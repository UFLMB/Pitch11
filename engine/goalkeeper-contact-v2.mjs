// Deterministic goalkeeper-ball contact response. Coordinates: x lateral, y vertical, z toward field.
const finite=(v,n)=>{if(!Number.isFinite(v))throw new TypeError(n+" must be finite");return v};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mag=v=>Math.hypot(v.x,v.y,v.z);
const vec=(v,n)=>({x:finite(v?.x??0,n+".x"),y:finite(v?.y??0,n+".y"),z:finite(v?.z??0,n+".z")});
const norm=(v,f)=>{const m=mag(v);return m>1e-8?{x:v.x/m,y:v.y/m,z:v.z/m}:{...f}};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export function resolveGoalkeeperContact({decision,ball,normal={x:0,y:0,z:1},handling=50,contactOffset={x:0,y:0,z:0}}={}) {
 if(!decision||!ball)throw new TypeError("decision and ball are required");
 const technique=decision.technique??decision.outcome;
 const position=vec(ball.position??ball,"ball.position");
 const velocity=vec(ball.velocity??{x:ball.vx,y:ball.vy,z:ball.vz},"ball.velocity");
 const offset=vec(contactOffset,"contactOffset"); const speed=mag(velocity); const skill=clamp(finite(handling,"handling"),1,99);
 if(technique==="miss"||technique==="none"||!decision.reachable)return Object.freeze({contact:false,secured:false,technique:"miss",position,velocity,ballState:"live"});
 if(technique==="catch")return Object.freeze({contact:true,secured:true,technique:"catch",position,velocity:Object.freeze({x:0,y:0,z:0}),ballState:"held",retainedControl:clamp(.72+skill/360,.72,.995)});
 if(technique!=="parry"&&technique!=="fingertip")throw new RangeError("unsupported goalkeeper contact technique: "+technique);
 let n=norm(vec(normal,"normal"),{x:0,y:0,z:1}); if(dot(velocity,n)>0)n={x:-n.x,y:-n.y,z:-n.z}; if(dot(velocity,n)>=-1e-6)n={x:0,y:0,z:1};
 const restitution=technique==="fingertip"?clamp(.62+(100-skill)*.0018,.62,.80):clamp(.34+(100-skill)*.0012,.34,.46);
 const impulse=-(1+restitution)*dot(velocity,n);
 let out={x:velocity.x+impulse*n.x,y:velocity.y+impulse*n.y,z:velocity.z+impulse*n.z};
 const om=mag(offset); const tangent=om>1e-8?{x:offset.x/om,y:offset.y/om,z:0}:{x:0,y:0,z:0};
 const strength=clamp(om,0,1)*(technique==="fingertip"?.16:.08)*speed;
 out={x:out.x+tangent.x*strength,y:out.y+tangent.y*strength+(technique==="fingertip"?.08*speed:0),z:out.z+Math.max(0,.12*speed)};
 return Object.freeze({contact:true,secured:false,technique,position,velocity:Object.freeze(out),ballState:"live",restitution,impactSpeed:speed,reboundSpeed:mag(out)});
}