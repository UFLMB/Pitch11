#!/usr/bin/env python3
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path.cwd()
INPUT = ROOT / "input" / "FULL-UV.txt.txt"
AUDIT_DIR = Path("/tmp/pitch11-player-texture-audit")
OUT = Path("/tmp/pitch11-uv-mapping")
OUT.mkdir(parents=True, exist_ok=True)

LABELS = {
"body": ["Törzs – mellkas, has és hát","Bal kar – alkar és kéz régiója","Jobb kar – alkar és kéz régiója","Bal lábszár","Jobb lábszár","Jobb comb fő felülete","Bal comb fő felülete","Bal felkar fő felülete","Jobb felkar fő felülete","Jobb térd / comb-lábszár átmenet","Bal térd / comb-lábszár átmenet","Bal lábfej fő felülete","Jobb lábfej fő felülete","Bal comb kisebb felülete","Jobb comb kisebb felülete","Bal felkar kisebb felülete","Jobb felkar kisebb felülete","Jobb lábfej – talp / lábujj felület","Bal lábfej – talp / lábujj felület","Jobb cipő – stoplik","Bal cipő – stoplik","Jobb cipő – nyelv oldalsó része","Bal cipő – nyelv oldalsó része","Bal cipő – külső oldali vonalszerű részlet a cipőnyelv csatlakozásánál","Jobb cipő – külső oldali vonalszerű részlet a cipőnyelv csatlakozásánál","Bal cipő – belső oldali vonalszerű részlet a cipőnyelv csatlakozásánál","Jobb cipő – belső oldali vonalszerű részlet a cipőnyelv csatlakozásánál"],
"head": ["Fej és arc fő felülete","Bal szem","Jobb szem","Szájüreg belső felülete / állkapocs","Felső fogsor környéke","Jobb szájzug és belső szájfelület","Bal szájzug és belső szájfelület","Alsó fogsor / állkapocs belső része","Nyelv fő felülete","Bal nyelvoldali felület","Jobb nyelvoldali felület"]
}

def read_json(path):
    with path.open(encoding="utf-8") as f: return json.load(f)

def texture_for(audit, material_name):
    mat = next((m for m in audit["materials"] if m.get("name") == material_name), None)
    if mat is None: raise RuntimeError("Missing material: " + material_name)
    image = next((i for i in audit["images"] if i.get("index") == mat.get("baseColorImage")), None)
    if not image or not image.get("filename"): raise RuntimeError("Missing base-color image for " + material_name)
    path = AUDIT_DIR / image["filename"]
    if not path.is_file(): raise RuntimeError("Missing extracted texture: " + str(path))
    return path, image

def draw_atlas(texture_path, islands, labels, filename):
    scale = 2
    image = Image.open(texture_path).convert("RGBA")
    if image.size != (1024,1024): raise RuntimeError(f"Expected 1024x1024 texture, got {image.size}")
    image = image.resize((2048,2048), Image.Resampling.LANCZOS)

    # Draw the UV overlay on a transparent layer. Mirror only its horizontal
    # positions; the original base-colour texture remains untouched.
    overlay = Image.new("RGBA", image.size, (0,0,0,0))
    draw = ImageDraw.Draw(overlay, "RGBA")
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
    centers = []
    for idx, island in enumerate(islands):
        tris = island.get("uvTriangles") or []
        if not tris: raise RuntimeError(f"Island {idx+1} has no UV triangles")
        points = []
        for tri in tris:
            if len(tri) != 3: raise RuntimeError("Malformed UV triangle")
            xy = []
            for p in tri:
                u,v = float(p[0]),float(p[1])
                if not (0 <= u <= 1 and 0 <= v <= 1): raise RuntimeError(f"UV outside 0..1: {p}")
                points.append((u,v))
                x = round((1-u)*(1024*scale-1))
                y = round((1-v)*1024*scale)
                xy.append((x,y))
            draw.line(xy+[xy[0]], fill=(255,238,65,235), width=2, joint="curve")
        xs=[p[0] for p in points]; ys=[p[1] for p in points]
        center_u=(min(xs)+max(xs))*0.5
        center_v=(min(ys)+max(ys))*0.5
        centers.append((center_u*(2048-1),(1-center_v)*2048))
    placed=[]
    offsets=[(0,0)]
    for radius in (42,60,80,102,128,158,192,230):
        for k in range(24):
            a=2*math.pi*k/24
            offsets.append((radius*math.cos(a),radius*math.sin(a)))
    for idx,(x,y) in enumerate(centers):
        chosen=None
        for dx,dy in offsets:
            cx,cy=x+dx,y+dy
            if 28<=cx<=2020 and 28<=cy<=2020 and all((cx-px)**2+(cy-py)**2>=70**2 for px,py in placed):
                chosen=(cx,cy); break
        if chosen is None: chosen=(x,y)
        cx,cy=chosen
        if math.hypot(cx-x,cy-y)>4: draw.line((x,y,cx,cy),fill=(255,255,255,240),width=2)
        r=25
        draw.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(5,12,19,245),outline=(255,255,255,255),width=3)
        s=str(idx+1); box=draw.textbbox((0,0),s,font=font)
        tw,th=box[2]-box[0],box[3]-box[1]
        # Marker circles, leader lines and digits are annotations, not the yellow UV wireframe; keep them in their original positions.
        draw.text((cx-tw/2,cy-th/2-box[1]),s,font=font,fill=(255,255,255,255))
        placed.append((cx,cy))
    image.alpha_composite(overlay)
    target=OUT/filename
    image.convert("RGB").save(target,format="PNG",optimize=True)
    return target

def main():
    if not INPUT.is_file(): raise RuntimeError("Missing input/FULL-UV.txt.txt")
    full=read_json(INPUT)
    audit=read_json(AUDIT_DIR/"texture-audit.json")
    groups=full.get("groups",{})
    report={"project":"PITCH 11","model":full.get("model","PITCH 11 player.glb"),
      "purpose":"Diagnostic UV mapping only; no model or runtime asset is modified.",
      "coordinate_convention":"diagnostic overlay x = (1 - u) * texture_width; y = (1 - v) * texture_height; base texture is unchanged",
      "validation":{},"materials":[]}
    counts={}
    for group,material_name,outname in [("body","m301_body","BODY-numbered-UV.png"),("head","m301_head","HEAD-numbered-UV.png")]:
        islands=groups.get(group,[]); labels=LABELS[group]
        if len(islands)!=len(labels): raise RuntimeError(f"{group}: expected {len(labels)} islands, got {len(islands)}")
        declared=sum(int(x.get("triangles",0)) for x in islands)
        supplied=sum(len(x.get("uvTriangles",[])) for x in islands)
        if declared!=supplied: raise RuntimeError(f"{group}: UV triangle count {supplied} != declared {declared}")
        tex,meta=texture_for(audit,material_name)
        draw_atlas(tex,islands,labels,outname)
        report["materials"].append({"group":group,"material":material_name,
          "texture_file":tex.name,"texture_dimensions":meta.get("dimensions"),
          "islands":[{"island":i+1,"anatomical_label":labels[i],"triangles":item.get("triangles"),
            "uv_vertices":item.get("uvVertices"),"uv_area":item.get("uvArea"),
            "uv_bounds_mesh_local":item.get("boundsMeshLocal"),"uv_triangles":item.get("uvTriangles")}
            for i,item in enumerate(islands)]})
        counts[group]={"islands":len(islands),"triangles":declared}
    report["validation"]={"body_islands":counts["body"]["islands"],"head_islands":counts["head"]["islands"],
      "total_islands":counts["body"]["islands"]+counts["head"]["islands"],
      "body_triangles":counts["body"]["triangles"],"head_triangles":counts["head"]["triangles"],
      "total_triangles":counts["body"]["triangles"]+counts["head"]["triangles"],
      "uv_triangle_data_matches_metadata":True}
    with (OUT/"uv-anatomical-mapping.json").open("w",encoding="utf-8") as f: json.dump(report,f,ensure_ascii=False,indent=2)
    with (OUT/"READ-ME-HU.txt").open("w",encoding="utf-8") as f:
        f.write("PITCH 11 – DIAGNOSZTIKAI UV MAPPING\\n\\n")
        f.write(f"Összesen {report['validation']['total_islands']} UV-sziget és {report['validation']['total_triangles']} UV-háromszög.\\n")
        f.write("A sárga kontúrok az eredeti UV-háromszögeket követik. A számok a JSON island mezőjével egyeznek.\\n")
        f.write("UV-háló vetítése: X=(1-u)*textúraszélesség; Y=(1-v)*textúramagasság. Az alatta lévő textúra változatlan.\\n\\n")
        for group in ("body","head"):
            f.write(group.upper()+"\\n")
            for i,label in enumerate(LABELS[group],1): f.write(f"{i:02d}. {label}\\n")
            f.write("\\n")
        f.write("Diagnosztikai csomag: a player.glb és a játék forrásfájljai nem módosultak.\\n")
    print(json.dumps(report["validation"],ensure_ascii=False,indent=2))

if __name__=="__main__": main()
