import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const host=document.getElementById("view"),status=document.getElementById("status");
const setStatus=(message,isError=false)=>{status.textContent=message;status.style.color=isError?"#ff9c9c":"#d6e1e8";};
let renderer,scene,camera,mixers=[];
try{
 setStatus("Three.js bundle loaded · loading player model…");
 const scene3=new THREE.Scene();scene3.background=new THREE.Color(0x080d12);scene=scene3;
 camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(0,8.8,12.8);camera.lookAt(0,0,0);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=false;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xe8f3ff,0x253322,2.1));
 const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-4,9,6);scene.add(key);
 const grid=new THREE.GridHelper(14,14,0x56704b,0x26352c);grid.position.y=.005;scene.add(grid);
 const axes=new THREE.AxesHelper(2.4);axes.position.set(-6.4,.02,-6.4);scene.add(axes);
 const specs=[
  {name:"RIGHT",f:0,x:-3,z:-3,v:new THREE.Vector3(1,0,0),color:0xa3e635},
  {name:"DOWN",f:Math.PI/2,x:3,z:-3,v:new THREE.Vector3(0,0,1),color:0x38bdf8},
  {name:"LEFT",f:Math.PI,x:-3,z:3,v:new THREE.Vector3(-1,0,0),color:0xf59e0b},
  {name:"UP",f:-Math.PI/2,x:3,z:3,v:new THREE.Vector3(0,0,-1),color:0xc084fc}
 ];
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
 addEventListener("resize",resize);resize();
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const withTimeout=(promise,label,ms=20000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+" timed out after "+ms/1000+"s")),ms))]);
 setStatus("Loading player.glb…");
 const modelAsset=await withTimeout(loader.loadAsync("./assets/players/player.glb"),"Player model");
 const template=modelAsset.scene;template.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(template),height=box.max.y-box.min.y;
 if(!Number.isFinite(height)||height<.5)throw new Error("Player model has invalid dimensions");
 const scale=1.8/height;
 for(const spec of specs){
  const group=new THREE.Group();group.position.set(spec.x,0,spec.z);
  const model=cloneSkeleton(template);model.scale.setScalar(scale);model.position.y=-box.min.y*scale;
  model.traverse(n=>{if(n.isMesh){n.frustumCulled=false;n.castShadow=false;n.receiveShadow=false;}});
  group.add(model);group.rotation.y=-spec.f-Math.PI/2;scene.add(group);
  const arrow=new THREE.ArrowHelper(spec.v,new THREE.Vector3(spec.x,.08,spec.z),1.65,spec.color,.42,.22);scene.add(arrow);
  mixers.push(new THREE.AnimationMixer(model));
 }
 setStatus("4/4 player models loaded · Loading run animation…");
 // The model is rendered independently; a slow or missing animation can no longer block it.
 const clock=new THREE.Clock();
 function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);for(const mixer of mixers)mixer.update(dt);renderer.render(scene,camera);}
 frame();
 try{
  const runAsset=await withTimeout(loader.loadAsync("./assets/players/run.glb"),"Run animation",20000);
  const runClip=runAsset.animations?.[0];
  if(!runClip)throw new Error("run.glb contains no animation clip");
  for(const mixer of mixers)mixer.clipAction(runClip.clone()).setLoop(THREE.LoopRepeat,Infinity).play();
  setStatus("4/4 models loaded · Run animation playing");
 }catch(animationError){
  setStatus("4/4 models loaded · Run animation unavailable: "+String(animationError.message||animationError),true);
  console.error(animationError);
 }
}catch(error){
 setStatus("Load failed: "+String(error.message||error),true);
 console.error(error);
}