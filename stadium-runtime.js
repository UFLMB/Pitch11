import * as THREE from './vendor/three/build/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
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
 let ready=false,lastRender=0,ledTextures=[],flagMeshes=[];
 const bodyColors=[0x172c43,0x253b57,0x3d2529,0xb8b9b2,0x1c382d,0x8e3c2d,0xd1b98b,0x34353b,0x657b8c,0x8a9a9a,0x253b34,0x6c2637],skinColors=[0xd5a47f,0xb97f5e,0x8e5b43,0xe2bd9b,0x704936,0xc99470];
 function points(hx,hz,r){const p=[],line=(a,b,c,d)=>{const n=Math.max(2,Math.ceil(Math.hypot(c-a,d-b)/2));for(let i=0;i<n;i++){const t=i/n;p.push([a+(c-a)*t,b+(d-b)*t]);}},arc=(x,z,rad,a0,a1)=>{const n=Math.max(8,Math.ceil(Math.abs(a1-a0)*rad/2));for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/n;p.push([x+Math.cos(a)*rad,z+Math.sin(a)*rad]);}};line(-hx+r,-hz,hx-r,-hz);arc(hx-r,-hz+r,r,-Math.PI/2,0);line(hx,-hz+r,hx,hz-r);arc(hx-r,hz-r,r,0,Math.PI/2);line(hx-r,hz,-hx+r,hz);arc(-hx+r,hz-r,r,Math.PI/2,Math.PI);line(-hx,hz-r,-hx,-hz+r);arc(-hx+r,-hz+r,r,Math.PI,Math.PI*1.5);return p;}
 function addCrowd(){
  const spacing=mobile?2.35:1.8,rows=[];
  for(let i=0;i<24;i++)rows.push({y:2.15+i*.34,p:points(66+i*.8,46+i*.8,14+i*.25)});
  for(let i=0;i<20;i++)rows.push({y:18+i*.34,p:points(86+i*.8,66+i*.8,22+i*.25)});
  const all=[];
  for(const row of rows){let total=0,lens=[];for(let i=0;i<row.p.length;i++){const a=row.p[i],b=row.p[(i+1)%row.p.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);lens.push(l);total+=l;}const n=Math.floor(total/spacing);let seg=0,base=0;for(let i=0;i<n;i++){const d=(i+.5)*total/n;while(seg<lens.length-1&&base+lens[seg]<d)base+=lens[seg++];const a=row.p[seg],b=row.p[(seg+1)%row.p.length],t=(d-base)/Math.max(.001,lens[seg]);all.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,y:row.y});}}
  const torso=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.17,.48,5),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96}),all.length),head=new THREE.InstancedMesh(new THREE.SphereGeometry(.105,5,4),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9}),all.length),o=new THREE.Object3D(),col=new THREE.Color();let seed=7711;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  all.forEach((p,i)=>{const s=.88+rnd()*.22;o.position.set(p.x,p.y+.31*s,p.z);o.rotation.set(0,Math.atan2(-p.x,-p.z)+(rnd()-.5)*.3,0);o.scale.setScalar(s);o.updateMatrix();torso.setMatrixAt(i,o.matrix);col.setHex(bodyColors[Math.floor(rnd()*bodyColors.length)]);torso.setColorAt(i,col);o.position.set(p.x,p.y+.69*s,p.z);o.updateMatrix();head.setMatrixAt(i,o.matrix);col.setHex(skinColors[Math.floor(rnd()*skinColors.length)]);head.setColorAt(i,col);});
  torso.instanceMatrix.needsUpdate=true;head.instanceMatrix.needsUpdate=true;torso.computeBoundingSphere();head.computeBoundingSphere();scene.add(torso,head);
 }
 function board(len,x,z,rot){const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(len,.95,.3),new THREE.MeshStandardMaterial({color:0x071018,metalness:.55,roughness:.45})));const c=document.createElement('canvas');c.width=1024;c.height=128;const x2=c.getContext('2d'),labels=['PITCH 11 · MATCHDAY','MATCHDAY LIVE','PLAY BEAUTIFUL','ULTIMATE FOOTBALL'],cols=['#b5e65b','#f2c66d','#79d7cf','#f0f2e8'];for(let i=0;i<4;i++){const x0=i*256;x2.fillStyle='#101d25';x2.fillRect(x0,0,256,128);x2.fillStyle=cols[i];x2.fillRect(x0+10,18,3,92);x2.font='900 25px Arial';x2.textAlign='center';x2.fillText(labels[i],x0+132,73);}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;ledTextures.push(tex);const screen=new THREE.Mesh(new THREE.PlaneGeometry(len-.15,.72),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));screen.position.z=.16;g.add(screen);g.position.set(x,.78,z);g.rotation.y=rot;scene.add(g);}
 function addFlags(){const mat=new THREE.MeshStandardMaterial({color:0xa3e635,side:THREE.DoubleSide,roughness:.8});for(const [x,z] of [[-52.5,-34],[-52.5,34],[52.5,-34],[52.5,34]]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,1.55,6),new THREE.MeshStandardMaterial({color:0xb8c2c4,metalness:.5}));pole.position.set(x,.78,z);scene.add(pole);const flag=new THREE.Mesh(new THREE.PlaneGeometry(.48,.3,3,2),mat.clone());flag.position.set(x+.24,1.38,z);flag.userData.phase=flagMeshes.length*.8;flagMeshes.push(flag);scene.add(flag);}}
 const loader=new GLTFLoader();
 loader.load('./assets/football-stadium.glb',gltf=>{
  const stadium=gltf.scene;stadium.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.map)m.map.colorSpace=THREE.SRGBColorSpace;}});
  const bounds=new THREE.Box3().setFromObject(stadium),center=bounds.getCenter(new THREE.Vector3());stadium.position.x-=center.x;stadium.position.z-=center.z;stadium.position.y-=bounds.min.y;scene.add(stadium);
  try{addCrowd();}catch(e){console.warn('PITCH 11 crowd layer skipped',e);}
  board(112,0,-36.5,0);board(112,0,36.5,Math.PI);board(72,-54.5,0,Math.PI/2);board(72,54.5,0,-Math.PI/2);addFlags();
  const details=new GLTFLoader();details.load('./assets/team-dugout.glb',asset=>{for(const s of[-1,1]){const d=asset.scene.clone(true);d.position.set(s*12.5,.05,36.5);if(s<0)d.rotation.y=Math.PI;scene.add(d);}},undefined,()=>{});
  details.load('./assets/corner-flag.glb',asset=>{for(const x of[-52.5,52.5])for(const z of[-34,34]){const f=asset.scene.clone(true);f.position.set(x,0,z);scene.add(f);}},undefined,()=>{});
  ready=true;window.dispatchEvent(new CustomEvent('p11stadiumready'));
 },undefined,e=>console.warn('PITCH 11 stadium unavailable; keeping original renderer.',e));
 function setCamera(V,w,h){const ch=V.yw?V.ch:0,sh=V.yw?V.sh:-1,cx=V.yw?V.ex:V.cx,cy=V.yw?V.ey:V.Cy,fy=V.fy,fz=V.fz,hz=V.hz;const pos=new THREE.Vector3((cx-585)*.1,hz*.1,(cy-400)*.1);forward.set(ch*fy,-fz,sh*fy).normalize();up.set(ch*fz,fy,sh*fz).normalize();camera.position.copy(pos);camera.up.copy(up);camera.lookAt(pos.clone().add(forward));const focal=V.K||h*.95;camera.fov=2*Math.atan(h/(2*focal))*180/Math.PI;camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
 function project(x,y,z){v3.set((x-585)*.1,z*.1,(y-400)*.1).project(camera);const sx=(v3.x*.5+.5)*innerWidth,sy=(-v3.y*.5+.5)*innerHeight;v4.set((x+1-585)*.1,z*.1,(y-400)*.1).project(camera);const sx2=(v4.x*.5+.5)*innerWidth,sy2=(-v4.y*.5+.5)*innerHeight;return{x:sx,y:sy,s:Math.max(.001,Math.hypot(sx2-sx,sy2-sy))};}
 function render(V,w,h){setCamera(V,w,h);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);if(now-lastRender>=(mobile?33:16)){renderer.render(scene,camera);lastRender=now;}}
 function renderTopDown(cx,cy,vw,vh,w,h){const width=Math.max(1,vw*.1),height=Math.max(1,vh*.1),x=(cx-585)*.1,z=(cy-400)*.1;topCamera.left=-width/2;topCamera.right=width/2;topCamera.top=height/2;topCamera.bottom=-height/2;topCamera.position.set(x,220,z);topCamera.up.set(0,0,-1);topCamera.lookAt(x,0,z);topCamera.updateProjectionMatrix();topCamera.updateMatrixWorld(true);const now=performance.now();flagMeshes.forEach(f=>f.rotation.z=Math.sin(now*.0015+f.userData.phase)*.08);if(now-lastRender>=(mobile?33:16)){renderer.render(scene,topCamera);lastRender=now;}}
 window.P11Stadium={get ready(){return ready;},render,renderTopDown,project};
 addEventListener('resize',()=>{renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1:1.25));renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
})();
