import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { createGoalNetPositions, DEFAULT_GOAL_LAYOUT } from './engine/goal-geometry.mjs';
import { createProductionSecurityPositions } from './engine/stadium-atmosphere.mjs';
(() => {
 const host=document.getElementById('stadium3d');if(!host)return;
 const boot=window.P11StadiumBoot||(window.P11StadiumBoot={});
 boot.state='initializing-renderer';boot.progress=0;boot.error='';
 const mobile=matchMedia('(max-width: 800px)').matches||(navigator.deviceMemory||4)<=4||(navigator.hardwareConcurrency||4)<=4;
 const uiCanvas=document.getElementById('c');
 let viewportWidth=uiCanvas?.getBoundingClientRect().width||innerWidth;
 let viewportHeight=uiCanvas?.getBoundingClientRect().height||innerHeight;
 const renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance',stencil:false,depth:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.25));
 function syncRendererSize(){
  const rect=uiCanvas&&uiCanvas.getBoundingClientRect();
  if(!rect||rect.width<1||rect.height<1)return null;
  viewportWidth=rect.width;viewportHeight=rect.height;
  const targetRatio=uiCanvas.width/rect.width;
  if(Number.isFinite(targetRatio)&&targetRatio>0&&Math.abs(renderer.getPixelRatio()-targetRatio)>.001)renderer.setPixelRatio(targetRatio);
  const size=renderer.getSize(new THREE.Vector2());
  if(Math.abs(size.x-rect.width)>.5||Math.abs(size.y-rect.height)>.5)renderer.setSize(rect.width,rect.height,false);
  return rect;
 }
 syncRendererSize();
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=false;host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x15263a);scene.fog=new THREE.Fog(0x15263a,260,620);
 const hemi=new THREE.HemisphereLight(0xc8ddff,0x1b251d,1.5);scene.add(hemi);
 const key=new THREE.DirectionalLight(0xffdfb5,1.35);key.position.set(-90,150,100);scene.add(key);
 const fill=new THREE.DirectionalLight(0x8dbbff,.65);fill.position.set(100,80,-120);scene.add(fill);
 // Four broad, shadow-free floodlights make NIGHT a genuine stadium lighting state.
 const floodlights=[[-66,43,-49],[-66,43,49],[66,43,-49],[66,43,49]].map(([x,y,z])=>{
  const light=new THREE.SpotLight(0xf0f4ff,0,190,.75,.58,1.35);
  light.position.set(x,35,z);light.target.position.set(0,0,0);
  scene.add(light,light.target);return light;
 });
 function applyStadiumTimeOfDay(value){
  const mode=Number.isInteger(value)?Math.max(0,Math.min(2,value)):0;
  if(mode===2){
   scene.background.set(0x07111d);if(scene.fog)scene.fog.color.set(0x101a29);
   hemi.color.set(0x7895c5);hemi.groundColor.set(0x101923);hemi.intensity=.48;
   key.color.set(0x8aa7d6);key.intensity=.18;fill.color.set(0x7399d8);fill.intensity=.16;
   floodlights.forEach(light=>{light.intensity=620;});setFloodlightFixtureState(2);
   renderer.toneMappingExposure=.94;
  }else if(mode===1){
   scene.background.set(0x382b3b);if(scene.fog)scene.fog.color.set(0x493746);
   hemi.color.set(0xe0a17d);hemi.groundColor.set(0x30252b);hemi.intensity=1.0;
   key.color.set(0xffad78);key.intensity=1.05;fill.color.set(0x8aa7c7);fill.intensity=.48;
   floodlights.forEach(light=>{light.intensity=110;});setFloodlightFixtureState(1);
   renderer.toneMappingExposure=1.02;
  }else{
   scene.background.set(0x15263a);if(scene.fog)scene.fog.color.set(0x15263a);
   hemi.color.set(0xc8ddff);hemi.groundColor.set(0x1b251d);hemi.intensity=1.5;
   key.color.set(0xffdfb5);key.intensity=1.35;fill.color.set(0x8dbbff);fill.intensity=.65;
   floodlights.forEach(light=>{light.intensity=0;});setFloodlightFixtureState(0);
   renderer.toneMappingExposure=1.08;
  }
 }
 const camera=new THREE.PerspectiveCamera(48,viewportWidth/Math.max(1,viewportHeight),.1,1000);
 const previewCamera=new THREE.PerspectiveCamera(46,1,.1,700);
 let previewBall=null,pitchTextureCanvas=null,pitchTexture=null,pitchMaterials=[],previewWeatherGroup=null,pitchSurfaceY=0,pitchMarkingsGroup=null,pitchBaseImage=null,pitchSettings={pitch:0,mowing:0},pitchTextureStatus='fallback',pitchDiagnostics={meshCount:0,surfaceCandidates:0,grassMaterialsChanged:0,largestMeshes:[],candidateSamples:[],markings:null};
 let activePitchKey='';
 function updatePreviewPitch(pitch,mowing){
  const p=Math.max(0,Math.min(4,pitch|0)),m=Math.max(0,Math.min(3,mowing|0)),key=p+':'+m;
  if(key===activePitchKey||!pitchTextureCanvas||!pitchTexture)return;
  activePitchKey=key;pitchSettings={pitch:p,mowing:m};
  const c=pitchTextureCanvas,g=c.getContext('2d',{alpha:false}),size=c.width;
  if(pitchBaseImage)g.drawImage(pitchBaseImage,0,0,size,size);
  else{
   const fallback=g.createLinearGradient(0,0,size,size);
   fallback.addColorStop(0,'#347b40');fallback.addColorStop(.5,'#2e7139');fallback.addColorStop(1,'#286637');
   g.fillStyle=fallback;g.fillRect(0,0,size,size);
  }
  // Grass presets tint the photographic sports-turf albedo; the separate
  // fixed line-marking texture is never recoloured or redrawn here.
  // Keep the photographic turf dominant: presets make restrained colour
  // corrections instead of painting over the grass detail.
  const tints=['#f0f5e9','#a8b8a5','#bca77b','#e4e9e8','#91b6c5'];
  const tintStrength=[.035,.22,.19,.14,.17][p];
  if(tintStrength>0){
   g.save();g.globalCompositeOperation='soft-light';g.globalAlpha=tintStrength;
   g.fillStyle=tints[p];g.fillRect(0,0,size,size);g.restore();
  }
  // Mowing patterns are broad, low-contrast light shifts with soft boundaries.
  const addBands=(vertical,count,dark,light)=>{
   for(let n=0;n<count;n++){
    const start=n/count,end=(n+1)/count,grad=vertical
     ?g.createLinearGradient(start*size,0,end*size,0)
     :g.createLinearGradient(0,start*size,0,end*size);
    const shade=n%2?dark:light;
    grad.addColorStop(0,'rgba(255,255,255,0)');
    grad.addColorStop(.12,shade);
    grad.addColorStop(.88,shade);
    grad.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=grad;
    if(vertical)g.fillRect(start*size,0,size/count,size);
    else g.fillRect(0,start*size,size,size/count);
   }
  };
  if(m===0)addBands(true,2,'rgba(0,0,0,.035)','rgba(255,255,255,.025)');
  else if(m===1)addBands(true,4,'rgba(0,0,0,.03)','rgba(255,255,255,.022)');
  else if(m===2)addBands(false,4,'rgba(0,0,0,.028)','rgba(255,255,255,.02)');
  pitchTexture.needsUpdate=true;
 }
 function createPreviewWeather(){
  if(previewWeatherGroup)return previewWeatherGroup;
  previewWeatherGroup=new THREE.Group();
  const rain=[],snow=[];
  let seed=77291;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let n=0;n<260;n++){const x=rnd()*110-55,y=3+rnd()*25,z=rnd()*76-38;rain.push(x,y,z,x-.12,y+1.25,z);}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.Float32BufferAttribute(rain,3));
  const rainMat=new THREE.LineBasicMaterial({color:0xb9d8f4,transparent:true,opacity:.48});
  const rainMesh=new THREE.LineSegments(rainGeo,rainMat);rainMesh.visible=false;previewWeatherGroup.add(rainMesh);
  const flakes=[];for(let n=0;n<240;n++)flakes.push(rnd()*110-55,3+rnd()*25,rnd()*76-38);
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.Float32BufferAttribute(flakes,3));
  const snowMat=new THREE.PointsMaterial({color:0xffffff,size:.22,transparent:true,opacity:.88,sizeAttenuation:true});
  const snowMesh=new THREE.Points(snowGeo,snowMat);snowMesh.visible=false;previewWeatherGroup.add(snowMesh);
  scene.add(previewWeatherGroup);return previewWeatherGroup;
 }
 const topCamera=new THREE.OrthographicCamera(-60,60,40,-40,.1,1000);
 const v3=new THREE.Vector3(),v4=new THREE.Vector3(),forward=new THREE.Vector3(),up=new THREE.Vector3();
 let ready=false,lastRender=0,ledTextures=[],flagMeshes=[],goalNetMesh=null,crowdFans=[],securityGuards=[],staffActors=[];
 let stadiumLoadState='loading',stadiumLoadProgress=0,stadiumLoadError='',stadiumLoadAttempts=0,previewFailure='loading';
 const optionalAssets={dugout:'pending',cornerFlag:'pending'};
 boot.state='loading-stadium';boot.progress=0;boot.optionalAssets=optionalAssets;
 const bodyColors=[0x172c43,0x253b57,0x3d2529,0xb8b9b2,0x1c382d,0x8e3c2d,0xd1b98b,0x34353b,0x657b8c,0x8a9a9a,0x253b34,0x6c2637],skinColors=[0xd5a47f,0xb97f5e,0x8e5b43,0xe2bd9b,0x704936,0xc99470];
 function points(hx,hz,r){const p=[],line=(a,b,c,d)=>{const n=Math.max(2,Math.ceil(Math.hypot(c-a,d-b)/2));for(let i=0;i<n;i++){const t=i/n;p.push([a+(c-a)*t,b+(d-b)*t]);}},arc=(x,z,rad,a0,a1)=>{const n=Math.max(8,Math.ceil(Math.abs(a1-a0)*rad/2));for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n;p.push([x+Math.cos(a)*rad,z+Math.sin(a)*rad]);}};line(-hx+r,-hz,hx-r,-hz);arc(hx-r,-hz+r,r,-Math.PI/2,0);line(hx,-hz+r,hx,hz-r);arc(hx-r,hz-r,r,0,Math.PI/2);line(hx-r,hz,-hx+r,hz);arc(-hx+r,hz-r,r,Math.PI/2,Math.PI);line(-hx,hz-r,-hx,-hz+r);arc(-hx+r,-hz+r,r,Math.PI,Math.PI*1.5);return p;}
 function addCrowd(){
  // Mobile uses a lighter crowd grid: preserve all four stands while avoiding
  // the desktop density of more than nine thousand individual supporters.
  const rowStep=mobile?2:1,spacing=mobile?3.8:1.8,rows=[];
  // All seats are on terraces beyond the touchline and goal-line safety zones.
  for(let i=0;i<24;i+=rowStep)rows.push({y:2.15+i*.34,p:points(66+i*.8,46+i*.8,14+i*.25)});
  for(let i=0;i<20;i+=rowStep)rows.push({y:18+i*.34,p:points(86+i*.8,66+i*.8,22+i*.25)});
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
 function updateCrowd(now){
  const meshes=crowdFans.meshes;if(!meshes||!crowdFans.length)return;
  const step=Math.max(1,Math.ceil(crowdFans.length/900)),start=Math.floor(now/32)%step,o=new THREE.Object3D();
  for(let i=start;i<crowdFans.length;i+=step){
   const f=crowdFans[i],wave=Math.sin(now*.0042+f.phase+f.delay*3)*f.response,bob=f.raised?Math.max(0,wave)*.035:Math.abs(wave)*.008;
   o.position.set(f.x,f.y+.36*f.scale+bob,f.z);o.rotation.set(0,f.yaw,0);o.scale.setScalar(f.scale);o.updateMatrix();meshes.torso.setMatrixAt(i,o.matrix);
   o.position.set(f.x,f.y+.77*f.scale+bob,f.z);o.updateMatrix();meshes.head.setMatrixAt(i,o.matrix);
   for(let side=-1;side<=1;side+=2){
    const ai=i*2+(side===1?1:0),sway=f.raised?Math.sin(now*.005+f.phase+side)*.24:wave*.055;
    o.position.set(f.x+side*.15*f.scale,f.y+.51*f.scale+bob,f.z);o.rotation.set(0,f.yaw,side*(f.raised?.18+sway:.82+sway));o.scale.setScalar(f.scale);o.updateMatrix();meshes.arms.setMatrixAt(ai,o.matrix);
   }
  }
  meshes.torso.instanceMatrix.needsUpdate=true;meshes.head.instanceMatrix.needsUpdate=true;meshes.arms.instanceMatrix.needsUpdate=true;
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

 // Visible PITCH 11 floodlight towers: the light sources have physical fixtures,
 // steel masts and LED panels so NIGHT reads as a properly lit football ground.
 const floodlightFixtures=[];
 function addFloodlightTowers(){
  const steel=new THREE.MeshStandardMaterial({color:0x303b43,metalness:.72,roughness:.42});
  const brace=new THREE.MeshStandardMaterial({color:0x59636a,metalness:.68,roughness:.48});
  const housing=new THREE.MeshStandardMaterial({color:0x202a33,metalness:.55,roughness:.36});
  const led=new THREE.MeshStandardMaterial({color:0xfff5d8,emissive:0xffe9b5,emissiveIntensity:0,roughness:.24});
  for(const [x,z] of [[-66,-49],[-66,49],[66,-49],[66,49]]){
   const tower=new THREE.Group();
   const mast=new THREE.Mesh(new THREE.BoxGeometry(.42,34,.42),steel);mast.position.y=17;tower.add(mast);
   for(const dx of [-.72,.72]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,33,.16),brace);leg.position.set(dx,16.5,0);tower.add(leg);}
   const cross=new THREE.Mesh(new THREE.BoxGeometry(3.8,.24,.5),steel);cross.position.y=34;tower.add(cross);
   const panel=new THREE.Mesh(new THREE.BoxGeometry(3.5,2.1,.32),housing);panel.position.set(0,33.1,0);tower.add(panel);
   for(let row=0;row<3;row++)for(let col=0;col<6;col++){
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(.39,.42,.055),led.clone());
    lamp.position.set(-1.35+col*.54,33.72-row*.62,.2);tower.add(lamp);floodlightFixtures.push(lamp);
   }
   tower.position.set(x,0,z);scene.add(tower);
  }
 }
 function setFloodlightFixtureState(mode){
  const on=mode===2?1:mode===1?.22:0;
  for(const lamp of floodlightFixtures){lamp.material.emissiveIntensity=on?2.4*on:0;lamp.material.color.setHex(on?0xfff5dc:0x7d858b);}
 }
 // One transparent, regulation-sized texture carries every field marking.
 // It is independent of the grass material, so pitch presets cannot alter it.
 function addPitchMarkings(){
  const group=new THREE.Group(),width=2048,height=Math.round(width*68/105);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  const X=x=>(x+52.5)/105*width,Y=z=>(34-z)/68*height;
  const lineWidth=width*.11/105;
  ctx.strokeStyle='rgba(250,250,244,.98)';ctx.fillStyle='rgba(250,250,244,.98)';
  ctx.lineWidth=lineWidth;ctx.lineCap='round';ctx.lineJoin='round';
  const line=(x1,z1,x2,z2)=>{
   ctx.beginPath();ctx.moveTo(X(x1),Y(z1));ctx.lineTo(X(x2),Y(z2));ctx.stroke();
  };
  const arc=(cx,cz,r,a0,a1,segments=96)=>{
   while(a1<a0)a1+=Math.PI*2;
   ctx.beginPath();
   for(let i=0;i<=segments;i++){
    const a=a0+(a1-a0)*i/segments,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(i===0)ctx.moveTo(X(x),Y(z));else ctx.lineTo(X(x),Y(z));
   }
   ctx.stroke();
  };
  const spot=(x,z)=>{
   ctx.beginPath();ctx.arc(X(x),Y(z),width*.16/105,0,Math.PI*2);ctx.fill();
  };
  // 105 x 68 m regulation field: outer boundary, halfway line and centre circle.
  line(-52.5,-34,52.5,-34);line(52.5,-34,52.5,34);
  line(52.5,34,-52.5,34);line(-52.5,34,-52.5,-34);
  line(0,-34,0,34);arc(0,0,9.15,0,Math.PI*2,160);spot(0,0);
  for(const sign of[-1,1]){
   const gx=sign*52.5,dir=-sign,penX=gx+dir*11;
   const boxX=gx+dir*16.5,boxZ=20.16;
   line(gx,-boxZ,boxX,-boxZ);line(boxX,-boxZ,boxX,boxZ);line(boxX,boxZ,gx,boxZ);
   const sixX=gx+dir*5.5,sixZ=9.16;
   line(gx,-sixZ,sixX,-sixZ);line(sixX,-sixZ,sixX,sixZ);line(sixX,sixZ,gx,sixZ);
   spot(penX,0);
   const lower=Math.atan2(-7.32,dir*5.5),upper=Math.atan2(7.32,dir*5.5);
   if(sign>0)arc(penX,0,9.15,upper,lower+Math.PI*2,80);
   else arc(penX,0,9.15,lower,upper,80);
  }
  // Four 1 m corner quarter-circles.
  arc(-52.5,-34,1,0,Math.PI/2,20);
  arc(52.5,-34,1,Math.PI/2,Math.PI,20);
  arc(52.5,34,1,Math.PI,Math.PI*1.5,20);
  arc(-52.5,34,1,Math.PI*1.5,Math.PI*2,20);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,side:THREE.DoubleSide});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(105,68),material);
  plane.rotation.x=-Math.PI/2;plane.renderOrder=6;
  group.position.y=pitchSurfaceY+.018;group.add(plane);scene.add(group);
  return group;
 }
 function createPitchGrassTextures(){
  const size=mobile?1536:2048,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const g=canvas.getContext('2d',{alpha:false});
  const fallback=g.createLinearGradient(0,0,size,size);
  fallback.addColorStop(0,'#347b40');fallback.addColorStop(.5,'#2e7139');fallback.addColorStop(1,'#286637');
  g.fillStyle=fallback;g.fillRect(0,0,size,size);
  let seed=110711;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Lightweight fallback only; the normal path uses the CC0 photographic turf map.
  for(let i=0;i<(mobile?9000:18000);i++){
   const x=rnd()*size,y=rnd()*size,len=1+rnd()*2.2;
   g.strokeStyle=rnd()>.5?'rgba(180,220,145,.15)':'rgba(9,42,17,.16)';
   g.lineWidth=.5+rnd()*.6;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5),y-len);g.stroke();
  }
  const albedo=new THREE.CanvasTexture(canvas);albedo.colorSpace=THREE.SRGBColorSpace;
  albedo.wrapS=albedo.wrapT=THREE.RepeatWrapping;albedo.repeat.set(10,7);albedo.generateMipmaps=true;
  albedo.minFilter=THREE.LinearMipmapLinearFilter;albedo.magFilter=THREE.LinearFilter;
  albedo.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const detailCanvas=document.createElement('canvas');detailCanvas.width=detailCanvas.height=512;
  const d=detailCanvas.getContext('2d',{alpha:false});d.fillStyle='#808080';d.fillRect(0,0,512,512);
  for(let i=0;i<9000;i++){
   const x=rnd()*512,y=rnd()*512,len=1+rnd()*3;
   d.strokeStyle=rnd()>.5?'rgba(235,235,235,.24)':'rgba(35,35,35,.24)';
   d.lineWidth=.5+rnd()*.6;d.beginPath();d.moveTo(x,y);d.lineTo(x+(rnd()-.5)*1.4,y-len);d.stroke();
  }
  const detail=new THREE.CanvasTexture(detailCanvas);detail.wrapS=detail.wrapT=THREE.RepeatWrapping;
  detail.repeat.set(16,11);detail.generateMipmaps=true;detail.minFilter=THREE.LinearMipmapLinearFilter;detail.magFilter=THREE.LinearFilter;
  return{albedo,detail,canvas};
 }
 function loadPhotographicPitchGrass(){
  const image=new Image();image.crossOrigin='anonymous';
  image.onload=()=>{
   pitchBaseImage=image;pitchTextureStatus='photographic-cc0';
   activePitchKey='';updatePreviewPitch(pitchSettings.pitch,pitchSettings.mowing);
   console.info('PITCH 11 CC0 sports-turf texture loaded:',image.naturalWidth+'x'+image.naturalHeight);
  };
  image.onerror=()=>{
   pitchTextureStatus='fallback-canvas';
   console.warn('PITCH 11 sports-turf CDN unavailable; using local fallback texture.');
  };
  image.src='https://cdn.meshy.ai/landing-assets/textures/grass/sports-turf/sports-turf-2k.jpg';
 }
 function enhancePitchGrass(stadium){
  stadium.updateMatrixWorld(true);
  const textures=createPitchGrassTextures();pitchTextureCanvas=textures.canvas;pitchTexture=textures.albedo;pitchSettings={pitch:Math.max(0,Math.min(4,window.P11PitchSettings?.pitch??0)),mowing:Math.max(0,Math.min(3,window.P11PitchSettings?.mowing??0))};activePitchKey='';updatePreviewPitch(pitchSettings.pitch,pitchSettings.mowing);loadPhotographicPitchGrass();let changed=0,meshCount=0,surfaceCandidates=0;
  const largest=[],candidateSamples=[];
  const materialInfo=material=>{
   if(!material)return null;
   const color=material.color?{r:+material.color.r.toFixed(3),g:+material.color.g.toFixed(3),b:+material.color.b.toFixed(3)}:null;
   const hsl={h:0,s:0,l:0};if(material.color)material.color.getHSL(hsl);
   const map=material.map;
   return{name:material.name||'',type:material.type||'',color,hsl:{h:+hsl.h.toFixed(3),s:+hsl.s.toFixed(3),l:+hsl.l.toFixed(3)},hasMap:!!map,mapSize:map&&map.image?{width:map.image.width||0,height:map.image.height||0}:null,roughness:material.roughness??null,metalness:material.metalness??null,side:material.side??null,transparent:!!material.transparent,opacity:material.opacity??1,depthWrite:material.depthWrite??null};
  };
  stadium.traverse(o=>{
   if(!o.isMesh)return;
   meshCount++;
   const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3());
   const longSide=Math.max(size.x,size.z),shortSide=Math.min(size.x,size.z);
   const summary={name:o.name||'(unnamed)',type:o.type,dimensions:{x:+size.x.toFixed(3),y:+size.y.toFixed(3),z:+size.z.toFixed(3)},bounds:{minY:+box.min.y.toFixed(3),maxY:+box.max.y.toFixed(3)},visible:o.visible,geometry:o.geometry?.type||'unknown'};
   largest.push({...summary,area:longSide*shortSide});
   largest.sort((a,b)=>b.area-a.area);if(largest.length>8)largest.pop();
   // Only the named, zero-thickness top plane is the playable grass surface.
   // Perimeter boards and the pitch slab must never receive the turf material.
   if(o.name!=='Pitch_2'||longSide<110||longSide>125||shortSide<72||shortSide>82||size.y>.02)return;
   surfaceCandidates++;
   pitchSurfaceY=box.max.y;
   const source=Array.isArray(o.material)?o.material:[o.material];
   const materialSamples=[],replacements=source.map(original=>{
    if(!original){materialSamples.push({material:null,green:false,changed:false});return original;}
    const hsl={h:0,s:0,l:0};if(original.color)original.color.getHSL(hsl);
    const green=hsl.h>=.19&&hsl.h<=.48&&hsl.s>=.18;
    const m=original.clone();
    // Replace the baked pitch texture (which contains the old markings) only
    // on Pitch_2; the independent overlay is drawn above this exact surface.
    m.map=textures.albedo;m.color.set(0xffffff);
    if(!m.bumpMap){m.bumpMap=textures.detail;m.bumpScale=.0012;}
    if(!m.roughnessMap)m.roughnessMap=textures.detail;
    m.roughness=Math.max(.96,m.roughness||0);m.metalness=0;m.needsUpdate=true;
    pitchMaterials.push(m);changed++;
    materialSamples.push({material:materialInfo(original),green,changed:true});
    return m;
   });
   if(candidateSamples.length<8)candidateSamples.push({...summary,materials:materialSamples});
   o.material=Array.isArray(o.material)?replacements:replacements[0];
  });
  pitchDiagnostics={meshCount,surfaceCandidates,grassMaterialsChanged:changed,pitchSurfaceY:+pitchSurfaceY.toFixed(4),texture:{albedoSize:textures.albedo.image?{width:textures.albedo.image.width,height:textures.albedo.image.height}:null,detailSize:textures.detail.image?{width:textures.detail.image.width,height:textures.detail.image.height}:null,anisotropy:textures.albedo.anisotropy,repeat:{x:textures.albedo.repeat.x,y:textures.albedo.repeat.y}},largestMeshes:largest.map(({area,...item})=>item),candidateSamples};
  if(changed)console.info('PITCH 11 realistic turf materials:',changed);
 }

 const loader=new GLTFLoader();
 const stadiumUrl=mobile?'./assets/football-stadium-mobile.glb':'./assets/football-stadium.glb';
 function setStadiumLoadState(state,error=''){
  stadiumLoadState=state;stadiumLoadError=error;boot.state=state;boot.progress=stadiumLoadProgress;boot.error=error;
 }
 function finishStadiumLoad(gltf){
  const stadium=gltf.scene;
  stadium.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;}});
  const bounds=new THREE.Box3().setFromObject(stadium),center=bounds.getCenter(new THREE.Vector3());
  stadium.position.x-=center.x;stadium.position.z-=center.z;stadium.position.y-=bounds.min.y;
  try{enhancePitchGrass(stadium);}catch(e){console.warn('PITCH 11 turf enhancement skipped',e);}
  scene.add(stadium);addFloodlightTowers();pitchMarkingsGroup=addPitchMarkings();pitchDiagnostics.markings={children:pitchMarkingsGroup.children.length,meshes:pitchMarkingsGroup.children.filter(o=>o.isMesh).length,lines:pitchMarkingsGroup.children.filter(o=>o.isLine).length,visible:pitchMarkingsGroup.visible,positionY:pitchMarkingsGroup.position.y,lineY:pitchSurfaceY+.018,lineCount:pitchMarkingsGroup.children.filter(o=>o.isMesh||o.isLine).length,sampleChildren:pitchMarkingsGroup.children.slice(0,6).map(o=>({type:o.type,visible:o.visible,positionY:+o.position.y.toFixed(4),renderOrder:o.renderOrder,material:o.material?{type:o.material.type,depthTest:o.material.depthTest,depthWrite:o.material.depthWrite,transparent:o.material.transparent,opacity:o.material.opacity,side:o.material.side}:null}))};
  previewBall=new THREE.Mesh(new THREE.SphereGeometry(.22,24,16),new THREE.MeshStandardMaterial({color:0xf5f4ec,roughness:.38,metalness:.02}));
  previewBall.position.set(0,.23,0);previewBall.visible=false;scene.add(previewBall);
  try{addCrowd();addSecurity();addStaff();}catch(e){console.warn('PITCH 11 matchday atmosphere partially skipped',e);}
  board(112,0,-36.5,0);board(112,0,36.5,Math.PI);board(72,-DEFAULT_GOAL_LAYOUT.endBoardX,0,Math.PI/2);board(72,DEFAULT_GOAL_LAYOUT.endBoardX,0,-Math.PI/2);
  setGoalDimensions();addFlags();
  const details=new GLTFLoader();
  optionalAssets.dugout='loading';boot.optionalAssets=optionalAssets;
  details.load('./assets/team-dugout.glb',asset=>{
   try{for(const s of[-1,1]){const d=asset.scene.clone(true);d.position.set(s*12.5,.05,36.5);if(s<0)d.rotation.y=Math.PI;scene.add(d);}optionalAssets.dugout='ready';}
   catch(e){optionalAssets.dugout='error';console.warn('PITCH 11 dugout setup failed',e);}
  },undefined,e=>{optionalAssets.dugout='error';console.warn('PITCH 11 dugout asset unavailable',e);});
  optionalAssets.cornerFlag='loading';
  details.load('./assets/corner-flag.glb',asset=>{
   try{for(const x of[-52.5,52.5])for(const z of[-34,34]){const f=asset.scene.clone(true);f.position.set(x,0,z);scene.add(f);}optionalAssets.cornerFlag='ready';}
   catch(e){optionalAssets.cornerFlag='error';console.warn('PITCH 11 corner-flag setup failed',e);}
  },undefined,e=>{optionalAssets.cornerFlag='error';console.warn('PITCH 11 corner-flag asset unavailable',e);});
  ready=true;stadiumLoadProgress=1;setStadiumLoadState('ready');previewFailure='';
  window.dispatchEvent(new CustomEvent('p11stadiumready'));
 }
 function loadStadium(attempt=0){
  stadiumLoadAttempts=attempt+1;stadiumLoadProgress=0;
  setStadiumLoadState(attempt?'retrying':'loading');
  loader.load(stadiumUrl,gltf=>{
   try{finishStadiumLoad(gltf);}
   catch(e){console.error('PITCH 11 stadium setup failed',e);setStadiumLoadState('error',e&&e.message?e.message:String(e));}
  },event=>{
   if(event&&event.lengthComputable&&event.total>0){
    stadiumLoadProgress=Math.max(0,Math.min(1,event.loaded/event.total));boot.progress=stadiumLoadProgress;
   }
  },error=>{
   const message=error&&error.message?error.message:String(error||'Unknown GLB load error');
   if(attempt<2){
    console.warn('PITCH 11 stadium load failed; retrying',attempt+1,error);
    setStadiumLoadState('retrying',message);
    setTimeout(()=>loadStadium(attempt+1),700*(attempt+1));
   }else{
    console.error('PITCH 11 stadium unavailable after retries.',error);
    setStadiumLoadState('error',message);
   }
  });
 }
 loadStadium();
 function setCamera(V,w,h){const ch=V.yw?V.ch:0,sh=V.yw?V.sh:-1,cx=V.yw?V.ex:V.cx,cy=V.yw?V.ey:V.Cy,fy=V.fy,fz=V.fz,hz=V.hz;const pos=new THREE.Vector3((cx-585)*.1,hz*.1,(cy-400)*.1);forward.set(ch*fy,-fz,sh*fy).normalize();up.set(ch*fz,fy,sh*fz).normalize();camera.position.copy(pos);camera.up.copy(up);camera.lookAt(pos.clone().add(forward));const focal=V.K||h*.95;camera.fov=2*Math.atan(h/(2*focal))*180/Math.PI;camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function project(x,y,z){v3.set((x-585)*.1,z*.1,(y-400)*.1).project(camera);const sx=(v3.x*.5+.5)*viewportWidth,sy=(-v3.y*.5+.5)*viewportHeight;v4.set((x+1-585)*.1,z*.1,(y-400)*.1).project(camera);const sx2=(v4.x*.5+.5)*viewportWidth,sy2=(-v4.y*.5+.5)*viewportHeight;return{x:sx,y:sy,s:Math.max(.001,Math.hypot(sx2-sx,sy2-sy))};}
 function render(V,w,h,options={}){applyStadiumTimeOfDay(options.timeOfDay);setCamera(V,w,h);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);updateSecurity(now);updateStaff(now);updateCrowd(now);if(now-lastRender>=(mobile?33:16)){renderer.render(scene,camera);lastRender=now;}}
 function renderTopDown(cx,cy,vw,vh,w,h,options={}){applyStadiumTimeOfDay(options.timeOfDay);const width=Math.max(1,vw*.1),height=Math.max(1,vh*.1),x=(cx-585)*.1,z=(cy-400)*.1;topCamera.left=-width/2;topCamera.right=width/2;topCamera.top=height/2;topCamera.bottom=-height/2;topCamera.position.set(x,220,z);topCamera.up.set(0,0,-1);topCamera.lookAt(x,0,z);topCamera.updateProjectionMatrix();topCamera.updateMatrixWorld(true);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);updateSecurity(now);updateStaff(now);updateCrowd(now);if(now-lastRender>=(mobile?33:16)){renderer.render(scene,topCamera);lastRender=now;}}
 function renderPreview(rect,options={}){
   if(!ready){previewFailure=stadiumLoadState;return false;}
   if(!rect||rect.w<2||rect.h<2){previewFailure='invalid-preview-rect';return false;}
   // The preview rectangle is expressed in the UI canvas' local CSS pixels.
   // Map it through both canvases' real DOM bounds; mobile browser viewport
   // dimensions can differ slightly from the CSS canvas dimensions.
   const uiCanvas=document.getElementById('c');
   const uiRect=uiCanvas&&uiCanvas.getBoundingClientRect();
   if(!uiRect||uiRect.width<2||uiRect.height<2){previewFailure='ui-canvas-unavailable';return false;}
   syncRendererSize();
   const canvasRect=renderer.domElement.getBoundingClientRect();
   if(canvasRect.width<2||canvasRect.height<2){previewFailure='renderer-canvas-unavailable';return false;}
   // Keep Three.js logical viewport dimensions aligned to the actual CSS
   // viewport instead of assuming innerWidth/innerHeight match on mobile.
   let logicalSize=renderer.getSize(new THREE.Vector2());
   if(Math.abs(logicalSize.x-canvasRect.width)>.5||Math.abs(logicalSize.y-canvasRect.height)>.5){
     renderer.setSize(canvasRect.width,canvasRect.height,false);
     logicalSize=renderer.getSize(new THREE.Vector2());
   }
   const pixelRatio=renderer.getPixelRatio();
   const sx=logicalSize.x/canvasRect.width,sy=logicalSize.y/canvasRect.height;
   const rawX=(uiRect.left+rect.x-canvasRect.left)*sx,rawY=(uiRect.top+rect.y-canvasRect.top)*sy;
   const rawW=rect.w*sx,rawH=rect.h*sy;
   // Snap all scissor edges to the shared physical-pixel grid, rounding inward
   // so the UI mask and WebGL viewport cannot shimmer against each other.
   const x=Math.max(0,Math.ceil(rawX*pixelRatio)/pixelRatio),y=Math.max(0,Math.ceil(rawY*pixelRatio)/pixelRatio);
   const right=Math.min(logicalSize.x,Math.floor((rawX+rawW)*pixelRatio)/pixelRatio),bottomEdge=Math.min(logicalSize.y,Math.floor((rawY+rawH)*pixelRatio)/pixelRatio);
   const w=right-x,h=bottomEdge-y;
   if(w<2||h<2){previewFailure='preview-outside-viewport';return false;}
   previewFailure='';
   const now=performance.now(),timeOfDay=Number.isInteger(options.timeOfDay)?Math.max(0,Math.min(2,options.timeOfDay)):0;
   const pitch=Number.isInteger(options.pitch)?options.pitch:0,mowing=Number.isInteger(options.mowing)?options.mowing:0,weather=Number.isInteger(options.weather)?Math.max(0,Math.min(3,options.weather)):0;
   updatePreviewPitch(pitch,mowing);
   const weatherGroup=createPreviewWeather(),rainMesh=weatherGroup.children[0],snowMesh=weatherGroup.children[1];
   rainMesh.visible=weather===1;snowMesh.visible=weather===2;weatherGroup.visible=weather===1||weather===2;
   weatherGroup.rotation.y=now*.000008;
   const oldBg=scene.background&&scene.background.clone?scene.background.clone():scene.background;
   const oldFog=scene.fog&&scene.fog.color?scene.fog.color.clone():null,oldFogNear=scene.fog?scene.fog.near:0,oldFogFar=scene.fog?scene.fog.far:0;
   const oldKey=key.color.clone(),oldFill=fill.color.clone(),oldKeyPower=key.intensity,oldFillPower=fill.intensity,oldHemiSky=hemi.color.clone(),oldHemiGround=hemi.groundColor.clone(),oldHemiPower=hemi.intensity,oldFloodPower=floodlights.map(light=>light.intensity),oldLampState=floodlightFixtures.map(lamp=>({color:lamp.material.color.clone(),emissiveIntensity:lamp.material.emissiveIntensity})),oldExposure=renderer.toneMappingExposure;
   applyStadiumTimeOfDay(timeOfDay);
   if(weather===1){scene.background.set(0x263746);if(scene.fog){scene.fog.color.set(0x71818c);scene.fog.near=125;scene.fog.far=360;}key.intensity*=.78;fill.intensity*=.82;}
   else if(weather===2){scene.background.set(0x667786);if(scene.fog){scene.fog.color.set(0xc4d0d8);scene.fog.near=75;scene.fog.far=240;}key.intensity*=.82;fill.intensity*=.9;}
   else if(weather===3){scene.background.set(0x89949b);if(scene.fog){scene.fog.color.set(0xc1c9ce);scene.fog.near=28;scene.fog.far=145;}key.intensity*=.72;fill.intensity*=.82;}
   // PITCH 11 original corner-flag composition: low sideline perspective,
   // looking diagonally across the pitch rather than copying a broadcast preset.
   // On narrow mobile viewports, widen the vertical FOV to preserve the same
   // horizontal scene coverage inside the smaller preview window. Desktop stays unchanged.
   const previewAspect=w/h,basePreviewFov=49,mobilePreview=matchMedia('(max-width: 800px)').matches;
   const mobileFitFov=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(basePreviewFov/2))*1.5/Math.max(.45,previewAspect))*180/Math.PI;
   previewCamera.aspect=previewAspect;previewCamera.fov=mobilePreview?Math.min(82,Math.max(basePreviewFov,mobileFitFov)):basePreviewFov;
   previewCamera.position.set(-59,4.6,-41);
   previewCamera.lookAt(-13,0,0);
   previewCamera.updateProjectionMatrix();
   if(previewBall){previewBall.rotation.y=now*.00022;previewBall.visible=true;}
   const viewportBottom=logicalSize.y-y-h;
   renderer.setScissorTest(true);renderer.setViewport(x,viewportBottom,w,h);renderer.setScissor(x,viewportBottom,w,h);
   updateSecurity(now);updateStaff(now);updateCrowd(now);
   renderer.render(scene,previewCamera);
   if(previewBall)previewBall.visible=false;
   renderer.setScissorTest(false);renderer.setViewport(0,0,logicalSize.x,logicalSize.y);
   if(oldBg&&scene.background&&scene.background.copy)scene.background.copy(oldBg);
   if(oldFog&&scene.fog){scene.fog.color.copy(oldFog);scene.fog.near=oldFogNear;scene.fog.far=oldFogFar;}weatherGroup.visible=false;rainMesh.visible=false;snowMesh.visible=false;
   key.color.copy(oldKey);fill.color.copy(oldFill);key.intensity=oldKeyPower;fill.intensity=oldFillPower;hemi.color.copy(oldHemiSky);hemi.groundColor.copy(oldHemiGround);hemi.intensity=oldHemiPower;floodlights.forEach((light,i)=>{light.intensity=oldFloodPower[i];});floodlightFixtures.forEach((lamp,i)=>{lamp.material.color.copy(oldLampState[i].color);lamp.material.emissiveIntensity=oldLampState[i].emissiveIntensity;});renderer.toneMappingExposure=oldExposure;
   return true;
  }
  window.P11Stadium={
   get ready(){return ready;},get status(){return stadiumLoadState;},get progress(){return stadiumLoadProgress;},
   get error(){return stadiumLoadError;},get previewFailure(){return previewFailure;},get mobile(){return mobile;},
   get diagnostics(){return{mobile,status:stadiumLoadState,progress:stadiumLoadProgress,error:stadiumLoadError,attempts:stadiumLoadAttempts,crowdCount:crowdFans.length,optionalAssets:{...optionalAssets},pitch:{...pitchDiagnostics,markings:pitchDiagnostics.markings?{...pitchDiagnostics.markings}:null,activeGrassMaterials:pitchMaterials.length,textureSource:pitchTextureStatus,textureResolution:pitchTextureCanvas?pitchTextureCanvas.width:0,pitchSurfaceY:+pitchSurfaceY.toFixed(4),markingsVerticalGap:+(.018-pitchSurfaceY).toFixed(4)},renderInfo:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lines:renderer.info.render.lines,points:renderer.info.render.points,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},renderer:{width:renderer.domElement.width,height:renderer.domElement.height,pixelRatio:renderer.getPixelRatio(),maxTextureSize:renderer.capabilities.maxTextureSize}};},
   setPitchSettings(pitch,mowing){
    pitchSettings={pitch:Math.max(0,Math.min(4,pitch|0)),mowing:Math.max(0,Math.min(3,mowing|0))};
    activePitchKey='';updatePreviewPitch(pitchSettings.pitch,pitchSettings.mowing);
   },
   render,renderTopDown,renderPreview,project,setGoalDimensions
  };
 const resizeStadium=()=>{const rect=syncRendererSize();if(rect){camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}};
 addEventListener('resize',resizeStadium);
 addEventListener('orientationchange',resizeStadium);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',resizeStadium);
 if(typeof ResizeObserver!=='undefined'){const viewportObserver=new ResizeObserver(resizeStadium);viewportObserver.observe(uiCanvas);}
})();
