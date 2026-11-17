import bpy, json, os, re
from mathutils import Matrix

SOURCE = os.environ.get("SOURCE_FBX", "input/player-package/jog forward.fbx")
TARGET = os.environ.get("TARGET_GLB", "assets/players/player.glb")
OUT = os.environ.get("REPORT", "retarget-preflight.json")

def norm(name):
    value = name.lower().replace("mixamorig:", "").replace("bip01", "")
    value = re.sub(r"[^a-z0-9]+", "", value)
    aliases = {"pelvis":"hips", "hip":"hips", "spine1":"spine", "leftupleg":"thighl",
               "rightupleg":"thighr", "leftleg":"calfl", "rightleg":"calfr",
               "leftfoot":"footl", "rightfoot":"footr"}
    return aliases.get(value, value)

def armatures():
    return [o for o in bpy.data.objects if o.type == "ARMATURE"]

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

bpy.ops.import_scene.gltf(filepath=TARGET)
target_rigs = armatures()
if not target_rigs: raise RuntimeError("Target GLB import produced no armature")
target = max(target_rigs, key=lambda o: len(o.data.bones))
target_bones = describe(target)

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
 "target_armature": target.name, "target_bone_count": len(target_bones),
 "source_action": source_action.name, "source_action_fcurves": (len(source_action.fcurves) if hasattr(source_action, "fcurves") else None),
 "source_action_slots": ([slot.name for slot in source_action.slots] if hasattr(source_action, "slots") else []),
 "source_bones": source_bones, "target_bones": target_bones,
 "direct_name_mapping_count": len(mapping), "direct_name_mapping": mapping,
 "unmatched_source_bones": unmatched,
 "status": "PREFLIGHT_ONLY_RETARGET_NOT_EXPORTED"
}
with open(OUT, "w", encoding="utf-8") as f: json.dump(report, f, indent=2)
print(json.dumps({k:v for k,v in report.items() if k not in ("source_bones","target_bones")}, indent=2))
