import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGoalkeeperShot } from "./goalkeeper-ai.mjs";

test("AI selects left and right dives from shot direction",()=>{
  assert.equal(evaluateGoalkeeperShot({targetX:-2.8,targetY:.35}).side,"left");
  assert.equal(evaluateGoalkeeperShot({targetX:2.8,targetY:.35}).side,"right");
  assert.equal(evaluateGoalkeeperShot({targetX:2.8,targetY:.35}).action,"dive");
});

test("AI chooses catch for a central low shot and parry for a central high shot",()=>{
  assert.equal(evaluateGoalkeeperShot({targetX:0,targetY:.35}).action,"catch");
  assert.equal(evaluateGoalkeeperShot({targetX:0,targetY:2.05}).action,"parry");
});

test("AI rejects a high shot outside its effective dive reach",()=>{
  const result=evaluateGoalkeeperShot({targetX:2.8,targetY:2.05});
  assert.equal(result.reachable,false);
  assert.ok(result.reach<2.8);
});

test("AI rejects shots arriving before its reaction time",()=>{
  const result=evaluateGoalkeeperShot({targetX:2.8,targetY:1.1,flightTime:.1});
  assert.equal(result.reachable,false);
});

test("AI validates numeric inputs",()=>{
  assert.throws(()=>evaluateGoalkeeperShot({targetX:NaN,targetY:1}),TypeError);
  assert.throws(()=>evaluateGoalkeeperShot({targetX:0,targetY:1,flightTime:0}),RangeError);
});
