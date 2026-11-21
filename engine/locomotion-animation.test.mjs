import test from "node:test";
import assert from "node:assert/strict";
import { clampRootMotionDeltaToTarget, consumeRootMotionDelta, extractHorizontalRootMotion, flattenHorizontalRootMotion, flattenVerticalRootMotion, getHorizontalRootMotionDelta, getHorizontalRootMotionDisplacement, getLocomotionTimeScale, removeLocomotionRootTranslation, shouldFlattenHorizontalRootMotion, shouldFlattenVerticalRootMotion, shouldRemoveLocomotionRootTranslation } from "./locomotion-animation.mjs";
import { isOneShotAnimationState } from "./player-animation-map.mjs";
import { MIXAMO_ANIMATION_FILES } from "./mixamo-animation-catalog.mjs";
function vectorTrack(name, values) { return { name, values: new Float32Array(values), getValueSize: () => 3 }; }

test("removes Root/Hips translation channels from every cyclic locomotion variant", () => {
 const locomotion = [
  "jog forward.fbx", "jog backward.fbx",
  "jog forward diagonal.fbx", "jog forward diagonal (2).fbx",
  "jog backward diagonal.fbx", "jog backward diagonal (2).fbx",
  "jog strafe left.fbx", "jog strafe right.fbx"
 ];
 for (const file of locomotion) assert.equal(shouldRemoveLocomotionRootTranslation(file), true, file);
 assert.equal(shouldRemoveLocomotionRootTranslation("offensive idle.fbx"), true);
 for (const file of MIXAMO_ANIMATION_FILES.filter(file => /^jog /.test(file))) assert.equal(shouldRemoveLocomotionRootTranslation(file), true, file);
 for (const file of ["header soccerball.fbx","soccer tackle.fbx","soccer penalty kick.fbx","goalkeeper sidestep.fbx","gk_dive-high_shot-left-ball_in_hand.fbx"]) {
  assert.equal(shouldRemoveLocomotionRootTranslation(file), false, file);
 }
 const hips = vectorTrack("mixamorigHips.position", [0, 0, 0, 2, .3, 4]);
 const root = vectorTrack("mixamorigRoot.position", [0, 0, 0, 1, 0, 1]);
 const hand = vectorTrack("mixamorigLeftHand.position", [1, 2, 3, 4, 5, 6]);
 const hipsRotation = { name: "mixamorigHips.quaternion", values: new Float32Array([0,0,0,1,0,0,0,1]) };
 const clip = { tracks: [hips, root, hand, hipsRotation] };
 removeLocomotionRootTranslation(clip);
 assert.deepEqual(clip.tracks.map(track => track.name), ["mixamorigLeftHand.position","mixamorigHips.quaternion"]);
 assert.equal(clip.userData.locomotionRootTranslationRemoved, true);
 assert.equal(clip.userData.locomotionRootTranslationTracksRemoved, 2);
});
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
test("flattens every mapped outfield jog clip, including diagonal variants", () => {
 for (const file of ["jog forward.fbx","jog backward.fbx","jog forward diagonal.fbx","jog forward diagonal (2).fbx","jog backward diagonal.fbx","jog backward diagonal (2).fbx","jog strafe left.fbx","jog strafe right.fbx"]) {
  assert.equal(shouldFlattenHorizontalRootMotion(file),true,file);
 }
});

test("flattens vertical pelvis motion only on locomotion cycles", () => {
 const locomotion = ["jog forward.fbx","jog backward.fbx","jog forward diagonal.fbx","jog forward diagonal (2).fbx","jog backward diagonal.fbx","jog backward diagonal (2).fbx","jog strafe left.fbx","jog strafe right.fbx"];
 for (const file of locomotion) assert.equal(shouldFlattenVerticalRootMotion(file), true, file);
 for (const file of ["offensive idle.fbx","header soccerball.fbx","soccer tackle.fbx","soccer penalty kick.fbx","goalkeeper sidestep.fbx","gk_dive-high_shot-left-ball_in_hand.fbx"]) {
  assert.equal(shouldFlattenVerticalRootMotion(file), false, file);
 }
 const hips = vectorTrack("mixamorigHips.position", [1, 0, 2, 4, .2, 6, 8, .4, 10]);
 const hand = vectorTrack("mixamorigLeftHand.position", [1, 2, 3, 4, 5, 6]);
 const clip = { tracks: [hips, hand] };
 assert.equal(flattenVerticalRootMotion(clip), clip);
 assert.deepEqual(Array.from(hips.values), [1, 0, 2, 4, 0, 6, 8, 0, 10]);
 assert.deepEqual(Array.from(hand.values), [1, 2, 3, 4, 5, 6]);
 assert.equal(clip.userData.verticalRootMotionFlattened, true);
 assert.equal(clip.userData.verticalRootMotionTracksAdjusted, 1);
});
test("keeps goalkeeper sidestep clips out of the legacy locomotion-flattening path", () => {
 assert.equal(shouldFlattenHorizontalRootMotion("goalkeeper sidestep.fbx"),false);
 assert.equal(shouldFlattenHorizontalRootMotion("goalkeeper sidestep (2).fbx"),false);
 assert.equal(shouldFlattenHorizontalRootMotion("gk_dive-low_shot-left-ball_not_in_hand.fbx"),true);
 assert.equal(shouldFlattenHorizontalRootMotion("gk_dive-high_shot-right-ball_in_hand.fbx"),true);
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

test("uses moving Hips when an FBX has a static explicit Root track", () => {
 const root={...vectorTrack("mixamorigRoot.position",[0,0,0,0,0,0]),times:new Float32Array([0,1])};
 const hips={...vectorTrack("mixamorigHips.position",[0,0,0,2,0,0]),times:new Float32Array([0,1])};
 const clip={duration:1,tracks:[root,hips]};
 extractHorizontalRootMotion(clip);
 assert.equal(clip.userData.rootMotion.trackName,"mixamorigHips.position");
 assert.deepEqual(getHorizontalRootMotionDisplacement(clip),{x:2,z:0});
 assert.deepEqual(Array.from(hips.values),[0,0,0,0,0,0]);
});

test("samples extracted root motion continuously and across a looping sidestep boundary", () => {
 const hips={...vectorTrack("Hips.position",[0,0,0,2,.1,0,4,.2,0]),times:new Float32Array([0,.5,1])};
 const clip={duration:1,tracks:[hips]};
 extractHorizontalRootMotion(clip);
 assert.deepEqual(getHorizontalRootMotionDelta(clip,0,.25),{x:1,z:0});
 assert.deepEqual(getHorizontalRootMotionDelta(clip,.75,.25),{x:2,z:0});
 assert.deepEqual(getHorizontalRootMotionDelta(clip,.25,.75),{x:2,z:0});
});

test("distributes a low-frequency root-motion update smoothly over rendered frames", () => {
 let pendingDelta={x:1,z:-.5};
 let pendingDuration=.05;
 let total={x:0,z:0};
 for (const frameDelta of [1/60,1/60,1/60,1/60]) {
  const result=consumeRootMotionDelta(pendingDelta,pendingDuration,frameDelta);
  total.x+=result.delta.x;total.z+=result.delta.z;
  pendingDelta=result.pendingDelta;pendingDuration=result.pendingDuration;
 }
 assert.ok(Math.abs(total.x-1)<1e-9);
 assert.ok(Math.abs(total.z+.5)<1e-9);
 assert.equal(pendingDuration,0);
 assert.deepEqual(pendingDelta,{x:0,z:0});
});

test("retains unconsumed root motion when a render frame is shorter than the animation tick", () => {
 const first=consumeRootMotionDelta({x:.6,z:.3},.05,1/60);
 assert.ok(Math.abs(first.delta.x-.2)<1e-9);
 assert.ok(Math.abs(first.pendingDelta.x-.4)<1e-9);
 assert.ok(Math.abs(first.pendingDuration-(.05-1/60))<1e-9);
});

test("supports opposite sidestep directions and clamps variable target distances", () => {
 const left={tracks:[{...vectorTrack("Hips.position",[0,0,0,-3,0,0]),times:new Float32Array([0,1])}],duration:1};
 const right={tracks:[{...vectorTrack("Hips.position",[0,0,0,3,0,0]),times:new Float32Array([0,1])}],duration:1};
 extractHorizontalRootMotion(left); extractHorizontalRootMotion(right);
 const leftStep=getHorizontalRootMotionDisplacement(left);
 const rightStep=getHorizontalRootMotionDisplacement(right);
 assert.equal(leftStep.x,-3); assert.equal(rightStep.x,3);
 assert.deepEqual(clampRootMotionDeltaToTarget(rightStep,{x:5,z:0}),{x:3,z:0});
 assert.deepEqual(clampRootMotionDeltaToTarget(rightStep,{x:.8,z:0}),{x:.8,z:0});
 assert.deepEqual(clampRootMotionDeltaToTarget(leftStep,{x:2,z:0}),{x:0,z:0});
 assert.deepEqual(clampRootMotionDeltaToTarget({x:2,z:2},{x:1,z:1}),{x:1,z:1});
});

test("keeps all six keeper dives one-shot until their complete save clips finish", () => {
 for (const state of ["keeperDiveLeft","keeperDiveRight","keeperDiveMiddleLeft","keeperDiveMiddleRight","keeperDiveLowLeft","keeperDiveLowRight"]) {
  assert.equal(isOneShotAnimationState(state),true);
 }
 assert.equal(isOneShotAnimationState("keeperMove"),false);
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


test("every engine-driven Mixamo animation is horizontal in-place except extracted keeper sidesteps", () => {
 for (const file of MIXAMO_ANIMATION_FILES) {
  const isSidestep = file.startsWith("goalkeeper sidestep");
  assert.equal(shouldFlattenHorizontalRootMotion(file), !isSidestep, file);
 }
});
