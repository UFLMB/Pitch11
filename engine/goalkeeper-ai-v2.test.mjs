import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGoalkeeperThreat, predictGoalPlaneCrossing } from "./goalkeeper-ai-v2.mjs";
const ballTo=(x,y,time,speed=18)=>({x:0,y:y+0.5*9.81*time*time,z:speed*time,vx:x/time,vy:0,vz:-speed});
test("predicts goal-line crossing from live ball position and velocity",()=>{
 const c=predictGoalPlaneCrossing({x:0,y:1,z:9,vx:1,vy:0,vz:-18});
 assert.ok(Math.abs(c.time-.5)<1e-9); assert.ok(Math.abs(c.x-.5)<1e-9); assert.ok(c.y<1);
});
test("no crossing is returned when the ball is not moving toward goal",()=>{
 assert.equal(predictGoalPlaneCrossing({x:0,y:1,z:8,vx:0,vy:0,vz:1}),null);
 assert.equal(predictGoalPlaneCrossing({x:0,y:1,z:8,vx:0,vy:0,vz:0}),null);
});
test("close central moderate-speed shot can be caught",()=>{
 const r=evaluateGoalkeeperThreat({ball:{x:0,y:1.1+0.5*9.81*(4/12)**2,z:4,vx:0,vy:0,vz:-12},keeper:{x:0,vx:0},attributes:{reflexes:80,positioning:80,handling:85,reach:75,diving:75}});
 assert.equal(r.reachable,true); assert.equal(r.technique,"catch");
});
test("fast corner shot can beat a high-rated keeper",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(3.45,1.2,.24,27),keeper:{x:0,vx:0},attributes:{reflexes:95,positioning:95,diving:95,reach:95,handling:95}});
 assert.equal(r.reachable,false); assert.equal(r.outcome,"goal-likely");
});
test("very short reaction window beats the keeper",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(.2,1,.12,24),keeper:{x:0},attributes:{reflexes:99}});
 assert.equal(r.reason,"reaction-window-expired");
});
test("outside-mouth shots are not classified as saves",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(3.8,1,.6),keeper:{x:0}});
 assert.equal(r.reason,"outside-goal-mouth"); assert.equal(r.reachable,false);
});
test("low lateral threats request a matching low dive when reachable",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(-2.4,.42,.8,16),keeper:{x:0},attributes:{reflexes:85,diving:85,reach:80}});
 assert.equal(r.heightBand,"low"); assert.equal(r.side,"left");
 assert.ok(["keeperDiveLowLeft","keeperMiss"].includes(r.animationState));
});
test("high wide threats are never treated as clean catches",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(2.3,2.12,.9,22),keeper:{x:0},attributes:{reflexes:85,diving:90,reach:90,handling:60}});
 assert.ok(["keeperFingertip","keeperDiveRight","keeperMiss"].includes(r.animationState)); assert.notEqual(r.technique,"catch");
});
test("attributes are bounded and cannot grant unlimited reach",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(3.5,2.3,.2,30),keeper:{x:0},attributes:{reflexes:999,diving:999,reach:999,positioning:999}});
 assert.equal(r.reachable,false);
});
test("invalid physical inputs are rejected",()=>{
 assert.throws(()=>evaluateGoalkeeperThreat({ball:{x:NaN,y:1,z:4,vx:0,vy:0,vz:-10}}),TypeError);
 assert.throws(()=>evaluateGoalkeeperThreat({ball:{x:0,y:1,z:4,vx:0,vy:0,vz:-10},environment:{goalWidth:0}}),RangeError);
});
test("ball crossing below the ground is not a goal-mouth threat",()=>{
 const r=evaluateGoalkeeperThreat({ball:{x:0,y:.3,z:10,vx:0,vy:-8,vz:-10},keeper:{x:0}});
 assert.equal(r.reason,"outside-goal-mouth");
});
