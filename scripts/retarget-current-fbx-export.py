import bpy, json, os, re
from pathlib import Path
from mathutils import Matrix

fbx_path = os.environ.get("FBX_PATH", "input/player-package/jog forward.fbx")
glb_path = os.environ.get("GLB_PATH", "/tmp/player-uncompressed.glb")
out_path = os.environ.get("OUTPUT_GLB", "/tmp/player-retargeted.glb")
report_path = os.environ.get("REPORT_PATH", "retarget-export-report.json")

ALIASES = {
    "Head": "Bip01 Head", "Hips": "Bip01 Pelvis",
    "Spine": "Bip01 Spine", "Spine1": "Bip01 Spine1", "Spine2": "Bip01 Spine2",
    "Neck": "Bip01 Neck",
    "LeftShoulder": "Bip01 L Clavicle", "LeftArm": "Bip01 L UpperArm",
    "LeftForeArm": "Bip01 L Forearm", "LeftHand": "Bip01 L Hand",
    "LeftUpLeg": "Bip01 L Thigh", "LeftLeg": "Bip01 L Calf",
    "LeftFoot": "Bip01 L Foot", "LeftToeBase": "Bip01 L Toe0",
    "RightShoulder": "Bip01 R Clavicle", "RightArm": "Bip01 R UpperArm",
    "RightForeArm": "Bip01 R Forearm", "RightHand": "Bip01 R Hand",
    "RightUpLeg": "Bip01 R Thigh", "RightLeg": "Bip01 R Calf",
    "RightFoot": "Bip01 R Foot", "RightToeBase": "Bip01 R Toe0",
}

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def armatures():
    return [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']

def action_targets(action):
    names = set()
    for fc in action.fcurves:
        m = re.search(r'pose\.bones\["([^"]+)"\]', fc.data_path)
        if m: names.add(m.group(1))
    return sorted(names)

clear_scene()
bpy.ops.import_scene.fbx(filepath=fbx_path, use_anim=True)
source_rigs = armatures()
source_actions = list(bpy.data.actions)
if not source_rigs or not source_actions:
    raise RuntimeError("FBX did not import an armature and animation")
source = source_rigs[0]
source_action = source_actions[0]
source.data.pose_position = 'POSE'
source.animation_data_create()
source.animation_data.action = source_action

bpy.ops.import_scene.gltf(filepath=glb_path)
target_rigs = armatures()
if not target_rigs:
    raise RuntimeError("Target GLB did not import an armature")
target = target_rigs[0]
target.data.pose_position = 'POSE'

source_targets = action_targets(source_action)
mapping = {}
for name in source_targets:
    clean = name.replace("mixamorig:", "").replace("mixamorig_", "")
    target_name = ALIASES.get(clean)
    if target_name and name in source.data.bones and target_name in target.data.bones:
        mapping[name] = target_name
if len(mapping) < 20:
    raise RuntimeError("Insufficient mapped bones: " + str(len(mapping)))

start, end = [int(round(v)) for v in source_action.frame_range]
scene = bpy.context.scene
scene.frame_start, scene.frame_end = start, end
scene.render.fps = max(1, scene.render.fps)
scene.frame_set(start)
bpy.context.view_layer.update()

target.animation_data_create()
if target.animation_data.action:
    target.animation_data.action = None
action = bpy.data.actions.new("Retargeted_Jog_Forward")
target.animation_data.action = action

# Sample source pose, transfer rest-relative armature-space motion, and bake
# target-local channels. This preserves the target rig and mesh.
target_pose_bones = target.pose.bones
for frame in range(start, end + 1):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    for source_name, target_name in mapping.items():
        src_pb = source.pose.bones[source_name]
        dst_pb = target_pose_bones[target_name]
        src_rest = source.data.bones[source_name].matrix_local
        dst_rest = target.data.bones[target_name].matrix_local
        desired = dst_rest @ src_rest.inverted() @ src_pb.matrix
        dst_pb.rotation_mode = 'QUATERNION'
        dst_pb.matrix = desired
        dst_pb.keyframe_insert(data_path="location", frame=frame, group=target_name)
        dst_pb.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=target_name)
        dst_pb.keyframe_insert(data_path="scale", frame=frame, group=target_name)

# Remove the source rig and any imported source objects; only the original
# target GLB scene is exported with the baked action.
source_objects = [source] + list(source.children_recursive)
for obj in source_objects:
    if obj.name in bpy.data.objects:
        bpy.data.objects.remove(obj, do_unlink=True)
# Ensure target and its original mesh objects are selected for export.
bpy.ops.object.select_all(action='DESELECT')
target.select_set(True)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
bpy.context.view_layer.objects.active = target

bpy.ops.export_scene.gltf(
    filepath=out_path, export_format='GLB',
    use_selection=True, export_animations=True,
    export_skins=True, export_apply=False
)
if not os.path.isfile(out_path) or os.path.getsize(out_path) < 10000:
    raise RuntimeError("Retargeted GLB export missing or unexpectedly small")

# Re-import exported file in a clean scene to verify that the animation survived.
export_bytes = os.path.getsize(out_path)
clear_scene()
bpy.ops.import_scene.gltf(filepath=out_path)
check_rigs = armatures()
check_actions = list(bpy.data.actions)
if not check_rigs or not check_actions:
    raise RuntimeError("Exported GLB did not retain an armature animation")
check_action = check_actions[-1]
track_count = len(action_targets(check_action))
if track_count < 20:
    raise RuntimeError("Exported animation has too few target tracks: " + str(track_count))

report = {
    "source_fbx": fbx_path,
    "target_glb": glb_path,
    "output_glb": out_path,
    "source_bone_count": source_bone_count,
    "mapped_bone_count": len(mapping),
    "mapped_bones": [{"source": s, "target": t} for s, t in mapping.items()],
    "source_frame_range": [start, end],
    "baked_frame_count": end - start + 1,
    "export_bytes": export_bytes,
    "reimport_armature_count": len(check_rigs),
    "reimport_action_names": [a.name for a in check_actions],
    "reimport_animation_track_count": track_count,
    "retarget_export_verified": True
}
Path(report_path).write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
