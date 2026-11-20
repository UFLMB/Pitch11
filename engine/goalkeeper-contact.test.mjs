import test from "node:test";
import assert from "node:assert/strict";
import {findGoalkeeperBallContact} from "./goalkeeper-contact.mjs";
const m=x=>new Map(x);
test("hand contact",()=>assert.equal(findGoalkeeperBallContact({bonePositions:m([["lefthand",{x:0,y:1,z:0}]]),ballPosition:{x:.25,y:1,z:0}})?.zone,"hand"));
test("forearm capsule contact between joints",()=>{const hit=findGoalkeeperBallContact({bonePositions:m([["leftarm",{x:0,y:1,z:0}],["leftforearm",{x:0,y:1,z:1}]]),ballPosition:{x:.2,y:1,z:.5}});assert.equal(hit?.zone,"arm");assert.equal(hit?.bone,"leftarm-leftforearm")});
test("torso and leg contact",()=>{assert.equal(findGoalkeeperBallContact({bonePositions:m([["spine1",{x:0,y:1,z:0}],["spine2",{x:0,y:1.5,z:0}]]),ballPosition:{x:.2,y:1.25,z:0}})?.zone,"torso");assert.equal(findGoalkeeperBallContact({bonePositions:m([["leftupleg",{x:0,y:.8,z:0}],["leftleg",{x:0,y:.4,z:0}]]),ballPosition:{x:.1,y:.6,z:0}})?.zone,"leg")});
test("miss outside volumes",()=>assert.equal(findGoalkeeperBallContact({bonePositions:m([["head",{x:0,y:2,z:0}]]),ballPosition:{x:3,y:3,z:3}}),null));
test("invalid input",()=>assert.equal(findGoalkeeperBallContact({bonePositions:new Map(),ballPosition:{x:NaN,y:0,z:0}}),null));
