// The building, modelled once. The plan sheet, the rising walls and the walk-through
// are all views of this same geometry.
//
// Units: metres. Axes: +x east, +z south, +y up. Origin: NW corner of the upper-floor footprint.
// Ground floor (PB) occupies x 0.40–14.40; the upper floors overhang the parking to x 20.40.
// Depth is 9.00 m. Sizes are measured off the renders (cars for scale) and are approximate.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMesh, patchLine, INK } from './materials.js';
import { buildShops } from './shops.js';
import { buildResidence } from './residence.js';
import { buildStudio } from './studio.js';
import { Kit, doorLeaf, rnd } from './props.js';
import { buildRoof } from './roof.js';
import { buildCars } from './cars.js';
import { buildContext } from './context.js';
import { buildStair } from './stair.js';
import { S } from './scale.js';

export const LEVELS = {
  pb: 0, pbTop: 3.3,          // ground floor clear height 3.30
  s1: 3.6, s1Top: 6.4,        // floor 1 (slab 3.30–3.60)
  s2: 6.7, s2Top: 9.5,        // floor 2 (slab 6.40–6.70)
  roof: 9.8, parapet: 10.6,   // roof slab 9.50–9.80
  towers: 12.6,
};
export const CUT = 1.2;

// Planting (built as leaf-card trees in trees.js). [x, z, scale, baseY, room]
export const TREES = [
  [3.8, -2.5, 1, 0, 'site'], [11.7, -2.6, 1.05, 0, 'site'], [17.0, -2.5, 0.95, 0, 'site'],
  [-2.9, 13.5, 0.9, 0, 'site'], [-2.9, 20, 0.9, 0, 'site'],
  [10.25, 4.6, 0.9, 0.49, 'lobby', { rx: 1.35, rz: 0.82, ry: 0.95, cy: 3.95, n: 340 }],
  [0.75, 5.3, 0.5, 7.32, 'resi', { rx: 0.4, rz: 0.3, ry: 0.5, cy: 8.65, n: 170 }],
  [0.48, 7.5, 0.6, 10.41, 'roof', { rx: 0.8, rz: 0.8, ry: 0.6, cy: 12.3, n: 200 }],
  [3.7, 0.48, 0.6, 10.41, 'roof', { rx: 0.8, rz: 0.8, ry: 0.6, cy: 12.3, n: 200 }],
  [19.7, 0.75, 0.6, 10.41, 'roof', { rx: 0.8, rz: 0.8, ry: 0.6, cy: 12.3, n: 200 }],
];
// low planting in the street-tree pits, a ring of six clumps round each trunk: [x, z, scale, baseY, room]
const PIT_PLANTS = TREES.filter(([, , , base, room]) => room === 'site' && base === 0)
  .flatMap(([x, z], i) => Array.from({ length: 6 }, (_, j) => {
    const a = (j / 6) * Math.PI * 2 + i, rr = (j % 2 ? 0.36 : 0.3) / 1.3;
    return [x + Math.cos(a) * rr, z + Math.sin(a) * rr, j % 2 ? 0.3 : 0.36, 0.04, 'site'];
  }));
// the corner planters on the café terrace, planted end to end
const CORNER_PLANTS = [[-3.3, 0.5], [-2.7, 0.5], [-2.1, 0.5], [-1.5, 0.5], [-1.1, 0.45], [-3.2, 1.15], [-3.2, 1.55]]
  .map(([x, z], i) => [x, z, i % 2 ? 0.42 : 0.5, 0.75, 'site']);
export const SHRUBS = [
  ...PIT_PLANTS, ...CORNER_PLANTS,
  [6.55, 2.55, 0.5, 0.42, 'cafe'], [1.0, 5.45, 0.6, 0.5, 'boutique'],
  [10.02, 4.47, 0.32, 0.47, 'lobby'], [10.5, 4.74, 0.3, 0.47, 'lobby'], [10.4, 4.38, 0.26, 0.47, 'lobby'],
  [19.6, 8.2, 0.55, 10.6, 'site'],
  [0.62, 7.25, 0.6, 7.22, 'resi'],
  [2.55, 5.55, 0.5, 4.07, 'studio'],
  [1.2, 0.5, 0.55, 10.41, 'roof'], [2.2, 0.5, 0.5, 10.41, 'roof'], [3.0, 0.48, 0.5, 10.41, 'roof'],
  [0.5, 4.2, 0.55, 10.41, 'roof'], [0.5, 5.2, 0.5, 10.41, 'roof'], [0.5, 6.4, 0.55, 10.41, 'roof'],
  // east deck: the bed along the north parapet and the one on the east parapet
  [16.5, 0.48, 0.5, 10.41, 'roof'], [17.6, 0.5, 0.55, 10.41, 'roof'], [18.6, 0.47, 0.5, 10.41, 'roof'],
  [20.0, 2.7, 0.45, 10.36, 'roof'], [20.0, 3.7, 0.5, 10.36, 'roof'], [20.0, 4.6, 0.45, 10.36, 'roof'],
];

function worldUV(g) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = p.getX(i); v = -p.getZ(i); }
    else if (nx >= nz) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export class Builder {
  constructor(lib, rooms) {
    this.lib = lib; this.rooms = rooms;
    this.buckets = new Map();
    this.lines = new Map();
    this.caps = new Map();
    this.capList = [];
  }
  _push(g, room, mat, o = {}) {
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!o.keepUV) worldUV(g);
    const key = `${room}|${mat}|${o.glass ? 1 : 0}`;
    if (!this.buckets.has(key)) this.buckets.set(key, { room, mat, glass: !!o.glass, cast: o.cast !== false, geoms: [] });
    this.buckets.get(key).geoms.push(g);
    if (o.edges !== false) {
      const e = new THREE.EdgesGeometry(o.edgeGeom ?? g, o.edgeAngle ?? 30);
      const cls = o.fine ? 'fine' : 'strong';
      const k = `${room}|${cls}`;
      if (!this.lines.has(k)) this.lines.set(k, { room, cls, arr: [] });
      const arr = this.lines.get(k).arr;
      const a = e.attributes.position.array;
      for (let i = 0; i < a.length; i++) arr.push(a[i]);
      e.dispose();
    }
    return g;
  }
  box(x0, x1, y0, y1, z0, z1, room, mat, o = {}) {
    if (!o.noScale) { x0 *= S; x1 *= S; z0 *= S; z1 *= S; }
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    if (o.taper) {   // narrow the top face along z (garments, shoulders)
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * o.taper);
    }
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this._push(g, room, mat, o);
    if (o.cap) this.cap(x0, x1, z0, z1, y0, y1, o.cap);
  }
  cyl(x, z, r, y0, y1, room, mat, o = {}) {
    if (!o.noScale) { x *= S; z *= S; }
    const g = new THREE.CylinderGeometry(o.r1 ?? r, r, y1 - y0, o.seg ?? 24);
    g.translate(x, (y0 + y1) / 2, z);
    this._push(g, room, mat, { edgeAngle: 40, ...o });
    if (o.cap) this.capDisc(x, z, r, y0, y1, o.cap);
  }
  blob(x, y, z, r, room, mat, o = {}) {
    x *= S; z *= S;
    const g = new THREE.IcosahedronGeometry(r, o.detail ?? 1);
    g.scale(1, o.sy ?? 0.8, 1);
    g.translate(x, y, z);
    this._push(g, room, mat, { edges: false, ...o });
  }
  // any geometry already placed in world space (props.js)
  add(g, room, mat, o = {}) { return this._push(g, room, mat, o); }
  sphere(x, y, z, r, room, mat, o = {}) {
    x *= S; z *= S;
    const g = new THREE.SphereGeometry(r, 20, 14);
    g.translate(x, y, z);
    this._push(g, room, mat, { edges: false, ...o });
  }
  line(points, room, fine = true) {
    const k = `${room}|${fine ? 'fine' : 'strong'}`;
    if (!this.lines.has(k)) this.lines.set(k, { room, cls: fine ? 'fine' : 'strong', arr: [] });
    const arr = this.lines.get(k).arr;
    const p = points.map(([x, y, z]) => [x * S, y, z * S]);
    for (let i = 0; i < p.length - 1; i++) arr.push(...p[i], ...p[i + 1]);
  }
  _capKey(y0, y1, color) {
    const k = `${y0.toFixed(3)}|${y1.toFixed(3)}|${color}`;
    if (!this.caps.has(k)) this.caps.set(k, { y0, y1, color, geoms: [] });
    return this.caps.get(k);
  }
  cap(x0, x1, z0, z1, y0, y1, color = 'ink') {
    const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0));
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    this._capKey(y0, y1, color).geoms.push(g);
  }
  capDisc(x, z, r, y0, y1, color = 'ink') {
    const g = new THREE.CircleGeometry(r, 20);
    g.rotateX(-Math.PI / 2);
    g.translate(x, 0, z);
    this._capKey(y0, y1, color).geoms.push(g.toNonIndexed());
  }

  // Straight wall with openings. axis 'x' runs along x at z = c; axis 'z' runs along z at x = c.
  wall(axis, c, a0, a1, y0, y1, t, room, mat, openings = [], o = {}) {
    const B = (s0, s1, h0, h1, rm = room, m = mat, extra = {}) => {
      if (s1 - s0 < 1e-3 || h1 - h0 < 1e-3) return;
      if (axis === 'x') this.box(s0, s1, h0, h1, c - t / 2, c + t / 2, rm, m, { cap: o.cap ?? 'ink', ...extra });
      else this.box(c - t / 2, c + t / 2, h0, h1, s0, s1, rm, m, { cap: o.cap ?? 'ink', ...extra });
    };
    let cur = a0;
    const ops = [...openings].sort((p, q) => p.a - q.a);
    for (const op of ops) {
      B(cur, op.a, y0, y1);
      B(op.a, op.b, y0, y0 + op.y0);
      B(op.a, op.b, y0 + op.y1, y1);
      if (op.glass) {
        const gt = 0.03, gr = op.room ?? room;
        if (axis === 'x') this.box(op.a, op.b, y0 + op.y0, y0 + op.y1, c - gt / 2, c + gt / 2, gr, 'glass', { glass: true, cast: false });
        else this.box(c - gt / 2, c + gt / 2, y0 + op.y0, y0 + op.y1, op.a, op.b, gr, 'glass', { glass: true, cast: false });
        // slim black frame
        const f = 0.05, fr = op.frameRoom ?? gr;
        const fb = (s0, s1, h0, h1) => axis === 'x'
          ? this.box(s0, s1, h0, h1, c - 0.04, c + 0.04, fr, 'blackmetal', { fine: true })
          : this.box(c - 0.04, c + 0.04, h0, h1, s0, s1, fr, 'blackmetal', { fine: true });
        fb(op.a, op.a + f, y0 + op.y0, y0 + op.y1);
        fb(op.b - f, op.b, y0 + op.y0, y0 + op.y1);
        fb(op.a, op.b, y0 + op.y1 - f, y0 + op.y1);
        if (op.y0 > 0.02) fb(op.a, op.b, y0 + op.y0, y0 + op.y0 + f);
        if (op.mullions) for (let i = 1; i < op.mullions; i++) {
          const s = op.a + (op.b - op.a) * i / op.mullions;
          fb(s - f / 2, s + f / 2, y0 + op.y0, y0 + op.y1);
        }
      }
      cur = op.b;
    }
    B(cur, a1, y0, y1);
  }

  build(scene) {
    const out = { meshes: [], lines: [], caps: [] };
    for (const b of this.buckets.values()) {
      const geom = mergeGeometries(b.geoms, false);
      const mat = this.lib[b.mat]();
      patchMesh(mat, this.rooms[b.room], { glass: b.glass });
      const m = new THREE.Mesh(geom, mat);
      m.castShadow = b.cast && !b.glass;
      m.receiveShadow = !b.glass;
      if (b.glass) m.renderOrder = 2;
      scene.add(m); out.meshes.push(m);
    }
    for (const l of this.lines.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(l.arr, 3));
      const mat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: l.cls === 'fine' ? 0.42 : 0.92, depthWrite: false });
      patchLine(mat, this.rooms[l.room]);
      const ls = new THREE.LineSegments(g, mat);
      ls.renderOrder = 3;
      scene.add(ls); out.lines.push(ls);
    }
    const capColors = { ink: '#151515', grey: '#9a978f', light: '#dedad1' };
    for (const c of this.caps.values()) {
      const m = new THREE.Mesh(mergeGeometries(c.geoms.map(g => g.index ? g.toNonIndexed() : g), false),
        new THREE.MeshBasicMaterial({ color: capColors[c.color], side: THREE.DoubleSide, toneMapped: false }));
      m.userData = { y0: c.y0, y1: c.y1 };
      m.renderOrder = 1;
      scene.add(m); out.caps.push(m);
    }
    return out;
  }
}

// ------------------------------------------------------------------------------------------
export function buildModel(B) {
  const L = LEVELS;
  const T_EXT = 0.25, T_INT = 0.14;
  const G = 0, GT = L.pbTop;

  // ---------------- SITE ----------------
  B.box(-120, 160, -0.32, -0.3, -120, 160, 'site', 'grass', { edges: false, cast: false });
  // roads (asphalt) — north street and west street
  B.box(-12.5, 160, -0.3, -0.15, -12, -3.9, 'site', 'asphalt', { edges: false, cast: false });
  B.box(-12.5, -4.5, -0.3, -0.15, -3.9, 160, 'site', 'asphalt', { edges: false, cast: false });
  B.box(-120, -12.5, -0.3, -0.15, -12, -3.9, 'site', 'asphalt', { edges: false, cast: false });
  B.box(-12.5, 160, -0.3, -0.15, -120, -12, 'site', 'grass', { edges: false, cast: false });
  // curbs + sidewalks
  B.box(-4.5, 20.4, -0.15, 0, -3.9, 0, 'site', 'pavers', { cast: false });          // north sidewalk
  B.box(20.4, 60, -0.15, 0, -3.9, -0.6, 'site', 'pavers', { cast: false });
  B.box(-4.5, 0.4, -0.15, 0, 0, 30, 'site', 'pavers', { cast: false });            // west sidewalk + café terrace
  B.box(-4.62, -4.5, -0.15, 0.0, -4.02, 30, 'site', 'curb', { fine: true, cast: false });
  B.box(-4.62, 60, -0.15, 0.0, -4.02, -3.9, 'site', 'curb', { fine: true, cast: false });
  // driveway apron + parking slab
  B.box(14.4, 20.4, -0.02, 0, 0, 9, 'garage', 'curb', { cast: false });
  // crosswalks
  for (let i = 0; i < 4; i++) B.box(-3.6 - i * 0, -0.6, -0.149, -0.14, -6.0 - i * 1.4, -5.4 - i * 1.4, 'site', 'curb', { fine: true, cast: false });
  for (let i = 0; i < 2; i++) B.box(-11.6 + i * 1.6, -10.8 + i * 1.6, -0.149, -0.14, 2.0, 5.5, 'site', 'curb', { fine: true, cast: false });

  // the neighbourhood: blocks, the square across the avenue, street trees, lamps, parked cars
  buildContext(B);

  // street trees: each in a raised cantero (precast kerb, dark soil, bark mulch, river stones)
  for (const [x, z, , base, room] of TREES) if (room === 'site' && base === 0) treePit(B, x, z);

  // café terrace on the corner: planter at the corner (tables, chairs and umbrella in shops.js)
  B.box(-3.6, -0.9, 0, 0.75, 0.1, 0.9, 'site', 'concrete', { fine: true, cap: 'light' });
  B.box(-3.6, -2.8, 0, 0.75, 0.9, 1.8, 'site', 'concrete', { fine: true, cap: 'light' });
  B.box(-3.52, -0.98, 0.75, 0.77, 0.18, 0.82, 'site', 'soil', { edges: false, cast: false });
  B.box(-3.52, -2.88, 0.75, 0.77, 0.82, 1.72, 'site', 'soil', { edges: false, cast: false });
  { const k = new Kit(B, 'site'); for (const [x, z, s] of [[-3.0, 0.62, 1], [-1.8, 0.4, 0.9], [-3.3, 1.35, 1.1]]) grassTuft(k, x, 0.77, z, s, Math.round(x * 50 + z * 9)); }

  // ---------------- GROUND FLOOR (PB) ----------------
  // exterior walls — grey render
  B.wall('x', T_EXT / 2, 0.4, 14.4, G, GT, T_EXT, 'site', 'concrete', [
    { a: 0.9, b: 5.4, y0: 0.1, y1: 2.9, glass: true, mullions: 3, room: 'cafe' },
    { a: 7.2, b: 8.4, y0: 0, y1: 2.7 },                                  // entrance (door is its own object)
    { a: 10.6, b: 11.5, y0: 1.1, y1: 2.2, glass: true, room: 'care' },
    { a: 12.6, b: 13.5, y0: 1.1, y1: 2.2, glass: true, room: 'care' },
  ]);
  B.wall('z', 0.4 + T_EXT / 2, 0.25, 8.75, G, GT, T_EXT, 'site', 'concrete', [
    { a: 0.5, b: 1.8, y0: 0.05, y1: 2.9, glass: true, room: 'cafe' },
    { a: 1.88, b: 2.78, y0: 0, y1: 2.7 },                                // café door (own object)
    { a: 3.15, b: 4.05, y0: 0, y1: 2.7 },                                // boutique door (own object)
    { a: 4.15, b: 5.6, y0: 0.05, y1: 2.9, glass: true, room: 'boutique' },
    { a: 6.2, b: 7.1, y0: 0, y1: 2.7 },                                  // bookshop door (own object)
    { a: 7.25, b: 8.5, y0: 0.05, y1: 2.9, glass: true, room: 'shop3' },
  ]);
  B.wall('x', 9 - T_EXT / 2, 0.4, 14.4, G, GT, T_EXT, 'site', 'concrete');
  B.wall('z', 14.4 - T_EXT / 2, 0.25, 8.75, G, GT, T_EXT, 'site', 'concrete', [{ a: 6.1, b: 7.0, y0: 0, y1: 2.2 }]);
  // inner lining around the entrance so the lobby side reads as plaster
  B.box(7.075, 7.2, G, GT, 0.25, 0.32, 'lobby', 'plaster', { fine: true });
  B.box(8.4, 8.525, G, GT, 0.25, 0.32, 'lobby', 'plaster', { fine: true });
  B.box(7.2, 8.4, 2.7, GT, 0.25, 0.32, 'lobby', 'plaster', { fine: true });
  // dark recessed portal around the entrance (outside)
  B.box(6.95, 7.2, G, 3.0, -0.12, 0.0, 'site', 'darkstone', {});
  B.box(8.4, 8.65, G, 3.0, -0.12, 0.0, 'site', 'darkstone', {});
  B.box(6.95, 8.65, 2.7, 3.0, -0.12, 0.0, 'site', 'darkstone', {});

  // three shops (west) — café, clothing store, and a third unit left as a drawing
  buildShops(B, G, GT);

  // lobby / circulation spine (x 7.075–8.525) and hall (z 5.6–6.9)
  B.wall('z', 7.0375, 0.25, 8.75, G, GT, 0.075, 'lobby', 'plaster');   // shop-side half lives in shops.js
  B.wall('z', 8.6, 0.25, 3.6, G, GT, 0.15, 'lobby', 'plaster', [{ a: 2.3, b: 3.2, y0: 0, y1: 2.2 }]);
  // light-well patio, glazed on two sides
  B.wall('x', 3.6, 8.525, 14.275, G, GT, 0.15, 'lobby', 'plaster');
  B.wall('z', 8.6, 3.675, 5.6, G, GT, 0.08, 'lobby', 'plaster', [{ a: 3.675, b: 5.6, y0: 0, y1: GT, glass: true }], { cap: 'ink' });
  B.wall('x', 5.6, 8.56, 11.9, G, GT, 0.08, 'lobby', 'plaster', [{ a: 8.56, b: 11.9, y0: 0, y1: GT, glass: true, mullions: 2 }]);
  B.wall('z', 11.9, 3.675, 8.0, G, GT, 0.15, 'lobby', 'plaster', [{ a: 6.0, b: 6.9, y0: 0, y1: 2.2 }]);
  // corridor from the hall to the garage, past the office
  B.wall('x', 8.0, 11.975, 14.275, G, GT, 0.15, 'lobby', 'plaster');
  B.wall('x', 5.95, 11.975, 14.275, G, GT, 0.12, 'lobby', 'plaster');
  // services room behind the hall, faced with oak slats
  B.wall('x', 6.9, 7.075, 8.7, G, GT, 0.15, 'lobby', 'plaster');
  B.wall('z', 8.7, 6.9, 8.75, G, GT, 0.15, 'lobby', 'plaster');
  for (let x = 7.12; x < 8.65; x += 0.09) B.box(x, x + 0.045, 0.0, 3.25, 6.78, 6.825, 'lobby', 'oak', { fine: true, edges: false });
  B.box(7.075, 8.7, 0.0, 3.25, 6.826, 6.83, 'lobby', 'darkstone', { edges: false });

  // closed door to the caretaker's flat (the garage corridor door is its own object)
  doorLeaf(new Kit(B, 'lobby'), 'z', 8.6, 2.3, 3.2, { h: 2.18 });

  // caretaker unit
  B.wall('z', 10.2, 0.25, 2.0, G, GT, 0.1, 'care', 'plaster', [{ a: 1.2, b: 1.9, y0: 0, y1: 2.1 }]);
  B.wall('x', 2.0, 8.675, 10.2, G, GT, 0.1, 'care', 'plaster');
  B.box(8.675, 14.275, -0.02, 0, 0.25, 3.525, 'care', 'oak', { edges: false, cast: false });
  B.box(12.4, 14.0, 0, 0.5, 0.5, 2.5, 'care', 'linen', { fine: true });
  B.cyl(11.0, 2.7, 0.45, 0.72, 0.76, 'care', 'oak', { fine: true });
  // office / administration
  B.box(11.975, 14.275, -0.02, 0, 3.675, 5.89, 'office', 'oak', { edges: false, cast: false });
  B.box(12.6, 14.0, 0, 0.75, 4.4, 5.2, 'office', 'oak', { fine: true });
  B.box(14.0, 14.2, 0, 2.0, 3.8, 5.8, 'office', 'oak', { fine: true });
  B.box(11.9, 14.275, -0.02, 0, 5.89, 7.925, 'lobby', 'travertine', { edges: false, cast: false });
  B.box(12.4, 13.9, GT - 0.03, GT, 6.9, 7.0, 'lobby', 'lamp', { fine: true, cast: false });

  // lobby floor — travertine; patio — gravel
  B.box(7.075, 8.525, -0.02, 0, 0.25, 6.9, 'lobby', 'travertine', { edges: false, cast: false });
  B.box(8.525, 11.825, -0.02, 0, 5.6, 6.9, 'lobby', 'travertine', { edges: false, cast: false });
  B.box(8.7, 11.825, -0.02, 0, 6.9, 8.75, 'lobby', 'travertine', { edges: false, cast: false });
  B.box(8.64, 11.825, -0.06, -0.01, 3.675, 5.56, 'lobby', 'gravel', { edges: false, cast: false });
  // stair to floor 1, entered from the hall
  buildStair(B, 'lobby', 0, L.s1, { hallSide: true, guardFrom: 3 });
  // lobby furniture: bronze letterboxes, travertine bench, olive tree in the patio
  B.box(7.075, 7.14, 0.95, 2.05, 1.0, 2.8, 'lobby', 'bronze', { fine: true });
  for (let z = 1.0; z < 2.8; z += 0.3) for (let y = 0.95; y < 2.05; y += 0.22) B.box(7.14, 7.145, y + 0.02, y + 0.2, z + 0.02, z + 0.28, 'lobby', 'blackmetal', { edges: false, cast: false });
  B.box(7.12, 7.62, 0, 0.44, 3.9, 5.5, 'lobby', 'travertine', { fine: true });
  patioPlanting(B);
  // linear light in the ceiling + sconces
  B.box(7.74, 7.86, GT - 0.03, GT, 0.6, 5.4, 'lobby', 'lamp', { fine: true, cast: false });
  B.box(7.074, 7.1, 1.7, 2.1, 3.1, 3.4, 'lobby', 'lamp', { fine: true, cast: false });

  // parking: columns under the overhang, painted bays, ceiling lights, three cars
  // (the sliding gate on the street is its own object, buildGate)
  for (const z of [0.25, 3.1, 5.9, 8.75]) B.box(19.95, 20.35, 0, GT, z - 0.2, z + 0.2, 'site', 'concrete', { cap: 'ink' });
  for (const x of [16.3, 18.2]) {
    B.line([[x, 0.005, 0.8], [x, 0.005, 8.6]], 'garage', true);
    B.box(x - 0.03, x + 0.03, 0, 0.004, 0.8, 8.6, 'garage', 'paintWhite', { edges: false, cast: false });
  }
  for (const x of [15.35, 17.25, 19.1]) {
    B.box(x - 0.06, x + 0.06, 0, 0.004, 4.65, 4.75, 'garage', 'paintWhite', { edges: false, cast: false });
    B.box(x - 0.6, x + 0.6, GT - 0.03, GT, 4.65, 4.75, 'garage', 'lamp', { fine: true, cast: false });
  }
  buildCars(B);

  // ---------------- SLABS, BANDS, UPPER FLOORS ----------------
  // slabs stop 2 cm short of the outer faces, so their edges never z-fight with the façade
  const IN = (v, lo, hi) => Math.min(hi - 0.02, Math.max(lo + 0.02, v));
  const slab = (y0, y1, room, mat, rects) => rects.forEach(([x0, x1, z0, z1]) =>
    B.box(IN(x0, 0, 20.4), IN(x1, 0, 20.4), y0, y1, IN(z0, 0, 9), IN(z1, 0, 9), room, mat, { fine: true }));
  const slabRects = {
    shops: [[0.0, 7.0, 0, 2.95], [0.0, 7.0, 2.95, 5.95], [0.0, 7.0, 5.95, 9]],
    lobby: [[7.0, 8.6, 0, 5.6], [7.0, 8.7, 5.6, 9], [8.7, 11.9, 5.6, 6.9]],   // stair well left open
    rest: [[8.6, 14.4, 0, 3.6], [11.9, 14.4, 3.6, 9]],
    garage: [[14.4, 20.4, 0, 9]],
  };
  slab(L.pbTop, L.s1, 'cafe', 'ceiling', [slabRects.shops[0]]);
  slab(L.pbTop, L.s1, 'boutique', 'ceiling', [slabRects.shops[1]]);
  slab(L.pbTop, L.s1, 'shop3', 'ceiling', [slabRects.shops[2]]);
  slab(L.pbTop, L.s1, 'lobby', 'ceiling', slabRects.lobby);
  slab(L.pbTop, L.s1, 'site', 'ceiling', slabRects.rest);
  slab(L.pbTop, L.s1, 'garage', 'ceiling', slabRects.garage);
  // floor 1 ceiling: studio 1.02 and the landing/corridor own their part
  slab(L.s1Top, L.s2, 'studio', 'ceiling', [slabRects.shops[1]]);
  slab(L.s1Top, L.s2, 'landing', 'ceiling', [slabRects.lobby[0], slabRects.lobby[1], slabRects.lobby[2]]);
  slab(L.s1Top, L.s2, 'upper', 'ceiling', [slabRects.shops[0], slabRects.shops[2], ...slabRects.rest, ...slabRects.garage]);
  // floor 2 ceiling (roof slab): the residence and its landing
  slab(L.s2Top, L.roof, 'resi', 'ceiling', slabRects.shops);
  slab(L.s2Top, L.roof, 'landing2', 'ceiling', [slabRects.lobby[0], slabRects.lobby[1], [8.7, 11.9, 6.9, 9]]);
  slab(L.s2Top, L.roof, 'upper', 'ceiling', [slabRects.lobby[2], ...slabRects.rest, ...slabRects.garage]);

  // dark textured bands at each floor line + under the parapet (from the elevations)
  for (const [y0, y1] of [[3.0, 3.75], [6.1, 6.75], [9.1, 9.8]]) {
    B.box(-0.14, 20.54, y0, y1, -0.14, 0.0, 'site', 'darkstone', { cap: 'ink' });
    B.box(-0.14, 0.0, y0, y1, 0.0, 9.0, 'site', 'darkstone', { cap: 'ink' });
    B.box(20.4, 20.54, y0, y1, 0.0, 9.0, 'site', 'darkstone', { cap: 'ink' });
  }

  // upper floors exterior walls (white render) with openings measured from the elevations
  const north = [[3.2, 4.6], [5.9, 6.4], [7.6, 8.0], [9.5, 10.6], [11.0, 11.75, 'door'], [12.4, 12.8], [13.9, 14.4], [16.0, 17.1]];
  const west = [[1.4, 2.9], [3.1, 4.6], [6.0, 7.5]];
  const east = [[1.5, 2.9], [3.1, 4.5], [6.0, 7.3]];
  for (const [y0, y1] of [[L.s1, L.s1Top], [L.s2, L.s2Top]]) {
    const yA = y0 - 0.3, yB = y1;   // wall spans slab edge to underside of next slab
    B.wall('x', T_EXT / 2, 0, 20.4, yA, yB + 0.3, T_EXT, 'site', 'render',
      north.map(([a, b, k]) => ({ a, b, y0: k ? 0.3 : 1.2, y1: 2.5, glass: true, room: 'site' })));
    // on floor 2 the middle French window stands half open (the walk leaves through it)
    const westOps = y0 === L.s2
      ? [[1.4, 2.9], [6.0, 7.5]].map(([a, b]) => ({ a, b, y0: 0.32, y1: 2.75, glass: true, mullions: 2, room: 'site' }))
        .concat([{ a: 3.1, b: 3.85, y0: 0.32, y1: 2.75, glass: true, room: 'site' }, { a: 3.85, b: 4.6, y0: 0.32, y1: 2.75 }])
      : west.map(([a, b]) => ({ a, b, y0: 0.32, y1: 2.75, glass: true, mullions: 2, room: 'site' }));
    B.wall('z', T_EXT / 2, 0.25, 8.75, yA, yB + 0.3, T_EXT, 'site', 'render', westOps);
    B.wall('z', 20.4 - T_EXT / 2, 0.25, 8.75, yA, yB + 0.3, T_EXT, 'site', 'render',
      east.map(([a, b]) => ({ a, b, y0: 1.0, y1: 2.5, glass: true, room: 'site' })));
    B.wall('x', 9 - T_EXT / 2, 0, 20.4, yA, yB + 0.3, T_EXT, 'site', 'render');
    // railings on the west French windows
    for (const [a, b] of west) {
      B.box(-0.35, -0.32, y0 + 0.95, y0 + 1.0, a - 0.1, b + 0.1, 'site', 'blackmetal', { fine: true });
      for (let z = a - 0.1; z <= b + 0.1; z += 0.5) B.box(-0.35, -0.32, y0 - 0.05, y0 + 0.95, z, z + 0.03, 'site', 'blackmetal', { edges: false });
    }
    // partitions (cut drawing reads the unit layout as the floors rise)
    const P = (axis, c, a0, a1, room = 'upper') => B.wall(axis, c, a0, a1, y0, y1, 0.12, room, 'plaster');
    const f1 = y0 === L.s1, ld = f1 ? 'landing' : 'landing2';
    P('z', 12.0, 0.25, 6.9); P('z', 12.0, 6.9, 8.75, ld);
    P('x', 2.95, 12.0, 20.15); P('x', 5.95, 12.0, 20.15);
    P('z', 8.6, 0.25, 3.6, ld); P('x', 6.9, 8.7, 12.0, ld);
    for (const z of [0.25, 3.02, 6.02]) P('z', 13.5, z, z + 1.7);
    // floor 1 west studios: see studio.js; floor 2 west half: the residence (residence.js)
    // light-well walls
    B.wall('z', 8.6, 3.6, 5.6, y0 - 0.3, y1, 0.2, 'lobby', 'render', [{ a: 4.0, b: 5.2, y0: 1.2, y1: 2.5, glass: true }]);
    B.wall('z', 11.9, 3.6, 5.6, y0 - 0.3, y1, 0.2, 'lobby', 'render');
    B.wall('x', 3.6, 8.5, 12.0, y0 - 0.3, y1, 0.2, 'lobby', 'render', [{ a: 9.4, b: 11.1, y0: 1.0, y1: 2.5, glass: true }]);
    B.wall('x', 5.6, 8.5, 12.0, y0 - 0.3, y1, 0.2, 'lobby', 'render', [{ a: 9.0, b: 11.4, y0: 0.9, y1: 2.5, glass: true }]);
  }
  buildStudio(B, L);
  buildResidence(B, L);
  buildRoof(B, L);

  // parapet + light-well kerb on the roof
  B.wall('x', 0.1, 0, 20.4, L.roof, L.parapet, 0.2, 'site', 'render');
  B.wall('x', 8.9, 0, 20.4, L.roof, L.parapet, 0.2, 'site', 'render');
  B.wall('z', 0.1, 0.2, 8.8, L.roof, L.parapet, 0.2, 'site', 'render');
  B.wall('z', 20.3, 0.2, 8.8, L.roof, L.parapet, 0.2, 'site', 'render');
  // roof volumes (stair + tanks) and the pergola
  B.box(4.9, 8.2, L.roof, L.towers, 2.9, 6.2, 'site', 'concrete', { cap: 'ink' });
  B.box(12.0, 15.3, L.roof, L.towers, 2.9, 6.2, 'site', 'concrete', { cap: 'ink' });
  for (const [x, z] of [[16.3, 1.3], [19.4, 1.3], [16.3, 5.5], [19.4, 5.5]]) B.box(x - 0.05, x + 0.05, L.roof, 12.3, z - 0.05, z + 0.05, 'site', 'blackmetal', { fine: true });
  for (let z = 1.3; z <= 5.55; z += 0.6) B.box(16.2, 19.5, 12.2, 12.3, z - 0.03, z + 0.03, 'site', 'blackmetal', { fine: true });
}

// Square tree pit in the sidewalk: 1.4 m precast concrete kerb, soil and bark mulch, a few stones.
function treePit(B, x, z) {
  const k = new Kit(B, 'site'), W = 1.4, T = 0.1, H = 0.16, o = { noScale: true, r: 0.012, fine: true };
  for (const s of [-1, 1]) {
    k.box(W, H, T, x, -0.02, z + s * (W - T) / 2 / S, 'curb', o);
    k.box(T, H, W - 2 * T, x + s * (W - T) / 2 / S, -0.02, z, 'curb', o);
  }
  k.box(W - 2 * T, 0.1, W - 2 * T, x, -0.04, z, 'soil', { noScale: true, r: 0, edges: false, cast: false });
  const r = rnd(Math.round(x * 97 + z * 31));
  for (let i = 0; i < 26; i++) {
    const px = (r() - 0.5) * (W - 0.3), pz = (r() - 0.5) * (W - 0.3);
    if (Math.hypot(px, pz) < 0.2) continue;
    k.at(x + px / S, 0.055, z + pz / S, r() * 3).box(0.07 + r() * 0.05, 0.012, 0.03 + r() * 0.02, 0, 0, 0, 'walnut', { r: 0.004, edges: false, cast: false });
  }
  for (const [dx, dz, rr] of [[0.42, -0.38, 0.06], [0.36, -0.46, 0.04], [-0.44, 0.1, 0.05], [0.1, 0.44, 0.045]]) {
    k.sphere(rr, x + dx / S, 0.06, z + dz / S, 'pebble', { sy: 0.55, seg: 14, seg2: 10 });
  }
  for (const [dx, dz] of [[-0.45, -0.45], [0.45, 0.42], [-0.42, 0.45]]) grassTuft(k, x + dx / S, 0.06, z + dz / S, 0.8, Math.round((x + dx) * 71 + z * 13));
}

// Ornamental grass: a fountain of thin arching blades.
function grassTuft(k, x, y, z, s = 1, seed = 1) {
  const r = rnd(seed);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, h = (0.35 + r() * 0.3) * s, out = (0.12 + r() * 0.16) * s;
    const c = Math.cos(a), sn = Math.sin(a);
    k.tube([[x, y, z], [x + c * out * 0.25 / S, y + h * 0.7, z + sn * out * 0.25 / S], [x + c * out / S, y + h, z + sn * out / S],
      [x + c * out * 1.35 / S, y + h * 0.82, z + sn * out * 1.35 / S]], 0.0035, i % 3 ? 'sage' : 'stem', { ts: 10, rs: 4 });
  }
}

// The olive's planter in the light well: a honed travertine bowl, dark soil and river stones,
// boulders in the gravel and an uplight at the foot of the tree.
function patioPlanting(B) {
  const k = new Kit(B, 'lobby');
  k.lathe([[0, 0], [0.51, 0], [0.53, 0.04], [0.59, 0.1], [0.645, 0.26], [0.67, 0.47], [0.66, 0.54], [0.635, 0.56], [0.6, 0.555], [0.575, 0.52], [0.565, 0.45], [0, 0.45]], 10.25, 0, 4.6, 'travertine', { seg: 72, edges: true });
  k.cyl(0.57, 0.57, 0.03, 10.25, 0.45, 4.6, 'soil', { seg: 56, edges: false });
  for (const [dx, dz, r] of [[0.28, 0.1, 0.05], [0.24, 0.2, 0.035], [-0.3, -0.12, 0.045], [-0.1, 0.3, 0.04], [0.05, -0.32, 0.05], [0.33, -0.14, 0.03]]) {
    k.sphere(r, 10.25 + dx, 0.485, 4.6 + dz, 'pebble', { sy: 0.55, seg: 14, seg2: 10 });
  }
  for (const [x, z, r] of [[9.15, 4.0, 0.24], [9.42, 4.08, 0.12], [11.25, 5.1, 0.18], [11.38, 3.98, 0.13]]) k.sphere(r, x, -0.02, z, 'pebble', { sy: 0.55, seg: 20, seg2: 14 });
  k.cyl(0.07, 0.07, 0.04, 9.7, -0.03, 4.95, 'blackmetal', { seg: 20 });
  k.cyl(0.05, 0.05, 0.004, 9.7, 0.01, 4.95, 'lamp', { seg: 20, cast: false });
}

function mulberry(a) { return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Glazed doors: their own objects so they can swing open as the camera arrives.
// The leaf runs along local +x from the hinge; `rot` turns it into place, `open()` swings it inward.
export function buildDoor(lib, room, { W: W0 = 1.16, H = 2.66, hinge = [7.22, 0, 0.13], rot = 0, dir = -1, panel = 'glass' } = {}) {
  const W = W0 * S;
  const g = new THREE.Group();
  const frame = patchMesh(lib.bronze(), room);
  const glass = panel === 'glass' ? patchMesh(lib.glass(), room, { glass: true }) : patchMesh(lib[panel](), room);
  const add = (w, h, d, x, y, z, m) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = m !== glass; g.add(mm); return mm; };
  add(0.06, H, 0.06, 0.03, H / 2, 0, frame);
  add(0.06, H, 0.06, W - 0.03, H / 2, 0, frame);
  add(W, 0.06, 0.06, W / 2, H - 0.03, 0, frame);
  add(W, 0.2, 0.06, W / 2, 0.1, 0, frame);
  add(W - 0.12, H - 0.26, 0.02, W / 2, 0.2 + (H - 0.26) / 2, 0, glass).renderOrder = 2;
  add(0.03, 1.2, 0.05, W - 0.16, 1.05, 0.07 * dir, frame);    // pull handle (street side)
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, 0.06)),
    patchLine(new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.9 }), room));
  edges.position.set(W / 2, H / 2, 0); g.add(edges);
  g.position.set(hinge[0] * S, hinge[1], hinge[2] * S);
  g.rotation.y = rot;
  g.userData.open = (t) => { g.rotation.y = rot + dir * t * 1.45; };
  return g;
}

// The black bar gate across the parking entrance; open() slides it east, clear of the bays.
export function buildGate(lib, room) {
  const geoms = [];
  const bar = (x0, x1, y0, y1, z0, z1) => {
    const g = new THREE.BoxGeometry((x1 - x0) * S, y1 - y0, (z1 - z0) * S);
    g.translate((x0 + x1) / 2 * S, (y0 + y1) / 2, (z0 + z1) / 2 * S);
    geoms.push(g);
  };
  for (let x = 14.5; x < 19.9; x += 0.13) bar(x, x + 0.05, 0, 2.0, 0.05, 0.12);
  bar(14.4, 19.95, 1.95, 2.02, 0.03, 0.14);
  bar(14.4, 19.95, 0.0, 0.07, 0.03, 0.14);
  const m = new THREE.Mesh(mergeGeometries(geoms, false), patchMesh(lib.blackmetal(), room));
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  g.userData.open = (t) => { g.position.x = t * 5.6 * S; };
  return g;
}
