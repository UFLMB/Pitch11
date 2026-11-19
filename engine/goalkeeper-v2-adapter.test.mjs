import test from "node:test";
import assert from "node:assert/strict";
import { predictGoalPlaneCrossing } from "./goalkeeper-ai-v2.mjs";
import { createGoalkeeperShot,advanceGoalkeeperBall,toGoalkeeperBallState,resolveGoalkeeperBallContact } from "./goalkeeper-v2-adapter.mjs";
test("ballistic shot reaches its authored target under gravity",()=>{
 const shot=createGoalkeeperShot({from:{x:.2,y:1.1,z:18},target:{x:2.8,y:.35,z:34},flightTime:.72});
 const end=advanceGoalkeeperBall(shot,.72);
 assert.ok(Math.abs(end.position.x-2.8)<1e-9);
 assert.ok(Math.abs(end.position.y-.35)<1e-9);
 assert.ok(Math.abs(end.position.z-34)<1e-9);
});
test("world coordinates convert to the goalkeeper's goal-line coordinate frame",()=>{
 const shot=createGoalkeeperShot({from:{x:1,y:1,z:18},target:{x:2,y:2,z:34},flightTime:1});
 const state=toGoalkeeperBallState(shot);
 assert.equal(state.x,1);assert.equal(state.y,1);assert.equal(state.z,16);
 assert.equal(state.vx,1);assert.equal(state.vz,-16);
});
test("AI predicts the same crossing as the live ballistic trajectory",()=>{
 const shot=createGoalkeeperShot({from:{x:-.2,y:1.1,z:18},target:{x:2.4,y:.4,z:34},flightTime:.8});
 const crossing=predictGoalPlaneCrossing(toGoalkeeperBallState(shot));
 assert.ok(Math.abs(crossing.time-.8)<1e-8);
 assert.ok(Math.abs(crossing.x-2.4)<1e-8);
 assert.ok(Math.abs(crossing.y-.4)<1e-8);
});
test("parry contact returns the ball toward the field in world coordinates",()=>{
 const shot=createGoalkeeperShot({from:{x:0,y:1,z:18},target:{x:0,y:1,z:34},flightTime:.8});
 const crossing=predictGoalPlaneCrossing(toGoalkeeperBallState(shot));
 const atContact={position:{x:crossing.x,y:crossing.y,z:34},velocity:{x:crossing.vx,y:crossing.vy,z:-crossing.vz}};
 const result=resolveGoalkeeperBallContact({decision:{technique:"parry",reachable:true},ball:atContact});
 assert.equal(result.contact,true);
 assert.ok(result.worldVelocity.z<0);
});
test("catch contact secures the ball and stops its world velocity",()=>{
 const result=resolveGoalkeeperBallContact({
  decision:{technique:"catch",reachable:true},
  ball:{position:{x:0,y:1,z:34},velocity:{x:0,y:0,z:20}}
 });
 assert.equal(result.secured,true);
 assert.deepEqual(result.worldVelocity,{x:0,y:0,z:0});
});
test("invalid shot timing and non-finite world state are rejected",()=>{
 assert.throws(()=>createGoalkeeperShot({from:{x:0,y:0,z:0},target:{x:0,y:0,z:1},flightTime:0}),RangeError);
 assert.throws(()=>toGoalkeeperBallState({position:{x:NaN,y:0,z:0},velocity:{x:0,y:0,z:0}}),TypeError);
});
