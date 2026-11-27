import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/three/examples/jsm/libs/meshopt_decoder.module.js';
import { createGoalNetPositions, DEFAULT_GOAL_LAYOUT } from './engine/goal-geometry.mjs';
import { createProductionSecurityPositions } from './engine/stadium-atmosphere.mjs';
import { MatchPlayerRenderer } from './engine/match-player-renderer.mjs';
import { mapLegacyBallState } from './engine/match-ball-state.mjs';
(() => {
 const host=document.getElementById('stadium3d');if(!host)return;
 const boot=window.P11StadiumBoot||(window.P11StadiumBoot={});
 boot.state='initializing-renderer';boot.progress=0;boot.error='';
 const mobile=matchMedia('(max-width: 800px)').matches||(navigator.deviceMemory||4)<=4||(navigator.hardwareConcurrency||4)<=4;
 const uiCanvas=document.getElementById('c');
 let viewportWidth=uiCanvas?.getBoundingClientRect().width||innerWidth;
 let viewportHeight=uiCanvas?.getBoundingClientRect().height||innerHeight;
 // Acquire WebGL2 explicitly so mobile GPU failures can be diagnosed before
 // Three.js initializes the renderer. Mobile starts low-power and antialias-free.
 let renderer=null,gl=null,contextFailure='';
 const contextAttempts=mobile
  ?[{powerPreference:'low-power',antialias:false},{powerPreference:'default',antialias:false}]
  :[{powerPreference:'high-performance',antialias:true},{powerPreference:'default',antialias:false}];
 for(const attempt of contextAttempts){
  const candidate=document.createElement('canvas');
  try{
   const context=candidate.getContext('webgl2',{
    alpha:false,antialias:attempt.antialias,depth:true,stencil:false,
    powerPreference:attempt.powerPreference,failIfMajorPerformanceCaveat:false,
    preserveDrawingBuffer:false
   });
   if(!context){contextFailure='WebGL 2 context unavailable ('+attempt.powerPreference+')';continue;}
   renderer=new THREE.WebGLRenderer({canvas:candidate,context,alpha:false,antialias:attempt.antialias,powerPreference:attempt.powerPreference,stencil:false,depth:true});
   gl=context;
   break;
  }catch(error){
   contextFailure=error&&error.message?error.message:String(error);
   console.warn('PITCH 11 WebGL initialization attempt failed',attempt.powerPreference,error);
  }
 }
 if(!renderer){
  const detail=contextFailure||'WebGL 2 is unavailable in this browser or GPU session.';
  boot.state='error';
  boot.error='Mobile WebGL startup failed: '+detail+' Close other 3D tabs/apps, disable battery-saving graphics restrictions, then retry in Chrome.';
  window.dispatchEvent(new CustomEvent('p11stadiumbooterror',{detail:boot.error}));
  return;
 }
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile ? 0.8 : 1.25));
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
 const scene=new THREE.Scene();
 const environmentMode=true; // Isolated runtime for environment-lab.html only.
 let playerRenderer=null,matchBallMesh=null,matchBallShadow=null;
 if(!environmentMode){
  playerRenderer=new MatchPlayerRenderer(scene,{mobile});
  playerRenderer.load();
  function createMatchBallTexture(){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
   const c=canvas.getContext('2d');c.fillStyle='#f4f2e9';c.fillRect(0,0,512,256);
   const pentagon=(cx,cy,r,rotation=0)=>{c.beginPath();for(let i=0;i<5;i++){const a=rotation-Math.PI/2+i*Math.PI*2/5,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();};
   c.fillStyle='#20242a';[[64,64],[190,52],[320,72],[448,54],[120,184],[256,174],[390,188],[500,166]].forEach(([x,y],i)=>pentagon(x,y,25,i*.13));
   c.strokeStyle='rgba(20,24,28,.22)';c.lineWidth=3;for(let y=0;y<=256;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
  }
  const matchBallTexture=createMatchBallTexture();
  matchBallMesh=new THREE.Mesh(new THREE.SphereGeometry(.11,28,20),new THREE.MeshStandardMaterial({map:matchBallTexture,color:0xffffff,roughness:.48,metalness:0}));
  matchBallMesh.name='PITCH 11 3D match ball';matchBallMesh.visible=false;scene.add(matchBallMesh);
  matchBallShadow=new THREE.Mesh(new THREE.CircleGeometry(.15,24),new THREE.MeshBasicMaterial({color:0x050806,transparent:true,opacity:.24,depthWrite:false}));
  matchBallShadow.name='PITCH 11 match ball ground shadow';matchBallShadow.rotation.x=-Math.PI/2;matchBallShadow.visible=false;matchBallShadow.renderOrder=2;scene.add(matchBallShadow);
 }
 function syncMatchBall(legacyBall,alpha=1){
  if(!matchBallMesh||!matchBallShadow)return;
  const state=mapLegacyBallState(legacyBall,alpha);
  if(!state){matchBallMesh.visible=false;matchBallShadow.visible=false;return;}
  const ground=(playerRenderer?.groundHeight||pitchSurfaceY)-.025;
  matchBallMesh.visible=state.visible;matchBallMesh.position.set(state.x,ground+.11+state.height,state.z);matchBallMesh.rotation.set(state.rotation,0,state.rotation*.18);
  matchBallShadow.visible=state.visible;matchBallShadow.position.set(state.x,ground+.012,state.z);
  const spread=1+Math.min(1.5,state.height*1.8);matchBallShadow.scale.set(spread,spread,1);matchBallShadow.material.opacity=Math.max(.06,.26/(1+state.height*2.4));
 }
 scene.background=new THREE.Color(0x15263a);scene.fog=new THREE.Fog(0x15263a,260,620);
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
   renderer.toneMappingExposure=1.05;
  }else if(mode===1){
   scene.background.set(0x382b3b);if(scene.fog)scene.fog.color.set(0x493746);
   hemi.color.set(0xe0a17d);hemi.groundColor.set(0x30252b);hemi.intensity=1.0;
   key.color.set(0xffad78);key.intensity=1.05;fill.color.set(0x8aa7c7);fill.intensity=.48;
   floodlights.forEach(light=>{light.intensity=110;});setFloodlightFixtureState(1);
   renderer.toneMappingExposure=1.05;
  }else{
   scene.background.set(0x15263a);if(scene.fog)scene.fog.color.set(0x15263a);
   hemi.color.set(0xc8ddff);hemi.groundColor.set(0x1b251d);hemi.intensity=1.5;
   key.color.set(0xffdfb5);key.intensity=1.35;fill.color.set(0x8dbbff);fill.intensity=.65;
   floodlights.forEach(light=>{light.intensity=0;});setFloodlightFixtureState(0);
   renderer.toneMappingExposure=1.05;
  }
 }
 const camera=new THREE.PerspectiveCamera(48,viewportWidth/Math.max(1,viewportHeight),.1,1000);
 const previewCamera=new THREE.PerspectiveCamera(46,1,.1,700);
 let previewBall=null,pitchTextureCanvas=null,pitchTexture=null,pitchMaterials=[],previewWeatherGroup=null,pitchSurfaceY=0,pitchMarkingsGroup=null,pitchBaseImage=null,pitchGrassBaseCanvas=null,pitchNormalTexture=null,pitchRoughnessTexture=null,pitchSettings={pitch:0,mowing:0},pitchTextureStatus='fallback',pitchDiagnostics={meshCount:0,surfaceCandidates:0,grassMaterialsChanged:0,largestMeshes:[],candidateSamples:[],markings:null};
 let pitchGrassPbrDiagnostics={status:'not-started',quality:null,files:{},materialCount:0,normalBindings:0,roughnessBindings:0};
 let activePitchKey='';
 function drawProceduralGrass(g,width,height){
  // One continuous, deterministic turf image. Blade marks are baked into a
  // single texture; no grass meshes, particle systems, or repeated tiles.
  let seed=110711;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const base=g.createLinearGradient(0,0,width,height);
  base.addColorStop(0,'#397d43');base.addColorStop(.48,'#34763d');base.addColorStop(1,'#2d6d37');
  g.fillStyle=base;g.fillRect(0,0,width,height);
  // Broad, very low-contrast natural variation prevents a flat carpet look.
  for(let i=0;i<420;i++){
   const x=rnd()*width,y=rnd()*height,r=18+rnd()*95;
   const shade=rnd()>.52?'rgba(135,174,91,.055)':'rgba(10,43,19,.06)';
   const grad=g.createRadialGradient(x,y,1,x,y,r);
   grad.addColorStop(0,shade);grad.addColorStop(1,'rgba(0,0,0,0)');
   g.fillStyle=grad;g.fillRect(x-r,y-r,r*2,r*2);
  }
  const tones=[
   'rgba(104,157,75,.55)','rgba(145,184,102,.46)','rgba(72,132,62,.62)',
   'rgba(42,105,48,.62)','rgba(177,190,112,.25)','rgba(24,82,39,.42)',
   'rgba(119,164,83,.38)','rgba(57,119,55,.5)'
  ];
  const paths=tones.map(()=>new Path2D());
  const blades=mobile?52000:92000;
  for(let i=0;i<blades;i++){
   const x=rnd()*width,y=rnd()*height;
   const len=(mobile?2.2:2.8)+rnd()*(mobile?5.2:7.2);
   const angle=(rnd()-.5)*1.35;
   const dx=Math.sin(angle)*len,dy=-Math.cos(angle)*len;
   const bend=(rnd()-.5)*len*.42;
   const path=paths[Math.floor(rnd()*paths.length)];
   path.moveTo(x,y);path.quadraticCurveTo(x+bend,y-len*.55,x+dx,y+dy);
  }
  g.lineCap='round';
  paths.forEach((path,i)=>{g.beginPath();g.strokeStyle=tones[i];g.lineWidth=.55+(i%3)*.28;g.stroke(path);});
  // Tiny highlights and dark organic flecks add close-up texture without geometry.
  for(let i=0;i<(mobile?16000:26000);i++){
   const x=rnd()*width,y=rnd()*height;
   g.fillStyle=rnd()>.5?'rgba(190,207,133,.23)':'rgba(13,54,25,.24)';
   g.fillRect(x,y,.55+rnd()*1.05,.55+rnd()*1.35);
  }
 }
 function updatePreviewPitch(pitch,mowing){
  const p=Math.max(0,Math.min(4,pitch|0)),m=Math.max(0,Math.min(3,mowing|0)),key=p+':'+m;
  if(key===activePitchKey||!pitchTextureCanvas||!pitchTexture)return;
  activePitchKey=key;pitchSettings={pitch:p,mowing:m};
  const c=pitchTextureCanvas,g=c.getContext('2d',{alpha:false}),width=c.width,height=c.height;
  if(pitchGrassBaseCanvas)g.drawImage(pitchGrassBaseCanvas,0,0,width,height);
  else drawProceduralGrass(g,width,height);
  const tints=['#f0f5e9','#a8b8a5','#bca77b','#e4e9e8','#91b6c5'];
  const tintStrength=[.035,.22,.19,.14,.17][p];
  if(tintStrength>0){
   g.save();g.globalCompositeOperation='soft-light';g.globalAlpha=tintStrength;
   g.fillStyle=tints[p];g.fillRect(0,0,width,height);g.restore();
  }
  const addBands=(vertical,count,dark,light,opacity=1)=>{
   for(let n=0;n<count;n++){
    const start=n/count,end=(n+1)/count,grad=vertical
     ?g.createLinearGradient(start*width,0,end*width,0)
     :g.createLinearGradient(0,start*height,0,end*height);
    const shade=n%2?dark:light;
    grad.addColorStop(0,'rgba(255,255,255,0)');
    grad.addColorStop(.12,shade);grad.addColorStop(.88,shade);
    grad.addColorStop(1,'rgba(255,255,255,0)');
    g.save();g.globalAlpha=opacity;g.fillStyle=grad;
    if(vertical)g.fillRect(start*width,0,width/count,height);
    else g.fillRect(0,start*height,width,height/count);
    g.restore();
   }
  };
  // The pitch canvas follows the field axes: horizontal canvas bands run
  // lengthwise along the pitch. Keep mowing contrast subtle so PBR blade detail
  // remains visible instead of looking like painted green panels.
  if(m===0)addBands(true,6,'rgba(0,0,0,.075)','rgba(255,255,255,.052)');
  else if(m===1){
   // A real checkerboard: alternate individual mowing rectangles, not
   // overlapping lengthwise and crosswise bands.
   const columns=10,rows=6;
   for(let row=0;row<rows;row++){
    for(let column=0;column<columns;column++){
     const dark=(row+column)%2===0;
     g.fillStyle=dark?'rgba(0,0,0,.065)':'rgba(255,255,255,.045)';
     const x=column*width/columns,y=row*height/rows;
     g.fillRect(x,y,Math.ceil(width/columns)+1,Math.ceil(height/rows)+1);
    }
   }
  }
  else if(m===2)addBands(false,10,'rgba(0,0,0,.068)','rgba(255,255,255,.046)');
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
 const optionalAssets={dugout:'pending',cornerFlag:'pending',playerEntrance:'pending',testGoal:'pending'};
 let playerEntranceTunnel=null,walkColliderMeshes=[],walkSurfaceMeshes=[],walkNavigationStadiumRoot=null,walkNavigationExtraRoots=[];
 const walkRaycaster=new THREE.Raycaster();
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
    const fanX=a[0]+(b[0]-a[0])*t,fanZ=a[1]+(b[1]-a[1])*t;
    if(fanZ>40&&fanZ<90&&Math.abs(fanX)<20)continue; // Reserve the central main-stand access block.
    all.push({x:fanX,z:fanZ,y:row.y,row:ri,section:Math.floor(d/27)});
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
  const torso=new THREE.InstancedMesh(bodyGeo,bodyMat,all.length);torso.name='Crowd · Torso Instances';
  const head=new THREE.InstancedMesh(headGeo,skinMat,all.length);head.name='Crowd · Head Instances';
  const hair=new THREE.InstancedMesh(hairGeo,hairMat,all.length);hair.name='Crowd · Hair Instances';
  const arms=new THREE.InstancedMesh(armGeo,skinMat,all.length*2);arms.name='Crowd · Arm Instances';
  const legs=new THREE.InstancedMesh(legGeo,trouserMat,all.length*2);legs.name='Crowd · Leg Instances';
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
   const guard=new THREE.Group();guard.name='Stadium Security Guard '+(i+1);
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
   // Keep the single north-side access-ramp staff member out of the walking lane.
   if(side>0&&i===2)continue;
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
   actor.name='Touchline Staff '+(side>0?'North ':'South ')+(i+1);
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
 function board(len,x,z,rot){const g=new THREE.Group();g.name='LED Advertising Board';const housing=new THREE.Mesh(new THREE.BoxGeometry(len,.95,.3),new THREE.MeshStandardMaterial({color:0x071018,metalness:.55,roughness:.45}));housing.name='LED Board Housing';g.add(housing);const c=document.createElement('canvas');c.width=1024;c.height=128;const x2=c.getContext('2d'),labels=['PITCH 11 · MATCHDAY','MATCHDAY LIVE','PLAY BEAUTIFUL','ULTIMATE FOOTBALL'],cols=['#b5e65b','#f2c66d','#79d7cf','#f0f2e8'];for(let i=0;i<4;i++){const x0=i*256;x2.fillStyle='#101d25';x2.fillRect(x0,0,256,128);x2.fillStyle=cols[i];x2.fillRect(x0+10,18,3,92);x2.font='900 25px Arial';x2.textAlign='center';x2.fillText(labels[i],x0+132,73);}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;ledTextures.push(tex);const screen=new THREE.Mesh(new THREE.PlaneGeometry(len-.15,.72),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));screen.name='LED Advertising Screen';screen.position.z=.16;g.add(screen);g.position.set(x,.78,z);g.rotation.y=rot;scene.add(g);}
  function sidelineBoardWithOpenings(z,openings){
   const min=-56,max=56,sorted=openings.map(g=>[Math.max(min,g[0]),Math.min(max,g[1])]).sort((a,b)=>a[0]-b[0]),merged=[];
   for(const gap of sorted){const last=merged[merged.length-1];if(last&&gap[0]<=last[1])last[1]=Math.max(last[1],gap[1]);else merged.push(gap);}
   let cursor=min;
   for(const gap of merged){if(gap[0]-cursor>.8)board(gap[0]-cursor,(cursor+gap[0])/2,z,Math.PI);cursor=Math.max(cursor,gap[1]);}
   if(max-cursor>.8)board(max-cursor,(cursor+max)/2,z,Math.PI);
  }
 function setGoalDimensions({halfWidth=DEFAULT_GOAL_LAYOUT.halfWidth,height=DEFAULT_GOAL_LAYOUT.height,depth=DEFAULT_GOAL_LAYOUT.depth}={}) {
  if(goalNetMesh){scene.remove(goalNetMesh);goalNetMesh.geometry.dispose();goalNetMesh.material.dispose();}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(createGoalNetPositions({pitchHalfLength:DEFAULT_GOAL_LAYOUT.pitchHalfLength,halfWidth,height,depth}),3));
  const material=new THREE.LineBasicMaterial({color:0xf2f6f8,transparent:true,opacity:.78,depthWrite:false});
  goalNetMesh=new THREE.LineSegments(geometry,material);goalNetMesh.name='Goal Net Structure';
  goalNetMesh.frustumCulled=false;
  goalNetMesh.renderOrder=2;
  scene.add(goalNetMesh);
 }
 function addFlags(){const mat=new THREE.MeshStandardMaterial({color:0xa3e635,side:THREE.DoubleSide,roughness:.8});for(const [x,z] of [[-52.5,-34],[-52.5,34],[52.5,-34],[52.5,34]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,1.55,6),new THREE.MeshStandardMaterial({color:0xb8c2c4,metalness:.5}));pole.name='Corner Flag Pole';pole.position.set(x,.78,z);scene.add(pole);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.48,.3,3,2),mat.clone());flag.name='Corner Flag Cloth';flag.position.set(x+.24,1.38,z);flag.userData.phase=flagMeshes.length*.8;flagMeshes.push(flag);scene.add(flag);}}

 // Visible PITCH 11 floodlight towers: the light sources have physical fixtures,
 // steel masts and LED panels so NIGHT reads as a properly lit football ground.
 const floodlightFixtures=[];
 function addFloodlightTowers(){
  const steel=new THREE.MeshStandardMaterial({color:0x303b43,metalness:.72,roughness:.42});
  const brace=new THREE.MeshStandardMaterial({color:0x59636a,metalness:.68,roughness:.48});
  const housing=new THREE.MeshStandardMaterial({color:0x202a33,metalness:.55,roughness:.36});
  const led=new THREE.MeshStandardMaterial({color:0xfff5d8,emissive:0xffe9b5,emissiveIntensity:0,roughness:.24});
  for(const [x,z] of [[-66,-49],[-66,49],[66,-49],[66,49]]){
   const tower=new THREE.Group();tower.name='Floodlight Tower';
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
 function loadMeshyPitchGrass(){
  // Load the repository's local Sports Turf PBR pack. Mobile uses 1K;
  // desktop uses 2K. This avoids CDN dependencies and preserves offline caching.
  const quality=mobile?'1k':'2k';
  const prefix='./assets/textures/grass/'+quality+'/sports-turf_'+quality+'_';
  const canvas=pitchGrassBaseCanvas;if(!canvas){pitchGrassPbrDiagnostics={status:'no-base-canvas',quality,files:{}};return;}
  pitchGrassPbrDiagnostics={status:'loading',quality,files:{color:{url:prefix+'color.jpg',status:'loading'},normalgl:{url:prefix+'normalgl.jpg',status:'loading'},roughness:{url:prefix+'roughness.jpg',status:'loading'}},materialCount:pitchMaterials.length,normalBindings:0,roughnessBindings:0};
  // Build one continuous, high-detail turf surface from the seamless source map.
  // Three offset spatial scales break up obvious repetition without field-sized
  // image blocks. Identical transforms are used for albedo, normal and roughness.
  const composeMap=(image,target)=>{
   const g=target.getContext('2d',{alpha:false}),iw=image.naturalWidth,ih=image.naturalHeight;
   const side=Math.min(iw,ih),sx=(iw-side)/2,sy=(ih-side)/2,unit=Math.min(target.width,target.height);
   // Smaller seamless tiles restore a believable blade scale across the full pitch.
   // The same spatial transforms are applied to albedo, normal and roughness maps.
   // Keep the canvas resolution unchanged: this adds no geometry or draw calls.
   const layers=[
    {scale:.28,alpha:1,ox:0,oy:0},
    {scale:.19,alpha:.28,ox:.23,oy:.37},
    {scale:.13,alpha:.14,ox:.61,oy:.19},
    {scale:.085,alpha:.07,ox:.41,oy:.73}
   ];
   g.clearRect(0,0,target.width,target.height);
   for(const layer of layers){
    const tile=Math.max(96,Math.round(unit*layer.scale)),ox=Math.round(unit*layer.ox),oy=Math.round(unit*layer.oy);
    g.globalAlpha=layer.alpha;
    for(let y=-tile+oy;y<target.height+tile;y+=tile)
     for(let x=-tile+ox;x<target.width+tile;x+=tile)
      g.drawImage(image,sx,sy,side,side,x,y,tile,tile);
   }
   g.globalAlpha=1;
  };
  const load=(file,key,target,done)=>{
   const image=new Image();
   image.onload=()=>{composeMap(image,target);pitchGrassPbrDiagnostics.files[key]={url:prefix+file,status:'loaded',width:image.naturalWidth,height:image.naturalHeight};done(true);};
   image.onerror=()=>{pitchGrassPbrDiagnostics.files[key]={url:prefix+file,status:'error'};done(false);console.warn('PITCH 11 local grass map unavailable:',prefix+file);};
   image.src=prefix+file;
  };
  const normalCanvas=document.createElement('canvas');normalCanvas.width=canvas.width;normalCanvas.height=canvas.height;
  const roughCanvas=document.createElement('canvas');roughCanvas.width=canvas.width;roughCanvas.height=canvas.height;
  let complete=0,baseOK=false,normalOK=false,roughOK=false;
  const finish=()=>{
   if(++complete!==3)return;
   if(baseOK){pitchTexture.needsUpdate=true;pitchTextureStatus='local-meshy-'+quality+'-pbr';}
   if(normalOK){
    pitchNormalTexture=new THREE.CanvasTexture(normalCanvas);pitchNormalTexture.colorSpace=THREE.NoColorSpace;
    pitchNormalTexture.wrapS=pitchNormalTexture.wrapT=THREE.ClampToEdgeWrapping;
    pitchNormalTexture.generateMipmaps=true;pitchNormalTexture.minFilter=THREE.LinearMipmapLinearFilter;
    pitchNormalTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   }
   if(roughOK){
    pitchRoughnessTexture=new THREE.CanvasTexture(roughCanvas);pitchRoughnessTexture.colorSpace=THREE.NoColorSpace;
    pitchRoughnessTexture.wrapS=pitchRoughnessTexture.wrapT=THREE.ClampToEdgeWrapping;
    pitchRoughnessTexture.generateMipmaps=true;pitchRoughnessTexture.minFilter=THREE.LinearMipmapLinearFilter;
    pitchRoughnessTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   }
   pitchGrassPbrDiagnostics.status=baseOK?'complete':'base-color-failed';
   pitchGrassPbrDiagnostics.baseColorApplied=baseOK;
   pitchGrassPbrDiagnostics.materialCount=pitchMaterials.length;
   pitchMaterials.forEach(material=>{
    if(normalOK){material.normalMap=pitchNormalTexture;material.normalScale.set(.38,.38);if(material.normalMap===pitchNormalTexture)pitchGrassPbrDiagnostics.normalBindings++;}
    if(roughOK){material.roughnessMap=pitchRoughnessTexture;if(material.roughnessMap===pitchRoughnessTexture)pitchGrassPbrDiagnostics.roughnessBindings++;}
    material.roughness=1;material.metalness=0;material.needsUpdate=true;
   });
   pitchGrassPbrDiagnostics.completedAt=new Date().toISOString();
   activePitchKey='';updatePreviewPitch(pitchSettings.pitch,pitchSettings.mowing);
   console.info('PITCH 11 local Sports Turf PBR maps:',{quality,baseColor:baseOK,normalOpenGL:normalOK,roughness:roughOK,metalness:0,materials:pitchMaterials.length});
  };
  load('color.jpg','color',canvas,ok=>{baseOK=ok;finish();});
  load('normalgl.jpg','normalgl',normalCanvas,ok=>{normalOK=ok;finish();});
  load('roughness.jpg','roughness',roughCanvas,ok=>{roughOK=ok;finish();});
 }
 function createPitchGrassTextures(){
  // Mobile texture stays at 1536 x 1024 (~6 MB RGBA before mipmaps);
  // desktop uses 2048 x 1365. The grass is texture-only, never 3D blades.
  const width=mobile?1536:2048,height=Math.round(width*2/3);
  const baseCanvas=document.createElement('canvas');baseCanvas.width=width;baseCanvas.height=height;
  const bg=baseCanvas.getContext('2d',{alpha:false});drawProceduralGrass(bg,width,height);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const g=canvas.getContext('2d',{alpha:false});g.drawImage(baseCanvas,0,0);
  const albedo=new THREE.CanvasTexture(canvas);albedo.colorSpace=THREE.SRGBColorSpace;
  albedo.wrapS=albedo.wrapT=THREE.ClampToEdgeWrapping;albedo.repeat.set(1,1);
  albedo.generateMipmaps=true;albedo.minFilter=THREE.LinearMipmapLinearFilter;albedo.magFilter=THREE.LinearFilter;
  albedo.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return{albedo,canvas,baseCanvas};
 }
 function enhancePitchGrass(stadium){
  stadium.updateMatrixWorld(true);
  const textures=createPitchGrassTextures();pitchTextureCanvas=textures.canvas;pitchGrassBaseCanvas=textures.baseCanvas;pitchTexture=textures.albedo;pitchSettings={pitch:Math.max(0,Math.min(4,window.P11PitchSettings?.pitch??0)),mowing:Math.max(0,Math.min(3,window.P11PitchSettings?.mowing??0))};activePitchKey='';updatePreviewPitch(pitchSettings.pitch,pitchSettings.mowing);pitchTextureStatus='procedural-hd-local';loadMeshyPitchGrass();let changed=0,meshCount=0,surfaceCandidates=0;
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
   // The source stadium mesh uses fragmented/atlas UV islands on its pitch
   // surface. Rebuild UVs from world-space X/Z so the grass image spans the
   // complete playing field continuously, independent of the model's atlas.
   const position=o.geometry?.getAttribute('position');
   let uvMapping={mode:'unchanged',vertices:0};
   if(position&&size.x>1&&size.z>1){
    const geometry=o.geometry.clone(),uv=new Float32Array(position.count*2),point=new THREE.Vector3();
    for(let i=0;i<position.count;i++){
     point.fromBufferAttribute(position,i).applyMatrix4(o.matrixWorld);
     uv[i*2]=THREE.MathUtils.clamp((point.x-box.min.x)/size.x,0,1);
     uv[i*2+1]=THREE.MathUtils.clamp((point.z-box.min.z)/size.z,0,1);
    }
    geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    geometry.attributes.uv.needsUpdate=true;
    o.geometry=geometry;
    uvMapping={mode:'continuous-world-space-xz',vertices:position.count,u:[0,1],v:[0,1]};
   }
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
  pitchDiagnostics={meshCount,surfaceCandidates,grassMaterialsChanged:changed,pitchSurfaceY:+pitchSurfaceY.toFixed(4),uvMapping,texture:{albedoSize:textures.albedo.image?{width:textures.albedo.image.width,height:textures.albedo.image.height}:null,detailSize:textures.detail.image?{width:textures.detail.image.width,height:textures.detail.image.height}:null,anisotropy:textures.albedo.anisotropy,repeat:{x:textures.albedo.repeat.x,y:textures.albedo.repeat.y}},largestMeshes:largest.map(({area,...item})=>item),candidateSamples};
  if(changed)console.info('PITCH 11 realistic turf materials:',changed);
 }

 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const stadiumUrl=mobile?'./assets/football-stadium-mobile.glb':'./assets/football-stadium.glb';
 function setStadiumLoadState(state,error=''){
  stadiumLoadState=state;stadiumLoadError=error;boot.state=state;boot.progress=stadiumLoadProgress;boot.error=error;
 }

 function createPlayerEntranceTunnel(){
   // A practical, full-scale players' route: pitch portal -> enclosed approach
   // -> T-junction -> home / officials / away changing rooms.
   const root=new THREE.Group();root.name='P11_PlayerEntranceTunnel';root.position.set(0,pitchSurfaceY,0);
   const material=(color,roughness=.82,metalness=.04)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
   const concrete=material(0x777b78,.94,.02),paint=material(0xb9b9ad,.88,.02),floor=material(0x343b3d,.96,.01);
   const rubber=material(0x202629,.98,0),steel=material(0x596168,.48,.55),darkSteel=material(0x252d33,.62,.42);
   const ceiling=material(0x92958e,.92,.01),homeMat=material(0x526c82,.8,.06),awayMat=material(0x80605b,.8,.06),officialMat=material(0x77715e,.82,.04);
   const white=material(0xe1e1d7,.86,.02),black=material(0x151a1d,.82,.08);
   const led=new THREE.MeshStandardMaterial({color:0xf1e6c8,emissive:0xffdca0,emissiveIntensity:.72,roughness:.5});
    // Low-level self-illumination keeps enclosed surfaces readable independently
    // of the outdoor day/sunset/night lighting preset.
    for(const mat of [concrete,paint,floor,rubber,steel,darkSteel,ceiling,homeMat,awayMat,officialMat,white,black]){
     mat.emissive.setHex(mat===floor||mat===rubber||mat===black?0x343b3d:0x4b4b43);
     mat.emissiveIntensity=mat===floor||mat===rubber||mat===black?.42:.34;
    }
    const tunnelPointLights=[];
   // One shared micro-grain pair serves every tunnel material. Material colors
   // keep concrete, paint, rubber and flooring distinct without duplicating
   // canvas textures or bump maps on mobile GPUs.
   const grainCanvas=document.createElement('canvas');grainCanvas.width=256;grainCanvas.height=256;
   const grainContext=grainCanvas.getContext('2d');grainContext.fillStyle='#eeeeea';grainContext.fillRect(0,0,256,256);
   let grainSeed=1901;const grainRandom=()=>{grainSeed=(grainSeed*1664525+1013904223)>>>0;return grainSeed/4294967296;};
   for(let i=0;i<7200;i++){
    const x=grainRandom()*256,y=grainRandom()*256,size=.25+grainRandom()*1.25;
    grainContext.fillStyle=grainRandom()>.48?'rgba(0,0,0,.075)':'rgba(255,255,255,.11)';
    grainContext.fillRect(x,y,size,size);
   }
   const grainMap=new THREE.CanvasTexture(grainCanvas);grainMap.colorSpace=THREE.SRGBColorSpace;
   grainMap.wrapS=grainMap.wrapT=THREE.RepeatWrapping;grainMap.repeat.set(3,3);
   grainMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   const grainBump=grainMap.clone();grainBump.colorSpace=THREE.NoColorSpace;grainBump.needsUpdate=true;
   for(const [mat,bumpScale] of [[concrete,.018],[paint,.009],[floor,.024],[rubber,.012],[ceiling,.008]]){
    mat.map=grainMap;mat.bumpMap=grainBump;mat.bumpScale=bumpScale;mat.needsUpdate=true;
   }
   const boxGeometryCache=new Map();
   const boxGeometry=(w,h,d)=>{
    const key=[w,h,d].map(value=>Number(value).toFixed(4)).join(':');
    let geometry=boxGeometryCache.get(key);
    if(!geometry){geometry=new THREE.BoxGeometry(w,h,d);boxGeometryCache.set(key,geometry);}
    return geometry;
   };
   const add=(name,w,h,d,x,y,z,mat,parent=root,walkableSurface=false)=>{
    const mesh=new THREE.Mesh(boxGeometry(w,h,d),mat);mesh.name=name;mesh.position.set(x,y,z);
    mesh.castShadow=false;mesh.receiveShadow=false;
    if(walkableSurface){mesh.userData.p11WalkableSurface=true;mesh.userData.p11WalkBlocker=false;}
    parent.add(mesh);return mesh;
   };
   const addInstances=(name,w,h,d,mat,placements)=>{
    if(!placements.length)return null;
    const mesh=new THREE.InstancedMesh(boxGeometry(w,h,d),mat,placements.length);
    mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;
    const transform=new THREE.Object3D();
    placements.forEach((item,index)=>{
     transform.position.set(item.x,item.y,item.z);
     transform.rotation.set(0,item.rotation||0,0);
     transform.updateMatrix();mesh.setMatrixAt(index,transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;root.add(mesh);return mesh;
   };
   const sign=(name,title,subtitle,x,y,z,accent=0xc9b77a,rotation=0,width=4.4)=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=320;const g=canvas.getContext('2d');
    g.fillStyle='#252c30';g.fillRect(0,0,1024,320);g.fillStyle='#b7b8ae';g.fillRect(0,0,1024,10);
    g.fillStyle='#'+accent.toString(16).padStart(6,'0');g.fillRect(54,244,916,5);
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f2f1e9';g.font='700 66px Arial';g.fillText(title,512,112);
    g.fillStyle='#c1c5c2';g.font='500 30px Arial';g.fillText(subtitle,512,190);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,1.38),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
    m.name=name;m.position.set(x,y,z);m.rotation.y=rotation;root.add(m);return m;
   };
   let tunnelLightIndex=0;
   const light=(x,y,z,rotation=0)=>{
    add('Recessed tunnel light housing',.72,.12,.42,x,y,z,darkSteel);
    const lens=add('Warm white tunnel light lens',.56,.035,.29,x,y-.075,z,led);
    lens.rotation.y=rotation;
    // Emissive lenses provide continuous visual lighting; only selected
    // fixtures add real point lights to keep the mobile fragment workload low.
    if(tunnelLightIndex++%(mobile?3:2)===0){
     const point=new THREE.PointLight(0xffe8c2,4.8,11.5,1.35);
     point.position.set(x,y-.18,z);root.add(point);tunnelPointLights.push(point);
    }
   };
   const front=45.5,junction=65.5,roomDoorZ=79.5,roomBack=91.5;
   const mainW=5.8,height=3.65,wall=.24,mainMid=(front+junction)/2,mainDepth=junction-front;
   // Pitch-side apron starts exactly flush with the playing surface and rises
   // gently toward the tunnel threshold (17 cm over 11.6 m).
   const apronGeometry=new THREE.BufferGeometry();
   const apronHalfDepth=5.8,apronHalfWidth=3.8,apronRise=.17;
   apronGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    -apronHalfWidth,0,-apronHalfDepth, apronHalfWidth,0,-apronHalfDepth,
    -apronHalfWidth,apronRise,apronHalfDepth, apronHalfWidth,apronRise,apronHalfDepth
   ],3));
   apronGeometry.setIndex([0,2,1,1,2,3]);apronGeometry.computeVertexNormals();
   const apron=new THREE.Mesh(apronGeometry,concrete);apron.name='Concrete pitch-side apron';
   // Extend the ramp back to the pitch edge and overlap the corridor landing.
   apron.position.set(0,0,39.8);apron.castShadow=false;apron.receiveShadow=false;
   apron.userData.p11WalkableSurface=true;apron.userData.p11WalkBlocker=false;root.add(apron);
   add('Rubber threshold strip',5.65,.025,.42,0,.145,45.38,rubber);
   for(let i=0;i<8;i++){
    const z=34.5+i*1.42,surfaceY=((z-34.0)/11.6)*apronRise;
    add('Apron expansion joint '+i,7.3,.012,.025,0,surfaceY+.006,z,darkSteel);
   }
   // Entrance portal: robust concrete piers, metal lintel, drainage and kick plates.
   add('Portal left concrete pier',.42,height,.5,-3.02,height/2+.16,front,concrete);
   add('Portal right concrete pier',.42,height,.5,3.02,height/2+.16,front,concrete);
   add('Portal reinforced lintel',6.45,.42,.58,0,height-.08,front,concrete);
   add('Portal left steel reveal',.075,3.15,.64,-2.77,1.72,front-.035,steel);
   add('Portal right steel reveal',.075,3.15,.64,2.77,1.72,front-.035,steel);
   sign('Players entrance wayfinding','PLAYERS','ACCESS TO THE FIELD',0,3.08,front-.34,0xc9b77a);
   add('Main corridor floor slab',mainW,.18,mainDepth,0,.08,mainMid,floor,root,true);
   add('Main corridor anti-slip runner',4.7,.025,mainDepth-.35,0,.185,mainMid,rubber);
   add('Main corridor left wall',wall,height,mainDepth,-mainW/2+wall/2,height/2+.18,mainMid,paint);
   add('Main corridor right wall',wall,height,mainDepth,mainW/2-wall/2,height/2+.18,mainMid,paint);
   add('Main corridor ceiling',mainW,.24,mainDepth,0,height+.12,mainMid,ceiling);
   // Low stainless kick plates and painted wall protection prevent the empty-box look.
   add('Left stainless wall kick plate',.035,.42,mainDepth-.25,-mainW/2+wall+.025,.42,mainMid,steel);
   add('Right stainless wall kick plate',.035,.42,mainDepth-.25,mainW/2-wall-.025,.42,mainMid,steel);
   add('Left wall protection rail',.09,.12,mainDepth-1,-mainW/2+wall+.06,1.02,mainMid,steel);
   add('Right wall protection rail',.09,.12,mainDepth-1,mainW/2-wall-.06,1.02,mainMid,steel);
   for(let z=front+1.4;z<junction-1;z+=3.1){
    light(0,height-.02,z);
    add('Left service access panel',.045,.72,.58,-mainW/2+wall+.035,2.35,z,concrete);
    add('Right service access panel',.045,.72,.58,mainW/2-wall-.035,2.35,z,concrete);
   }
   // Realistic exposed services: cable tray, sprinkler main and ventilation grilles.
   add('Main cable tray',.24,.16,mainDepth-1,-1.9,height-.22,mainMid,steel);
   add('Sprinkler pipe',.075,.075,mainDepth-1,1.82,height-.2,mainMid,steel);
   for(let z=front+2;z<junction-1;z+=5.5){
    add('Ventilation grille',1.05,.045,.42,0,height-.16,z,darkSteel);
    for(let k=0;k<5;k++)add('Vent grille slot '+k,.035,.012,.3,-.38+k*.19,height-.125,z,steel);
   }
   // T-junction: three genuinely separate routes rather than three doors in one hall.
   const branchZ=66.1,branchW=4.8,branchHeight=3.55,branchLength=35,junctionOpening=6.2;
   add('T-junction floor',branchLength,.18,branchW,0,.08,branchZ,floor,root,true);
   add('T-junction anti-slip surface',branchLength-.25,.025,branchW-.35,0,.185,branchZ,rubber);
   add('T-junction ceiling',branchLength,.24,branchW,0,branchHeight+.12,branchZ,ceiling);
   // Split both transverse walls around a full-width opening. The old
   // continuous walls sealed the main approach and the officials corridor.
   const wallWing=(branchLength-junctionOpening)/2,wallWingX=junctionOpening/2+wallWing/2;
   for(const side of[-1,1]){
    const wallX=side*wallWingX;
    add('T-junction front wall '+(side<0?'left':'right'),wallWing,branchHeight,.24,wallX,branchHeight/2+.18,branchZ-branchW/2,paint);
    add('T-junction rear wall '+(side<0?'left':'right'),wallWing,branchHeight,.24,wallX,branchHeight/2+.18,branchZ+branchW/2,paint);
   }
   // Flush luminaires only; no columns or posts may obstruct the walkable route.
   for(let x=-12;x<=12;x+=6)light(x,branchHeight-.02,branchZ);
   // Three branch corridors lead to their own doors; all room geometry remains separated.
   const branch=(id,x1,x2,z,accentMat,accent)=>{
    // The left/right routes are the wings of the T-junction itself. Do not
    // duplicate floors, walls or ceilings over the shared junction geometry.
    const len=Math.abs(x2-x1),cx=(x1+x2)/2;
    add(id+' route stripe',len-.5,.018,.11,cx,.195,z,accentMat);
    sign(id+' direction sign',id.toUpperCase(),'CHANGING ROOM',cx,3.0,z-2.28,accent);
   };
   branch('Home team branch',-17,-3.0,branchZ,homeMat,0x8ab7d2);
   branch('Away team branch',3.0,17,branchZ,awayMat,0xc99b8f);
   // The officials' forward corridor begins beyond the T-junction, avoiding
   // coplanar floor and ceiling overlaps at the three-way intersection.
   const officialsStart=branchZ+branchW/2,officialsEnd=roomDoorZ+.5,officialsLength=officialsEnd-officialsStart,officialsMid=(officialsStart+officialsEnd)/2;
   add('Officials corridor floor',5.8,.16,officialsLength,0,.08,officialsMid,floor,root,true);
   add('Officials corridor runner',4.5,.025,officialsLength-.25,0,.17,officialsMid,rubber);
   add('Officials corridor left wall',.22,3.55,officialsLength,-2.9,1.94,officialsMid,paint);
   add('Officials corridor right wall',.22,3.55,officialsLength,2.9,1.94,officialsMid,paint);
   add('Officials corridor ceiling',5.8,.22,officialsLength,0,3.67,officialsMid,ceiling);
   light(0,3.62,70);light(0,3.62,75);
   // One shared low-resolution tactics-board texture and geometry serve all rooms.
   const boardCanvas=document.createElement('canvas');boardCanvas.width=512;boardCanvas.height=320;
   const boardContext=boardCanvas.getContext('2d');
   boardContext.fillStyle='#202b30';boardContext.fillRect(0,0,512,320);
   boardContext.strokeStyle='#d9e3d8';boardContext.lineWidth=3;boardContext.strokeRect(36,28,440,264);
   boardContext.beginPath();boardContext.moveTo(256,28);boardContext.lineTo(256,292);boardContext.moveTo(36,160);boardContext.lineTo(476,160);boardContext.stroke();
   boardContext.beginPath();boardContext.arc(256,160,48,0,Math.PI*2);boardContext.stroke();
   boardContext.strokeRect(36,94,64,132);boardContext.strokeRect(412,94,64,132);
   boardContext.fillStyle='#d9e3d8';
   for(const [x,y] of [[90,120],[145,205],[220,105],[290,205],[350,115],[420,190],[255,160]]){boardContext.beginPath();boardContext.arc(x,y,7,0,Math.PI*2);boardContext.fill();}
   boardContext.strokeStyle='#d4b36b';boardContext.lineWidth=5;boardContext.beginPath();boardContext.moveTo(90,120);boardContext.lineTo(145,205);boardContext.lineTo(220,105);boardContext.lineTo(290,205);boardContext.stroke();
   const boardTexture=new THREE.CanvasTexture(boardCanvas);boardTexture.colorSpace=THREE.SRGBColorSpace;
   const boardMaterial=new THREE.MeshBasicMaterial({map:boardTexture,side:THREE.DoubleSide});
   const boardGeometry=new THREE.PlaneGeometry(1.8,1.12);
   // Dressing-room shells have a single controlled doorway facing their corridor.
   const makeRoom=(id,cx,cz,w,d,accent,accentMat,orientation='front')=>{
    const h=3.55,door=id==='Officials'?4.2:2.35,side=.22,backZ=cz+d/2,frontZ=cz-d/2;
    add(id+' floor',w,.18,d,cx,.08,cz,floor,root,true);
    add(id+' ceiling',w,.22,d,cx,h+.12,cz,ceiling);
    if(orientation==='front'){
     add(id+' left wall',side,h,d,cx-w/2+side/2,h/2+.18,cz,paint);
     add(id+' right wall',side,h,d,cx+w/2-side/2,h/2+.18,cz,paint);
     const span=(w-door)/2;
     add(id+' entrance left return',span,h,.24,cx-w/2+span/2,h/2+.18,frontZ,accentMat);
     add(id+' entrance right return',span,h,.24,cx+w/2-span/2,h/2+.18,frontZ,accentMat);
     add(id+' entrance lintel',door,.38,.26,cx,h-.01,frontZ,accentMat);
     add(id+' rear wall',w,h,.24,cx,h/2+.18,backZ,accentMat);
    }else{
     const doorSide=orientation==='side-reverse'?-1:1,doorX=cx+doorSide*w/2,span=(d-door)/2;
     add(id+' near side wall',w,h,.22,cx,h/2+.18,cz-d/2,paint);
     add(id+' far side wall',w,h,.22,cx,h/2+.18,cz+d/2,paint);
     add(id+' entrance front return',.24,h,span,doorX,h/2+.18,cz-d/2+span/2,accentMat);
     add(id+' entrance rear return',.24,h,span,doorX,h/2+.18,cz+d/2-span/2,accentMat);
     add(id+' entrance lintel',.26,.38,door,doorX,h-.01,cz,accentMat);
     add(id+' rear wall',.24,h,d,cx-doorSide*w/2,h/2+.18,cz,accentMat);
    }
    // Locker banks are instanced by component: the same detailed doors,
    // handles, number plates and vents render in a handful of draw calls.
    const count=id==='Officials'?4:8,lockerWidth=(orientation==='front'?w:d)-1.2;
    const unit=lockerWidth/count,carcasses=[],doors=[],handles=[],plates=[],vents=[];
    for(let i=0;i<count;i++){
     if(orientation==='front'){
      const lx=cx-w/2+.6+unit*(i+.5),lz=backZ-.34;
      carcasses.push({x:lx,y:1.22,z:lz});
      doors.push({x:lx,y:1.25,z:lz-.255});
      handles.push({x:lx+unit*.28,y:1.18,z:lz-.29});
      plates.push({x:lx,y:1.9,z:lz-.29});
      for(let vent=0;vent<4;vent++)vents.push({x:lx,y:1.65+vent*.07,z:lz-.292});
     }else{
      const doorSide=orientation==='side-reverse'?-1:1,lx=cx-doorSide*(w/2-.34),lz=cz-d/2+.6+unit*(i+.5);
      carcasses.push({x:lx,y:1.22,z:lz});
      doors.push({x:lx+doorSide*.255,y:1.25,z:lz});
      handles.push({x:lx+doorSide*.29,y:1.18,z:lz+unit*.28});
      plates.push({x:lx+doorSide*.29,y:1.9,z:lz});
      for(let vent=0;vent<4;vent++)vents.push({x:lx+doorSide*.292,y:1.65+vent*.07,z:lz});
     }
    }
    if(orientation==='front'){
     addInstances(id+' locker carcass instances',unit-.07,2.0,.48,accentMat,carcasses);
     addInstances(id+' locker door instances',unit-.16,1.78,.035,steel,doors);
     addInstances(id+' locker handle instances',.035,.2,.045,black,handles);
     addInstances(id+' locker number plate instances',unit*.38,.1,.025,white,plates);
     addInstances(id+' locker vent instances',unit*.45,.018,.02,black,vents);
    }else{
     addInstances(id+' locker carcass instances',.48,2.0,unit-.07,accentMat,carcasses);
     addInstances(id+' locker door instances',.035,1.78,unit-.16,steel,doors);
     addInstances(id+' locker handle instances',.045,.2,.035,black,handles);
     addInstances(id+' locker number plate instances',.025,.1,unit*.38,white,plates);
     addInstances(id+' locker vent instances',.02,.018,unit*.45,black,vents);
    }
    const benchW=Math.min((orientation==='front'?w:d)-1.4,orientation==='front'?w-1.4:d-1.4);
    const bx=orientation==='front'?cx:cx-(orientation==='side-reverse'?-1:1)*1.8,bz=orientation==='front'?frontZ+2.0:cz;
    if(orientation==='front'){
     add(id+' changing bench seat',benchW,.14,.58,bx,.58,bz,accentMat);
     add(id+' changing bench frame',benchW-.25,.48,.12,bx,.28,bz,steel);
     for(let i=0;i<4;i++)add(id+' boot shelf '+i,.55,.12,.48,bx-benchW/2+.45+i*(benchW-.9)/3,.16,bz+.55,black);
    }else{
     add(id+' changing bench seat',.58,.14,benchW,bx,.58,bz,accentMat);
     add(id+' changing bench frame',.12,.48,benchW-.25,bx,.28,bz,steel);
     for(let i=0;i<4;i++)add(id+' boot shelf '+i,.48,.12,.55,bx-(orientation==='side-reverse'?-1:1)*.55,.16,bz-benchW/2+.45+i*(benchW-.9)/3,black);
    }
    // Shared magnetic tactics board: one texture and one geometry for all rooms.
    const board=new THREE.Mesh(boardGeometry,boardMaterial);
    board.name=id+' tactical board';
    if(orientation==='front'){board.position.set(cx,2.55,backZ-.15);board.rotation.y=Math.PI;}
    else if(orientation==='side-reverse'){board.position.set(cx+w/2-.15,2.55,cz);board.rotation.y=-Math.PI/2;}
    else{board.position.set(cx-w/2+.15,2.55,cz);board.rotation.y=Math.PI/2;}
    root.add(board);
    // Kit rail and hooks sit against the usable wall, not floating in the room.
    if(orientation==='front'){
     const railLength=Math.min(w-2,7.5);
     add(id+' kit rail',railLength,.055,.055,cx,2.35,cz-.7,steel);
     for(let i=0;i<8;i++)add(id+' kit hook '+i,.045,.2,.045,cx-railLength/2+.45+i*(railLength-.9)/7,2.2,cz-.7,steel);
    }else{
     const doorSide=orientation==='side-reverse'?-1:1,railX=cx-doorSide*(w/2-1.0),railLength=Math.min(d-2,7.5);
     add(id+' kit rail',.055,.055,railLength,railX,2.35,cz,steel);
     for(let i=0;i<8;i++)add(id+' kit hook '+i,.045,.2,.045,railX,2.2,cz-railLength/2+.45+i*(railLength-.9)/7,steel);
    }
    // Practical ceiling luminaires and ventilation panels.
    for(let i=0;i<3;i++){light(cx-w/3+i*w/3,3.62,cz);add(id+' ceiling vent '+i,.7,.045,.34,cx-w/3+i*w/3,3.68,backZ-1.0,darkSteel);}
    sign(id+' room identification',id==='Home'?'HOME TEAM':id==='Away'?'AWAY TEAM':'MATCH OFFICIALS',
      id==='Officials'?'REFEREES & DELEGATES': 'FIRST TEAM DRESSING ROOM',
      orientation==='front'?cx:cx+(orientation==='side-reverse'?-w/2:w/2),3.0,orientation==='front'?frontZ-.18:cz,accent,
      orientation==='front'?0:(orientation==='side-reverse'?-Math.PI/2:Math.PI/2),orientation==='front'?4.4:3.0);
   };
   makeRoom('Home',-23.0,branchZ,11.0,11.5,0x8ab7d2,homeMat,'side');
   makeRoom('Away',23.0,branchZ,11.0,11.5,0xc99b8f,awayMat,'side-reverse');
   makeRoom('Officials',0,85.6,10.5,11.8,0xc9b77a,officialMat,'front');
   // Fire safety, CCTV and accessible service details in the public-facing corridor.
   const fireRed=material(0x9b302a,.72,.02),cctvLensGeometry=new THREE.SphereGeometry(.055,10,8);
   const cctvLensMaterial=new THREE.MeshBasicMaterial({color:0x171d22});
   for(const z of[52,61]){
    add('Fire extinguisher cabinet',.38,.72,.2,-2.55,1.0,z,fireRed);
    add('CCTV camera housing',.28,.18,.22,2.55,3.15,z,darkSteel);
    const lens=new THREE.Mesh(cctvLensGeometry,cctvLensMaterial);
    lens.name='CCTV camera lens';lens.position.set(2.55,3.06,z+.1);root.add(lens);
   }
   root.userData={kind:'player-entrance',frontZ:front,junctionZ:junction,homeRoom:{x:-23,z:branchZ},officialsRoom:{x:0,z:85.6},awayRoom:{x:23,z:branchZ},openPitchEnd:true,threeWayJunction:true};
   scene.add(root);return root;
  }
 function rebuildWalkColliders(stadiumRoot){
   if(stadiumRoot)walkNavigationStadiumRoot=stadiumRoot;
   walkColliderMeshes=[];walkSurfaceMeshes=[];
   const addRoot=(root,isLegacyStadium=false)=>root?.traverse(object=>{
    if(!object.isMesh||!object.geometry?.attributes?.position||!object.visible)return;
    object.updateWorldMatrix(true,false);
    object.userData.p11WalkBounds=new THREE.Box3().setFromObject(object);
    const isWalkSurface=object.userData.p11WalkableSurface===true;
    // Preserve legacy stadium ground probing. Modular systems explicitly tag floors.
    if(isWalkSurface||isLegacyStadium)walkSurfaceMeshes.push(object);
    // Walkable floors are ground probes, not waist/shoulder obstruction meshes.
    if(object.userData.p11WalkBlocker!==false&&!isWalkSurface)walkColliderMeshes.push(object);
   });
   addRoot(walkNavigationStadiumRoot,true);
   addRoot(playerEntranceTunnel,false);
   walkNavigationExtraRoots.forEach(root=>addRoot(root,false));
   console.info('PITCH 11 POV navigation meshes:',{blockers:walkColliderMeshes.length,walkableSurfaces:walkSurfaceMeshes.length,extraRoots:walkNavigationExtraRoots.length});
  }
  // Future environment systems: tag floor meshes with
  // userData.p11WalkableSurface=true and userData.p11WalkBlocker=false.
  // Solid geometry blocks by default; set p11WalkBlocker=false for visual-only meshes.
  // Add the completed system root to the scene, then register it here.
  function registerWalkNavigationRoot(root){
   if(!root||typeof root.traverse!=='function')return false;
   if(!walkNavigationExtraRoots.includes(root))walkNavigationExtraRoots.push(root);
   if(walkNavigationStadiumRoot)rebuildWalkColliders();
   return true;
  }
  function movePlayerWalk(position,deltaX,deltaZ){
   const distance=Math.hypot(deltaX,deltaZ);
   if(!Number.isFinite(distance)||distance<1e-5||!walkSurfaceMeshes.length)return position;
   const steps=Math.max(1,Math.ceil(distance/.16)),stepX=deltaX/steps,stepZ=deltaZ/steps;
   const direction=new THREE.Vector3(stepX,0,stepZ).normalize();
   const groundRay=new THREE.Vector3(0,-1,0),current={x:position.x,y:position.y,z:position.z};
   for(let step=0;step<steps;step++){
    const nextX=current.x+stepX,nextZ=current.z+stepZ,currentGround=current.y-1.65;
    // Obstructions and ground are queried independently so decorative meshes
    // cannot be mistaken for a continuous floor.
    const nearbyBlockers=walkColliderMeshes.filter(mesh=>{
     const b=mesh.userData.p11WalkBounds;
     return b&&nextX>=b.min.x-1.5&&nextX<=b.max.x+1.5&&nextZ>=b.min.z-1.5&&nextZ<=b.max.z+1.5&&b.max.y>=currentGround-1.25&&b.min.y<=currentGround+7.0;
    });
    let blocked=false;
    for(const height of [.28,.88,1.48]){
     if(!nearbyBlockers.length)break;
     walkRaycaster.set(new THREE.Vector3(current.x,currentGround+height,current.z),direction);
     walkRaycaster.near=0;walkRaycaster.far=Math.hypot(stepX,stepZ)+.2;
     if(walkRaycaster.intersectObjects(nearbyBlockers,false).some(hit=>hit.distance<walkRaycaster.far-.015)){blocked=true;break;}
    }
    if(blocked)break;
    const nearbySurfaces=walkSurfaceMeshes.filter(mesh=>{
     const b=mesh.userData.p11WalkBounds;
     return b&&nextX>=b.min.x-.05&&nextX<=b.max.x+.05&&nextZ>=b.min.z-.05&&nextZ<=b.max.z+.05&&b.max.y>=currentGround-1.0&&b.min.y<=currentGround+1.25;
    });
    if(!nearbySurfaces.length)break;
    walkRaycaster.set(new THREE.Vector3(nextX,currentGround+6.5,nextZ),groundRay);
    walkRaycaster.near=0;walkRaycaster.far=8.0;
    const floorHit=walkRaycaster.intersectObjects(nearbySurfaces,false).find(hit=>hit.point.y<=currentGround+1.25&&hit.point.y>=currentGround-1.0);
    if(!floorHit)break;
    const nextGround=floorHit.point.y;
    current.x=nextX;current.z=nextZ;current.y=nextGround+1.65;
   }
   return current;
  }
function carveStadiumForPlayerEntrance(stadium){
  // Clip imported GLB triangles against the complete corridor/room clearances.
  // This removes seats, terrace steps and their foundations as real geometry,
  // rather than hiding them behind tunnel walls.
  const clearanceBottom=pitchSurfaceY-1.0,clearanceTop=pitchSurfaceY+4.8;
  const cuts=[
   // Pitch portal and main approach, with vertical clearance above the ceiling.
   // Remove only the narrow obstruction directly in front of the player portal:
    // the end-stand wall / advertising fascia aligned with the tunnel opening.
    {minX:-4.35,maxX:4.35,minY:clearanceBottom,maxY:clearanceTop,minZ:34.1,maxZ:45.05},
    {minX:-3.8,maxX:3.8,minY:clearanceBottom,maxY:clearanceTop,minZ:44.55,maxZ:66.75},
   // Full T-junction crossbar including wall thickness and door returns.
   {minX:-18.0,maxX:18.0,minY:clearanceBottom,maxY:clearanceTop,minZ:63.15,maxZ:69.05},
   // Home and away changing rooms and their side-door thresholds.
   {minX:-29.2,maxX:-16.0,minY:clearanceBottom,maxY:clearanceTop,minZ:59.45,maxZ:72.75},
   {minX:16.0,maxX:29.2,minY:clearanceBottom,maxY:clearanceTop,minZ:59.45,maxZ:72.75},
   // The complete officials corridor was previously missing from the cut.
   {minX:-3.25,maxX:3.25,minY:clearanceBottom,maxY:clearanceTop,minZ:68.15,maxZ:80.05},
   // Officials dressing room, continuously joined to the corridor clearance.
   {minX:-5.9,maxX:5.9,minY:clearanceBottom,maxY:clearanceTop,minZ:78.45,maxZ:92.25}
  ];
  const axis=['x','y','z'];
  const interpolate=(a,b,t)=>{
   const v={world:a.world.clone().lerp(b.world,t),attrs:{}};
   for(const name of Object.keys(a.attrs)){const av=a.attrs[name],bv=b.attrs[name];v.attrs[name]=av.map((n,i)=>n+(bv[i]-n)*t);}
   return v;
  };
  const clip=(poly,key,bound,greater)=>{
   if(!poly.length)return [];
   const out=[];let previous=poly[poly.length-1],pv=previous.world[key],pin=greater?pv>=bound:pv<=bound;
   for(const current of poly){
    const cv=current.world[key],cin=greater?cv>=bound:cv<=bound;
    if(cin!==pin){const t=(bound-pv)/(cv-pv);out.push(interpolate(previous,current,THREE.MathUtils.clamp(t,0,1)));}
    if(cin)out.push(current);
    previous=current;pv=cv;pin=cin;
   }
   return out;
  };
  const subtractBox=(poly,box)=>{
   let inside=[poly],outside=[];
   for(const [key,bound,greater] of [['x',box.minX,true],['x',box.maxX,false],['y',box.minY,true],['y',box.maxY,false],['z',box.minZ,true],['z',box.maxZ,false]]){
    const next=[];
    for(const part of inside){
     const out=clip(part,key,bound,!greater),inn=clip(part,key,bound,greater);
     if(out.length>=3)outside.push(out);
     if(inn.length>=3)next.push(inn);
    }
    inside=next;if(!inside.length)break;
   }
   return outside;
  };
  stadium.updateMatrixWorld(true);
  let meshesVisited=0,meshesChanged=0,trianglesClipped=0,trianglesRemoved=0,fragmentsCreated=0;
  const worldBounds=new THREE.Box3(),v=new THREE.Vector3();
  stadium.traverse(mesh=>{
   if(!mesh.isMesh||mesh.isSkinnedMesh||!mesh.geometry?.attributes?.position)return;
   meshesVisited++;
   const source=mesh.geometry,pos=source.attributes.position,index=source.index;
   worldBounds.setFromBufferAttribute(pos).applyMatrix4(mesh.matrixWorld);
   const relevant=cuts.filter(c=>worldBounds.max.x>=c.minX&&worldBounds.min.x<=c.maxX&&worldBounds.max.y>=c.minY&&worldBounds.min.y<=c.maxY&&worldBounds.max.z>=c.minZ&&worldBounds.min.z<=c.maxZ);
   if(!relevant.length)return;
   const names=Object.keys(source.attributes),inverse=mesh.matrixWorld.clone().invert(),arrays=Object.fromEntries(names.map(n=>[n,[]]));
   const groups=source.groups.length?source.groups:[{start:0,count:index?index.count:pos.count,materialIndex:0}];
   const newGroups=[];let emitted=0,removed=0,clipped=0;
   const readVertex=vi=>{
    const attrs={};for(const name of names){const a=source.attributes[name],values=[];for(let c=0;c<a.itemSize;c++)values.push(c===0?a.getX(vi):c===1?a.getY(vi):c===2?a.getZ(vi):c===3?a.getW(vi):0);attrs[name]=values;}
    const p=new THREE.Vector3().fromBufferAttribute(pos,vi).applyMatrix4(mesh.matrixWorld);
    return{world:p,attrs};
   };
   for(const group of groups){
    const groupStart=emitted,limit=Math.min(index?index.count:pos.count,group.start+group.count);
    for(let i=group.start;i+2<limit;i+=3){
     const ids=[index?index.getX(i):i,index?index.getX(i+1):i+1,index?index.getX(i+2):i+2];
     let polygons=[[readVertex(ids[0]),readVertex(ids[1]),readVertex(ids[2])]];
     for(const cut of relevant){
      polygons=polygons.flatMap(poly=>subtractBox(poly,cut));
      if(!polygons.length)break;
     }
     const kept=polygons.reduce((sum,p)=>sum+Math.max(0,p.length-2),0);
     if(!kept){removed++;continue;}
     if(polygons.length!==1||polygons[0].length!==3)clipped++;
     for(const poly of polygons){
      for(let n=1;n<poly.length-1;n++){
       for(const vertex of[poly[0],poly[n],poly[n+1]]){
        for(const name of names){
         let values=vertex.attrs[name];
         if(name==='position'){v.copy(vertex.world).applyMatrix4(inverse);values=[v.x,v.y,v.z];}
         if((name==='normal'||name==='tangent')&&values.length>=3){
          const n=new THREE.Vector3(values[0],values[1],values[2]).normalize();
          values=[n.x,n.y,n.z,...values.slice(3)];
         }
         arrays[name].push(...values);
        }
        emitted++;
       }
       fragmentsCreated++;
      }
     }
    }
    if(emitted>groupStart)newGroups.push({start:groupStart,count:emitted-groupStart,materialIndex:group.materialIndex||0});
   }
   if(!clipped&&!removed)return;
   const geometry=new THREE.BufferGeometry();
   for(const name of names){const old=source.attributes[name];geometry.setAttribute(name,new THREE.Float32BufferAttribute(arrays[name],old.itemSize,old.normalized));}
   for(const group of newGroups)geometry.addGroup(group.start,group.count,group.materialIndex);
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   mesh.geometry=geometry;meshesChanged++;trianglesClipped+=clipped;trianglesRemoved+=removed;
  });
  const diagnostics={meshesVisited,meshesChanged,trianglesClipped,trianglesRemoved,fragmentsCreated,cutVolumes:cuts.length,entrancePortalCut:{minX:-4.35,maxX:4.35,minZ:34.1,maxZ:45.05},clearanceY:{bottom:+clearanceBottom.toFixed(3),top:+clearanceTop.toFixed(3)},clearanceZones:{mainApproach:[44.55,66.75],tJunction:[63.15,69.05],homeAwayRooms:[59.45,72.75],officialsCorridor:[68.15,80.05],officialsRoom:[78.45,92.25]},scope:'imported-stadium-glb-only',firstStepStartZ:45.5,method:'triangle-box-clipping'};
  console.info('PITCH 11 Environment Lab precise tunnel clearance:',diagnostics);return diagnostics;
 }

function finishStadiumLoad(gltf){
  const stadium=gltf.scene;
  stadium.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;}});
  const bounds=new THREE.Box3().setFromObject(stadium),center=bounds.getCenter(new THREE.Vector3());
  stadium.position.x-=center.x;stadium.position.z-=center.z;stadium.position.y-=bounds.min.y;
  try{enhancePitchGrass(stadium);}catch(e){console.warn('PITCH 11 turf enhancement skipped',e);}
  stadium.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];if(mats.some(m=>pitchMaterials.includes(m))){}}});
   let tunnelClearanceDiagnostics=null;
   if(environmentMode){try{tunnelClearanceDiagnostics=carveStadiumForPlayerEntrance(stadium);}catch(e){console.warn('PITCH 11 tunnel clearance carving skipped',e);}}
  // Place player feet on the actual GLB pitch surface, not at world Y=0.
  if(playerRenderer)playerRenderer.setGroundHeight(pitchSurfaceY + 0.025);
  scene.add(stadium);addFloodlightTowers();pitchMarkingsGroup=addPitchMarkings();pitchMarkingsGroup.name='PITCH MARKINGS · LOCKED';pitchDiagnostics.tunnelClearance=tunnelClearanceDiagnostics;pitchDiagnostics.markings={children:pitchMarkingsGroup.children.length,meshes:pitchMarkingsGroup.children.filter(o=>o.isMesh).length,lines:pitchMarkingsGroup.children.filter(o=>o.isLine).length,visible:pitchMarkingsGroup.visible,positionY:pitchMarkingsGroup.position.y,lineY:pitchSurfaceY+.018,lineCount:pitchMarkingsGroup.children.filter(o=>o.isMesh||o.isLine).length,sampleChildren:pitchMarkingsGroup.children.slice(0,6).map(o=>({type:o.type,visible:o.visible,positionY:+o.position.y.toFixed(4),renderOrder:o.renderOrder,material:o.material?{type:o.material.type,depthTest:o.material.depthTest,depthWrite:o.material.depthWrite,transparent:o.material.transparent,opacity:o.material.opacity,side:o.material.side}:null}))};
  if(!environmentMode){previewBall=new THREE.Mesh(new THREE.SphereGeometry(.22,24,16),new THREE.MeshStandardMaterial({color:0xf5f4ec,roughness:.38,metalness:.02}));previewBall.position.set(0,.23,0);previewBall.visible=false;scene.add(previewBall);}
  try{addCrowd();addSecurity();addStaff();}catch(e){console.warn('PITCH 11 matchday atmosphere partially skipped',e);}
  board(112,0,-36.5,0);sidelineBoardWithOpenings(36.5,[[-17.1,-7.9],[-4.7,4.7],[7.9,17.1]]);board(72,-DEFAULT_GOAL_LAYOUT.endBoardX,0,Math.PI/2);board(72,DEFAULT_GOAL_LAYOUT.endBoardX,0,-Math.PI/2);
  setGoalDimensions();addFlags();
  if(environmentMode){try{playerEntranceTunnel=createPlayerEntranceTunnel();optionalAssets.playerEntrance='ready';}catch(e){optionalAssets.playerEntrance='error';console.warn('PITCH 11 player entrance setup failed',e);}}
  else{optionalAssets.playerEntrance='disabled-outside-environment-lab';}
  if(environmentMode)rebuildWalkColliders(stadium);
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
  // Separate imported comparison goal in the Environment Lab; the procedural goal remains untouched.
  optionalAssets.testGoal='loading';
  const goalTestLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  goalTestLoader.load('./assets/football-goal-test.glb',asset=>{
   try{
    const testGoal=new THREE.Group();testGoal.name='PITCH 11 imported football goal test';
    const model=asset.scene;model.scale.set(7.32/7.56,2.44/2.57968,2.2/2.205);model.rotation.y=-Math.PI/2;
    testGoal.add(model);testGoal.position.set(55.5,pitchSurfaceY+.019,0);
    testGoal.userData={testOnly:true,visualComparison:true,doesNotReplaceProceduralGoal:true};
    model.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=false;}});
    scene.add(testGoal);optionalAssets.testGoal='ready';
   }catch(e){optionalAssets.testGoal='error';console.warn('PITCH 11 imported goal test setup failed',e);}
  },undefined,e=>{optionalAssets.testGoal='error';console.warn('PITCH 11 imported goal test asset unavailable',e);});
  ready=true;stadiumLoadProgress=1;setStadiumLoadState('ready');previewFailure='';
  window.dispatchEvent(new CustomEvent('p11stadiumready'));
 }
 function loadStadium(attempt=0){
  stadiumLoadAttempts=attempt+1;stadiumLoadProgress=0;
  setStadiumLoadState(attempt?'retrying':'loading');
  // GLTFLoader does not expose a request timeout. Guard each attempt so a
  // stalled transfer cannot leave the lab in LOADING forever.
  let settled=false;
  const timeout=setTimeout(()=>{
   if(settled)return;
   settled=true;
   const message='Stadium GLB request timed out after 30 seconds: '+stadiumUrl;
   if(attempt<2){
    console.warn('PITCH 11 stadium load timed out; retrying',attempt+1);
    setStadiumLoadState('retrying',message);
    setTimeout(()=>loadStadium(attempt+1),700*(attempt+1));
   }else{
    console.error('PITCH 11 stadium unavailable after timed-out retries.');
    setStadiumLoadState('error',message);
   }
  },30000);
  loader.load(stadiumUrl,gltf=>{
   if(settled)return;
   settled=true;clearTimeout(timeout);
   try{finishStadiumLoad(gltf);}
   catch(e){console.error('PITCH 11 stadium setup failed',e);setStadiumLoadState('error',e&&e.message?e.message:String(e));}
  },event=>{
   if(settled)return;
   if(event&&event.lengthComputable&&event.total>0){
    stadiumLoadProgress=Math.max(0,Math.min(1,event.loaded/event.total));boot.progress=stadiumLoadProgress;
   }
  },error=>{
   if(settled)return;
   settled=true;clearTimeout(timeout);
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
 
 function render(V,w,h,options={}){applyStadiumTimeOfDay(options.timeOfDay);setCamera(V,w,h);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);updateSecurity(now);updateStaff(now);updateCrowd(now);if(now-lastRender>=(mobile?33:16)){if(playerRenderer)playerRenderer.update(options.players,options.selectedPlayer,options.alpha,options.delta,options);syncMatchBall(options.ball,options.alpha);renderer.render(scene,camera);lastRender=now;}}
 function renderTopDown(cx,cy,vw,vh,w,h,options={}){applyStadiumTimeOfDay(options.timeOfDay);const width=Math.max(1,vw*.1),height=Math.max(1,vh*.1),x=(cx-585)*.1,z=(cy-400)*.1;topCamera.left=-width/2;topCamera.right=width/2;topCamera.top=height/2;topCamera.bottom=-height/2;topCamera.position.set(x,220,z);topCamera.up.set(0,0,-1);topCamera.lookAt(x,0,z);topCamera.updateProjectionMatrix();topCamera.updateMatrixWorld(true);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);updateSecurity(now);updateStaff(now);updateCrowd(now);if(now-lastRender>=(mobile?33:16)){playerRenderer.update(options.players,options.selectedPlayer,options.alpha,options.delta,options);syncMatchBall(options.ball,options.alpha);renderer.render(scene,topCamera);lastRender=now;}}
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
  function renderEnvironment(position,target,fov=62,timeOfDay=0){
   if(!environmentMode||!ready)return false;
   applyStadiumTimeOfDay(timeOfDay);
   camera.position.set(position.x,position.y,position.z);
   camera.up.set(0,1,0);
   camera.lookAt(target.x,target.y,target.z);
   camera.fov=Math.max(35,Math.min(85,fov));
   camera.aspect=viewportWidth/Math.max(1,viewportHeight);
   camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   const now=performance.now();
   flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);
   updateSecurity(now);updateStaff(now);updateCrowd(now);
   renderer.render(scene,camera);
   return true;
  }
 window.P11Stadium={
   get ready(){return ready;},get environmentMode(){return environmentMode;},get scene(){return scene;},get camera(){return camera;},get renderer(){return renderer;},get status(){return stadiumLoadState;},get progress(){return stadiumLoadProgress;},
   get error(){return stadiumLoadError;},get previewFailure(){return previewFailure;},get mobile(){return mobile;},
   get playerEntrance(){return playerEntranceTunnel;},
   get playerModelsReady(){return !!playerRenderer&&playerRenderer.ready&&playerRenderer.expectedCount>0&&playerRenderer.count>=playerRenderer.expectedCount;},get playerModelsStatus(){return playerRenderer?playerRenderer.status:'disabled-in-environment-viewer'},
   get diagnostics(){return{mobile,status:stadiumLoadState,progress:stadiumLoadProgress,error:stadiumLoadError,attempts:stadiumLoadAttempts,crowdCount:crowdFans.length,optionalAssets:{...optionalAssets},pitch:{...pitchDiagnostics,markings:pitchDiagnostics.markings?{...pitchDiagnostics.markings}:null,activeGrassMaterials:pitchMaterials.length,textureSource:pitchTextureStatus,pbrLoad:{...pitchGrassPbrDiagnostics,files:{...pitchGrassPbrDiagnostics.files}},textureResolution:pitchTextureCanvas?pitchTextureCanvas.width:0,pitchSurfaceY:+pitchSurfaceY.toFixed(4),markingsVerticalGap:+(.018-pitchSurfaceY).toFixed(4)},playerModels:playerRenderer?{status:playerRenderer.status,assetReady:playerRenderer.ready,ready:playerRenderer.ready&&playerRenderer.expectedCount>0&&playerRenderer.count>=playerRenderer.expectedCount,expectedPlayers:playerRenderer.expectedCount,visiblePlayers:playerRenderer.visibleCount,renderedPlayers:playerRenderer.count,animatedCount:playerRenderer.animatedCount,clipCount:playerRenderer.clipCount,trianglesPerModel:playerRenderer.modelTriangleCount,estimatedPlayerTriangles:playerRenderer.triangleCount,animationHz:playerRenderer.animationUpdateRate,materialVariants:playerRenderer.materialVariants.size,error:playerRenderer.error}:null,renderInfo:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lines:renderer.info.render.lines,points:renderer.info.render.points,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},renderer:{width:renderer.domElement.width,height:renderer.domElement.height,pixelRatio:renderer.getPixelRatio(),maxTextureSize:renderer.capabilities.maxTextureSize}};},
   setPitchSettings(pitch,mowing){
    pitchSettings={pitch:Math.max(0,Math.min(4,pitch|0)),mowing:Math.max(0,Math.min(3,mowing|0))};
    activePitchKey='';updatePreviewPitch(pitchSettings.pitch,pitchSettings.mowing);
   },
   render,renderTopDown,renderPreview,renderEnvironment,movePlayerWalk,project,setGoalDimensions,
   registerWalkNavigationRoot,rebuildWalkNavigation:()=>rebuildWalkColliders()
  };
 const resizeStadium=()=>{const rect=syncRendererSize();if(rect){camera.aspect=rect.width/Math.max(1,rect.height);camera.updateProjectionMatrix();}};
 addEventListener('resize',resizeStadium);
 addEventListener('orientationchange',resizeStadium);
 if(window.visualViewport)window.visualViewport.addEventListener('resize',resizeStadium);
 if(typeof ResizeObserver!=='undefined'){const viewportObserver=new ResizeObserver(resizeStadium);viewportObserver.observe(uiCanvas);}
})();
