// Parked cars for the garage under the overhang, merged into the site like any other prop.
// Each body is lofted along its length from superellipse sections: the side profile sets the
// hood, deck and roof lines, the sill rises over each axle to cut the wheel arches, and the
// glasshouse is a second loft with tumblehome, roof skin and pillars in paint.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Kit } from './props.js';

// Three bays (x 14.4–16.3, 16.3–18.2, 18.2–20.15), two spaces in tandem in each: half are taken.
// [x, z, rot, paint, shape] in plan coordinates; rot −π/2 = nose in (facing south), π/2 = reversed in.
export const CARS = [
  [15.35, 2.6, -Math.PI / 2, 'carGreen', 'sedan'],
  [17.25, 6.6, -Math.PI / 2, 'carSilver', 'suv'],
  [19.15, 2.7, Math.PI / 2, 'carNavy', 'sedan'],
];

// t runs 0 (tail) → 1 (nose). Heights in metres.
const SHAPES = {
  sedan: {
    L: 4.72, W: 1.84, wheelR: 0.33, axle: 1.42,
    top: [[0, 0.6], [0.03, 0.86], [0.1, 0.97], [0.28, 1.0], [0.62, 0.96], [0.88, 0.86], [0.97, 0.78], [1, 0.6]],
    bot: [[0, 0.36], [0.04, 0.25], [0.96, 0.25], [1, 0.36]],
    cabin: { t0: 0.27, t1: 0.7, base: 0.9, hw0: 0.8, hw1: 0.6, roofT: [0.4, 0.57], bPillars: [0.485],
      roof: [[0.27, 0.95], [0.4, 1.38], [0.47, 1.43], [0.56, 1.42], [0.7, 0.93]] },
  },
  suv: {
    L: 4.68, W: 1.9, wheelR: 0.37, axle: 1.42,
    top: [[0, 0.72], [0.03, 0.96], [0.09, 1.05], [0.6, 1.05], [0.88, 0.98], [0.97, 0.9], [1, 0.72]],
    bot: [[0, 0.46], [0.04, 0.34], [0.96, 0.34], [1, 0.44]],
    cabin: { t0: 0.06, t1: 0.7, base: 0.98, hw0: 0.84, hw1: 0.68, roofT: [0.11, 0.57], bPillars: [0.27, 0.47],
      roof: [[0.06, 1.0], [0.1, 1.6], [0.2, 1.66], [0.56, 1.66], [0.7, 1.02]] },
  },
};

const lerp = (a, b, t) => a + (b - a) * t;
const se = (c, n) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);   // superellipse
function interp(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return lerp(v0, v1, u * u * (3 - 2 * u));
}

// sections: [{ x, pts: [[y, z], …] }], equal point counts. Closed rings get flat end caps.
function loft(sections, closed = true) {
  const M = sections[0].pts.length, pos = [], idx = [];
  sections.forEach(({ x, pts }) => pts.forEach(([y, z]) => pos.push(x, y, z)));
  const ring = closed ? M : M - 1;
  for (let i = 0; i < sections.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * M + j, b = i * M + (j + 1) % M;
    idx.push(a, a + M, b, b, a + M, b + M);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const parts = [g.toNonIndexed()];
  if (closed) for (const [sec, front] of [[sections[0], false], [sections[sections.length - 1], true]]) {
    const cy = sec.pts.reduce((s, p) => s + p[0], 0) / M, cap = [];
    for (let j = 0; j < M; j++) {
      const p = sec.pts[j], q = sec.pts[(j + 1) % M];
      const tri = [[sec.x, cy, 0], [sec.x, p[0], p[1]], [sec.x, q[0], q[1]]];
      if (front) tri.reverse();
      tri.forEach((v) => cap.push(...v));
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
    cg.computeVertexNormals();
    parts.push(cg);
  }
  return mergeGeometries(parts, false);
}

function bodyGeometry(sh) {
  const { L, W, wheelR, axle } = sh, N = 150, M = 40, Ra = wheelR + 0.07, secs = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = (t - 0.5) * L;
    let bot = interp(sh.bot, t);
    for (const xa of [-axle, axle]) {
      const dx = x - xa;
      if (Math.abs(dx) < Ra) bot = Math.max(bot, wheelR + Math.sqrt(Ra * Ra - dx * dx));
    }
    const top = interp(sh.top, t), yc = (top + bot) / 2, hh = (top - bot) / 2;
    const hw = (W / 2) * (0.8 + 0.2 * (1 - Math.pow(Math.abs(2 * t - 1), 5)));
    const pts = [];
    for (let j = 0; j < M; j++) {
      const th = (j / M) * Math.PI * 2, s = se(Math.sin(th), 5), c = se(Math.cos(th), 5);
      pts.push([yc + hh * s, hw * c * (1 - 0.07 * Math.max(0, s) ** 2)]);   // tumblehome above the shoulder
    }
    secs.push({ x, pts });
  }
  return loft(secs);
}

function cabinPoint(sh, t, th) {
  const cb = sh.cabin, u = (t - cb.t0) / (cb.t1 - cb.t0), roof = interp(cb.roof, t);
  const y = (cb.base + roof) / 2 + ((roof - cb.base) / 2) * se(Math.sin(th), 4);
  const f = (y - cb.base) / Math.max(roof - cb.base, 1e-3);
  const hw = lerp(cb.hw0, cb.hw1, f) * (1 - 0.08 * (2 * u - 1) ** 2);
  return [y, hw * se(Math.cos(th), 4)];
}
function cabinGeometry(sh, t0, t1, th0 = 0, th1 = Math.PI * 2, M = 36, grow = 0) {
  const N = 50, secs = [], closed = th1 - th0 >= Math.PI * 2 - 1e-6;
  for (let i = 0; i <= N; i++) {
    const t = lerp(t0, t1, i / N), pts = [];
    for (let j = 0; j < M; j++) {
      const [y, z] = cabinPoint(sh, t, lerp(th0, th1, closed ? j / M : j / (M - 1)));
      pts.push([y + grow, z * (1 + grow)]);
    }
    secs.push({ x: (t - 0.5) * sh.L, pts });
  }
  return loft(secs, closed);
}

function wheel(k, x, y, z, side, R) {
  const w = 0.235, rx = side > 0 ? Math.PI / 2 : -Math.PI / 2;   // local profile +y → outboard
  k.lathe([[R * 0.66, -w / 2], [R * 0.9, -w / 2], [R * 0.985, -w / 2 + 0.03], [R, -w / 2 + 0.075],
    [R, w / 2 - 0.075], [R * 0.985, w / 2 - 0.03], [R * 0.9, w / 2], [R * 0.66, w / 2]], x, y, z, 'rubber', { seg: 40, rx });
  k.lathe([[R * 0.66, w / 2 - 0.005], [R * 0.64, w / 2 - 0.015], [R * 0.6, w / 2 - 0.03], [R * 0.6, -w / 2 + 0.02]], x, y, z, 'carRim', { seg: 40, rx });
  k.cyl(R * 0.6, R * 0.6, 0.01, x, y, z - side * 0.02, 'carTrim', { center: true, rx: Math.PI / 2, seg: 32 });
  k.cyl(R * 0.45, R * 0.45, 0.02, x, y, z + side * (w / 2 - 0.08), 'brushed', { center: true, rx: Math.PI / 2, seg: 32 });
  for (let i = 0; i < 10; i++) {   // five twin spokes
    const a = (Math.floor(i / 2) / 5) * Math.PI * 2 + (i % 2 ? 0.13 : -0.13), rr = R * 0.36, h = R * 0.48;
    k.box(0.028, h, 0.022, x + Math.cos(a) * rr, y + Math.sin(a) * rr - h / 2, z + side * (w / 2 - 0.045), 'carRim', { r: 0.008, rz: a - Math.PI / 2, edges: false });
  }
  k.cyl(0.055, 0.06, 0.03, x, y, z + side * (w / 2 - 0.03), 'carRim', { center: true, rx: Math.PI / 2, seg: 20 });
}

function car(B, x, z, rot, paint, kind) {
  const sh = SHAPES[kind], { L, W, wheelR, axle } = sh, cb = sh.cabin;
  const k = new Kit(B, 'site', x, 0, z, rot).at(0, 0, 0);   // local metres, +x = forward
  const top = (t) => interp(sh.top, t);
  k.geom(bodyGeometry(sh), paint, { edges: true, edgeAngle: 40 });
  k.geom(cabinGeometry(sh, cb.t0, cb.t1), 'carGlass', { edges: false });
  k.geom(cabinGeometry(sh, cb.roofT[0], cb.roofT[1], 0.1 * Math.PI, 0.9 * Math.PI, 20, 0.008), paint, { edges: false });
  // pillars: A along the windscreen, C/D along the backlight, B posts in gloss black
  for (const side of [1, -1]) {
    const th = side > 0 ? 0.1 * Math.PI : 0.9 * Math.PI;
    const edge = (t0, t1) => Array.from({ length: 9 }, (_, i) => {
      const t = lerp(t0, t1, i / 8), [yy, zz] = cabinPoint(sh, t, th);
      return [(t - 0.5) * L, yy + 0.006, zz * 1.01];
    });
    k.tube(edge(cb.roofT[1] - 0.01, cb.t1 - 0.01), 0.032, paint, { ts: 24 });
    k.tube(edge(cb.t0 + 0.01, cb.roofT[0] + 0.01), 0.04, paint, { ts: 24 });
    const thLow = side > 0 ? -0.15 * Math.PI : 1.15 * Math.PI;
    for (const tb of cb.bPillars) k.tube(Array.from({ length: 6 }, (_, i) => {
      const [yy, zz] = cabinPoint(sh, tb, lerp(thLow, th, i / 5));
      return [(tb - 0.5) * L, yy, zz * 1.012];
    }), 0.03, 'carTrim', { ts: 12 });
    // chrome belt line along the base of the glass
    k.tube(Array.from({ length: 10 }, (_, i) => {
      const t = lerp(cb.t0 + 0.04, cb.t1 - 0.04, i / 9);
      const u = (t - cb.t0) / (cb.t1 - cb.t0);
      return [(t - 0.5) * L, top(t) + 0.004, side * cb.hw0 * (1 - 0.08 * (2 * u - 1) ** 2) * 1.01];
    }), 0.008, 'chrome', { ts: 30 });
    // mirror, door handles
    const tm = cb.t1 - 0.04, mx = (tm - 0.5) * L, my = top(tm) + 0.1;
    k.box(0.05, 0.03, 0.12, mx, my - 0.015, side * (cb.hw0 + 0.04), 'carTrim', { r: 0.01, edges: false });
    k.box(0.13, 0.11, 0.2, mx - 0.02, my - 0.04, side * (cb.hw0 + 0.18), paint, { r: 0.04, seg: 3, edges: false });
    for (const th2 of [0.53, kind === 'suv' ? 0.33 : 0.38]) {
      const hx = (th2 - 0.5) * L, hy = top(th2) - 0.12;
      k.box(0.16, 0.025, 0.02, hx, hy, side * (W / 2) * 0.94, 'chrome', { r: 0.01, edges: false });
    }
  }
  // wheel houses (dark liners keep the arches from reading as tunnels), wheels
  for (const xa of [-axle, axle]) {
    k.box(2 * (wheelR + 0.07), 0.48, W - 0.52, xa, wheelR - 0.08, 0, 'carTrim', { r: 0, edges: false });
    for (const side of [1, -1]) wheel(k, xa, wheelR, side * (W / 2 - 0.13), side, wheelR);
  }
  // nose: slim wrap-around headlamps, a DRL bar, a dark grille and lower intake, plate
  const yNose = top(0.985), yTail = top(0.03);
  for (const s of [-1, 1]) k.box(0.07, 0.06, 0.4, L / 2 - 0.07, yNose - 0.1, s * 0.56, 'headlight', { r: 0.02, ry: -s * 0.35, edges: false });
  k.box(0.02, 0.012, 1.1, L / 2 - 0.004, yNose - 0.13, 0, 'headlight', { r: 0.004, edges: false });
  k.box(0.04, 0.17, 0.82, L / 2 - 0.015, yNose - 0.33, 0, 'carTrim', { r: 0.04, edges: false });
  k.box(0.03, 0.08, 1.2, L / 2 - 0.03, interp(sh.bot, 0.99) + 0.03, 0, 'carTrim', { r: 0.03, edges: false });
  k.box(0.015, 0.11, 0.5, L / 2 + 0.003, yNose - 0.5, 0, 'paintWhite', { edges: false });
  // tail: full-width light bar, corner lamps, plate
  k.box(0.03, 0.045, W * 0.78, -L / 2 + 0.03, yTail - 0.09, 0, 'taillight', { r: 0.01, edges: false });
  for (const s of [-1, 1]) k.box(0.05, 0.08, 0.24, -L / 2 + 0.04, yTail - 0.11, s * 0.56, 'taillight', { r: 0.02, ry: -s * 0.3, edges: false });
  k.box(0.015, 0.11, 0.5, -L / 2 - 0.003, yTail - 0.3, 0, 'paintWhite', { edges: false });
}

export function buildCars(B) {
  for (const [x, z, rot, paint, kind] of CARS) car(B, x, z, rot, paint, kind);
}
