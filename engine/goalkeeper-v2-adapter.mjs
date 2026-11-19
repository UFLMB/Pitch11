// Coordinate and motion adapter between the Goalkeeper Lab's Three.js world and AI v2.
// World z increases toward the goal; AI z is distance in front of the goal line.
import { resolveGoalkeeperContact } from "./goalkeeper-contact-v2.mjs";
const finite=(value,name)=>{if(!Number.isFinite(value))throw new TypeError(name+" must be finite");return value};
const vector=(value,name)=>({x:finite(value?.x,name+".x"),y:finite(value?.y,name+".y"),z:finite(value?.z,name+".z")});
export function createGoalkeeperShot({from,target,flightTime,gravity=9.81}={}){
 const start=vector(from,"from"),end=vector(target,"target");
 finite(flightTime,"flightTime");finite(gravity,"gravity");
 if(flightTime<=0||gravity<=0)throw new RangeError("flightTime and gravity must be positive");
 return Object.freeze({
  position:Object.freeze(start),
  velocity:Object.freeze({
   x:(end.x-start.x)/flightTime,
   y:(end.y-start.y+0.5*gravity*flightTime*flightTime)/flightTime,
   z:(end.z-start.z)/flightTime
  }),
  acceleration:Object.freeze({x:0,y:0,z:0}),
  elapsed:0,flightTime,gravity,
  target:Object.freeze(end)
 });
}
export function advanceGoalkeeperBall(ball,deltaSeconds,{gravity=ball?.gravity??9.81}={}){
 if(!ball||typeof ball!=="object")throw new TypeError("ball is required");
 finite(deltaSeconds,"deltaSeconds");finite(gravity,"gravity");
 if(deltaSeconds<0||gravity<=0)throw new RangeError("deltaSeconds must be non-negative and gravity positive");
 const p=vector(ball.position,"ball.position"),v=vector(ball.velocity,"ball.velocity");
 const a=vector(ball.acceleration??{x:0,y:0,z:0},"ball.acceleration");
 const dt=deltaSeconds;
 return Object.freeze({
  ...ball,
  position:Object.freeze({
   x:p.x+v.x*dt+0.5*a.x*dt*dt,
   y:p.y+v.y*dt+0.5*(a.y-gravity)*dt*dt,
   z:p.z+v.z*dt+0.5*a.z*dt*dt
  }),
  velocity:Object.freeze({x:v.x+a.x*dt,y:v.y+(a.y-gravity)*dt,z:v.z+a.z*dt}),
  elapsed:(ball.elapsed??0)+dt
 });
}
export function toGoalkeeperBallState(ball,goalLineZ=34){
 if(!ball||typeof ball!=="object")throw new TypeError("ball is required");
 finite(goalLineZ,"goalLineZ");
 const p=vector(ball.position,"ball.position"),v=vector(ball.velocity,"ball.velocity");
 const a=vector(ball.acceleration??{x:0,y:0,z:0},"ball.acceleration");
 return Object.freeze({x:p.x,y:p.y,z:goalLineZ-p.z,vx:v.x,vy:v.y,vz:-v.z,ax:a.x,ay:a.y,az:-a.z});
}
export function resolveGoalkeeperBallContact({decision,ball,goalLineZ=34,normal={x:0,y:0,z:1},handling=50,contactOffset={x:0,y:0,z:0}}={}){
 if(!decision||!ball)throw new TypeError("decision and ball are required");
 finite(goalLineZ,"goalLineZ");
 const p=vector(ball.position,"ball.position"),v=vector(ball.velocity,"ball.velocity");
 const result=resolveGoalkeeperContact({
  decision,
  ball:{position:{x:p.x,y:p.y,z:goalLineZ-p.z},velocity:{x:v.x,y:v.y,z:-v.z}},
  normal,handling,contactOffset
 });
 return Object.freeze({
  ...result,
  worldPosition:Object.freeze({x:result.position.x,y:result.position.y,z:goalLineZ-result.position.z}),
  worldVelocity:Object.freeze({x:result.velocity.x,y:result.velocity.y,z:result.velocity.z===0?0:-result.velocity.z})
 });
}
