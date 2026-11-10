import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";
import { FootballSimulation } from "./simulation.mjs";
import { createBroadcastCamera, updateBroadcastCamera } from "./broadcast-camera.mjs";
import { markRoofForCameraExclusion, configureStadiumCameraLayers } from "./stadium-visibility.mjs";

const host = document.querySelector("#scene");
const mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 800;
const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: "high-performance", stencil: false });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.25));
renderer.setSize(host.clientWidth, host.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = false;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101e2a);
scene.fog = new THREE.Fog(0x101e2a, 180, 360);
scene.add(new THREE.HemisphereLight(0xc9e0ff, 0x1a241c, 1.65));
const keyLight = new THREE.DirectionalLight(0xffe2bd, 1.65);
keyLight.position.set(-65, 110, 45); scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0x91bfff, .65);
fillLight.position.set(70, 70, -85); scene.add(fillLight);

const camera = new THREE.PerspectiveCamera(41, host.clientWidth / host.clientHeight, .1, 500);
const broadcastCamera = createBroadcastCamera(camera, { mobile });
// Roof meshes are on a dedicated Three.js layer. The broadcast camera omits
// that layer; any alternate/replay camera can explicitly enable it.
configureStadiumCameraLayers(camera, { hideRoof: true });

const mat = (color, roughness = .82, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const addBox = (w, h, d, x, y, z, material, parent = scene) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
};
const addCylinder = (rt, rb, h, x, y, z, material, parent = scene, radial = 10) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, radial), material);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
};

// Pitch and markings — all geometry is generated locally; no external stadium model is required.
addBox(260, .6, 210, 0, -.75, 0, mat(0x101a18));
const grassCanvas = document.createElement("canvas");
grassCanvas.width = 1024; grassCanvas.height = 512;
const grassCtx = grassCanvas.getContext("2d");
grassCtx.fillStyle = "#1b512f"; grassCtx.fillRect(0, 0, 1024, 512);
for (let i = 0; i < 10; i++) {
  grassCtx.fillStyle = i % 2 ? "#1d5834" : "#17492b";
  grassCtx.fillRect(i * 102.4, 0, 102.4, 512);
}
for (let i = 0; i < 18000; i++) {
  const x = Math.random() * 1024, y = Math.random() * 512;
  grassCtx.fillStyle = Math.random() > .5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.035)";
  grassCtx.fillRect(x, y, 1.2, 1.2);
}
const grassTexture = new THREE.CanvasTexture(grassCanvas);
grassTexture.colorSpace = THREE.SRGBColorSpace;
grassTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(105, 68), new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1 }));
pitch.rotation.x = -Math.PI / 2; pitch.position.y = .025; scene.add(pitch);

const lineMat = new THREE.MeshBasicMaterial({ color: 0xe6eee3 });
function lineRect(w, d, x, z, thickness = .12) {
  addBox(w, thickness, thickness, x, .085, z - d / 2, lineMat);
  addBox(w, thickness, thickness, x, .085, z + d / 2, lineMat);
  addBox(thickness, thickness, d, x - w / 2, .085, z, lineMat);
  addBox(thickness, thickness, d, x + w / 2, .085, z, lineMat);
}
function lineSegment(x1, z1, x2, z2, thickness = .12) {
  const dx = x2 - x1, dz = z2 - z1, length = Math.hypot(dx, dz);
  const mesh = addBox(length, thickness, thickness, (x1 + x2) / 2, .085, (z1 + z2) / 2, lineMat);
  mesh.rotation.y = -Math.atan2(dz, dx);
}
lineRect(105, 68, 0, 0, .14);
lineSegment(0, -34, 0, 34);
const centerCircle = new THREE.Mesh(new THREE.TorusGeometry(9.15, .075, 6, 72), lineMat);
centerCircle.rotation.x = Math.PI / 2; centerCircle.position.y = .09; scene.add(centerCircle);
const spotMat = new THREE.MeshBasicMaterial({ color: 0xf0f3e9 });
for (const [x, z] of [[0, 0], [-41.5, 0], [41.5, 0]]) {
  const spot = new THREE.Mesh(new THREE.CircleGeometry(.16, 12), spotMat);
  spot.rotation.x = -Math.PI / 2; spot.position.set(x, .095, z); scene.add(spot);
}
for (const sign of [-1, 1]) {
  lineRect(16.5, 40.32, sign * 44.25, 0, .13);
  lineRect(5.5, 18.32, sign * 49.75, 0, .13);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(9.15, .075, 6, 48, Math.PI * .72), lineMat);
  arc.rotation.x = Math.PI / 2; arc.rotation.z = sign === 1 ? Math.PI / 2 : -Math.PI / 2;
  arc.position.set(sign * 41.5, .09, 0); scene.add(arc);
}

// Goals, nets and corner flags.
const postMat = mat(0xf4f5ed, .35, .25), netMat = new THREE.LineBasicMaterial({ color: 0xdbe5df, transparent: true, opacity: .42 });
for (const sign of [-1, 1]) {
  const gx = sign * 52.5;
  for (const z of [-3.66, 3.66]) addCylinder(.075, .075, 2.44, gx, 1.22, z, postMat, scene, 12);
  addCylinder(.075, .075, 7.32, gx, 2.44, 0, postMat, scene, 12).rotation.x = Math.PI / 2;
  const backX = gx + sign * 2.1;
  for (const z of [-3.66, 3.66]) lineSegment(gx, z, backX, z, .055);
  lineSegment(backX, -3.66, backX, 3.66, .055);
  for (let i = 0; i <= 8; i++) {
    const z = -3.66 + i * .915;
    lineSegment(gx, z, backX, z, .035);
  }
  for (let i = 0; i <= 4; i++) {
    const xx = gx + sign * i * .525;
    lineSegment(xx, -3.66, xx, 3.66, .035);
  }
}
const flagMat = mat(0xb5e65b);
for (const x of [-52.5, 52.5]) for (const z of [-34, 34]) {
  addCylinder(.025, .035, 1.4, x, .7, z, postMat);
  const flag = addBox(.55, .28, .025, x + (x < 0 ? .27 : -.27), 1.25, z, flagMat);
}

// Stadium bowl: stepped seating tiers, roof canopies and a dense but inexpensive instanced crowd.
const standMat = mat(0x26333a, .92), seatMat = mat(0x17252c, .85), roofMat = mat(0x17232d, .5, .45);
for (let row = 0; row < 17; row++) {
  const y = 2.2 + row * 1.15, offset = row * .72;
  const z = 47 + row * .78;
  addBox(132 - offset * 1.4, 1.2, 1.35, 0, y, z, row % 3 ? standMat : seatMat);
  addBox(132 - offset * 1.4, 1.2, 1.35, 0, y, -z, row % 3 ? standMat : seatMat);
  const x = 64 + row * .7;
  addBox(1.35, 1.2, 96 - offset * 1.4, x, y, 0, row % 3 ? standMat : seatMat);
  addBox(1.35, 1.2, 96 - offset * 1.4, -x, y, 0, row % 3 ? standMat : seatMat);
}
markRoofForCameraExclusion(addBox(140, 2.2, 30, 0, 22.8, 59, roofMat));
markRoofForCameraExclusion(addBox(140, 2.2, 30, 0, 22.8, -59, roofMat));
markRoofForCameraExclusion(addBox(30, 2.2, 105, 70, 22.8, 0, roofMat));
markRoofForCameraExclusion(addBox(30, 2.2, 105, -70, 22.8, 0, roofMat));
for (const z of [-74, 74]) {
  markRoofForCameraExclusion(addBox(136, .35, .6, 0, 19.5, z, mat(0xa3e635, .35, .15)));
  markRoofForCameraExclusion(addBox(136, .18, .6, 0, 20.1, z, mat(0x9ccf58, .3, .1)));
}
for (const x of [-82, 82]) markRoofForCameraExclusion(addBox(.6, .35, 100, x, 19.5, 0, mat(0xa3e635, .35, .15)));

const crowdColors = [0x31506a, 0x9c3f3b, 0xddd8c8, 0x365f47, 0x9c824b, 0x202b3a, 0x758b98, 0x5e344c];
const crowdCount = mobile ? 1900 : 4400;
const torsoGeo = new THREE.CapsuleGeometry(.16, .38, 2, 5);
const headGeo = new THREE.SphereGeometry(.105, 5, 4);
const torsoMesh = new THREE.InstancedMesh(torsoGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .96 }), crowdCount);
const headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 }), crowdCount);
const dummy = new THREE.Object3D(), color = new THREE.Color();
let seed = 711;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < crowdCount; i++) {
  const side = i % 4, row = Math.floor(random() * 16), lane = random();
  let x, z;
  if (side < 2) { x = (random() - .5) * (119 - row * 1.1); z = (side === 0 ? 1 : -1) * (47 + row * .78 + lane * .7); }
  else { x = (side === 2 ? 1 : -1) * (64 + row * .7 + lane * .7); z = (random() - .5) * (83 - row * 1.1); }
  const y = 2.6 + row * 1.15;
  const scale = .82 + random() * .35;
  dummy.position.set(x, y + .36 * scale, z); dummy.rotation.set(0, random() * Math.PI * 2, 0); dummy.scale.set(scale, scale, scale); dummy.updateMatrix();
  torsoMesh.setMatrixAt(i, dummy.matrix); color.setHex(crowdColors[Math.floor(random() * crowdColors.length)]); torsoMesh.setColorAt(i, color);
  dummy.position.set(x, y + .77 * scale, z); dummy.scale.setScalar(scale); dummy.updateMatrix();
  headMesh.setMatrixAt(i, dummy.matrix); color.setHex([0xc98e6a, 0x9b674e, 0xe1b18b, 0x704a38][Math.floor(random() * 4)]); headMesh.setColorAt(i, color);
}
torsoMesh.instanceMatrix.needsUpdate = true; headMesh.instanceMatrix.needsUpdate = true;
scene.add(torsoMesh, headMesh);

const boardMat = mat(0x07131b, .45, .55);
for (const z of [-38, 38]) {
  addBox(118, 1.1, .6, 0, .7, z, boardMat);
  addBox(116, .06, .04, 0, 1.28, z + (z < 0 ? .33 : -.33), mat(0xb5e65b, .35, .2));
}
for (const x of [-59, 59]) addBox(.6, 1.1, 78, x, .7, 0, boardMat);
for (const x of [-91, 91]) for (const z of [-79, 79]) {
  addCylinder(.25, .38, 39, x, 19.5, z, mat(0x36434a, .5, .55), scene, 8);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xe9f2ff }));
  lamp.position.set(x, 39.3, z); scene.add(lamp);
  const glow = new THREE.PointLight(0xdbeaff, mobile ? 110 : 170, 120, 1.8);
  glow.position.set(x, 38, z); scene.add(glow);
}

// Dugouts and technical-area details.
for (const sign of [-1, 1]) {
  const bench = new THREE.Group();
  addBox(16, .25, 2.1, 0, .9, 0, mat(0x18232a), bench);
  addBox(16, 2.1, .15, 0, 2.0, -sign * .9, mat(0x263c46, .35, .3), bench);
  for (let i = 0; i < 10; i++) addBox(1.2, .8, .75, -7 + i * 1.55, .55, .1, mat(0x52636a), bench);
  bench.position.set(0, 0, sign * 39.5); scene.add(bench);
}

// Match state and animated player meshes.
const simulation = new FootballSimulation({ seed: 11, halfLengthSeconds: 2700, matchTimeScale: 60 });
const playerMeshes = new Map();
const kitMats = [mat(0x2876d9, .55), mat(0xd93f3d, .55)];
const shortsMats = [mat(0xe8edf2, .7), mat(0x1b2027, .7)];
const keeperMats = [mat(0xf1c72d, .55), mat(0x49b96e, .55)];
const skinMat = mat(0xb98262, .85), sockMat = [mat(0xe9edf2), mat(0x20242a)];
function createPlayerMesh(p) {
  const group = new THREE.Group();
  const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .62, 3, 7), p.role === "GK" ? keeperMats[p.team] : kitMats[p.team]);
  shirt.position.y = 1.0; group.add(shirt);
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(.56, .28, .38), shortsMats[p.team]);
  shorts.position.y = .52; group.add(shorts);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), skinMat);
  head.position.y = 1.68; group.add(head);
  const legMat = sockMat[p.team];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.085, .07, .48, 7), legMat);
    leg.position.set(side * .16, .23, 0); group.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.14, .1, .27), mat(0x14191d, .55));
    boot.position.set(side * .16, .06, -.08); group.add(boot);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .045, 6, 28), new THREE.MeshBasicMaterial({ color: 0xf4d36d }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .09; ring.visible = false; group.add(ring);
  group.userData.ring = ring;
  scene.add(group); playerMeshes.set(p.id, group); return group;
}
for (const p of simulation.players) createPlayerMesh(p);
const ball = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), mat(0xf4f5ee, .32));
scene.add(ball);
const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(.32, 16), new THREE.MeshBasicMaterial({ color: 0x030806, transparent: true, opacity: .42 }));
ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = .07; scene.add(ballShadow);

const scoreEl = document.querySelector("#score"), clockEl = document.querySelector("#clock");
const statusEl = document.querySelector("#status"), eventEl = document.querySelector("#event");
const keys = new Set(); let joystick = { x: 0, y: 0, sprint: false }, last = performance.now(), lastRender = 0;
let lastEvent = "", eventUntil = 0, paused = false;
const formatClock = t => String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(Math.floor(t % 60)).padStart(2, "0");
function action(name) {
  if (name === "pass") simulation.command({ type: "pass" });
  else if (name === "shoot") simulation.command({ type: "shoot", power: 1 });
  else if (name === "switch") simulation.command({ type: "switch" });
  else if (name === "tackle") simulation.command({ type: "tackle" });
  else if (name === "restart") simulation.command({ type: "restart" });
  else if (name === "pause") paused = !paused;
}
document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("pointerdown", event => {
  event.preventDefault(); action(button.dataset.action);
}));
window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
  keys.add(key); if (event.repeat) return;
  if (key === "p") action("pass");
  if (key === " " || key === "enter") action("shoot");
  if (key === "e") action("switch");
  if (key === "q") action("tackle");
  if (key === "r") action("restart");
  if (key === "escape") action("pause");
});
window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
function updateInput() {
  let x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0) + joystick.x;
  let y = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0) + joystick.y;
  const magnitude = Math.hypot(x, y);
  if (magnitude > 1) { x /= magnitude; y /= magnitude; }
  simulation.command({ type: magnitude > .01 ? "move" : "releaseMove", x, y, sprint: keys.has("shift") || joystick.sprint });
}
const stick = document.querySelector("#stick"), nub = document.querySelector("#nub");
let stickPointer = null;
function moveStick(event) {
  const rect = stick.getBoundingClientRect(), dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2;
  const max = rect.width * .34, length = Math.hypot(dx, dy), factor = length > max ? max / length : 1;
  joystick.x = dx * factor / max; joystick.y = dy * factor / max;
  nub.style.transform = `translate(${joystick.x * max}px,${joystick.y * max}px)`;
}
stick.addEventListener("pointerdown", event => { stickPointer = event.pointerId; stick.setPointerCapture(stickPointer); moveStick(event); });
stick.addEventListener("pointermove", event => { if (event.pointerId === stickPointer) moveStick(event); });
function releaseStick(event) {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null; joystick.x = 0; joystick.y = 0; nub.style.transform = "translate(0,0)";
}
stick.addEventListener("pointerup", releaseStick); stick.addEventListener("pointercancel", releaseStick);
document.querySelector("#sprint").addEventListener("pointerdown", e => { e.preventDefault(); joystick.sprint = true; });
for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) window.addEventListener(name, () => { joystick.sprint = false; });

function syncMeshes(snapshot) {
  for (const p of snapshot.players) {
    let group = playerMeshes.get(p.id);
    if (!group && !p.out) group = createPlayerMesh(p);
    if (!group) continue;
    group.visible = !p.out;
    if (!p.out) {
      group.position.set(p.x - 52.5, 0, p.y - 34);
      group.rotation.y = -p.facing - Math.PI / 2;
      group.userData.ring.visible = p.selected;
      const speed = Math.hypot(p.vx, p.vy);
      const moving = speed > .35;
      group.position.y = moving ? Math.abs(Math.sin(snapshot.time * 10 + p.id)) * .045 : 0;
    }
  }
  const b = snapshot.ball;
  ball.position.set(b.x - 52.5, b.z + .22, b.y - 34);
  ballShadow.position.set(b.x - 52.5, .075, b.y - 34);
  ballShadow.scale.setScalar(1 + b.z * .08);
  scoreEl.textContent = snapshot.score[0] + " — " + snapshot.score[1];
  clockEl.textContent = formatClock(snapshot.matchSeconds);
  statusEl.textContent = paused ? "PAUSED · ESC TO RESUME" : snapshot.phase === "playing" ? (snapshot.period === 1 ? "FIRST HALF" : "SECOND HALF") + " · 4-3-3" : snapshot.phase.toUpperCase() + (snapshot.restart ? " · " + snapshot.restart.type.toUpperCase() : "");
  for (const event of snapshot.events) {
    const message = ({ goal: "GOAL!", keeperSave: "GOALKEEPER SAVE", tackleWon: "TACKLE WON", offside: "OFFSIDE", foul: "FOUL", restartAwarded: String(event.restartType || "restart").replace(/[A-Z]/g, " $&").toUpperCase() })[event.type];
    if (message && message !== lastEvent) { lastEvent = message; eventUntil = performance.now() + 1900; eventEl.textContent = message; }
  }
  if (performance.now() > eventUntil) eventEl.textContent = "";
}
function frame(now) {
  requestAnimationFrame(frame);
  const frameMs = mobile ? 1000 / 30 : 1000 / 60;
  if (now - lastRender < frameMs) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now; lastRender = now;
  if (!paused) { updateInput(); simulation.update(dt); }
  const snapshot = simulation.getSnapshot();
  syncMeshes(snapshot);
  updateBroadcastCamera(camera, broadcastCamera, snapshot, dt);
  renderer.render(scene, camera);
}
document.addEventListener("visibilitychange", () => { last = performance.now(); });
window.addEventListener("resize", () => {
  const width = host.clientWidth, height = host.clientHeight;
  camera.aspect = width / height; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1 : 1.25)); renderer.setSize(width, height);
});
requestAnimationFrame(frame);
