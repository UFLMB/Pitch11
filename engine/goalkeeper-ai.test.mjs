import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGoalkeeperShot } from "./goalkeeper-ai.mjs";

test("keeper evaluates both sides using the actual 7.32 m goal mouth",()=>{
  assert.equal(evaluateGoalkeeperShot({targetX:-2.8,targetY:.35}).side,"left");
  assert.equal(evaluateGoalkeeperShot({targetX:2.8,targetY:.35}).side,"right");
  assert.equal(evaluateGoalkeeperShot({targetX:2.8,targetY:.35}).goalWidth,7.32);
});

test("keeper chooses a central catch low and a parry high",()=>{
  assert.equal(evaluateGoalkeeperShot({targetX:0,targetY:.35}).action,"catch");
  assert.equal(evaluateGoalkeeperShot({targetX:0,targetY:2.05}).action,"parry");
});

test("keeper cannot save a ball outside the real goal mouth",()=>{
  assert.equal(evaluateGoalkeeperShot({targetX:3.8,targetY:1}).inGoalMouth,false);
  assert.equal(evaluateGoalkeeperShot({targetX:3.8,targetY:1}).reachable,false);
  assert.equal(evaluateGoalkeeperShot({targetX:0,targetY:2.5}).reachable,false);
});

test("reach is time-dependent and very short shots beat the keeper",()=>{
  const short=evaluateGoalkeeperShot({targetX:2.8,targetY:1.1,flightTime:.1});
  const longer=evaluateGoalkeeperShot({targetX:2.8,targetY:1.1,flightTime:.8});
  assert.equal(short.reachable,false);
  assert.ok(longer.lateralReach>short.lateralReach);
});

test("high corner shots require more preparation and have a smaller reach window",()=>{
  const low=evaluateGoalkeeperShot({targetX:2.8,targetY:.35});
  const high=evaluateGoalkeeperShot({targetX:2.8,targetY:2.05});
  assert.ok(high.reactionTime>low.reactionTime);
  assert.ok(high.available<low.available);
});

test("keeper reach depends on keeper starting position",()=>{
  const centered=evaluateGoalkeeperShot({targetX:2.8,targetY:.35,keeperX:0});
  const shifted=evaluateGoalkeeperShot({targetX:2.8,targetY:.35,keeperX:1});
  assert.ok(shifted.requiredTravelTime<centered.requiredTravelTime);
});

test("AI validates numeric inputs and dimensions",()=>{
  assert.throws(()=>evaluateGoalkeeperShot({targetX:NaN,targetY:1}),TypeError);
  assert.throws(()=>evaluateGoalkeeperShot({targetX:0,targetY:1,flightTime:0}),RangeError);
});
