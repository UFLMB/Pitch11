import bpy, json, os, re
from pathlib import Path

fbx_path = os.environ.get("FBX_PATH", "input/player-package/jog forward.fbx")
glb_path = os.environ.get("GLB_PATH", "assets/players/player.glb")
out_path = os.environ.get("REPORT_PATH", "retarget-test-report.json")

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def armatures():
    return [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']

def action_targets(action):
    found = set()
    if not action:
        return []
    for fc in action.fcurves:
        m = re.search(r'pose\.bones\["([^"]+)"\]', fc.data_path)
        if m:
            found.add(m.group(1))
    return sorted(found)

def mixamo_to_bip(name):
    n = name.replace("mixamorig:", "").replace("mixamorig_", "")
    aliases = {
      "Hips":"Bip01 Pelvis", "Spine":"Bip01 Spine", "Spine1":"Bip01 Spine1",
      "Spine2":"Bip01 Spine2", "Neck":"Bip01 Neck", "Head":"Bip01 Head",
      "LeftShoulder":"Bip01 L Clavicle", "LeftArm":"Bip01 L UpperArm",
      "LeftForeArm":"Bip01 L Forearm", "LeftHand":"Bip01 L Hand",
      "RightShoulder":"Bip01 R Clavicle", "RightArm":"Bip01 R UpperArm",
      "RightForeArm":"Bip01 R Forearm", "RightHand":"Bip01 R Hand",
      "LeftUpLeg":"Bip01 L Thigh", "LeftLeg":"Bip01 L Calf",
      "LeftFoot":"Bip01 L Foot", "LeftToeBase":"Bip01 L Toe0",
      "RightUpLeg":"Bip01 R Thigh", "RightLeg":"Bip01 R Calf",
      "RightFoot":"Bip01 R Foot", "RightToeBase":"Bip01 R Toe0",
    }
    return aliases.get(n)

clear_scene()
if not os.path.isfile(fbx_path): raise RuntimeError("Missing FBX: " + fbx_path)
if not os.path.isfile(glb_path): raise RuntimeError("Missing player GLB: " + glb_path)

bpy.ops.import_scene.fbx(filepath=fbx_path, use_anim=True)
source_rigs = armatures()
source_actions = list(bpy.data.actions)
source = source_rigs[0] if source_rigs else None
source_bones = sorted(source.data.bones.keys()) if source else []
source_tracks = sorted(set(t for a in source_actions for t in action_targets(a)))

clear_scene()
bpy.ops.import_scene.gltf(filepath=glb_path)
target_rigs = armatures()
target = target_rigs[0] if target_rigs else None
target_bones = sorted(target.data.bones.keys()) if target else []

mapped = []
unmapped = []
for track in source_tracks:
    target_name = mixamo_to_bip(track)
    if target_name and target_name in target_bones:
        mapped.append({"source": track, "target": target_name})
    else:
        unmapped.append(track)

report = {
  "source_fbx": fbx_path,
  "target_glb": glb_path,
  "source_armature_found": bool(source),
  "source_armature_count": len(source_rigs),
  "source_bone_count": len(source_bones),
  "source_bone_names": source_bones,
  "source_action_names": [a.name for a in source_actions],
  "source_animation_track_targets": source_tracks,
  "target_armature_found": bool(target),
  "target_armature_count": len(target_rigs),
  "target_bone_count": len(target_bones),
  "target_bone_names": target_bones,
  "mapped_track_count": len(mapped),
  "unmapped_track_count": len(unmapped),
  "mapped_tracks": mapped,
  "unmapped_tracks": unmapped,
  "retarget_ready": bool(source and target and mapped)
}
Path(out_path).write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
