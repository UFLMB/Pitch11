import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { createGoalNetPositions, DEFAULT_GOAL_LAYOUT } from './engine/goal-geometry.mjs';
import { createProductionSecurityPositions } from './engine/stadium-atmosphere.mjs';
(() => {
 const host=document.getElementById('stadium3d');if(!host)return;
 const mobile=matchMedia('(max-width: 800px)').matches||(navigator.deviceMemory||4)<=4||(navigator.hardwareConcurrency||4)<=4;
 const renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance',stencil:false,depth:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.25));renderer.setSize(innerWidth,innerHeight);
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=false;host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x15263a);scene.fog=new THREE.Fog(0x15263a,260,620);
 scene.add(new THREE.HemisphereLight(0xc8ddff,0x1b251d,1.5));
 const key=new THREE.DirectionalLight(0xffdfb5,1.35);key.position.set(-90,150,100);scene.add(key);
 const fill=new THREE.DirectionalLight(0x8dbbff,.65);fill.position.set(100,80,-120);scene.add(fill);
 const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,1000);
 const topCamera=new THREE.OrthographicCamera(-60,60,40,-40,.1,1000);
 const v3=new THREE.Vector3(),v4=new THREE.Vector3(),forward=new THREE.Vector3(),up=new THREE.Vector3();
 let ready=false,lastRender=0,ledTextures=[],flagMeshes=[],goalNetMesh=null,crowdFans=[],securityGuards=[],staffActors=[];
 const bodyColors=[0x172c43,0x253b57,0x3d2529,0xb8b9b2,0x1c382d,0x8e3c2d,0xd1b98b,0x34353b,0x657b8c,0x8a9a9a,0x253b34,0x6c2637],skinColors=[0xd5a47f,0xb97f5e,0x8e5b43,0xe2bd9b,0x704936,0xc99470];
 function points(hx,hz,r){const p=[],line=(a,b,c,d)=>{const n=Math.max(2,Math.ceil(Math.hypot(c-a,d-b)/2));for(let i=0;i<n;i++){const t=i/n;p.push([a+(c-a)*t,b+(d-b)*t]);}},arc=(x,z,rad,a0,a1)=>{const n=Math.max(8,Math.ceil(Math.abs(a1-a0)*rad/2));for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n;p.push([x+Math.cos(a)*rad,z+Math.sin(a)*rad]);}};line(-hx+r,-hz,hx-r,-hz);arc(hx-r,-hz+r,r,-Math.PI/2,0);line(hx,-hz+r,hx,hz-r);arc(hx-r,hz-r,r,0,Math.PI/2);line(hx-r,hz,-hx+r,hz);arc(-hx+r,hz-r,r,Math.PI/2,Math.PI);line(-hx,hz-r,-hx,-hz+r);arc(-hx+r,-hz+r,r,Math.PI,Math.PI*1.5);return p;}
 function addCrowd(){
  const spacing=mobile?2.35:1.8,rows=[];
  // All seats are on terraces beyond the touchline and goal-line safety zones.
  for(let i=0;i<24;i++)rows.push({y:2.15+i*.34,p:points(66+i*.8,46+i*.8,14+i*.25)});
  for(let i=0;i<20;i++)rows.push({y:18+i*.34,p:points(86+i*.8,66+i*.8,22+i*.25)});
  const all=[];
  for(let ri=0;ri<rows.length;ri++){
   const row=rows[ri];let total=0,lens=[];
   for(let i=0;i<row.p.length;i++){const a=row.p[i],b=row.p[(i+1)%row.p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);lens.push(l);total+=l;}
   const n=Math.floor(total/spacing);let seg=0,base=0;
   for(let i=0;i<n;i++){
    const d=(i+.5)*total/n;
    // Repeated open stair aisles break up the seating into readable sections.
    if(d%27<2.8)continue;
    while(seg<lens.length-1&&base+lens[seg]<d)base+=lens[seg++];
    const a=row.p[seg],b=row.p[(seg+1)%row.p.length],t=(d-base)/Math.max(.001,lens[seg]);
    all.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,y:row.y,row:ri,section:Math.floor(d/27)});
   }
  }
  const bodyGeo=new THREE.CapsuleGeometry(.16,.22,3,7);
  const headGeo=new THREE.SphereGeometry(.105,8,6);
  const hairGeo=new THREE.SphereGeometry(.108,7,5);
  const armGeo=new THREE.CylinderGeometry(.045,.055,.34,6);
  const legGeo=new THREE.CylinderGeometry(.055,.07,.28,6);
  const bodyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.92});
  const skinMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88});
  const trouserMat=new THREE.MeshStandardMaterial({color:0x20242a,roughness:.94});
  const hairMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98});
  const torso=new THREE.InstancedMesh(bodyGeo,bodyMat,all.length);
  const head=new THREE.InstancedMesh(headGeo,skinMat,all.length);
  const hair=new THREE.InstancedMesh(hairGeo,hairMat,all.length);
  const arms=new THREE.InstancedMesh(armGeo,skinMat,all.length*2);
  const legs=new THREE.InstancedMesh(legGeo,trouserMat,all.length*2);
  const o=new THREE.Object3D(),col=new THREE.Color();
  const sectionColors=[0x183750,0x8b3038,0x294b3b,0xb38c36,0x35465f,0x713c58,0x8f9894,0x245466,0xeee8d9,0x25302d];
  const skinColors=[0xd5a47f,0xb97f5e,0x8e5b43,0xe2bd9b,0x704936,0xc99470];
  const hairColors=[0x171311,0x302017,0x4b3324,0x17191c,0x6a4b2e];
  let seed=7711;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  crowdFans=all.map((p,i)=>{
   const scale=.88+rnd()*.22,yaw=Math.atan2(-p.x,-p.z)+(rnd()-.5)*.3;
   const fan={...p,scale,yaw,phase:rnd()*Math.PI*2,delay:rnd()*.62,response:.35+rnd()*.65,skin:skinColors[Math.floor(rnd()*skinColors.length)],raised:rnd()<.22,reacts:false};
   const base=sectionColors[p.section%sectionColors.length];
   col.setHex(base).multiplyScalar(.82+rnd()*.32);
   o.position.set(p.x,p.y+.36*scale,p.z);o.rotation.set(0,yaw,0);o.scale.setScalar(scale);o.updateMatrix();torso.setMatrixAt(i,o.matrix);torso.setColorAt(i,col);
   col.setHex(fan.skin);o.position.set(p.x,p.y+.77*scale,p.z);o.scale.setScalar(scale);o.updateMatrix();head.setMatrixAt(i,o.matrix);head.setColorAt(i,col);
   col.setHex(hairColors[Math.floor(rnd()*hairColors.length)]);o.position.set(p.x,p.y+.835*scale,p.z);o.scale.set(scale*.94,scale*.52,scale*.94);o.updateMatrix();hair.setMatrixAt(i,o.matrix);hair.setColorAt(i,col);
   col.setHex(fan.skin);
   for(let side=-1;side<=1;side+=2){
    const ai=i*2+(side===1?1:0);
    o.position.set(p.x+side*.15*scale,p.y+.51*scale,p.z);o.rotation.set(0,yaw,side*(fan.raised?.18:.82));o.scale.setScalar(scale);o.updateMatrix();arms.setMatrixAt(ai,o.matrix);arms.setColorAt(ai,col);
    o.position.set(p.x+side*.075*scale,p.y+.145*scale,p.z);o.rotation.set(0,yaw,side*.035);o.scale.setScalar(scale);o.updateMatrix();legs.setMatrixAt(ai,o.matrix);
   }
   return fan;
  });
  for(const mesh of[torso,head,hair,arms,legs]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  scene.add(torso,head,hair,arms,legs);
  crowdFans.meshes={torso,head,hair,arms,legs};
 }
 function addSecurity(){
  const positions=createProductionSecurityPositions();
  const uniform=new THREE.MeshStandardMaterial({color:0x17212b,roughness:.82});
  const hiVis=new THREE.MeshStandardMaterial({color:0xd7ee38,emissive:0x303c08,roughness:.68});
  const skin=new THREE.MeshStandardMaterial({color:0xb98262,roughness:.9});
  const boots=new THREE.MeshStandardMaterial({color:0x090e14,roughness:.9});
  positions.forEach((p,i)=>{
   const guard=new THREE.Group();
   const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.72,3,6),uniform);body.position.y=.88;guard.add(body);
   const vest=new THREE.Mesh(new THREE.BoxGeometry(.42,.48,.27),hiVis);vest.position.set(0,1.04,-.015);guard.add(vest);
   const head=new THREE.Mesh(new THREE.SphereGeometry(.13,7,6),skin);head.position.y=1.52;guard.add(head);
   const hair=new THREE.Mesh(new THREE.SphereGeometry(.135,7,5),boots);hair.position.set(0,1.59,0);hair.scale.set(1,.48,1);guard.add(hair);
   for(const side of[-1,1]){
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.34,3,5),uniform);arm.position.set(side*.29,.99,0);arm.rotation.z=side*.16;guard.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.065,6,5),skin);hand.position.set(side*.3,.77,0);guard.add(hand);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.28,3,5),boots);leg.position.set(side*.105,.29,0);guard.add(leg);
   }
   const radio=new THREE.Mesh(new THREE.BoxGeometry(.1,.16,.06),boots);radio.position.set(.2,1.1,.16);guard.add(radio);
   guard.position.set(p.x,0,p.z);
   guard.rotation.y=p.zone==='sideline-stand'?(p.z>0?0:Math.PI):(p.x>0?Math.PI/2:-Math.PI/2);
   guard.userData={base:guard.rotation.y,phase:i*.71};
   securityGuards.push(guard);scene.add(guard);
  });
 }
 function addStaff(){
  const skinMat=new THREE.MeshStandardMaterial({color:0xc58d6b,roughness:.9});
  const darkHair=new THREE.MeshStandardMaterial({color:0x17191c,roughness:.96});
  const trouserMat=new THREE.MeshStandardMaterial({color:0x171c24,roughness:.94});
  const bootMat=new THREE.MeshStandardMaterial({color:0x080b10,roughness:.9});
  const tops=[0x172331,0x263c50,0x202b27,0xe8e8e1,0x7b2730];
  for(let side of[-1,1])for(let i=0;i<5;i++){
   const actor=new THREE.Group(),topMat=new THREE.MeshStandardMaterial({color:tops[(i+(side>0?2:0))%tops.length],roughness:.88});
   const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.48,4,7),topMat);torso.position.y=1.02;actor.add(torso);
   const neck=new THREE.Mesh(new THREE.CylinderGeometry(.065,.075,.13,6),skinMat);neck.position.y=1.38;actor.add(neck);
   const head=new THREE.Mesh(new THREE.SphereGeometry(.13,8,7),skinMat);head.position.y=1.55;actor.add(head);
   const hair=new THREE.Mesh(new THREE.SphereGeometry(.132,8,6),darkHair);hair.position.set(0,1.61,-.012);hair.scale.set(1,.48,1);actor.add(hair);
   for(const x of[-1,1]){
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.35,3,6),trouserMat);leg.position.set(x*.115,.32,0);actor.add(leg);
    const shoe=new THREE.Mesh(new THREE.BoxGeometry(.12,.07,.23),bootMat);shoe.position.set(x*.115,.075,.055);actor.add(shoe);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.34,3,6),topMat);arm.position.set(x*.27,1.02,0);arm.rotation.z=x*.18;actor.add(arm);
    const hand=new THREE.Mesh(new THREE.SphereGeometry(.06,6,5),skinMat);hand.position.set(x*.28,.79,.015);actor.add(hand);
   }
   // Staff lanyard and role-specific sideline detail.
   const lanyard=new THREE.Mesh(new THREE.BoxGeometry(.025,.24,.012),new THREE.MeshStandardMaterial({color:0xe5c65a,roughness:.8}));lanyard.position.set(.015,1.13,.205);actor.add(lanyard);
   if(i===1||i===3){const bib=new THREE.Mesh(new THREE.BoxGeometry(.34,.32,.025),new THREE.MeshStandardMaterial({color:i===1?0xd8ee45:0xe9e7dc,roughness:.8}));bib.position.set(0,1.04,.19);actor.add(bib);}
   if(i===2){const caseBox=new THREE.Mesh(new THREE.BoxGeometry(.28,.22,.12),new THREE.MeshStandardMaterial({color:0xc62d32,roughness:.75}));caseBox.position.set(.31,.77,.02);actor.add(caseBox);}
   const z=side*38.1,x=-22+i*11;
   actor.position.set(x,0,z);actor.rotation.y=side>0?Math.PI:0;
   actor.userData={base:actor.rotation.y,phase:i*.8+side*.6,role:i};
   staffActors.push(actor);scene.add(actor);
  }
 }
 function updateStaff(now){
  const t=now*.00055;
  for(const a of staffActors){a.rotation.y=a.userData.base+Math.sin(t+a.userData.phase)*.045;}
 }
 function updateSecurity(now){
  const t=now*.00045;
  for(const g of securityGuards)g.rotation.y=g.userData.base+Math.sin(t+g.userData.phase)*.09;
 }
 function board(len,x,z,rot){const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(len,.95,.3),new THREE.MeshStandardMaterial({color:0x071018,metalness:.55,roughness:.45})));const c=document.createElement('canvas');c.width=1024;c.height=128;const x2=c.getContext('2d'),labels=['PITCH 11 · MATCHDAY','MATCHDAY LIVE','PLAY BEAUTIFUL','ULTIMATE FOOTBALL'],cols=['#b5e65b','#f2c66d','#79d7cf','#f0f2e8'];for(let i=0;i<4;i++){const x0=i*256;x2.fillStyle='#101d25';x2.fillRect(x0,0,256,128);x2.fillStyle=cols[i];x2.fillRect(x0+10,18,3,92);x2.font='900 25px Arial';x2.textAlign='center';x2.fillText(labels[i],x0+132,73);}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;ledTextures.push(tex);const screen=new THREE.Mesh(new THREE.PlaneGeometry(len-.15,.72),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));screen.position.z=.16;g.add(screen);g.position.set(x,.78,z);g.rotation.y=rot;scene.add(g);}
 function setGoalDimensions({halfWidth=DEFAULT_GOAL_LAYOUT.halfWidth,height=DEFAULT_GOAL_LAYOUT.height,depth=DEFAULT_GOAL_LAYOUT.depth}={}) {
  if(goalNetMesh){scene.remove(goalNetMesh);goalNetMesh.geometry.dispose();goalNetMesh.material.dispose();}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(createGoalNetPositions({pitchHalfLength:DEFAULT_GOAL_LAYOUT.pitchHalfLength,halfWidth,height,depth}),3));
  const material=new THREE.LineBasicMaterial({color:0xf2f6f8,transparent:true,opacity:.78,depthWrite:false});
  goalNetMesh=new THREE.LineSegments(geometry,material);
  goalNetMesh.frustumCulled=false;
  goalNetMesh.renderOrder=2;
  scene.add(goalNetMesh);
 }
 function addFlags(){const mat=new THREE.MeshStandardMaterial({color:0xa3e635,side:THREE.DoubleSide,roughness:.8});for(const [x,z] of [[-52.5,-34],[-52.5,34],[52.5,-34],[52.5,34]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,1.55,6),new THREE.MeshStandardMaterial({color:0xb8c2c4,metalness:.5}));pole.position.set(x,.78,z);scene.add(pole);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.48,.3,3,2),mat.clone());flag.position.set(x+.24,1.38,z);flag.userData.phase=flagMeshes.length*.8;flagMeshes.push(flag);scene.add(flag);}}

 // Build one compact, deterministic turf atlas at load time; no external asset or per-frame work.
 function createPitchGrassTextures(){
  const size=mobile?512:1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const g=canvas.getContext('2d',{alpha:false});
  const base=g.createLinearGradient(0,0,size,size);
  base.addColorStop(0,'#347b40');base.addColorStop(.5,'#2e7139');base.addColorStop(1,'#286637');
  g.fillStyle=base;g.fillRect(0,0,size,size);
  const bands=14,band=size/bands;
  for(let i=0;i<bands;i++){
   g.fillStyle=i%2?'rgba(7,30,13,.105)':'rgba(190,225,165,.075)';
   g.fillRect(i*band,0,band+1,size);
   g.fillStyle=i%2?'rgba(255,255,255,.018)':'rgba(0,0,0,.018)';
   g.fillRect(i*band+band*.94,0,band*.06,size);
  }
  let seed=110711;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Fine blades run with the mowing direction; varied hue and length avoid a flat painted look.
  const blades=mobile?10500:26000;
  for(let i=0;i<blades;i++){
   const x=rnd()*size,y=rnd()*size,len=2+rnd()*(mobile?5:8),lean=(rnd()-.5)*2.8;
   const light=rnd();
   g.strokeStyle=light>.52?'rgba(180,220,145,.19)':light>.18?'rgba(9,42,17,.22)':'rgba(225,235,190,.12)';
   g.lineWidth=.45+rnd()*.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+lean,y-len);g.stroke();
  }
  const albedo=new THREE.CanvasTexture(canvas);albedo.colorSpace=THREE.SRGBColorSpace;
  albedo.wrapS=albedo.wrapT=THREE.RepeatWrapping;albedo.generateMipmaps=true;
  albedo.minFilter=THREE.LinearMipmapLinearFilter;albedo.magFilter=THREE.LinearFilter;
  albedo.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  // A low-contrast grayscale microstructure adds a restrained turf surface response.
  const detailCanvas=document.createElement('canvas');detailCanvas.width=detailCanvas.height=256;
  const d=detailCanvas.getContext('2d',{alpha:false});d.fillStyle='#808080';d.fillRect(0,0,256,256);
  for(let i=0;i<4200;i++){
   const x=rnd()*256,y=rnd()*256,len=1+rnd()*4;
   d.strokeStyle=rnd()>.5?'rgba(235,235,235,.32)':'rgba(35,35,35,.3)';
   d.lineWidth=.5+rnd()*.6;d.beginPath();d.moveTo(x,y);d.lineTo(x+(rnd()-.5)*1.4,y-len);d.stroke();
  }
  const detail=new THREE.CanvasTexture(detailCanvas);detail.wrapS=detail.wrapT=THREE.RepeatWrapping;
  detail.generateMipmaps=true;detail.minFilter=THREE.LinearMipmapLinearFilter;detail.magFilter=THREE.LinearFilter;
  return{albedo,detail};
 }
 function enhancePitchGrass(stadium){
  stadium.updateMatrixWorld(true);
  const textures=createPitchGrassTextures();let changed=0;
  stadium.traverse(o=>{
   if(!o.isMesh)return;
   const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());
   const longSide=Math.max(size.x,size.z),shortSide=Math.min(size.x,size.z);
   // Only touch the thin, pitch-sized green surface; stands, boards, seats and goal assets are excluded.
   if(longSide<85||longSide>125||shortSide<52||shortSide>82||size.y>1.5)return;
   const source=Array.isArray(o.material)?o.material:[o.material];
   const replacements=source.map(original=>{
    if(!original)return original;
    const hsl={h:0,s:0,l:0};if(original.color)original.color.getHSL(hsl);
    const green=hsl.h>=.19&&hsl.h<=.48&&hsl.s>=.18;
    if(!green&&!original.map)return original;
    const m=original.clone();
    if(!m.map){m.map=textures.albedo;m.color.set(0xffffff);}
    if(!m.bumpMap){m.bumpMap=textures.detail;m.bumpScale=.012;}
    if(!m.roughnessMap)m.roughnessMap=textures.detail;
    m.roughness=Math.max(.9,m.roughness||0);m.metalness=0;m.needsUpdate=true;
    changed++;return m;
   });
   o.material=Array.isArray(o.material)?replacements:replacements[0];
  });
  if(changed)console.info('PITCH 11 realistic turf materials:',changed);
 }

 const loader=new GLTFLoader();
 loader.load('./assets/football-stadium.glb',gltf=>{
  const stadium=gltf.scene;stadium.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;}});
  const bounds=new THREE.Box3().setFromObject(stadium),center=bounds.getCenter(new THREE.Vector3());stadium.position.x-=center.x;stadium.position.z-=center.z;stadium.position.y-=bounds.min.y;enhancePitchGrass(stadium);scene.add(stadium);
  try{addCrowd();addSecurity();addStaff();}catch(e){console.warn('PITCH 11 matchday atmosphere skipped',e);}
  board(112,0,-36.5,0);board(112,0,36.5,Math.PI);board(72,-DEFAULT_GOAL_LAYOUT.endBoardX,0,Math.PI/2);board(72,DEFAULT_GOAL_LAYOUT.endBoardX,0,-Math.PI/2);setGoalDimensions();addFlags();
  const details=new GLTFLoader();details.load('./assets/team-dugout.glb',asset=>{for(const s of[-1,1]){const d=asset.scene.clone(true);d.position.set(s*12.5,.05,36.5);if(s<0)d.rotation.y=Math.PI;scene.add(d);}},undefined,()=>{});
  details.load('./assets/corner-flag.glb',asset=>{for(const x of[-52.5,52.5])for(const z of[-34,34]){const f=asset.scene.clone(true);f.position.set(x,0,z);scene.add(f);}},undefined,()=>{});
  ready=true;window.dispatchEvent(new CustomEvent('p11stadiumready'));
 },undefined,e=>console.warn('PITCH 11 stadium unavailable; keeping original renderer.',e));
 function setCamera(V,w,h){const ch=V.yw?V.ch:0,sh=V.yw?V.sh:-1,cx=V.yw?V.ex:V.cx,cy=V.yw?V.ey:V.Cy,fy=V.fy,fz=V.fz,hz=V.hz;const pos=new THREE.Vector3((cx-585)*.1,hz*.1,(cy-400)*.1);forward.set(ch*fy,-fz,sh*fy).normalize();up.set(ch*fz,fy,sh*fz).normalize();camera.position.copy(pos);camera.up.copy(up);camera.lookAt(pos.clone().add(forward));const focal=V.K||h*.95;camera.fov=2*Math.atan(h/(2*focal))*180/Math.PI;camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function project(x,y,z){v3.set((x-585)*.1,z*.1,(y-400)*.1).project(camera);const sx=(v3.x*.5+.5)*innerWidth,sy=(-v3.y*.5+.5)*innerHeight;v4.set((x+1-585)*.1,z*.1,(y-400)*.1).project(camera);const sx2=(v4.x*.5+.5)*innerWidth,sy2=(-v4.y*.5+.5)*innerHeight;return{x:sx,y:sy,s:Math.max(.001,Math.hypot(sx2-sx,sy2-sy))};}
 function render(V,w,h){setCamera(V,w,h);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);updateSecurity(now);updateStaff(now);if(now-lastRender>=(mobile?33:16)){renderer.render(scene,camera);lastRender=now;}}
 function renderTopDown(cx,cy,vw,vh,w,h){const width=Math.max(1,vw*.1),height=Math.max(1,vh*.1),x=(cx-585)*.1,z=(cy-400)*.1;topCamera.left=-width/2;topCamera.right=width/2;topCamera.top=height/2;topCamera.bottom=-height/2;topCamera.position.set(x,220,z);topCamera.up.set(0,0,-1);topCamera.lookAt(x,0,z);topCamera.updateProjectionMatrix();topCamera.updateMatrixWorld(true);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);updateSecurity(now);if(now-lastRender>=(mobile?33:16)){renderer.render(scene,topCamera);lastRender=now;}}
 window.P11Stadium={get ready(){return ready;},render,renderTopDown,project,setGoalDimensions};
 addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.25));renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
})();
