import bpy, json, os, re, struct
from mathutils import Matrix

SOURCE = os.environ.get("SOURCE_FBX", "input/player-package/jog forward.fbx")
TARGET = os.environ.get("TARGET_GLB", "assets/players/player.glb")
OUT = os.environ.get("REPORT", "retarget-preflight.json")

def norm(name):
    value = name.lower().replace("mixamorig:", "").replace("bip01", "")
    value = re.sub(r"[^a-z0-9]+", "", value)
    aliases = {
        "pelvis":"hips", "hip":"hips",
        "rightshoulder":"rclavicle", "leftshoulder":"lclavicle",
        "rightarm":"rupperarm", "leftarm":"lupperarm",
        "rightforearm":"rforearm", "leftforearm":"lforearm",
        "righthand":"rhand", "lefthand":"lhand",
        "rightupleg":"rthigh", "leftupleg":"lthigh",
        "rightleg":"rcalf", "leftleg":"lcalf",
        "rightfoot":"rfoot", "leftfoot":"lfoot",
        "righttoebase":"rtoe0", "lefttoebase":"ltoe0"
    }
    for side, short in (("right", "r"), ("left", "l")):
        for source_finger, target_finger in (("thumb", "0"), ("index", "1"), ("middle", "2"), ("ring", "3"), ("pinky", "4")):
            for segment, target_segment in ((1, ""), (2, "1"), (3, "2")):
                aliases[f"{side}hand{source_finger}{segment}"] = f"{short}finger{target_finger}{target_segment}"
    return aliases.get(value, value)

def armatures():
    return [o for o in bpy.data.objects if o.type == "ARMATURE"]

def read_gltf_skin(path):
    with open(path, "rb") as f:
        header = f.read(12)
        if len(header) != 12 or header[:4] != b"glTF":
            raise RuntimeError("Target is not a binary GLB")
        _, version, total_length = struct.unpack("<4sII", header)
        if version != 2:
            raise RuntimeError("Unsupported GLB version: " + str(version))
        document = None
        consumed = 12
        while consumed < total_length:
            chunk_header = f.read(8)
            if len(chunk_header) != 8:
                break
            chunk_length, chunk_type = struct.unpack("<II", chunk_header)
            chunk = f.read(chunk_length)
            consumed += 8 + chunk_length
            if chunk_type == 0x4E4F534A:
                document = json.loads(chunk.decode("utf-8").rstrip("\\x00 "))
                break
        if document is None:
            raise RuntimeError("GLB JSON chunk not found")
    nodes = document.get("nodes", [])
    skins = document.get("skins", [])
    if not skins:
        raise RuntimeError("Target GLB contains no skin")
    skin = max(skins, key=lambda s: len(s.get("joints", [])))
    joints = skin.get("joints", [])
    joint_set = set(joints)
    parents = {}
    for parent_index, node in enumerate(nodes):
        for child_index in node.get("children", []):
            parents[child_index] = parent_index
    result = []
    for node_index in joints:
        node = nodes[node_index]
        ancestor = parents.get(node_index)
        while ancestor is not None and ancestor not in joint_set:
            ancestor = parents.get(ancestor)
        parent_name = nodes[ancestor].get("name", "node_" + str(ancestor)) if ancestor is not None else None
        result.append({
            "name": node.get("name", "node_" + str(node_index)),
            "parent": parent_name,
            "head": node.get("translation", [0, 0, 0]),
            "tail": [0, 0, 0],
            "gltf_node_index": node_index,
            "rotation": node.get("rotation"),
            "scale": node.get("scale"),
            "matrix": node.get("matrix")
        })
    return skin.get("name", "GLB skin"), result

def describe(obj):
    return [{"name": b.name, "parent": b.parent.name if b.parent else None,
             "head": [round(v,5) for v in b.head_local],
             "tail": [round(v,5) for v in b.tail_local]}
            for b in obj.data.bones]

bpy.ops.wm.read_factory_settings(use_empty=True)
if not os.path.isfile(SOURCE): raise RuntimeError("Missing source FBX: " + SOURCE)
if not os.path.isfile(TARGET): raise RuntimeError("Missing target GLB: " + TARGET)

bpy.ops.import_scene.fbx(filepath=SOURCE)
source_rigs = armatures()
if not source_rigs: raise RuntimeError("FBX import produced no armature")
source_actions = list(bpy.data.actions)
if not source_actions: raise RuntimeError("FBX import produced no animation action")
source = max(source_rigs, key=lambda o: len(o.data.bones))
source_bones = describe(source)
source_action = (source.animation_data.action if source.animation_data and source.animation_data.action else (source_actions[0] if source_actions else None))
if source_action is None: raise RuntimeError("FBX import produced no usable animation action")

target_armature_name, target_bones = read_gltf_skin(TARGET)
if not target_bones: raise RuntimeError("Target GLB skin contains no joints")

target_by_norm = {}
for bone in target_bones:
    target_by_norm.setdefault(norm(bone["name"]), []).append(bone["name"])
mapping, unmatched = {}, []
for bone in source_bones:
    candidates = target_by_norm.get(norm(bone["name"]), [])
    if len(candidates) == 1: mapping[bone["name"]] = candidates[0]
    else: unmatched.append({"source": bone["name"], "candidates": candidates})

report = {
 "source_fbx": SOURCE, "target_glb": TARGET,
 "source_armature": source.name, "source_bone_count": len(source_bones),
 "target_armature": target_armature_name, "target_bone_count": len(target_bones),
 "source_action": source_action.name, "source_action_fcurves": (len(source_action.fcurves) if hasattr(source_action, "fcurves") else None),
 "source_action_slots": ([slot.name for slot in source_action.slots] if hasattr(source_action, "slots") else []),
 "source_bones": source_bones, "target_bones": target_bones,
 "direct_name_mapping_count": len(mapping), "direct_name_mapping": mapping,
 "unmatched_source_bones": unmatched,
 "status": "PREFLIGHT_ONLY_RETARGET_NOT_EXPORTED"
}
with open(OUT, "w", encoding="utf-8") as f: json.dump(report, f, indent=2)
print(json.dumps({k:v for k,v in report.items() if k not in ("source_bones","target_bones")}, indent=2))
