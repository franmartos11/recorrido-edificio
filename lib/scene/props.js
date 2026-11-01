// Furniture and objects, modelled procedurally: rounded edges, turned (lathe) profiles,
// bent tubes and draped cloth. Each prop is placed with a Kit (position + rotation), and its
// geometry is merged into the room it belongs to, so it reveals with that room.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { S } from './scale.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Y = V(0, 1, 0);
const qY = (a) => new THREE.Quaternion().setFromAxisAngle(Y, a);
const TAU = Math.PI * 2;

export function rnd(seed) { let a = seed | 0; return () => { a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class Kit {
  // A root Kit works in plan coordinates (x/z get multiplied by S); kits made with at()
  // work in the prop's own local metres.
  constructor(B, room, x = 0, y = 0, z = 0, rot = 0) {
    this.B = B; this.room = room; this.world = true;
    this.M = new THREE.Matrix4().compose(V(x * S, y, z * S), qY(rot), V(1, 1, 1));
  }
  at(x, y, z, rot = 0) {
    const k = new Kit(this.B, this.room);
    k.world = false;
    const s = this.world ? S : 1;
    k.M = this.M.clone().multiply(new THREE.Matrix4().compose(V(x * s, y, z * s), qY(rot), V(1, 1, 1)));
    return k;
  }
  _place(g, local, eg, mat, o) {
    const L = new THREE.Matrix4();
    let [x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0] = local ?? [];
    if (this.world && local) { x *= S; z *= S; }
    L.compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
    const W = this.M.clone().multiply(L);
    g.applyMatrix4(W);
    if (eg) eg.applyMatrix4(W);
    this.B.add(g, this.room, mat, { ...o, edgeGeom: eg ?? undefined, edges: eg ? o.edges : (o.edges ?? false) });
  }
  // box: (x, z) centre, y = bottom
  box(w, h, d, x, y, z, mat, o = {}) {
    if (this.world && !o.noScale) { w *= S; d *= S; }
    const r = Math.min(o.r ?? 0.008, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
    const g = r > 0.0008 ? new RoundedBoxGeometry(w, h, d, o.seg ?? 2, r) : new THREE.BoxGeometry(w, h, d);
    const eg = o.edges === false ? null : new THREE.BoxGeometry(w, h, d);
    this._place(g, [x, y + h / 2, z, o.rx, o.ry, o.rz], eg, mat, { fine: true, ...o, edges: o.edges ?? true });
  }
  // turned profile [[r, y], …], y relative to the placement point
  lathe(profile, x, y, z, mat, o = {}) {
    const g = new THREE.LatheGeometry(profile.map(([r, yy]) => new THREE.Vector2(Math.max(r, 0.0001), yy)), o.seg ?? 32);
    this._place(g, [x, y, z, o.rx, o.ry, o.rz], o.edges ? new THREE.LatheGeometry(profile.map(([r, yy]) => new THREE.Vector2(Math.max(r, 0.0001), yy)), o.seg ?? 32) : null, mat, { edgeAngle: 50, fine: true, ...o });
  }
  cyl(rt, rb, h, x, y, z, mat, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 24, 1, o.open ?? false);
    const c = o.center ? y : y + h / 2;
    this._place(g, [x, c, z, o.rx, o.ry, o.rz], o.edges ? new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 24) : null, mat, { edgeAngle: 50, fine: true, ...o });
  }
  sphere(r, x, y, z, mat, o = {}) {
    this._place(new THREE.SphereGeometry(r, o.seg ?? 20, o.seg2 ?? 14), [x, y, z, o.rx, o.ry, o.rz], null, mat, o);
  }
  torus(R, r, x, y, z, mat, o = {}) {
    this._place(new THREE.TorusGeometry(R, r, o.rs ?? 8, o.ts ?? 32, o.arc ?? TAU), [x, y, z, o.rx, o.ry, o.rz], null, mat, o);
  }
  tube(points, r, mat, o = {}) {
    const s = this.world ? S : 1;
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => V(x * s, y, z * s)), !!o.closed, 'centripetal');
    this._place(new THREE.TubeGeometry(curve, o.ts ?? Math.max(8, points.length * 8), r, o.rs ?? 8, !!o.closed), null, null, mat, o);
  }
  plane(w, h, x, y, z, mat, o = {}) {
    this._place(new THREE.PlaneGeometry(w, h), [x, y, z, o.rx, o.ry, o.rz], null, mat, { keepUV: true, ...o });
  }
  geom(g, mat, o = {}, local = null) { this._place(g, local, o.edgeGeom ?? null, mat, o); }
}

// ---------------- tableware ----------------
export function cup(k, x, y, z, rot = 0, mat = 'ceramic') {
  const c = k.at(x, y, z, rot);
  c.lathe([[0, 0], [0.024, 0], [0.028, 0.004], [0.036, 0.05], [0.038, 0.056], [0.034, 0.056], [0.031, 0.01], [0, 0.012]], 0, 0, 0, mat, { seg: 24 });
  c.torus(0.016, 0.0035, 0.035, 0.03, 0, mat, { arc: Math.PI, rz: -Math.PI / 2, ts: 12 });
}
export function saucer(k, x, y, z, mat = 'ceramic', R = 0.07) {
  k.lathe([[0, 0], [R * 0.7, 0], [R * 0.93, 0.01], [R, 0.015], [R * 0.95, 0.016], [R * 0.66, 0.007], [0, 0.007]], x, y, z, mat, { seg: 32 });
}
export function cupAndSaucer(k, x, y, z, rot = 0) { saucer(k, x, y, z); cup(k, x, y + 0.007, z, rot); }
export function croissant(k, x, y, z, rot = 0) {
  const c = k.at(x, y, z, rot);
  for (let i = 0; i < 7; i++) {
    const t = (i - 3) / 3, a = t * 1.1;
    const s = 1 - Math.abs(t) * 0.55;
    c.sphere(0.024 * s, Math.sin(a) * 0.05, 0.02 * s, -Math.cos(a) * 0.05 + 0.05, 'pastry', { sx: 1.25, sy: 0.85, ry: a, seg: 12, seg2: 8 });
  }
}
export function cake(k, x, y, z, base = 'cake0', top = 'cake1', r = 0.085) {
  k.lathe([[0, 0], [r, 0], [r, 0.06], [r * 0.97, 0.068], [0, 0.068]], x, y, z, base, { seg: 36 });
  k.lathe([[0, 0.066], [r * 0.98, 0.066], [r * 0.95, 0.078], [0, 0.08]], x, y, z, top, { seg: 36 });
  const R = rnd(Math.floor(x * 97 + z * 31));
  for (let i = 0; i < 7; i++) { const a = R() * TAU, rr = R() * r * 0.7; k.sphere(0.009, x + Math.cos(a) * rr, y + 0.085, z + Math.sin(a) * rr, 'berry', { seg: 8, seg2: 6 }); }
}
export function jar(k, x, y, z, h = 0.18, fill = 'beans') {
  k.lathe([[0, 0], [0.055, 0], [0.06, 0.01], [0.06, h - 0.03], [0.045, h - 0.01], [0.045, h]], x, y, z, 'glass', { seg: 24, glass: true, cast: false });
  k.cyl(0.054, 0.054, h * 0.55, x, y + 0.004, z, fill, { seg: 20 });
  k.cyl(0.05, 0.05, 0.022, x, y + h - 0.005, z, 'walnut', { seg: 20 });
}
// Thrown vase with a real wall and open mouth. bloom: a flower material (open five-petal heads
// with two leaves per stem), or null for leafy eucalyptus-like branches.
export function vase(k, x, y, z, { mat = 'glaze', h = 0.26, r = 0.07, stems = 5, bloom = 'blossom', seed = 1 } = {}) {
  k.lathe([[0, 0], [r * 0.62, 0], [r * 0.7, 0.008], [r * 0.96, h * 0.28], [r, h * 0.42], [r * 0.9, h * 0.64], [r * 0.6, h * 0.84],
    [r * 0.46, h * 0.95], [r * 0.5, h], [r * 0.42, h], [r * 0.38, h * 0.93], [r * 0.4, h * 0.6], [0, h * 0.6]], x, y, z, mat, { seg: 48 });
  const R = rnd(seed), at = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
  for (let i = 0; i < stems; i++) {
    const a = R() * TAU + i * 2.4, lean = 0.06 + R() * 0.14, len = h * 0.6 + 0.22 + R() * 0.3, bend = (R() - 0.5) * 0.08;
    const c = Math.cos(a), s = Math.sin(a), m = r * 0.38 * 0.55 * Math.sqrt(R());   // stay inside the mouth
    const base = [x + c * m * 0.5, y + h * 0.6, z + s * m * 0.5];
    const neck = [x + c * m, y + h * 0.93, z + s * m];                  // through the narrowest point
    const p1 = [x + c * m * 1.15, y + h + 0.025, z + s * m * 1.15];   // just clear of the rim
    const p2 = [x + c * lean * 0.7 - s * bend, y + h + (len - h * 0.4) * 0.72, z + s * lean * 0.7 + c * bend];
    const tip = [x + c * lean, y + h * 0.6 + len, z + s * lean];
    k.tube([base, neck, p1, p2, tip], 0.0026, 'stem', { ts: 24, rs: 5 });
    const nl = bloom ? 2 : 7;
    for (let j = 0; j < nl; j++) {
      const t = bloom ? 0.35 + j * 0.25 : 0.25 + j * 0.11, p = t < 0.5 ? at(p1, p2, t * 2) : at(p2, tip, t * 2 - 1);
      const la = a + (j % 2 ? 1.6 : -1.6) + (R() - 0.5) * 0.6, sz = bloom ? 0.026 : 0.016 + R() * 0.006;
      k.sphere(sz, p[0] + Math.cos(la) * sz * 0.8, p[1], p[2] + Math.sin(la) * sz * 0.8, bloom ? 'leaf' : 'sage',
        { seg: 10, seg2: 6, sx: 1, sy: 0.1, sz: bloom ? 0.38 : 0.8, ry: -la, rz: 0.35, edges: false });
    }
    if (bloom) {
      for (let pI = 0; pI < 5; pI++) {
        const pa = (pI / 5) * TAU + R();
        k.sphere(0.017, tip[0] + Math.cos(pa) * 0.015, tip[1] + 0.004, tip[2] + Math.sin(pa) * 0.015, bloom,
          { seg: 10, seg2: 6, sx: 1, sy: 0.22, sz: 0.6, ry: -pa, rz: 0.25, edges: false });
      }
      k.sphere(0.008, tip[0], tip[1] + 0.008, tip[2], 'citrus', { seg: 8, seg2: 6, edges: false });
    }
  }
}
export function potPlant(k, x, z, { r = 0.2, h = 0.42, mat = 'terracotta' } = {}) {
  k.lathe([[0, 0.02], [r * 0.78, 0], [r, h * 0.9], [r * 1.06, h], [r * 0.96, h], [r * 0.9, h * 0.92], [0, h * 0.92]], x, 0, z, mat, { seg: 32, edges: true });
}

// ---------------- seating ----------------
// Bentwood chair (front faces local −z). `wood` for frame, `seat` for the cane disc.
export function bentwoodChair(k, x, z, rot, wood = 'walnut', seat = 'rattan') {
  const c = k.at(x, 0, z, rot);
  c.lathe([[0, 0.44], [0.19, 0.44], [0.205, 0.455], [0.195, 0.47], [0, 0.47]], 0, 0, 0, wood, { seg: 36, edges: true });
  c.cyl(0.17, 0.17, 0.004, 0, 0.468, 0, seat, { seg: 32 });
  for (const s of [-1, 1]) c.tube([[s * 0.15, 0.45, -0.12], [s * 0.17, 0.22, -0.16], [s * 0.2, 0, -0.2]], 0.013, wood, { ts: 12 });
  c.tube([[0.17, 0, 0.25], [0.15, 0.45, 0.16], [0.165, 0.7, 0.2], [0.13, 0.88, 0.22], [0, 0.93, 0.23], [-0.13, 0.88, 0.22], [-0.165, 0.7, 0.2], [-0.15, 0.45, 0.16], [-0.17, 0, 0.25]], 0.013, wood, { ts: 64 });
  c.tube([[0.12, 0.47, 0.16], [0.1, 0.62, 0.195], [0, 0.69, 0.205], [-0.1, 0.62, 0.195], [-0.12, 0.47, 0.16]], 0.009, wood, { ts: 40 });
  c.torus(0.175, 0.008, 0, 0.2, 0.02, wood, { rx: Math.PI / 2, ts: 40 });
}
export function barStool(k, x, z, h = 0.75) {
  const c = k.at(x, 0, z);
  c.lathe([[0, h - 0.04], [0.16, h - 0.04], [0.185, h - 0.02], [0.18, h + 0.005], [0.15, h - 0.008], [0, h - 0.01]], 0, 0, 0, 'walnut', { seg: 40, edges: true });
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + Math.PI / 4;
    c.tube([[Math.cos(a) * 0.11, h - 0.04, Math.sin(a) * 0.11], [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2]], 0.011, 'brass', { ts: 4 });
  }
  c.torus(0.165, 0.008, 0, 0.28, 0, 'brass', { rx: Math.PI / 2, ts: 40 });
}
export function bistroTable(k, x, z, top = 'marble', r = 0.33) {
  const c = k.at(x, 0, z);
  c.lathe([[0, 0.72], [r - 0.01, 0.72], [r, 0.73], [r, 0.745], [r - 0.01, 0.755], [0, 0.755]], 0, 0, 0, top, { seg: 48, edges: true });
  c.cyl(0.025, 0.03, 0.72, 0, 0, 0, 'brass', { seg: 16 });
  c.lathe([[0, 0], [0.22, 0], [0.21, 0.02], [0.05, 0.05], [0, 0.05]], 0, 0, 0, 'brass', { seg: 36 });
}
export function ottoman(k, x, z, r = 0.3, h = 0.42) {
  k.lathe([[0, 0.01], [r * 0.85, 0], [r, 0.06], [r * 1.02, h * 0.55], [r * 0.95, h - 0.02], [r * 0.7, h], [0, h + 0.005]], x, 0, z, 'boucle', { seg: 48, edges: true });
}

// ---------------- lighting objects ----------------
export function globePendant(k, x, z, yGlobe, ceiling) {
  k.lathe([[0, ceiling - 0.02], [0.06, ceiling - 0.02], [0.065, ceiling - 0.005], [0.06, ceiling], [0, ceiling]], x, 0, z, 'brass', { seg: 24 });
  k.cyl(0.0035, 0.0035, ceiling - yGlobe - 0.2, x, yGlobe + 0.2, z, 'blackmetal', { seg: 6, cast: false });
  k.lathe([[0, 0.2], [0.012, 0.2], [0.014, 0.16], [0.05, 0.12], [0.055, 0.11], [0.0, 0.11]], x, yGlobe, z, 'brass', { seg: 24, cast: false });
  k.sphere(0.14, x, yGlobe, z, 'opal', { seg: 28, seg2: 20, cast: false });
}
export function trackSpot(k, x, y, z, rot = 0) {
  const c = k.at(x, y, z, rot);
  c.cyl(0.012, 0.012, 0.08, 0, -0.08, 0, 'blackmetal', { seg: 8, cast: false });
  c.lathe([[0, 0], [0.032, 0], [0.036, -0.13], [0.03, -0.13], [0, -0.12]], 0, -0.06, 0.02, 'blackmetal', { rx: 0.45, seg: 20, cast: false });
}

// ---------------- espresso bar ----------------
// Two-group lever-free machine; local origin = counter top, front faces local −z.
export function espressoMachine(k, x, y, z, rot = 0) {
  const c = k.at(x, y, z, rot);
  c.box(0.8, 0.05, 0.5, 0, 0, 0, 'blackmetal', { r: 0.01 });
  c.box(0.76, 0.38, 0.46, 0, 0.05, 0.01, 'chrome', { r: 0.035, seg: 3 });
  for (const s of [-1, 1]) c.box(0.025, 0.36, 0.44, s * 0.395, 0.06, 0.01, 'walnut', { r: 0.008 });
  c.box(0.72, 0.025, 0.4, 0, 0.43, 0.02, 'blackmetal', { r: 0.006 });
  c.tube([[-0.36, 0.49, -0.18], [0.36, 0.49, -0.18], [0.36, 0.49, 0.2], [-0.36, 0.49, 0.2]], 0.006, 'brass', { closed: true, ts: 48 });
  for (const xx of [-0.24, -0.08, 0.08, 0.24]) cup(c, xx, 0.455, 0.0, 0.3);
  c.box(0.5, 0.12, 0.012, 0, 0.27, -0.228, 'blackmetal', { r: 0.004 });
  for (const s of [-1, 1]) {
    c.cyl(0.036, 0.036, 0.02, s * 0.15, 0.33, -0.235, 'chrome', { rx: Math.PI / 2, center: true, seg: 24 });
    c.cyl(0.03, 0.03, 0.022, s * 0.15, 0.33, -0.236, 'ceramic', { rx: Math.PI / 2, center: true, seg: 24 });
    // group head + portafilter
    c.cyl(0.048, 0.042, 0.06, s * 0.17, 0.16, -0.27, 'chrome', { seg: 24 });
    c.cyl(0.04, 0.034, 0.035, s * 0.17, 0.125, -0.27, 'chrome', { seg: 24 });
    c.tube([[s * 0.17, 0.142, -0.3], [s * 0.172, 0.138, -0.38], [s * 0.175, 0.13, -0.46]], 0.011, 'blackmetal', { ts: 10 });
    c.cyl(0.016, 0.014, 0.1, s * 0.175, 0.13, -0.45, 'walnut', { rx: Math.PI / 2, center: true, seg: 12 });
    cup(c, s * 0.17, 0.085, -0.28, 0.4);
  }
  c.box(0.7, 0.03, 0.17, 0, 0.05, -0.31, 'chrome', { r: 0.008 });
  for (let i = 0; i < 9; i++) c.box(0.66, 0.004, 0.006, 0, 0.081, -0.38 + i * 0.017, 'blackmetal', { edges: false });
  c.tube([[0.33, 0.32, -0.23], [0.355, 0.28, -0.3], [0.36, 0.2, -0.32], [0.36, 0.1, -0.31]], 0.006, 'chrome', { ts: 16 });
  c.tube([[-0.33, 0.32, -0.23], [-0.35, 0.28, -0.29], [-0.355, 0.16, -0.3]], 0.005, 'chrome', { ts: 16 });
}
export function grinder(k0, x, y, z) {
  const k = k0.at(x, y, z);
  k.box(0.17, 0.3, 0.24, 0, 0, 0, 'blackmetal', { r: 0.02, seg: 3 });
  k.cyl(0.03, 0.03, 0.06, 0, 0.3, 0, 'chrome', { seg: 16 });
  k.lathe([[0.03, 0], [0.09, 0.14], [0.095, 0.16], [0.0, 0.16]], 0, 0.36, 0, 'glass', { seg: 28, glass: true, cast: false });
  k.lathe([[0, 0], [0.03, 0], [0.075, 0.1], [0, 0.1]], 0, 0.362, 0, 'beans', { seg: 20 });
  k.box(0.08, 0.04, 0.08, 0, 0.12, -0.15, 'chrome', { r: 0.01 });
}

// ---------------- boutique ----------------
// Cloth hanging from a rail: two slightly separated draped surfaces (front/back) give it volume.
// Local frame: hangs from y = 0 down, width along z, faces ±x.
export function garmentGeometry(w, len, kind, seed) {
  const R = rnd(seed);
  const cols = 10, rows = 20;
  const f1 = 3 + R() * 2.5, f2 = 6 + R() * 3, ph1 = R() * TAU, ph2 = R() * TAU;
  const surf = (side) => {
    const g = new THREE.PlaneGeometry(1, 1, cols, rows);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5, v = 0.5 - p.getY(i);
      const c = 2 * u - 1;
      let ws;
      if (kind === 'dress') ws = v < 0.25 ? lerp(0.62, 0.82, v / 0.25) : lerp(0.82, 1.3, (v - 0.25) / 0.75);
      else if (kind === 'coat') ws = lerp(0.82, 1.08, Math.min(1, v * 3));
      else ws = lerp(0.74, 1.0, Math.min(1, v * 6));
      let yy = -v * len;
      yy -= Math.abs(c) * 0.075 * Math.max(0, 1 - v * 5);                 // shoulder slope
      if (v < 0.03 && Math.abs(c) < 0.28) yy -= 0.035 * (1 - Math.abs(c) / 0.28); // neckline
      yy += (R() - 0.5) * 0.006 * (v > 0.97 ? 1 : 0);
      const fold = (Math.sin(TAU * (u * f1) + ph1) * 0.012 + Math.sin(TAU * (u * f2) + ph2) * 0.006) * (0.25 + v);
      const body = Math.sin(Math.PI * u) * (kind === 'coat' ? 0.035 : 0.022) * (1 - 0.4 * v);
      p.setXYZ(i, fold + side * body, yy, c * w * 0.5 * ws);
    }
    g.computeVertexNormals();
    return g;
  };
  return [surf(1), surf(-1)];
}
export function hangerWithGarment(k, x, yRail, z, fab, { len = 0.9, w = 0.42, kind = 'shirt', seed = 1, tilt = 0 } = {}) {
  const c = k.at(x, yRail, z, tilt);
  c.tube([[0, 0.0, 0], [0, 0.03, 0.012], [0, 0.045, 0], [0, 0.035, -0.012]], 0.0025, 'brass', { ts: 10, rs: 5 });
  c.tube([[0, -0.07, -w * 0.47], [0, -0.035, -w * 0.25], [0, -0.025, 0], [0, -0.035, w * 0.25], [0, -0.07, w * 0.47]], 0.009, 'walnut', { ts: 20, rs: 6 });
  c.tube([[0, -0.025, 0], [0, 0, 0]], 0.003, 'brass', { ts: 2, rs: 5 });
  for (const g of garmentGeometry(w, len, kind, seed)) c.geom(g, fab, { fine: true, edges: false }, [0, -0.045, 0]);
}
export function curtainGeometry(width, height, pleat = 0.14, depth = 0.035) {
  const g = new THREE.PlaneGeometry(1, 1, Math.round(width / pleat * 8), 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + 0.5, v = p.getY(i) + 0.5;
    const z = u * width;
    p.setXYZ(i, Math.sin(TAU * z / pleat) * depth * (0.8 + 0.4 * (1 - v)), v * height, z);
  }
  g.computeVertexNormals();
  return g;
}
// Lathe profile with radial pleats that deepen towards the lowest point (a skirt's hem).
function pleatedLathe(profile, n, amp, seg = 96) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const p = g.attributes.position, ys = profile.map((q) => q[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vz = p.getZ(i), f = (y1 - p.getY(i)) / (y1 - y0), a = Math.atan2(vz, vx);
    const k = 1 + (amp * f * f * Math.sin(n * a)) / Math.max(0.05, Math.hypot(vx, vz));
    p.setX(i, vx * k); p.setZ(i, vz * k);
  }
  g.computeVertexNormals();
  return g;
}
// Dressmaker's form on a walnut tripod, wearing a one-tone dress: fitted bodice, belt, pleated skirt.
export function dressForm(k, x, z, rot, body = 'fab2', skirt = 'fab2') {
  const c = k.at(x, 0, z, rot), OV = 0.76;   // torso oval (depth / width)
  for (let i = 0; i < 3; i++) {
    const a = (i * TAU) / 3;
    c.tube([[0, 0.34, 0], [Math.cos(a) * 0.1, 0.14, Math.sin(a) * 0.1], [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25]], 0.012, 'walnut', { ts: 12 });
  }
  c.cyl(0.011, 0.011, 0.62, 0, 0.32, 0, 'brass', { seg: 10 });
  c.lathe([[0, 0.92], [0.13, 0.93], [0.165, 0.98], [0.175, 1.05], [0.15, 1.15], [0.125, 1.21], [0.135, 1.28], [0.165, 1.35],
    [0.17, 1.42], [0.155, 1.47], [0.11, 1.5], [0.05, 1.52], [0.042, 1.58], [0.04, 1.63], [0, 1.64]], 0, 0, 0, 'linen', { seg: 48, sz: OV });
  c.lathe([[0, 1.635], [0.046, 1.64], [0.05, 1.66], [0.03, 1.69], [0.012, 1.72], [0, 1.73]], 0, 0, 0, 'walnut', { seg: 24 });
  c.lathe([[0.131, 1.2], [0.142, 1.28], [0.172, 1.35], [0.178, 1.42], [0.165, 1.46], [0.12, 1.49]], 0, 0, 0, body, { seg: 48, sz: OV });
  c.torus(0.132, 0.01, 0, 1.205, 0, 'leather', { rx: Math.PI / 2, sy: OV, ts: 48 });
  c.geom(pleatedLathe([[0.134, 1.2], [0.19, 1.07], [0.22, 0.93], [0.26, 0.76], [0.3, 0.6], [0.31, 0.585]], 16, 0.012), skirt, { fine: true, sz: OV + 0.06 }, [0, 0, 0]);
}
export function handbag(k, x, y, z, rot = 0, mat = 'leather') {
  const c = k.at(x, y, z, rot);
  c.box(0.3, 0.2, 0.12, 0, 0, 0, mat, { r: 0.02, seg: 3 });
  c.torus(0.08, 0.008, 0, 0.2, 0, mat, { arc: Math.PI, ts: 20 });
  c.box(0.06, 0.02, 0.01, 0, 0.14, -0.062, 'brass', { r: 0.003, edges: false });
}
export function foldedStack(k0, x, y, z, fabs, R, { w = 0.32, d = 0.28 } = {}) {
  const k = k0.at(x, y, z);
  let yy = 0;
  fabs.forEach((fab, i) => {
    const h = 0.045 + R() * 0.02, jx = (R() - 0.5) * 0.025, jz = (R() - 0.5) * 0.02;
    k.box(w, h, d, jx, yy, jz, fab, { r: 0.016, seg: 3, edges: i === fabs.length - 1, ry: (R() - 0.5) * 0.05 });
    yy += h;
  });
  return y + yy;
}

const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

// ---------------- living ----------------
// Low modular sofa, front faces local −z; `len` along local x.
export function sofa(k, x, z, rot, len = 2.8, fab = 'boucle') {
  const c = k.at(x, 0, z, rot);
  c.box(len - 0.1, 0.06, 0.9, 0, 0, 0.02, 'blackmetal', { r: 0.01, edges: false });
  c.box(len, 0.3, 1.0, 0, 0.06, 0, fab, { r: 0.06, seg: 4 });
  const n = Math.round(len / 0.95), w = len / n;
  for (let i = 0; i < n; i++) {
    const cx = -len / 2 + w * (i + 0.5);
    c.box(w - 0.02, 0.17, 0.74, cx, 0.36, -0.1, fab, { r: 0.075, seg: 4 });
    c.box(w - 0.04, 0.46, 0.24, cx, 0.36, 0.36, fab, { r: 0.09, seg: 4, rx: -0.12 });
  }
  c.box(0.42, 0.4, 0.13, -len / 2 + 0.45, 0.5, 0.18, 'linen', { r: 0.06, seg: 4, rx: -0.25, ry: 0.2 });
  c.box(0.42, 0.4, 0.13, len / 2 - 0.5, 0.5, 0.17, 'fab2', { r: 0.06, seg: 4, rx: -0.25, ry: -0.15 });
  c.box(0.55, 0.03, 0.75, len / 2 - 0.45, 0.53, -0.08, 'fab1', { r: 0.012, ry: 0.08 });
}
// Lounge chair: walnut frame, leather cushions; front faces local −z.
// Mid-century lounge chair: bent wooden side frames, flat armrests, reclined back posts,
// deep upholstered seat and back cushions, a lumbar pillow. Front faces local −z.
export function loungeChair(k, x, z, rot, { fab = 'leather', wood = 'walnut', accent = 'fab0' } = {}) {
  const c = k.at(x, 0, z, rot);
  for (const s of [-1, 1]) {
    c.tube([[s * 0.35, 0, -0.33], [s * 0.35, 0.3, -0.31], [s * 0.35, 0.55, -0.27], [s * 0.35, 0.59, 0.0],
      [s * 0.35, 0.57, 0.2], [s * 0.35, 0.3, 0.32], [s * 0.35, 0, 0.36]], 0.019, wood, { ts: 48 });
    c.box(0.075, 0.028, 0.55, s * 0.35, 0.585, -0.05, wood, { r: 0.012, seg: 3 });
    c.tube([[s * 0.31, 0.26, 0.27], [s * 0.31, 0.6, 0.38], [s * 0.3, 0.9, 0.48]], 0.016, wood, { ts: 16 });
  }
  c.tube([[-0.35, 0.15, -0.32], [0.35, 0.15, -0.32]], 0.014, wood, { ts: 2 });
  c.tube([[-0.3, 0.9, 0.48], [0.3, 0.9, 0.48]], 0.016, wood, { ts: 2 });
  c.box(0.66, 0.025, 0.6, 0, 0.24, 0.0, wood, { r: 0.008 });
  c.box(0.64, 0.15, 0.58, 0, 0.265, -0.02, fab, { r: 0.068, seg: 5 });
  c.box(0.62, 0.52, 0.14, 0, 0.36, 0.31, fab, { r: 0.065, seg: 5, rx: 0.32 });
  c.box(0.36, 0.22, 0.11, 0.06, 0.44, 0.19, accent, { r: 0.05, seg: 4, rx: 0.3, ry: -0.12 });
}
export function coffeeTableRound(k, x, z, r = 0.55, top = 'travertine') {
  k.lathe([[0, 0], [r * 0.6, 0], [r * 0.62, 0.02], [r * 0.6, 0.3], [r, 0.31], [r, 0.36], [r * 0.97, 0.37], [0, 0.37]], x, 0, z, top, { seg: 56, edges: true });
}
export function books(k, x, y, z, rot, R, n = 4) {
  const c = k.at(x, y, z, rot);
  const cols = ['fab3', 'fab0', 'fab5', 'fab1', 'fab4'];
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const h = 0.025 + R() * 0.02, w = 0.22 + R() * 0.08, d = 0.16 + R() * 0.06;
    c.box(w, h, d, (R() - 0.5) * 0.03, yy, (R() - 0.5) * 0.03, cols[Math.floor(R() * cols.length)], { r: 0.003, ry: (R() - 0.5) * 0.15, edges: i === n - 1 });
    yy += h;
  }
  return yy;
}
export function bowl(k, x, y, z, r = 0.16, mat = 'glaze') {
  k.lathe([[0, 0], [r * 0.45, 0], [r, r * 0.55], [r * 0.96, r * 0.56], [r * 0.42, r * 0.06], [0, r * 0.06]], x, y, z, mat, { seg: 36 });
}
export function floorLamp(k, x, z) {
  k.lathe([[0, 0], [0.16, 0], [0.16, 0.025], [0, 0.03]], x, 0, z, 'brass', { seg: 32 });
  k.cyl(0.01, 0.01, 1.42, x, 0.03, z, 'brass', { seg: 8 });
  k.lathe([[0.13, 1.3], [0.2, 1.3], [0.15, 1.62], [0.09, 1.62]], x, 0, z, 'linen', { seg: 40, edges: true });
}
export function diningTable(k, x, z, rot, len = 2.4, dep = 1.0) {
  const c = k.at(x, 0, z, rot);
  c.box(len, 0.045, dep, 0, 0.71, 0, 'walnut', { r: 0.018, seg: 3 });
  for (const s of [-1, 1]) {
    c.box(0.09, 0.68, dep * 0.7, s * (len / 2 - 0.35), 0.03, 0, 'walnut', { r: 0.02 });
    c.box(0.32, 0.03, dep * 0.75, s * (len / 2 - 0.35), 0, 0, 'walnut', { r: 0.012 });
  }
  c.box(len - 0.8, 0.06, 0.06, 0, 0.62, 0, 'walnut', { r: 0.012, edges: false });
}
export function linearPendant(k, x, y, z, rot, len, ceiling) {
  const c = k.at(x, 0, z, rot);
  c.box(len, 0.05, 0.07, 0, y, 0, 'brass', { r: 0.012 });
  c.box(len - 0.06, 0.008, 0.05, 0, y - 0.006, 0, 'lamp', { r: 0.002, edges: false, cast: false });
  for (const s of [-1, 1]) c.cyl(0.002, 0.002, ceiling - y - 0.05, s * (len / 2 - 0.1), y + 0.05, 0, 'blackmetal', { seg: 4, cast: false });
}

// ---------------- roof ----------------
export function outdoorSofa(k, x, z, rot, len = 2.4) {
  const c = k.at(x, 0, z, rot);
  c.box(len, 0.32, 0.95, 0, 0.0, 0, 'walnut', { r: 0.02 });
  for (let i = 0; i < 3; i++) {
    const cx = -len / 2 + (len / 3) * (i + 0.5);
    c.box(len / 3 - 0.03, 0.15, 0.78, cx, 0.32, -0.06, 'linen', { r: 0.06, seg: 4 });
    c.box(len / 3 - 0.05, 0.42, 0.2, cx, 0.36, 0.34, 'linen', { r: 0.08, seg: 4, rx: -0.15 });
  }
  c.box(0.4, 0.38, 0.12, -len / 2 + 0.4, 0.5, 0.16, 'fab5', { r: 0.06, seg: 4, rx: -0.25, ry: 0.2 });
  c.box(0.4, 0.38, 0.12, len / 2 - 0.4, 0.5, 0.16, 'fab4', { r: 0.06, seg: 4, rx: -0.25, ry: -0.2 });
}
// Sun lounger: slim walnut frame on legs, mattress, back rest hinged and raised 38°.
// Feet towards local −z, head towards +z.
export function lounger(k, x, z, rot, cushion = 'linen') {
  const c = k.at(x, 0, z, rot);
  c.box(0.72, 0.06, 2.0, 0, 0.26, 0, 'walnut', { r: 0.02 });
  for (const sx of [-0.31, 0.31]) for (const sz of [-0.9, 0.9]) c.box(0.05, 0.26, 0.05, sx, 0, sz, 'walnut', { r: 0.01, edges: false });
  for (const sz of [-0.95, 0.95]) c.box(0.68, 0.08, 0.05, 0, 0.14, sz, 'walnut', { r: 0.01, edges: false });
  c.box(0.68, 0.09, 1.3, 0, 0.32, -0.32, cushion, { r: 0.04, seg: 3 });
  const a = 38 * Math.PI / 180, L = 0.72, t = 0.09, hx = 0.33, hy = 0.36;
  const cy = hy + Math.sin(a) * L / 2, cz = hx + Math.cos(a) * L / 2;
  c.box(0.66, t, L, 0, cy - t / 2, cz, cushion, { r: 0.04, seg: 3, rx: -a });
  c.box(0.62, 0.03, L * 0.9, 0, cy - t / 2 - 0.06, cz + 0.03, 'walnut', { r: 0.01, rx: -a, edges: false });
  c.box(0.05, 0.3, 0.05, 0, 0.3, 0.88, 'walnut', { r: 0.01, rx: 0.5, edges: false });
  c.box(0.42, 0.12, 0.18, 0, cy + 0.12, cz + 0.12, 'fab5', { r: 0.05, seg: 3, rx: -a });
  c.box(0.45, 0.02, 0.5, 0.06, 0.41, -0.62, 'fab1', { r: 0.008, ry: 0.12 });
}
export function fireBowl(k, x, z) {
  k.lathe([[0, 0], [0.18, 0], [0.2, 0.25], [0.45, 0.4], [0.47, 0.44], [0.42, 0.44], [0.2, 0.32], [0, 0.32]], x, 0, z, 'concrete', { seg: 48, edges: true });
  for (let i = 0; i < 9; i++) { const a = i * 0.7; k.sphere(0.05, x + Math.cos(a) * 0.15, 0.36, z + Math.sin(a) * 0.15, 'darkstone', { seg: 8, seg2: 6 }); }
}
export function planterBox(k, x, z, rot, len, dep = 0.5, h = 0.6) {
  const c = k.at(x, 0, z, rot);
  c.box(len, h, dep, 0, 0, 0, 'darkstone', { r: 0.02 });
  c.box(len - 0.06, 0.02, dep - 0.06, 0, h - 0.04, 0, 'gravel', { r: 0.005, edges: false });
}


// ---------------- doors ----------------
// Closed (or ajar) door leaf with trim and brass levers, in an opening a..b of a wall
// along `axis` ('x' or 'z') at plan coordinate c. `k` is a root Kit (plan coords).
export function doorLeaf(k, axis, c, a, b, { h = 2.08, mat = 'walnut', ajar = 0, sign = null, t = 0.045 } = {}) {
  const S_ = k.world ? S : 1;   // plan → metres for the opening width
  const wPlan = b - a, w = wPlan * S_ - 0.02;
  const mid = (a + b) / 2;
  const d = k.at(axis === 'z' ? c : a + 0.01 / S_, 0, axis === 'z' ? a + 0.01 / S_ : c, axis === 'z' ? -Math.PI / 2 : 0);
  // in d: the leaf runs along local +x from the hinge
  const leaf = d.at(0, 0, 0, ajar);
  leaf.box(w, h, t, w / 2, 0, 0, mat, { r: 0.006 });
  for (const s of [-1, 1]) {
    leaf.box(0.12, 0.018, 0.018, w - 0.13, 1.0, s * (t / 2 + 0.03), 'brass', { r: 0.006, edges: false });
    leaf.box(0.05, 0.05, 0.03, w - 0.08, 0.985, s * (t / 2 + 0.012), 'brass', { r: 0.01, edges: false });
  }
  if (sign) for (const s of [-1, 1]) leaf.plane(0.12, 0.12, w / 2, 1.55, s * (t / 2 + 0.002), sign, { ry: s > 0 ? 0 : Math.PI });
  // trim around the opening, both faces
  const T = d.at(0, 0, 0);
  for (const s of [-1, 1]) {
    T.box(0.05, h + 0.05, 0.015, -0.025, 0, s * 0.07, mat, { r: 0.004, edges: false });
    T.box(0.05, h + 0.05, 0.015, w + 0.025, 0, s * 0.07, mat, { r: 0.004, edges: false });
    T.box(w + 0.1, 0.05, 0.015, w / 2, h, s * 0.07, mat, { r: 0.004, edges: false });
  }
  return mid;
}

// ---------------- small apartment ----------------
export function kitchenette(k, x, z, rot, len = 2.6) {
  // runs along local x, back against local +z
  const c = k.at(x, 0, z, rot);
  c.box(len - 0.04, 0.08, 0.56, 0, 0, -0.03, 'blackmetal', { r: 0.004, edges: false });
  c.box(len, 0.8, 0.6, 0, 0.08, 0, 'oakBoard', { r: 0.008 });
  for (let i = 1; i < 4; i++) c.box(0.004, 0.74, 0.004, -len / 2 + i * len / 4, 0.11, -0.302, 'blackmetal', { edges: false });
  c.box(len + 0.02, 0.035, 0.63, 0, 0.88, -0.01, 'terrazzo', { r: 0.008 });
  c.box(len, 0.6, 0.02, 0, 0.915, 0.29, 'zellige', { r: 0.003, edges: false });
  c.box(len * 0.8, 0.035, 0.26, -len * 0.08, 1.6, 0.17, 'oakBoard', { r: 0.008 });
  c.box(0.5, 0.006, 0.42, len * 0.22, 0.915, -0.02, 'blackmetal', { r: 0.003 });
  c.box(0.4, 0.004, 0.36, -len * 0.25, 0.915, -0.02, 'chrome', { r: 0.002, edges: false });
  c.tube([[-len * 0.25, 0.915, 0.2], [-len * 0.25, 1.2, 0.2], [-len * 0.25, 1.23, 0.06], [-len * 0.25, 1.16, 0.02]], 0.011, 'brass', { ts: 14 });
  c.box(0.6, 2.1, 0.62, len / 2 + 0.32, 0, 0, 'oakBoard', { r: 0.008 });                  // fridge column
  c.box(0.02, 0.5, 0.02, len / 2 + 0.06, 1.0, -0.325, 'brass', { r: 0.008, edges: false });
  for (let i = 0; i < 5; i++) {
    const xx = -len * 0.45 + i * 0.22;
    if (i % 2) cup(c, xx, 1.635, 0.18, i); else jar(c, xx, 1.635, 0.18, 0.16, i % 4 ? 'pastry' : 'beans');
  }
  bowl(c, len * 0.05, 0.915, -0.05, 0.12, 'glaze');
  c.box(0.28, 0.02, 0.4, -len * 0.05, 0.915, -0.03, 'walnut', { r: 0.008, ry: 0.15 });
}
export function wardrobe(k, x, z, rot, len = 1.6, h = 2.3) {
  const c = k.at(x, 0, z, rot);
  c.box(len, h, 0.6, 0, 0, 0, 'walnut', { r: 0.01 });
  const n = Math.round(len / 0.55);
  for (let i = 1; i < n; i++) c.box(0.004, h - 0.08, 0.004, -len / 2 + i * len / n, 0.04, -0.302, 'blackmetal', { edges: false });
  for (let i = 0; i < n; i++) c.box(0.015, 0.4, 0.02, -len / 2 + (i + 0.5) * len / n + (i % 2 ? -0.18 : 0.18) * (len / n) / 0.55 * 0.5, 0.95, -0.31, 'brass', { r: 0.006, edges: false });
}
export function smallTable(k, x, z, r = 0.42) {
  k.at(x, 0, z).lathe([[0, 0.72], [r, 0.72], [r, 0.75], [0, 0.75]], 0, 0, 0, 'marble', { seg: 48, edges: true });
  k.at(x, 0, z).cyl(0.03, 0.035, 0.72, 0, 0, 0, 'blackmetal', { seg: 12 });
  k.at(x, 0, z).lathe([[0, 0], [0.2, 0], [0.19, 0.02], [0, 0.03]], 0, 0, 0, 'blackmetal', { seg: 28 });
}
export function sideTable(k, x, z, h = 0.5, r = 0.22, top = 'walnut') {
  const c = k.at(x, 0, z);
  c.lathe([[0, h - 0.03], [r, h - 0.03], [r, h], [0, h]], 0, 0, 0, top, { seg: 36, edges: true });
  c.cyl(0.02, 0.02, h - 0.03, 0, 0, 0, 'brass', { seg: 10 });
  c.lathe([[0, 0], [r * 0.6, 0], [r * 0.55, 0.015], [0, 0.02]], 0, 0, 0, 'brass', { seg: 24 });
}
export function lantern(k, x, y, z, h = 0.45) {
  const c = k.at(x, y, z);
  c.box(0.2, 0.02, 0.2, 0, 0, 0, 'blackmetal', { r: 0.004 });
  c.box(0.2, 0.02, 0.2, 0, h - 0.02, 0, 'blackmetal', { r: 0.004 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) c.box(0.012, h, 0.012, sx * 0.094, 0, sz * 0.094, 'blackmetal', { edges: false });
  c.box(0.18, h - 0.04, 0.18, 0, 0.02, 0, 'glass', { glass: true, cast: false, edges: false });
  c.cyl(0.035, 0.035, 0.12, 0, 0.02, 0, 'lamp', { seg: 14, cast: false });
  c.torus(0.05, 0.006, 0, h + 0.04, 0, 'blackmetal', { arc: Math.PI, ts: 12 });
}

// ---------------- roof ----------------
export function hotTub(k, x, z, r = 1.05, h = 0.85) {
  const c = k.at(x, 0, z);
  const n = 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    c.box(0.16, h, 0.05, Math.cos(a) * r, 0, Math.sin(a) * r, 'walnut', { r: 0.008, ry: -a + Math.PI / 2, edges: i % 4 === 0 });
  }
  c.torus(r + 0.015, 0.02, 0, h * 0.3, 0, 'blackmetal', { rx: Math.PI / 2, ts: 64 });
  c.torus(r + 0.015, 0.02, 0, h * 0.75, 0, 'blackmetal', { rx: Math.PI / 2, ts: 64 });
  c.lathe([[r - 0.02, h - 0.04], [r + 0.04, h - 0.04], [r + 0.05, h], [r + 0.04, h + 0.03], [r - 0.08, h + 0.03], [r - 0.08, h - 0.04]], 0, 0, 0, 'walnut', { seg: 64, edges: true });
  c.cyl(r - 0.08, r - 0.08, 0.02, 0, h - 0.14, 0, 'water', { seg: 64, cast: false });
  for (let i = 0; i < 3; i++) { const a = 0.9 + i * 0.35; c.box(0.26, 0.2 - i * 0.07, 0.4, Math.cos(a) * (r + 0.25 + i * 0.12), 0, Math.sin(a) * (r + 0.25 + i * 0.12), 'walnut', { r: 0.01, ry: -a }); }
  c.box(0.3, 0.05, 0.22, Math.cos(4.0) * (r - 0.2), h + 0.03, Math.sin(4.0) * (r - 0.2), 'linen', { r: 0.02, ry: 0.6 });
}
export function outdoorKitchen(k, x, z, rot, len = 3.2) {
  // runs along local x, back towards local +z
  const c = k.at(x, 0, z, rot);
  c.box(len, 0.9, 0.7, 0, 0, 0, 'concrete', { r: 0.02 });
  for (let i = 1; i < 4; i++) c.box(0.004, 0.8, 0.004, -len / 2 + i * len / 4, 0.05, -0.352, 'blackmetal', { edges: false });
  c.box(len + 0.04, 0.05, 0.74, 0, 0.9, 0, 'marble', { r: 0.012 });
  c.box(0.8, 0.012, 0.5, len * 0.22, 0.95, 0.0, 'blackmetal', { r: 0.004 });
  for (let i = 0; i < 9; i++) c.box(0.76, 0.012, 0.012, len * 0.22, 0.962, -0.22 + i * 0.055, 'chrome', { edges: false });
  c.box(0.8, 0.45, 0.05, len * 0.22, 0.95, 0.27, 'blackmetal', { r: 0.008, rx: 0.4 });
  c.box(0.42, 0.006, 0.36, -len * 0.25, 0.95, 0.0, 'chrome', { r: 0.003, edges: false });
  c.tube([[-len * 0.25, 0.95, 0.24], [-len * 0.25, 1.25, 0.24], [-len * 0.25, 1.28, 0.08], [-len * 0.25, 1.2, 0.04]], 0.012, 'brass', { ts: 14 });
  c.box(0.35, 0.02, 0.45, -len * 0.05, 0.95, -0.05, 'walnut', { r: 0.008, ry: 0.1 });
  bowl(c, -len * 0.42, 0.95, -0.05, 0.13, 'glaze');
  for (let i = 0; i < 5; i++) c.sphere(0.04, -len * 0.42 + Math.cos(i * 1.3) * 0.05, 1.0, -0.05 + Math.sin(i * 1.3) * 0.05, 'citrus', { seg: 12, seg2: 10 });
  for (const xx of [-len * 0.3, 0, len * 0.3]) barStool(c, xx, -0.75, 0.68);
}
export function stringLights(k, posts, y, sag = 0.35, bulbs = 10) {
  // posts: [[x, z], ...] plan coords on k (root kit). One catenary per consecutive pair.
  for (const [x, z] of posts) {
    k.cyl(0.03, 0.035, y, x, 0, z, 'blackmetal', { seg: 10 });
    k.sphere(0.045, x, y + 0.02, z, 'brass', { seg: 10, seg2: 8 });
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const [x0, z0] = posts[i], [x1, z1] = posts[i + 1];
    const pts = [];
    for (let j = 0; j <= 10; j++) { const t = j / 10; pts.push([x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t), z0 + (z1 - z0) * t]); }
    k.tube(pts, 0.004, 'blackmetal', { ts: 40, rs: 4 });
    for (let j = 1; j < bulbs; j++) { const t = j / bulbs; k.sphere(0.03, x0 + (x1 - x0) * t, y - sag * 4 * t * (1 - t) - 0.05, z0 + (z1 - z0) * t, 'lamp', { seg: 10, seg2: 8, cast: false }); }
  }
}
export function outdoorRug(k, x, z, w, d, rot = 0) {
  k.at(x, 0, z, rot).box(w, 0.01, d, 0, 0, 0, 'wool', { r: 0.004 });
}

// ---------------- premium pieces (apartments) ----------------
// Fluted walnut wall from floor to ceiling along a north wall, with an LED wash at the top.
export function flutedWall(k, x0, x1, zWall, h, rot = 0) {
  const len = (x1 - x0) * S, c = k.at((x0 + x1) / 2, 0, zWall, rot);   // local +z: into the room
  c.box(len, h, 0.018, 0, 0, 0.009, 'walnut', { r: 0 });
  for (let x = -len / 2 + 0.03; x < len / 2 - 0.02; x += 0.05) c.box(0.036, h - 0.03, 0.022, x, 0.015, 0.028, 'walnut', { r: 0.011, seg: 3, edges: false });
  c.box(len, 0.012, 0.03, 0, h - 0.06, 0.055, 'lamp', { r: 0, edges: false, cast: false });
}

// Upholstered bed: a padded headboard in a walnut frame, a soft base on a shadow plinth,
// a deep mattress, a duvet that falls over the sides, two pillows and a throw.
export function bed(k, x, z, rot, r = rnd(5), { ns = 1.36, nsW = 0.55 } = {}) {
  const c = k.at(x, 0, z, rot);   // head against local +z, foot towards −z
  c.box(1.7, 0.1, 1.95, 0, 0, 0, 'blackmetal', { r: 0.01, edges: false });
  c.box(1.94, 0.28, 2.12, 0, 0.08, -0.02, 'boucle', { r: 0.1, seg: 6 });
  c.box(1.82, 0.24, 2.0, 0, 0.34, -0.03, 'linen', { r: 0.1, seg: 6 });
  c.box(1.9, 0.07, 1.58, 0, 0.54, -0.24, 'fab0', { r: 0.035, seg: 4 });                    // duvet
  for (const s of [-1, 1]) c.box(0.035, 0.3, 1.58, s * 0.94, 0.3, -0.24, 'fab0', { r: 0.017, seg: 3, edges: false });
  c.box(1.9, 0.035, 0.04, 0, 0.3, -1.02, 'fab0', { r: 0.017, edges: false });
  c.box(1.96, 0.02, 0.55, 0, 0.6, -0.68, 'fab1', { r: 0.01, seg: 3 });                     // throw
  for (const s of [-1, 1]) c.box(0.02, 0.24, 0.55, s * 0.975, 0.38, -0.68, 'fab1', { r: 0.01, seg: 3, edges: false });
  for (const s of [-1, 1]) {
    c.box(0.74, 0.5, 0.16, s * 0.42, 0.56, 0.93, 'linen', { r: 0.06, seg: 4, rx: 0.22 });   // pillows against the headboard
    c.box(0.7, 0.11, 0.44, s * 0.42, 0.57, 0.6, 'fab0', { r: 0.045, seg: 4 });             // sleeping pillows, flat
  }
  c.box(0.42, 0.34, 0.12, 0, 0.6, 0.66, 'fab4', { r: 0.05, seg: 4, rx: 0.2 });             // square accent cushion
  c.box(2.14, 1.2, 0.05, 0, 0.12, 1.16, 'walnut', { r: 0.012, seg: 3 });
  c.box(2.0, 1.06, 0.1, 0, 0.2, 1.1, 'boucle', { r: 0.05, seg: 6 });
  for (const s of [-1, 1]) {
    const n = c.at(s * ns, 0, 0.9);       // floating nightstand, front towards local −z
    n.box(nsW, 0.3, 0.42, 0, 0.3, 0, 'walnut', { r: 0.012 });
    n.box(nsW + 0.01, 0.025, 0.43, 0, 0.6, 0, 'marble', { r: 0.006 });
    n.box(nsW - 0.05, 0.006, 0.004, 0, 0.44, -0.212, 'blackmetal', { edges: false });
    n.box(0.14, 0.012, 0.02, 0, 0.5, -0.222, 'brass', { r: 0.005, edges: false });
    const sc = c.at(s * ns, 0, 1.16);   // brass reading sconce on the fluted wall
    sc.cyl(0.045, 0.045, 0.02, 0, 1.32, 0, 'brass', { center: true, rx: Math.PI / 2, seg: 24 });
    sc.tube([[0, 1.32, -0.01], [0, 1.33, -0.14], [0, 1.27, -0.24]], 0.008, 'brass', { ts: 12 });
    sc.lathe([[0.016, 0.05], [0.07, -0.05], [0.064, -0.052], [0.012, 0.045]], 0, 1.24, -0.24, 'brass', { seg: 32 });
    sc.sphere(0.03, 0, 1.21, -0.24, 'opal', { cast: false });
  }
  books(c.at(-ns - nsW * 0.1, 0.625, 0.88), 0, 0, 0, 0.3, r, 3);
  vase(c, -ns + nsW * 0.25, 0.625, 0.95, { h: 0.2, r: 0.05, stems: 4, seed: 61, mat: 'glaze' });
  c.lathe([[0, 0], [0.05, 0], [0.055, 0.12], [0.03, 0.2], [0.025, 0.22], [0, 0.22]], ns - nsW * 0.1, 0.625, 0.92, 'glass', { seg: 28, glass: true, cast: false });
  cup(c, ns + nsW * 0.15, 0.625, 0.84, 0.4);
}

// Floor-to-ceiling wardrobe, three fluted doors with long brass pulls, on a shadow plinth.
export function wardrobeFluted(k, x, z, rot, len, h) {
  const c = k.at(x, 0, z, rot);   // front faces local −z
  c.box(len - 0.04, 0.08, 0.5, 0, 0, 0.04, 'blackmetal', { edges: false });
  c.box(len, h - 0.08, 0.58, 0, 0.08, 0.01, 'walnut', { r: 0.006 });
  const dw = len / 3;
  for (let d = 0; d < 3; d++) {
    const x0 = -len / 2 + d * dw;
    for (let xx = x0 + 0.025; xx < x0 + dw - 0.03; xx += 0.045) c.box(0.034, h - 0.16, 0.018, xx + 0.017, 0.12, -0.288, 'walnut', { r: 0.009, seg: 3, edges: false });
    c.box(0.018, 0.9, 0.03, d === 0 ? x0 + dw - 0.05 : x0 + 0.05, 0.72, -0.31, 'brass', { r: 0.008, edges: false });
  }
}


// Walnut console: slab legs, drawer band with brass pulls, travertine shelf below, a ceramic lamp,
// branches in a vase, books, and a round brass-framed mirror on the wall above.
// Runs along local x, back against local +z.
export function consoleTable(k, x, z, rot, len = 1.3, { seed = 3, mirror = true } = {}) {
  const c = k.at(x, 0, z, rot), D = 0.36, R = rnd(seed);
  for (const s of [-1, 1]) c.box(0.04, 0.8, D - 0.02, s * (len / 2 - 0.05), 0, 0, 'walnut', { r: 0.008 });
  c.box(len, 0.04, D, 0, 0.8, 0, 'walnut', { r: 0.01, seg: 3 });
  c.box(len - 0.12, 0.13, D - 0.04, 0, 0.66, 0, 'walnut', { r: 0.006 });
  c.box(len - 0.14, 0.004, 0.004, 0, 0.725, -D / 2 + 0.018, 'blackmetal', { edges: false });
  for (const s of [-1, 1]) c.box(0.12, 0.012, 0.02, s * len * 0.22, 0.69, -D / 2 + 0.01, 'brass', { r: 0.005, edges: false });
  c.box(len - 0.12, 0.03, D - 0.06, 0, 0.16, 0, 'travertine', { r: 0.006 });
  const lx = -len * 0.32;
  c.lathe([[0, 0], [0.07, 0], [0.09, 0.08], [0.085, 0.18], [0.04, 0.27], [0.015, 0.3], [0, 0.3]], lx, 0.84, 0.03, 'glaze', { seg: 36 });
  c.lathe([[0.1, 0.27], [0.17, 0.27], [0.14, 0.5], [0.09, 0.5]], lx, 0.84, 0.03, 'opal', { seg: 40, cast: false });
  vase(c, len * 0.3, 0.84, 0.04, { h: 0.34, r: 0.075, stems: 6, seed, bloom: null, mat: 'ceramic' });
  books(c.at(len * 0.04, 0.84, -0.02), 0, 0, 0, 0.2, R, 3);
  books(c.at(-len * 0.15, 0.19, 0.0), 0, 0, 0, -0.1, R, 5);
  c.lathe([[0, 0], [0.12, 0], [0.15, 0.16], [0.14, 0.16], [0.11, 0.012], [0, 0.012]], len * 0.22, 0.19, 0.0, 'rattan', { seg: 36 });
  if (mirror) {
    c.cyl(0.36, 0.36, 0.012, 0, 1.55, D / 2 - 0.01, 'mirror', { rx: Math.PI / 2, center: true, seg: 56 });
    c.torus(0.365, 0.014, 0, 1.55, D / 2 - 0.014, 'brass', { ts: 56 });
  }
}

// Marble worktop with a real cut-out for an undermount stainless sink. Kit-local box (w, h, d) at
// (x, bottom y, z); cut-out (cw × cd) centred at (cx, cz); the basin hangs below with a drain.
export function worktopWithSink(k, w, h, d, x, y, z, cx, cz, cw, cd, mat = 'marble') {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const ax = cx - cw / 2, bx = cx + cw / 2, az = cz - cd / 2, bz = cz + cd / 2;
  const slab = (xa, xb, za, zb) => { if (xb - xa > 1e-3 && zb - za > 1e-3) k.box(xb - xa, h, zb - za, (xa + xb) / 2, y, (za + zb) / 2, mat, { r: 0 }); };
  slab(x0, ax, z0, z1); slab(bx, x1, z0, z1); slab(ax, bx, z0, az); slab(ax, bx, bz, z1);
  const depth = 0.2, t = 0.008, yb = y + h - depth;
  k.box(cw, t, cd, cx, yb, cz, 'brushed', { r: 0, edges: false });
  k.box(t, depth, cd, ax + t / 2, yb, cz, 'brushed', { r: 0, edges: false });
  k.box(t, depth, cd, bx - t / 2, yb, cz, 'brushed', { r: 0, edges: false });
  k.box(cw, depth, t, cx, yb, az + t / 2, 'brushed', { r: 0, edges: false });
  k.box(cw, depth, t, cx, yb, bz - t / 2, 'brushed', { r: 0, edges: false });
  k.cyl(0.04, 0.04, 0.004, cx, yb + t, cz, 'chrome', { seg: 24 });
  k.cyl(0.024, 0.024, 0.005, cx, yb + t + 0.001, cz, 'carTrim', { seg: 16 });
}

// Brass gooseneck tap at (x, y, z) whose spout reaches `reach` metres along [dx, dz].
export function gooseneckTap(k, x, y, z, reach, [dx, dz]) {
  const hgt = 0.3, rr = reach / 2, pts = [[x, y, z], [x, y + 0.12, z], [x, y + 0.22, z], [x, y + hgt, z]];
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * Math.PI, o = rr * (1 - Math.cos(a));
    pts.push([x + dx * o, y + hgt + rr * Math.sin(a), z + dz * o]);
  }
  pts.push([x + dx * reach, y + hgt - 0.06, z + dz * reach]);
  k.cyl(0.024, 0.028, 0.05, x, y, z, 'brass', { seg: 24 });
  k.tube(pts, 0.011, 'brass', { ts: 64, rs: 12 });
  k.cyl(0.013, 0.013, 0.018, x + dx * reach, y + hgt - 0.075, z + dz * reach, 'brushed', { seg: 14 });
  k.tube([[x - dz * 0.03, y + 0.1, z + dx * 0.03], [x - dz * 0.11, y + 0.13, z + dx * 0.11]], 0.006, 'brass', { ts: 2 });
}

// Wall-hung television above a floating walnut media unit. Back against local +z.
export function tvWall(k, x, z, rot, { size = 1.45, unit = 1.8 } = {}) {
  const c = k.at(x, 0, z, rot), th = size * 0.5625;
  c.box(unit, 0.42, 0.4, 0, 0.22, -0.2, 'walnut', { r: 0.01 });
  for (let i = 1; i < 3; i++) c.box(0.004, 0.36, 0.004, -unit / 2 + (i * unit) / 3, 0.25, -0.402, 'blackmetal', { edges: false });
  c.box(unit - 0.06, 0.01, 0.02, 0, 0.21, -0.38, 'lamp', { edges: false, cast: false });
  c.box(size + 0.02, th + 0.02, 0.03, 0, 1.25 - th / 2, -0.035, 'carTrim', { r: 0.006 });
  c.box(size, th, 0.004, 0, 1.25 - th / 2 + 0.01, -0.052, 'blackGlass', { r: 0.002, edges: false });
  books(c.at(-unit * 0.32, 0.64, -0.2), 0, 0, 0, 0.2, rnd(9), 3);
  vase(c, unit * 0.34, 0.64, -0.2, { h: 0.24, r: 0.06, stems: 5, seed: 17, bloom: null, mat: 'ceramic' });
  bowl(c, unit * 0.14, 0.64, -0.18, 0.1, 'glaze');
}
