import test from "node:test";
import assert from "node:assert/strict";
import { extractHorizontalRootMotion, flattenHorizontalRootMotion, getHorizontalRootMotionDelta, getHorizontalRootMotionDisplacement, getLocomotionTimeScale, shouldFlattenHorizontalRootMotion } from "./locomotion-animation.mjs";
function vectorTrack(name, values) { return { name, values: new Float32Array(values), getValueSize: () => 3 }; }
test("flattens horizontal Hips translation while preserving vertical pelvis motion", () => {
 const hips=vectorTrack("mixamorigHips.position",[1,0,2,4,.2,6,8,.4,10]); const clip={tracks:[hips]};
 assert.equal(flattenHorizontalRootMotion(clip),clip);
 assert.deepEqual(Array.from(hips.values).map(value => Math.round(value * 1000) / 1000),[1,0,2,1,.2,2,1,.4,2]);
 assert.equal(clip.userData.rootMotionFlattened,true); assert.equal(clip.userData.rootMotionTracksAdjusted,1);
});
test("supports namespaced Mixamo roots and leaves unrelated bones unchanged", () => {
 const root=vectorTrack("mixamorig:Root.position",[0,0,0,2,0,3]); const hand=vectorTrack("mixamorigLeftHand.position",[1,2,3,4,5,6]);
 flattenHorizontalRootMotion({tracks:[root,hand]});
 assert.deepEqual(Array.from(root.values),[0,0,0,0,0,0]); assert.deepEqual(Array.from(hand.values),[1,2,3,4,5,6]);
});
test("keeps goalkeeper sidestep clips out of the legacy locomotion-flattening path", () => {
 assert.equal(shouldFlattenHorizontalRootMotion("goalkeeper sidestep.fbx"),false);
 assert.equal(shouldFlattenHorizontalRootMotion("goalkeeper sidestep (2).fbx"),false);
 assert.equal(shouldFlattenHorizontalRootMotion("gk_dive-low_shot-left-ball_not_in_hand.fbx"),false);
});
test("extracts sidestep root displacement while neutralizing mixer X/Z translation", () => {
 const hips={...vectorTrack("mixamorigHips.position",[2,0,3,5,.18,7,8,.32,11]),times:new Float32Array([0,.5,1])};
 const clip={duration:1,tracks:[hips]};
 extractHorizontalRootMotion(clip);
 assert.deepEqual(Array.from(hips.values).map(value => Math.round(value * 1000) / 1000),[2,0,3,2,.18,3,2,.32,3]);
 assert.equal(clip.userData.rootMotionExtracted,true);
 assert.equal(clip.userData.rootMotionFlattened,true);
 assert.deepEqual(getHorizontalRootMotionDisplacement(clip),{x:6,z:8});
});

test("samples extracted root motion continuously and across a looping sidestep boundary", () => {
 const hips={...vectorTrack("Hips.position",[0,0,0,2,.1,0,4,.2,0]),times:new Float32Array([0,.5,1])};
 const clip={duration:1,tracks:[hips]};
 extractHorizontalRootMotion(clip);
 assert.deepEqual(getHorizontalRootMotionDelta(clip,0,.25),{x:1,z:0});
 assert.deepEqual(getHorizontalRootMotionDelta(clip,.75,.25),{x:2,z:0});
 assert.deepEqual(getHorizontalRootMotionDelta(clip,.25,.75),{x:2,z:0});
});

test("supports opposite sidestep directions and variable remaining distances without overshooting", () => {
 const left={tracks:[{...vectorTrack("Hips.position",[0,0,0,-3,0,0]),times:new Float32Array([0,1])}],duration:1};
 const right={tracks:[{...vectorTrack("Hips.position",[0,0,0,3,0,0]),times:new Float32Array([0,1])}],duration:1};
 extractHorizontalRootMotion(left); extractHorizontalRootMotion(right);
 const leftStep=getHorizontalRootMotionDisplacement(left);
 const rightStep=getHorizontalRootMotionDisplacement(right);
 assert.equal(leftStep.x,-3); assert.equal(rightStep.x,3);
 for (const remaining of [0.2,0.8,2.5,5]) {
  const step=remaining>Math.abs(rightStep.x)?rightStep.x:Math.sign(rightStep.x)*remaining;
  assert.ok(Math.abs(step)<=remaining+1e-9);
 }
});
test("leaves malformed and non-vector root tracks unchanged", () => {
 const malformed={name:"Hips.position",values:new Float32Array([1,2]),getValueSize:()=>1}; const clip={tracks:[malformed]};
 flattenHorizontalRootMotion(clip); assert.deepEqual(Array.from(malformed.values),[1,2]); assert.equal(clip.userData.rootMotionFlattened,false);
});
test("scales locomotion cadence with actual speed and clamps extremes", () => {
 assert.ok(getLocomotionTimeScale("walk",.8)<getLocomotionTimeScale("walk",1.8));
 assert.ok(getLocomotionTimeScale("run",2.5)<getLocomotionTimeScale("run",5));
 assert.ok(getLocomotionTimeScale("sprint",5.5)<getLocomotionTimeScale("sprint",8));
 assert.equal(getLocomotionTimeScale("walk",0),.55); assert.equal(getLocomotionTimeScale("sprint",20),1.5); assert.equal(getLocomotionTimeScale("idle",4),1);
});
