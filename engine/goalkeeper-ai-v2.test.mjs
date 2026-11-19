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
 const r=evaluateGoalkeeperThreat({ball:{x:0,y:1.1+0.5*9.81*(4/8)**2,z:4,vx:0,vy:0,vz:-8},keeper:{x:0,vx:0},attributes:{reflexes:80,positioning:80,handling:85,reach:75,diving:75}});
 assert.equal(r.reachable,true); assert.equal(r.technique,"catch");
});
test("fast corner shot can beat a high-rated keeper",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(3.45,1.2,.24,27),keeper:{x:0,vx:0},attributes:{reflexes:95,positioning:95,diving:95,reach:95,handling:95}});
 assert.equal(r.reachable,false); assert.equal(r.outcome,"goal-likely");
});
test("very short reaction window beats the keeper",()=>{
 const r=evaluateGoalkeeperThreat({ball:ballTo(.2,1,.04,24),keeper:{x:0},attributes:{reflexes:99}});
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

test("uses accelerated goal-plane crossing instead of assuming constant depth velocity",()=>{
 const linear=predictGoalPlaneCrossing({x:0,y:1,z:8,vx:0,vy:0,vz:-10});
 const accelerated=predictGoalPlaneCrossing({x:0,y:1,z:8,vx:0,vy:0,vz:-8,az:-4});
 assert.ok(accelerated.time < linear.time);
});
test("applies lateral acceleration to the predicted crossing point",()=>{
 const c=predictGoalPlaneCrossing({x:0,y:1,z:8,vx:0,vy:0,vz:-10,ax:2});
 assert.ok(c.x>0);
});
test("occlusion delays the keeper reaction and can turn a marginal save into a miss",()=>{
 const ball=ballTo(2.1,1.1,.42,24);
 const attributes={reflexes:88,positioning:50,diving:78,reach:78};
 const clear=evaluateGoalkeeperThreat({ball,keeper:{x:0,visibility:1,occlusion:0},attributes});
 const screened=evaluateGoalkeeperThreat({ball,keeper:{x:0,visibility:0.1,occlusion:1},attributes});
 assert.ok(screened.reactionTime>clear.reactionTime);
 assert.ok(screened.availableReactionTime<clear.availableReactionTime);
});
test("keeper is not moved toward the future shot endpoint by positioning rating",()=>{
 const ball=ballTo(2.5,1.1,.8,18);
 const low=evaluateGoalkeeperThreat({ball,keeper:{x:0},attributes:{positioning:1,reflexes:80,diving:80,reach:80}});
 const high=evaluateGoalkeeperThreat({ball,keeper:{x:0},attributes:{positioning:99,reflexes:80,diving:80,reach:80}});
 assert.equal(low.lateralDistance,high.lateralDistance);
});
