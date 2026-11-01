// The scroll-driven walkthrough: renderer, lights, model, camera path and timeline.
// Framework-agnostic: the React component hands it a canvas and the HTML overlay nodes,
// and calls dispose() on unmount.
//
// Story units u (scroll progress × U_TOTAL):
//   0.0–1.0  ground-floor plan → walls rise → descent → lobby
//   1.0–1.17 detour (GAR): through the hall door to the garage, out the gate and along North Street
//   1.17–2.0 round the corner, café, clothing store
//   2.0      detour (BOOK): out along the avenue and into the bookshop, shop 03
//   3.205    detour (PLAN2): at the top of the stair, rise straight up to the floor-2 plan sheet, walls rise, back down
//   2.0–2.56 lift out of the shop, back to the drawing: floor-1 plan, walls rise, descent to the landing
//   2.56–3.00 floor 1: studio 1.02
//   3.00–3.25 up the stair to floor 2
//   3.25–3.76 floor 2: the residence, out through the French window
//   3.76–4.0  crane up the façade onto the roof terrace
//   4.0–4.8   east along the roof to the pergola deck, then back to the west deck and the sunset
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { makeTextures, paperDataURL } from './textures';
import { Room, makeMaterialLib, PAPER, shared } from './materials';
import { Builder, buildModel, buildDoor, buildGate, CUT, LEVELS, TREES, SHRUBS } from './building';
import { buildTrees } from './trees';
import { buildAnnotations } from './annotations';
import { S } from './scale';

// ---------- helpers ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const ease = (t) => t * t * (3 - 2 * t);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x * S, y, z * S);   // plan coordinates → world
const F1 = LEVELS.s1 + 0.02;                                   // floor-1 finished floor
const F2 = LEVELS.s2 + 0.02;                                   // floor-2 finished floor
// Detours: spans of raw u (scroll progress × U_TOTAL) spliced into the story. While one plays the
// story clock holds at `at`, then resumes at `resume`, so the story units above stay as they were.
const GAR = { from: 1.0, to: 1.54, at: 1.0, resume: 1.17 };
const BOOK = { from: 2.37, to: 2.72, at: 2.0, resume: 2.0 };
const PLAN2 = { from: 3.95, to: 4.47, at: 3.205, resume: 3.205 };
const DETOURS = [GAR, BOOK, PLAN2];
const lag = (d) => (d.to - d.from) - (d.resume - d.at);
const U_END = 4.80;
export const U_TOTAL = U_END + DETOURS.reduce((s, d) => s + lag(d), 0);
const BASE_VH = 900;    // scroll height per story unit at the calmest pace
function storyU(uRaw) {
  let shift = 0;
  for (const d of DETOURS) {
    if (uRaw < d.from) break;
    if (uRaw < d.to) return { u: d.at, detour: d };
    shift += lag(d);
  }
  return { u: uRaw - shift, detour: null };
}

// Rig keyframes: target (plan coords), yaw/pitch (deg), frame width W (plan metres), fov (deg).
// W is held while the fov opens — a dolly-zoom from an orthographic-looking plan into perspective.
const K_OPEN = [
  { u: 0.05, t: [10.2, 0, 3.6], yaw: 0, pitch: -90, W: 23, fov: 1.2 },
  { u: 0.28, t: [10.2, 0.8, 4.2], yaw: -24, pitch: -57, W: 25, fov: 2.4 },
  { u: 0.46, t: [8.8, 3.2, 3.6], yaw: -138, pitch: -30, W: 36, fov: 24 },
  { u: 0.62, t: [7.8, 3.4, 0.0], yaw: -180, pitch: 3, W: 13.5, fov: 46 },
];
// floor 1: first key is filled in at runtime from the end of the shop walk
const K_UP = [
  null,
  { u: 2.12, t: [5.5, 3.6, 4.5], yaw: 55, pitch: -55, W: 22, fov: 26 },
  { u: 2.24, t: [10.2, F1, 4.4], yaw: 0, pitch: -90, W: 23, fov: 1.2 },
  { u: 2.30, t: [10.2, F1, 4.4], yaw: 0, pitch: -90, W: 23, fov: 1.2 },
  { u: 2.42, t: [9.0, F1 + 0.8, 5.0], yaw: 30, pitch: -56, W: 24, fov: 2.4 },
  { u: 2.50, t: [8.0, F1 + 1.4, 6.6], yaw: 20, pitch: -38, W: 14, fov: 22 },
  { u: 2.56, t: [7.8, F1 + 1.55, 5.3], yaw: 0, pitch: -2, W: 2.6, fov: 50 },
];

// floor 2 (local t 0–1 across PLAN2). Filled in buildPaths: the ends are the stair view at PLAN2.at,
// and keys 1 and n−2 sit straight above it, so the camera lifts vertically off the stair (and drops
// back onto it) rather than backing away. The rise looks over the east units, the half the walk skips.
const K_UP2 = [
  null,
  null,
  { u: 0.22, t: [15.6, F2 + 0.3, 4.4], yaw: -35, pitch: -50, W: 17, fov: 26 },
  { u: 0.34, t: [10.2, F2, 4.4], yaw: 0, pitch: -90, W: 23, fov: 1.2 },
  { u: 0.46, t: [10.2, F2, 4.4], yaw: 0, pitch: -90, W: 23, fov: 1.2 },
  { u: 0.64, t: [9.0, F2 + 0.8, 5.0], yaw: 30, pitch: -56, W: 24, fov: 2.4 },
  { u: 0.82, t: [8.0, F2 + 1.4, 6.6], yaw: 20, pitch: -38, W: 14, fov: 22 },
  null,
  null,
];
const UP2_RISE = 0.1, UP2_FALL = 0.9;

// Timed walk keys (u, eye, look) in plan coordinates.
const WALK_SHOPS = [
  [1.00, [7.45, 1.58, 6.22], [11.6, 1.9, 5.6]],
  [1.04, [7.62, 1.6, 5.4], [7.8, 1.6, 1.5]],
  [1.09, [7.8, 1.6, 2.4], [7.8, 1.6, -2.5]],
  [1.13, [7.8, 1.6, -0.8], [5.8, 1.6, -3.0]],
  [1.17, [5.9, 1.62, -1.8], [0.0, 1.6, -1.6]],
  [1.21, [2.2, 1.62, -1.9], [-1.6, 1.55, 0.6]],
  [1.25, [-0.3, 1.6, -1.0], [-0.5, 1.5, 4.5]],
  [1.28, [-0.35, 1.6, 0.9], [0.8, 1.5, 2.4]],
  [1.31, [-0.45, 1.6, 2.33], [3.0, 1.45, 2.1]],
  [1.35, [0.95, 1.6, 2.0], [4.5, 1.4, 1.75]],
  [1.40, [2.4, 1.6, 1.28], [5.0, 1.3, 2.25]],
  [1.45, [3.9, 1.6, 1.18], [5.6, 1.45, 1.6]],
  [1.50, [4.6, 1.6, 1.3], [1.0, 1.35, 0.9]],
  [1.54, [4.6, 1.6, 1.32], [0.8, 1.45, 1.35]],
  [1.58, [1.5, 1.6, 1.95], [-1.0, 1.5, 2.35]],
  [1.61, [-0.5, 1.6, 2.45], [-0.5, 1.5, 5.5]],
  [1.64, [-0.55, 1.6, 3.6], [2.0, 1.5, 3.7]],
  [1.68, [0.95, 1.6, 3.6], [4.0, 1.35, 4.4]],
  [1.74, [2.0, 1.6, 3.75], [4.7, 1.2, 5.3]],
  [1.81, [2.75, 1.5, 4.05], [2.85, 1.15, 5.7]],
  [1.89, [4.6, 1.6, 4.55], [1.0, 1.35, 4.3]],
  [2.00, [4.65, 1.6, 4.55], [0.9, 1.5, 4.5]],
];
// raw u: the hall door, the corridor, the garage, out through the gate and west along the
// sidewalk; the last three keys are WALK_SHOPS 1.13–1.21, so the hand-over keeps its velocity
const WALK_GARAGE = [
  [1.00, [7.45, 1.58, 6.22], [11.6, 1.9, 5.6]],
  [1.04, [8.6, 1.6, 6.35], [11.9, 1.35, 6.45]],
  [1.09, [10.6, 1.6, 6.45], [14.4, 1.4, 6.55]],
  [1.13, [12.9, 1.6, 6.65], [16.0, 1.35, 6.6]],
  // through the door: hold a wide view across the bays, then thread between the cars to the gate
  [1.165, [14.85, 1.7, 6.55], [16.2, 0.8, 2.6]],
  [1.20, [15.3, 1.75, 6.35], [19.6, 0.8, 3.0]],
  [1.235, [15.45, 1.75, 5.45], [19.2, 0.75, 2.5]],
  [1.265, [16.3, 1.7, 4.6], [19.3, 0.8, 2.6]],
  [1.295, [17.25, 1.65, 3.0], [17.25, 1.5, -2.0]],
  [1.33, [17.2, 1.6, 0.3], [16.0, 1.55, -3.5]],
  [1.37, [16.4, 1.6, -1.3], [11.0, 1.6, -2.2]],
  [1.44, [12.0, 1.6, -1.3], [6.0, 1.6, -2.0]],
  [GAR.to - 0.04, ...WALK_SHOPS[3].slice(1)],
  [GAR.to, ...WALK_SHOPS[4].slice(1)],
  [GAR.to + 0.04, ...WALK_SHOPS[5].slice(1)],
];
// raw u from BOOK.from: out of the clothing store, south along the avenue, into the bookshop
const WALK_BOOK = [
  [0.00, ...WALK_SHOPS[WALK_SHOPS.length - 1].slice(1)],
  [0.04, [2.4, 1.6, 3.9], [-0.5, 1.5, 3.75]],
  [0.08, [0.6, 1.6, 3.6], [-2.0, 1.55, 3.9]],
  [0.12, [-0.9, 1.6, 4.7], [-0.4, 1.5, 7.5]],
  [0.16, [-0.8, 1.6, 6.4], [2.0, 1.5, 6.65]],
  [0.20, [1.3, 1.6, 6.65], [4.0, 1.4, 7.5]],
  [0.25, [2.3, 1.6, 6.6], [3.0, 1.1, 8.6]],
  [0.30, [3.6, 1.6, 6.9], [1.2, 1.2, 8.0]],
  [0.35, [4.8, 1.6, 6.8], [1.0, 1.4, 7.4]],
].map(([o, e, l]) => [BOOK.from + o, e, l]);
const E1 = F1 + 1.6, E2 = F2 + 1.6;   // eye heights
const RISE = (LEVELS.s2 - LEVELS.s1) / 22;
const WALK_UP = [
  // [u, eye, look] — first key filled from the end of the descent rig
  null,
  [2.60, [7.8, E1, 6.0], [7.3, E1, 5.3]],
  [2.635, [7.75, E1, 5.32], [4.5, E1 - 0.1, 5.2]],
  [2.67, [6.2, E1, 5.25], [3.0, E1 - 0.45, 4.3]],
  [2.74, [5.0, E1, 4.7], [0.6, E1 - 0.55, 3.9]],
  [2.81, [4.3, E1, 4.35], [4.4, E1 - 0.6, 5.9]],
  [2.88, [3.0, E1, 4.85], [0.3, E1 - 0.25, 3.9]],
  [2.94, [4.6, E1, 4.85], [7.0, E1 - 0.1, 5.3]],
  [3.00, [6.6, E1, 5.3], [7.8, E1, 5.9]],
  // corridor, then the stair to floor 2
  [3.04, [7.8, E1, 6.4], [7.9, E1, 8.2]],
  [3.08, [8.05, E1, 7.42], [10.6, E1 + 0.7, 7.42]],
  [3.125, [10.6, E1 + 8 * RISE, 7.42], [9.0, E1 + 2.6, 8.4]],   // looking back up at the upper flight over the spine
  [3.145, [11.45, E1 + 11 * RISE, 7.6], [9.0, E1 + 2.6, 8.35]],
  [3.165, [11.5, E1 + 11 * RISE, 8.25], [8.5, E1 + 2.6, 8.3]],
  [3.19, [9.6, E1 + 18.7 * RISE, 8.31], [7.6, E2, 8.25]],
  [3.23, [8.3, E2, 8.22], [7.0, E2 - 0.05, 8.2]],
  // floor 2: the residence
  [3.30, [7.6, E2, 8.2], [6.0, E2 - 0.05, 8.1]],
  [3.33, [6.2, E2, 7.95], [4.5, E2 - 0.15, 6.55]],
  // the bedroom first: in along the aisle at the foot of the bed, turn to the TV wall, back out
  [3.36, [5.3, E2, 6.5], [3.3, E2 - 0.4, 7.9]],
  [3.40, [4.0, E2, 6.55], [3.0, E2 - 0.55, 8.3]],
  [3.44, [2.2, E2, 6.75], [4.2, E2 - 0.45, 7.9]],
  [3.47, [2.5, E2, 6.95], [3.6, E2 - 0.35, 5.86]],
  [3.50, [4.2, E2, 6.5], [6.5, E2 - 0.1, 6.45]],
  [3.525, [5.9, E2, 6.55], [6.2, E2 - 0.2, 3.5]],   // clear of the bedroom door's swing
  // then the living room and kitchen
  [3.55, [5.85, E2, 4.9], [1.0, E2 - 0.5, 3.6]],
  [3.59, [4.25, E2, 3.5], [6.9, E2 - 0.6, 2.5]],
  [3.63, [3.1, E2, 4.2], [0.0, E2 - 0.2, 4.25]],
  [3.70, [1.3, E2, 4.25], [-3.0, E2 - 0.1, 4.25]],
  [3.76, [-0.8, E2 + 0.2, 4.25], [-5.0, E2 + 0.4, 4.3]],
  // crane up onto the roof
  [3.84, [-3.5, 10.6, 4.3], [1.5, 10.4, 4.5]],
  [3.92, [-0.9, 12.0, 4.4], [3.0, 10.9, 4.4]],
  // east first, along the south parapet to the dining deck under the pergola
  [4.00, [0.9, 11.55, 6.9], [6.0, 11.2, 7.3]],
  [4.07, [5.0, 11.5, 7.35], [9.5, 11.2, 7.5]],
  [4.15, [9.5, 11.55, 7.45], [14.5, 11.1, 6.2]],
  [4.23, [13.4, 11.5, 7.75], [17.85, 10.9, 4.2]],
  [4.31, [15.5, 11.5, 7.55], [17.9, 10.8, 3.4]],
  [4.39, [15.95, 11.5, 4.3], [19.6, 10.9, 2.4]],
  // back west along the north parapet, ending on the west deck facing the hills at sunset
  [4.46, [15.4, 11.5, 1.6], [8.0, 11.2, 1.8]],
  [4.53, [11.0, 11.55, 1.6], [4.0, 11.2, 2.0]],
  [4.61, [7.4, 11.55, 1.5], [1.5, 11.0, 3.2]],
  [4.70, [5.5, 11.65, 1.9], [-0.8, 10.9, 4.4]],
  [4.80, [5.6, 12.3, 2.05], [-1.2, 10.95, 4.6]],
];

export function createExperience({ canvas, ui, record = false, onReady }) {
  let disposed = false;
  const cleanups = [];

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(record ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT);
  renderer.clippingPlanes = [clip];

  const scene = new THREE.Scene();
  scene.background = PAPER.clone();
  scene.fog = new THREE.FogExp2(0xd9d4ca, 0);

  const camera = new THREE.PerspectiveCamera(1.2, window.innerWidth / window.innerHeight, 1, 3000);
  camera.rotation.order = 'YXZ';

  // ---------- sky dome (paper → late-afternoon sky) ----------
  const skyU = { uSky: { value: 0 }, uPaper: shared.uPaper };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uSky; uniform vec3 uPaper; varying vec3 vD;
      void main(){
        float h = clamp(vD.y, 0.0, 1.0);
        vec3 horizon = vec3(0.93, 0.86, 0.76), zenith = vec3(0.46, 0.62, 0.82);
        vec3 s = mix(horizon, zenith, pow(h, 0.55));
        float glow = pow(max(dot(normalize(vD), normalize(vec3(-0.75, 0.25, -0.55))), 0.0), 18.0);
        s += vec3(0.25, 0.16, 0.06) * glow;
        // distant hills
        float az = atan(vD.z, vD.x);
        float ridge = 0.035 + 0.025 * sin(az * 3.0 + 1.3) + 0.015 * sin(az * 7.0 + 0.4) + 0.008 * sin(az * 17.0);
        if (vD.y < ridge && vD.y > -0.02) s = mix(s, vec3(0.52, 0.55, 0.50), 0.55);
        gl_FragColor = vec4(mix(uPaper, s, uSky), 1.0);
      }`,
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  // ---------- light: low sun from the north-west (southern hemisphere, late afternoon) ----------
  const sunDir = new THREE.Vector3(-0.72, 0.36, -0.6).normalize();
  const sun = new THREE.DirectionalLight(0xffd2a1, 3.4);
  const sunTarget = V(10, 0, 4);
  sun.position.copy(sunDir).multiplyScalar(90).add(sunTarget);
  sun.target.position.copy(sunTarget);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const SR = 36 * S;
  Object.assign(sun.shadow.camera, { left: -SR, right: SR, top: SR, bottom: -SR, near: 1, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x8a7a66, 0.3));
  const point = (color, intensity, dist, [x, y, z]) => { const pl = new THREE.PointLight(color, intensity, dist, 2); pl.position.copy(V(x, y, z)); scene.add(pl); return pl; };
  // lobby
  for (const [z, i] of [[0.9, 1.6], [3.3, 1.6], [5.9, 1.4]]) point(0xffd6a6, i, 8, [7.8, 2.9, z]);
  point(0xffd6a6, 1.6, 8, [10.4, 2.9, 6.3]);
  // garage corridor and the three bays
  point(0xffd6a6, 1.3, 6, [13.1, 2.9, 6.95]);
  for (const x of [15.35, 17.25, 19.1]) point(0xfff1dc, 1.4, 9, [x, 3.0, 4.7]);
  // café pendants, clothing-store spots
  for (const x of [2.95, 3.85, 4.75]) point(0xffcf96, 1.4, 6, [x, 2.3, 1.56]);
  for (const x of [2.0, 4.0]) point(0xffe7cc, 2.0, 7, [x, 2.95, 4.45]);
  // bookshop: table pendants, a wash over each wall of shelves
  for (const x of [3.0, 4.1]) point(0xffcf96, 1.3, 6, [x, 2.2, 7.45]);
  for (const z of [6.5, 8.25]) point(0xffe7cc, 1.4, 6, [3.7, 2.95, z]);
  // studio 1.02: table pendant, reading lamp, landing sconces
  point(0xffcf96, 1.5, 6, [3.45, F1 + 1.95, 4.15]);
  point(0xffc98a, 1.1, 5, [1.55, F1 + 1.45, 5.55]);
  point(0xffd6a6, 1.3, 5, [7.4, F1 + 1.8, 5.3]);
  point(0xffd2a0, 0.7, 4, [1.77, F1 + 1.25, 3.35]);   // bed sconces
  point(0xffe2bc, 0.7, 4, [3.7, F1 + 1.45, 5.55]);   // under-shelf LED
  // residence (floor 2): island pendants, dining bar, floor lamp, landing sconces
  for (const z of [2.45, 3.75]) point(0xffcf96, 1.6, 6, [5.0, F2 + 2.0, z]);
  point(0xffd9a8, 2.2, 7, [3.0, F2 + 1.9, 1.46]);
  point(0xffc98a, 1.2, 5, [3.62, F2 + 1.45, 2.6]);
  point(0xffd6a6, 1.4, 5, [7.4, F2 + 1.8, 8.2]);
  point(0xffd2a0, 0.9, 5, [2.95, F2 + 1.3, 6.2]);   // residence bedroom, by the bed
  // roof: string lights glow
  for (const z of [3.1, 6.0]) point(0xffc98a, 1.2, 7, [2.6, LEVELS.roof + 2.5, z]);
  // a shaft of late sun falling down the light well onto the patio and across the hall floor
  const wellSun = new THREE.SpotLight(0xffc98f, 900, 30, 0.32, 0.6, 2);
  wellSun.position.copy(V(8.4, 16, 2.6)); wellSun.target.position.copy(V(10.9, 0, 6.0));
  wellSun.castShadow = true; wellSun.shadow.mapSize.set(1024, 1024);
  wellSun.shadow.bias = -0.0005; wellSun.shadow.normalBias = 0.02;
  scene.add(wellSun, wellSun.target);

  ui.paper.style.backgroundImage = `url(${paperDataURL()})`;

  const rooms = Object.fromEntries(['site', 'garage', 'lobby', 'cafe', 'boutique', 'shop3', 'care', 'office', 'upper', 'landing', 'studio', 'landing2', 'resi', 'roof']
    .map((n) => [n, new Room(n)]));
  let model, doors, gate, notes, walkCurve, lookCurve;
  const state = { p: 0 };

  // ---------- rig (target / yaw / pitch / frame width / fov) ----------
  function rigAt(keys, u) {
    let i = 0;
    while (i < keys.length - 2 && u > keys[i + 1].u) i++;
    const a = keys[i], b = keys[i + 1];
    const t = easeIO(seg(u, a.u, b.u));
    return {
      t: a.t.map((v, k) => lerp(v, b.t[k], t)),
      yaw: lerp(a.yaw, b.yaw, t) * D2R,
      pitch: lerp(a.pitch, b.pitch, t) * D2R,
      W: Math.exp(lerp(Math.log(a.W), Math.log(b.W), t)),
      fov: Math.exp(lerp(Math.log(a.fov), Math.log(b.fov), t)),
    };
  }
  const minHalfFov = (fov) => {
    const vf = fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    return Math.min(vf, hf) / 2;
  };
  function placeRig(c) {
    camera.fov = c.fov;
    const d = (c.W * S) / (2 * Math.tan(minHalfFov(c.fov)));
    camera.rotation.set(c.pitch, c.yaw, 0);
    const f = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    camera.position.copy(V(...c.t)).addScaledVector(f, -d);
    camera.near = Math.max(0.05, d * 0.04);
    camera.far = d + 2000;
    camera.updateProjectionMatrix();
  }
  // express an eye/look pair (plan coords) as a rig key, so a walk can hand over to a rig
  function rigFromEyeLook(u, eye, look, fov) {
    const e = V(...eye), l = V(...look);
    const f = l.clone().sub(e); const d = f.length(); f.normalize();
    const W = (2 * d * Math.tan(minHalfFov(fov))) / S;
    return { u, t: look, yaw: Math.atan2(-f.x, -f.z) / D2R, pitch: Math.asin(f.y) / D2R, W, fov };
  }

  // ---------- timed walks (Hermite through keys, continuous velocity) ----------
  // The eye follows a Hermite curve through the keys; the gaze is interpolated as yaw/pitch
  // (unwrapped, shortest way round) rather than as a look-at point, so it can never whip round
  // when a look point passes close to the eye. Angle tangents are flattened at turning points
  // (monotone), so the camera eases into each held view instead of overshooting it.
  function makeWalk(raw) {
    const keys = raw.map(([u, e, l]) => {
      const E = V(...e), d = V(...l).sub(E).normalize();
      return { u, e: E, yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(d.y) };
    });
    for (let i = 1; i < keys.length; i++) {
      let dy = keys[i].yaw - keys[i - 1].yaw;
      dy -= Math.round(dy / (2 * Math.PI)) * 2 * Math.PI;
      keys[i].yaw = keys[i - 1].yaw + dy;
    }
    const last = keys.length - 1;
    const tanV = (i) => (i === 0 || i === last) ? new THREE.Vector3()
      : keys[i + 1].e.clone().sub(keys[i - 1].e).divideScalar(keys[i + 1].u - keys[i - 1].u);
    const tanA = (i, k) => {
      if (i === 0 || i === last) return 0;
      const s0 = (keys[i][k] - keys[i - 1][k]) / (keys[i].u - keys[i - 1].u);
      const s1 = (keys[i + 1][k] - keys[i][k]) / (keys[i + 1].u - keys[i].u);
      return s0 * s1 <= 0 ? 0 : (2 * s0 * s1) / (s0 + s1);   // harmonic mean: monotone, no overshoot
    };
    const T = keys.map((_, i) => ({ e: tanV(i), yaw: tanA(i, 'yaw'), pitch: tanA(i, 'pitch') }));
    const eV = new THREE.Vector3();
    return (u) => {
      let i = 0;
      while (i < keys.length - 2 && u > keys[i + 1].u) i++;
      const a = keys[i], b = keys[i + 1], dt = b.u - a.u, t = clamp01((u - a.u) / dt), t2 = t * t, t3 = t2 * t;
      const h0 = 2 * t3 - 3 * t2 + 1, h1 = t3 - 2 * t2 + t, h2 = -2 * t3 + 3 * t2, h3 = t3 - t2;
      eV.copy(a.e).multiplyScalar(h0).addScaledVector(T[i].e, h1 * dt).addScaledVector(b.e, h2).addScaledVector(T[i + 1].e, h3 * dt);
      const ang = (k) => a[k] * h0 + T[i][k] * h1 * dt + b[k] * h2 + T[i + 1][k] * h3 * dt;
      camera.position.copy(eV);
      camera.rotation.set(ang('pitch'), ang('yaw'), 0);
    };
  }
  let walkGarage, walkBook, walkShops, walkUp;
  const walkEyeLook = (walk, u) => { walk(u); const f = new THREE.Vector3(); camera.getWorldDirection(f); return [camera.position.clone(), f]; };

  function buildPaths() {
    placeRig(rigAt(K_OPEN, K_OPEN[3].u));
    const e0 = camera.position.clone();
    walkCurve = new THREE.CatmullRomCurve3([
      e0, V(7.8, 1.62, -6.5), V(7.8, 1.6, -1.2), V(7.8, 1.6, 2.4), V(7.78, 1.6, 5.0), V(7.45, 1.58, 6.22),
    ], false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3([
      V(...K_OPEN[3].t), V(7.8, 1.7, 2.0), V(7.8, 1.6, 7.0), V(8.9, 1.7, 8.2), V(10.6, 1.6, 7.4), V(11.6, 1.55, 5.6),
    ], false, 'centripetal');
    walkGarage = makeWalk(WALK_GARAGE);
    walkShops = makeWalk(WALK_SHOPS);
    walkBook = makeWalk(WALK_BOOK);
    const end = WALK_BOOK[WALK_BOOK.length - 1];
    K_UP[0] = rigFromEyeLook(2.0, end[1], end[2], 54);
    // hand the descent rig over to the residence walk
    placeRig(rigAt(K_UP, 2.56));
    const p = camera.position, t = K_UP[K_UP.length - 1].t;
    WALK_UP[0] = [2.56, [p.x / S, p.y, p.z / S], t];
    walkUp = makeWalk(WALK_UP);
    // hand the floor-2 landing view to the plan rig and back
    const [e2, f2] = walkEyeLook(walkUp, PLAN2.at);
    const eye2 = [e2.x / S, e2.y, e2.z / S], look2 = [eye2[0] + f2.x * 2 / S, eye2[1] + f2.y * 2, eye2[2] + f2.z * 2 / S];
    const n = K_UP2.length;
    K_UP2[0] = rigFromEyeLook(0, eye2, look2, 56);
    K_UP2[n - 1] = rigFromEyeLook(1, eye2, look2, 56);
    K_UP2[1] = rigFromEyeLook(UP2_RISE, [eye2[0], F2 + 5.2, eye2[2]], [13.8, F2, 5.2], 56);
    K_UP2[n - 2] = rigFromEyeLook(UP2_FALL, [eye2[0], F2 + 4.5, eye2[2]], [7.4, F2 + 0.3, 7.2], 56);
  }
  // straight lift between two rig keys at the stair's fov: the eye moves on a line, the gaze turns
  // as yaw/pitch (the short way round), so it tips down without ever swinging up through the ceiling
  const liftA = new THREE.Vector3();
  function liftPose(a, b, t) {
    const rad = (k) => ({ ...k, yaw: k.yaw * D2R, pitch: k.pitch * D2R });   // keys are in degrees
    placeRig(rad(a)); liftA.copy(camera.position);
    placeRig(rad(b));
    camera.position.lerpVectors(liftA, camera.position, t);
    let dy = b.yaw - a.yaw; dy -= 360 * Math.round(dy / 360);
    camera.rotation.set(lerp(a.pitch, b.pitch, t) * D2R, (a.yaw + dy * t) * D2R, 0);
    camera.fov = 56; camera.near = 0.05; camera.far = 2500;
    camera.updateProjectionMatrix();
  }

  // ---------- timeline ----------
  const O = {
    street: V(7.8, 0, -7), door: V(7.8, 0, -0.2), garage: V(14.4, 0, 6.55), cafe: V(0.5, 0, 2.33), boutique: V(0.5, 0, 3.6), shop3: V(0.5, 0, 6.65),
    landing: V(7.9, 0, 7.0), studio: V(7.0, 0, 5.3), landing2: V(8.6, 0, 8.0), resi: V(7.0, 0, 8.2), roof: V(1.0, 0, 4.4),
  };
  const hazeColor = new THREE.Color(0.86, 0.84, 0.8);
  const bg = new THREE.Color();
  const lift = new THREE.Vector3();

  // ---------- pacing: scroll → story ----------
  // Scroll is spent in proportion to how much the camera is doing, so fast turns and big moves
  // get more of it and the whole walk keeps an even, unhurried pace.
  let warpE = null, warpU = null;
  const warp = (p) => {
    if (!warpE) return p * U_TOTAL;
    let lo = 0, hi = warpE.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (warpE[m] <= p) lo = m; else hi = m; }
    return lerp(warpU[lo], warpU[hi], (p - warpE[lo]) / Math.max(1e-9, warpE[hi] - warpE[lo]));
  };
  function buildPacing() {
    const N = 2400, du = U_TOTAL / N, w = [1], f0 = new THREE.Vector3(), f1 = new THREE.Vector3(), p0 = new THREE.Vector3();
    updateU(0); camera.getWorldDirection(f0); p0.copy(camera.position);
    let fov0 = camera.fov;
    for (let i = 1; i <= N; i++) {
      updateU(i * du);
      camera.getWorldDirection(f1);
      const rot = Math.acos(Math.min(1, f0.dot(f1))) / D2R / du;            // degrees per story unit
      const mv = camera.fov > 20 ? camera.position.distanceTo(p0) / du : 0;  // metres per unit, eye level only
      const zoom = Math.abs(Math.log(camera.fov / fov0)) / du;
      w.push(Math.min(5, Math.max(1, Math.pow(Math.max(rot / 2200, mv / 70, zoom / 6), 0.85))));
      f0.copy(f1); p0.copy(camera.position); fov0 = camera.fov;
    }
    const sm = w.map((_, i) => { let a = 0, n = 0; for (let j = -12; j <= 12; j++) { const v = w[i + j]; if (v !== undefined) { a += v; n++; } } return a / n; });
    warpU = sm.map((_, i) => i * du); warpE = [0];
    for (let i = 1; i <= N; i++) warpE.push(warpE[i - 1] + ((sm[i - 1] + sm[i]) / 2) * du);
    const total = warpE[N];
    warpE = warpE.map((e) => e / total);
    return total / U_TOTAL;   // how much longer the scroll must be to keep the base pace
  }

  function update(p) { updateU(warp(p), p); }
  function updateU(uRaw, p = uRaw / U_TOTAL) {
    const { u, detour } = storyU(uRaw);
    // how far we are "back on paper" for the floor-1 sequence (0 = built, 1 = drawing)
    const paperF1 = ease(seg(u, 2.02, 2.14)) * (1 - ease(seg(u, 2.44, 2.56)));
    // same for the floor-2 sheet, on the detour's own clock
    const t2 = detour === PLAN2 ? seg(uRaw, PLAN2.from, PLAN2.to) : 0;
    const paperF2 = ease(seg(t2, 0.1, 0.24)) * (1 - ease(seg(t2, 0.7, 0.9)));

    // 1. camera
    camera.near = 0.05; camera.far = 2500;
    if (detour === GAR) {
      camera.fov = 54 - 6 * ease(seg(uRaw - lag(GAR), 1.12, 1.18));   // the shop walk's fov, so the hand-over is seamless
      camera.updateProjectionMatrix();
      walkGarage(uRaw);
    } else if (detour === PLAN2) {
      const n = K_UP2.length;
      if (t2 < UP2_RISE) liftPose(K_UP2[0], K_UP2[1], easeIO(t2 / UP2_RISE));
      else if (t2 > UP2_FALL) liftPose(K_UP2[n - 2], K_UP2[n - 1], easeIO(seg(t2, UP2_FALL, 1)));
      else placeRig(rigAt(K_UP2, t2));
    } else if (detour === BOOK) {
      camera.fov = 54;
      camera.updateProjectionMatrix();
      walkBook(uRaw);
    } else if (u <= K_OPEN[3].u) placeRig(rigAt(K_OPEN, u));
    else if (u <= 1) {
      const t = easeIO(seg(u, 0.66, 0.93));
      camera.fov = lerp(K_OPEN[3].fov, 54, ease(seg(u, 0.7, 0.86)));
      camera.updateProjectionMatrix();
      camera.position.copy(walkCurve.getPointAt(t));
      camera.lookAt(lookCurve.getPointAt(t).add(lift.set(0, seg(u, 0.93, 1.0) * 0.35, 0)));
    } else if (u < 2) {   // u = 2 exactly is the end of the bookshop detour: the rise starts there
      camera.fov = 54 - 6 * ease(seg(u, 1.12, 1.18)) + 6 * ease(seg(u, 1.28, 1.34));
      camera.updateProjectionMatrix();
      walkShops(u);
    } else if (u <= 2.56) placeRig(rigAt(K_UP, u));
    else {
      camera.fov = 50 + 6 * ease(seg(u, 2.62, 2.72)) - 4 * ease(seg(u, 3.74, 3.84));
      camera.updateProjectionMatrix();
      walkUp(u);
    }

    // 2. section height
    let h;
    if (u < 0.36) h = lerp(CUT, LEVELS.pbTop - 0.01, ease(seg(u, 0.05, 0.28)));
    else if (u < 0.57) h = lerp(LEVELS.pbTop - 0.01, LEVELS.towers + 0.2, ease(seg(u, 0.36, 0.57)));
    else if (u < 2.015) h = 1e4;
    else if (u < 2.30) h = Math.min(LEVELS.s1 + CUT, Math.max(LEVELS.pbTop - 0.01, camera.position.y + 0.6));
    else if (u < 2.555) h = lerp(LEVELS.s1 + CUT, LEVELS.s1Top - 0.01, ease(seg(u, 2.30, 2.42)));
    else h = 1e4;
    if (detour === PLAN2) {
      const C2 = LEVELS.s2 + CUT;
      // nothing is cut while the camera is still inside: the ceiling opens as it rises through it,
      // then the section sweeps down to the plan cut
      h = t2 < 0.46 ? (camera.position.y + 0.25 < LEVELS.s2Top ? 1e4 : lerp(LEVELS.s2Top - 0.01, C2, ease(seg(t2, 0.12, 0.3))))
        : camera.position.y > LEVELS.s2Top ? lerp(C2, LEVELS.s2Top - 0.01, ease(seg(t2, 0.46, 0.6)))
        : 1e4;   // once the camera drops below the roof slab, the ceiling closes over it
    }
    clip.constant = h;
    for (const c of model.caps) {
      const { y0, y1 } = c.userData;
      c.visible = y0 < h - 0.005 && h < y1 - 0.005;
      c.position.y = h - 0.002;
    }

    // 3. drafting layers
    notes.ground.setOpacity(1 - ease(seg(u, 0.3, 0.44)));
    notes.floor1.setOpacity(ease(seg(u, 2.16, 2.24)) * (1 - ease(seg(u, 2.34, 2.46))));
    notes.floor2.setOpacity(ease(seg(t2, 0.26, 0.34)) * (1 - ease(seg(t2, 0.5, 0.62))));
    shared.uLineAlpha.value = (1 - 0.35 * ease(seg(u, 0.5, 0.62))) + 0.35 * Math.max(paperF1, paperF2);

    // 4. material wipes, room by room (and back to paper for the floor-1 sheet)
    const back = 1 - ease(seg(u, 2.02, 2.14));
    const reSite = ease(seg(u, 2.44, 2.56));
    const siteR = u < 2.3 ? lerp(0, 170, ease(seg(u, 0.6, 0.72))) * back : 170 * reSite;
    rooms.site.set(u < 2.3 ? O.street : O.landing, siteR - 0.01, lerp(4, 14, seg(u, 0.6, 0.72)));
    rooms.garage.set(u < 2.3 ? O.garage : O.landing,
      (u < 2.3 ? lerp(0, 16, ease(seg(uRaw, 1.12, 1.22))) * back : 170 * reSite) - 0.01, 2.5);
    rooms.lobby.set(O.door, (u < 2.3 ? lerp(0, 18, ease(seg(u, 0.75, 0.9))) * back : 18 * reSite) - 0.01, 2.2);
    rooms.cafe.set(O.cafe, lerp(0, 12, ease(seg(u, 1.29, 1.41))) * back - 0.01, 2.0);
    rooms.boutique.set(O.boutique, lerp(0, 11, ease(seg(u, 1.63, 1.75))) * back - 0.01, 2.0);
    rooms.shop3.set(O.shop3, lerp(0, 11, ease(seg(uRaw, BOOK.from + 0.14, BOOK.from + 0.26))) * back - 0.01, 2.0);
    rooms.landing.set(O.landing, lerp(0, 12, ease(seg(u, 2.5, 2.6))) - 0.01, 2.0);
    rooms.studio.set(O.studio, lerp(0, 11, ease(seg(u, 2.63, 2.78))) - 0.01, 2.2);
    rooms.landing2.set(O.landing2, lerp(0, 11, ease(seg(u, 3.06, 3.2))) - 0.01, 2.0);
    rooms.resi.set(O.resi, lerp(0, 16, ease(seg(u, 3.25, 3.37))) - 0.01, 2.5);
    rooms.roof.set(O.roof, lerp(0, 30, ease(seg(u, 3.76, 3.88))) - 0.01, 3.0);

    // back on paper for the floor-2 sheet: every room's wipe pulls back to its origin, then reopens
    if (paperF2 > 0) for (const rm of Object.values(rooms)) rm.uRadius.value = (rm.uRadius.value + 0.01) * (1 - paperF2) - 0.01;
    const skyT = ease(seg(u, 0.6, 0.7)) * (1 - Math.max(paperF1, paperF2));
    skyU.uSky.value = skyT;
    scene.background = bg.copy(PAPER).lerp(hazeColor, skyT);
    scene.fog.density = 0.0035 * skyT;
    sky.position.copy(camera.position);

    // 5. doors swing in as the camera reaches them
    doors.lobby.userData.open(ease(seg(u, 0.71, 0.8)));
    doors.hall.userData.open(ease(seg(uRaw, 1.03, 1.08)));
    doors.garage.userData.open(ease(seg(uRaw, 1.11, 1.15)));
    gate.userData.open(ease(seg(uRaw, 1.22, 1.30)));
    doors.cafe.userData.open(ease(seg(u, 1.26, 1.32)));
    doors.boutique.userData.open(ease(seg(u, 1.61, 1.66)));
    doors.shop3.userData.open(ease(seg(uRaw, BOOK.from + 0.13, BOOK.from + 0.18)));
    doors.studio.userData.open(ease(seg(u, 2.605, 2.64)));
    doors.resi.userData.open(ease(seg(u, 3.24, 3.28)));

    // 6. HTML layer
    ui.titleblock.style.opacity = 1 - ease(seg(u, 0.03, 0.1));
    if (ui.titleblock2) ui.titleblock2.style.opacity = ease(seg(u, 2.18, 2.24)) * (1 - ease(seg(u, 2.3, 2.36)));
    if (ui.titleblock3) ui.titleblock3.style.opacity = ease(seg(t2, 0.28, 0.34)) * (1 - ease(seg(t2, 0.44, 0.5)));
    ui.paper.style.opacity = 0.12 * Math.max(1 - ease(seg(u, 0.3, 0.5)), paperF1 * (1 - ease(seg(u, 2.34, 2.46))),
      paperF2 * (1 - ease(seg(t2, 0.5, 0.62))));
    for (const c of ui.captions) {
      const a = +c.dataset.in, b = +c.dataset.out;
      const fi = ease(seg(uRaw, a, a + 0.02)), fo = 1 - ease(seg(uRaw, b - 0.02, b));
      c.style.opacity = Math.min(fi, fo);
      c.style.transform = `translateY(${(1 - fi) * 10}px)`;
    }
    ui.railfill.style.height = `${p * 100}%`;
  }

  const render = () => renderer.render(scene, camera);

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    buildPaths();
    if (model) { ui.track.style.height = `${Math.round(BASE_VH * U_TOTAL * buildPacing())}vh`; update(state.p); render(); }
  }

  // ---------- scroll ----------
  function startScroll() {
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.7 });
    lenis.on('scroll', ScrollTrigger.update);
    const rafLenis = (t) => lenis.raf(t * 1000);
    // the rendered camera trails the scroll-driven one with a little inertia, like a dolly on a track
    const cam = { p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 0, ready: false };
    let last = performance.now();
    const tick = () => {
      update(state.p);
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!cam.ready) { cam.p.copy(camera.position); cam.q.copy(camera.quaternion); cam.fov = camera.fov; cam.ready = true; }
      // only at eye level: on the plan sheets the camera sits far off with a long lens, where any lag
      // between position, rotation and lens would make the drawing swim, so it follows exactly there
      const eye = ease(seg(camera.fov, 30, 46)) * clamp01(1.5 - camera.position.distanceTo(cam.p) / 2);
      const kp = lerp(1, 1 - Math.exp(-dt / 0.14), eye), kq = lerp(1, 1 - Math.exp(-dt / 0.24), eye);
      cam.p.lerp(camera.position, kp); cam.q.slerp(camera.quaternion, kq); cam.fov = lerp(cam.fov, camera.fov, kp);
      camera.position.copy(cam.p); camera.quaternion.copy(cam.q); camera.fov = cam.fov;
      camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      render();
    };
    gsap.ticker.add(rafLenis);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    const st = ScrollTrigger.create({
      trigger: ui.track, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { state.p = self.progress; },
    });
    cleanups.push(() => { st.kill(); gsap.ticker.remove(rafLenis); gsap.ticker.remove(tick); lenis.destroy(); });
  }

  // ---------- init ----------
  (async () => {
    try { await Promise.race([document.fonts.load('600 40px Inter'), new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* fonts optional */ }
    if (disposed) return;
    const lib = makeMaterialLib(makeTextures(renderer));
    const B = new Builder(lib, rooms);
    buildModel(B);
    model = B.build(scene);
    doors = {
      lobby: buildDoor(lib, rooms.site),
      cafe: buildDoor(lib, rooms.site, { W: 0.9, H: 2.66, hinge: [0.525, 0, 1.88], rot: -Math.PI / 2, dir: 1 }),
      shop3: buildDoor(lib, rooms.site, { W: 0.9, H: 2.66, hinge: [0.525, 0, 6.2], rot: -Math.PI / 2, dir: 1 }),
      boutique: buildDoor(lib, rooms.site, { W: 0.9, H: 2.66, hinge: [0.525, 0, 3.15], rot: -Math.PI / 2, dir: 1 }),
      studio: buildDoor(lib, rooms.landing, { W: 0.8, H: 2.33, hinge: [7.0, F1, 5.7], rot: Math.PI / 2, dir: 1, panel: 'walnut' }),
      resi: buildDoor(lib, rooms.landing2, { W: 0.8, H: 2.33, hinge: [7.0, F2, 8.6], rot: Math.PI / 2, dir: 1, panel: 'walnut' }),
      hall: buildDoor(lib, rooms.lobby, { W: 0.9, H: 2.18, hinge: [11.9, 0, 6.0], rot: -Math.PI / 2, dir: 1, panel: 'walnut' }),
      garage: buildDoor(lib, rooms.lobby, { W: 0.9, H: 2.18, hinge: [14.275, 0, 7.0], rot: Math.PI / 2, dir: -1, panel: 'walnut' }),   // swings south, clear of the view
    };
    Object.values(doors).forEach((d) => scene.add(d));
    gate = buildGate(lib, rooms.site);
    scene.add(gate);
    buildTrees(scene, lib, rooms, TREES, SHRUBS);
    notes = buildAnnotations(scene, F1 + 0.01, F2 + 0.01);

    const hdr = await new RGBELoader().loadAsync('/assets/venice_sunset_1k.hdr');
    if (disposed) { hdr.dispose(); return; }
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.55;
    hdr.dispose(); pm.dispose();

    resize();   // also builds the pacing table and sizes the scroll track
    renderer.compile(scene, camera);
    onReady?.();
    window.__ready = true;
    if (!record) startScroll();
  })();

  window.addEventListener('resize', resize);
  cleanups.push(() => window.removeEventListener('resize', resize));

  // deterministic hooks for recording / QA (?record)
  window.__setProgress = (p) => { if (!model) return; state.p = p; update(p); render(); };
  window.__setU = (u) => { if (!model) return; updateU(u); render(); };
  window.__cam = camera;

  return {
    dispose() {
      disposed = true;
      cleanups.forEach((f) => f());
      delete window.__setProgress;
      delete window.__setU;
      delete window.__cam;
      window.__ready = false;
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose(); });
      });
      scene.environment?.dispose();
      renderer.dispose();
    },
  };
}
