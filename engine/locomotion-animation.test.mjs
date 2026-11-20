import test from "node:test";
import assert from "node:assert/strict";
import { flattenHorizontalRootMotion, getLocomotionTimeScale } from "./locomotion-animation.mjs";
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
test("flattens goalkeeper sidestep root drift while preserving gait bounce", () => {
 const hips=vectorTrack("mixamorigHips.position",[2,0,3,5,.18,7,8,.32,11]); const clip={tracks:[hips]};
 flattenHorizontalRootMotion(clip);
 assert.deepEqual(Array.from(hips.values).map(value => Math.round(value * 1000) / 1000),[2,0,3,2,.18,3,2,.32,3]);
 assert.equal(clip.userData.rootMotionFlattened,true);
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
