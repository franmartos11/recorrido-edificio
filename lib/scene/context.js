// The neighbourhood around the corner lot, in the manner of an architect's site model: calm
// massing in warm whites with ribbon and punched windows, a square across the avenue, model
// trees, lamps and a few parked cars. Plain boxes and low-poly blobs only, all merged into the
// builder's buckets, no new textures: it adds a few hundred draw-free boxes and almost no weight.
// Plan coordinates (× S): +x east, +z south. The building sits at x 0–20.4, z 0–9.
import * as THREE from 'three';
import { rnd } from './props.js';
import { car } from './cars.js';
import { S } from './scale.js';

const FH = 3.1;                                    // storey height
const MASS = ['ctxA', 'ctxA', 'ctxB', 'ctxC', 'ctxD'];
const NO = { edges: false, cast: false };

export function buildContext(B) {
  const r = rnd(7331);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const flat = (x0, x1, z0, z1, y0, y1, mat, o = {}) => B.box(x0, x1, y0, y1, z0, z1, 'site', mat, { cast: false, ...o });

  // ---------- streets ----------
  // the avenue continues north across North Street; a second ring of streets closes the blocks
  flat(-12.5, -4.5, -120, -12, -0.3, -0.15, 'asphalt', NO);
  flat(-120, 160, -60, -52, -0.3, -0.15, 'asphalt', NO);
  flat(60, 68, -52, 160, -0.3, -0.15, 'asphalt', NO);
  flat(-120, -12.5, 92, 100, -0.3, -0.15, 'asphalt', NO);
  flat(-4.5, 60, 92, 100, -0.3, -0.15, 'asphalt', NO);
  // sidewalks opposite the building, with their kerbs
  const walk = (x0, x1, z0, z1) => flat(x0, x1, z0, z1, -0.15, 0, 'pavers', { edges: false, cast: false });
  walk(-120, -12.5, -15.5, -12); walk(-4.5, 160, -15.5, -12);
  walk(-15.5, -12.5, -3.9, 92); walk(-15.5, -12.5, -52, -15.5); walk(-4.5, -1.5, -52, -15.5);
  walk(-4.5, 0.4, 30, 92); walk(20.4, 60, -0.6, 0);
  flat(-120, 160, -12.12, -12, -0.15, 0.0, 'curb', NO);
  flat(-12.62, -12.5, -3.9, 92, -0.15, 0.0, 'curb', NO);
  // dashed centre lines
  for (let x = -110; x < 150; x += 4.5) if (x > -4 || x < -13.5) flat(x, x + 2.2, -8.03, -7.87, -0.149, -0.145, 'paintWhite', NO);
  for (let z = -110; z < 90; z += 4.5) if (z < -13 || z > -3) flat(-8.58, -8.42, z, z + 2.2, -0.149, -0.145, 'paintWhite', NO);

  // ---------- buildings ----------
  // a row of lots along a street front. along: 'x' or 'z'; front: the street-side coordinate;
  // dir: +1/−1, the direction the lots extend away from the street.
  function row(along, a0, a1, front, dir, o = {}) {
    let a = a0;
    while (a < a1 - 5) {
      const w = Math.min(a1 - a, 7 + r() * 8), d = (o.depth ?? 11) + r() * 4;
      const floors = o.floors ? pick(o.floors) : pick([2, 3, 3, 4, 4, 5]);
      const f0 = front, f1 = front + dir * d;
      const [x0, x1, z0, z1] = along === 'x'
        ? [a + 0.15, a + w - 0.15, Math.min(f0, f1), Math.max(f0, f1)]
        : [Math.min(f0, f1), Math.max(f0, f1), a + 0.15, a + w - 0.15];
      lot(x0, x1, z0, z1, floors, along, dir, o.shops);
      a += w;
    }
  }
  function lot(x0, x1, z0, z1, floors, along, dir, shops) {
    const mat = pick(MASS), H = floors * FH, style = pick(['ribbon', 'punched', 'punched', 'grid']);
    const set = floors >= 4 && r() < 0.45;   // a set-back top storey
    const Hb = set ? H - FH : H;
    flat(x0, x1, z0, z1, 0, Hb, mat, { fine: true, cap: 'light' });
    flat(x0 - 0.06, x1 + 0.06, z0 - 0.06, z1 + 0.06, Hb, Hb + 0.35, mat, { fine: true, cap: 'light' });   // parapet coping
    if (set) {
      const inset = 2.2;
      const [sx0, sx1, sz0, sz1] = along === 'x'
        ? (dir > 0 ? [x0 + 0.6, x1 - 0.6, z0 + inset, z1 - 0.6] : [x0 + 0.6, x1 - 0.6, z0 + 0.6, z1 - inset])
        : (dir > 0 ? [x0 + inset, x1 - 0.6, z0 + 0.6, z1 - 0.6] : [x0 + 0.6, x1 - inset, z0 + 0.6, z1 - 0.6]);
      flat(sx0, sx1, sz0, sz1, Hb, H, mat, { fine: true, cap: 'light' });
    }
    // windows on the street front (and on the far face, so the blocks read from both sides)
    const len = along === 'x' ? x1 - x0 : z1 - z0;
    for (const face of [0, 1]) {
      const c = along === 'x' ? (face === 0 ? (dir > 0 ? z0 : z1) : (dir > 0 ? z1 : z0))
        : (face === 0 ? (dir > 0 ? x0 : x1) : (dir > 0 ? x1 : x0));
      const out = (face === 0 ? -dir : dir) * 0.03;
      const pane = (s0, s1, y0, y1) => along === 'x'
        ? flat(x0 + s0, x0 + s1, Math.min(c, c + out), Math.max(c, c + out), y0, y1, 'ctxGlass', NO)
        : flat(Math.min(c, c + out), Math.max(c, c + out), z0 + s0, z0 + s1, y0, y1, 'ctxGlass', NO);
      for (let f = 0; f < floors - (set ? 1 : 0); f++) {
        const y = f * FH;
        if (f === 0 && shops && face === 0) { pane(0.5, len - 0.5, 0.15, 2.7); continue; }
        if (style === 'ribbon') pane(0.6, len - 0.6, y + 0.95, y + 2.35);
        else {
          const n = Math.max(1, Math.floor((len - 0.8) / (style === 'grid' ? 1.9 : 2.6))), step = (len - 0.8) / n;
          const ww = style === 'grid' ? step * 0.62 : Math.min(1.5, step * 0.55);
          for (let i = 0; i < n; i++) { const m = 0.4 + step * (i + 0.5); pane(m - ww / 2, m + ww / 2, y + (style === 'grid' ? 0.5 : 0.9), y + 2.45); }
        }
      }
    }
  }
  // north of North Street: two blocks either side of the avenue, back to back with courtyards
  row('x', -1.5, 58, -16.6, -1, { shops: true });
  row('x', -1.5, 58, -51, 1, { floors: [3, 4, 4, 5] });
  row('x', -58, -15.5, -16.6, -1, { shops: true });
  row('x', -58, -15.5, -51, 1, { floors: [3, 4, 5] });
  // along the avenue, south of the square and south of the low neighbour
  row('z', 47, 90, -16.6, -1, { shops: true, floors: [3, 4, 4] });
  row('z', 23.5, 90, 1.0, 1, { floors: [2, 3, 3, 4] });
  // east along North Street, past the garage
  row('x', 23, 59, 0.6, 1, { floors: [2, 3, 4] });
  row('x', 23, 59, 40, 1, { floors: [3, 4] });
  // beyond the square: a street along its far side and a long row of houses facing it
  flat(-68, -60, -52, 100, -0.3, -0.15, 'asphalt', NO);
  walk(-60, -58, -52, 92);
  row('z', -50, 92, -70, -1, { floors: [2, 2, 3, 3, 4], depth: 12 });
  // the low white neighbour to the south of the lot, kept as it was
  flat(0.4, 14.4, 9.05, 22, 0, 3.6, 'neighbor', { cap: 'light' });
  flat(0.0, 14.8, 9.05, 10.0, 3.6, 4.1, 'neighbor', { cap: 'light' });

  // ---------- trees ----------
  const trees = [];
  const tree = (x, z, s = 1) => trees.push([x, z, s * (0.85 + r() * 0.3)]);
  for (let x = -110; x < 150; x += 7) if (x < -16 || x > 22) tree(x + r(), -14.2, 0.9);   // North Street, far side
  for (let z = -48; z < 90; z += 7) if (z < -16 || z > 0) tree(-14.1, z + r(), 0.9);       // the avenue, far side
  for (let z = 32; z < 90; z += 7) tree(-2.6, z + r(), 0.85);                              // the avenue, near side
  for (const [cx, cz] of [[28, -33], [8, -33], [45, -33], [-36, -33], [-24, -33], [40, 20], [30, 20]])
    for (let i = 0; i < 3; i++) tree(cx + (r() - 0.5) * 8, cz + (r() - 0.5) * 6, 1.1);   // courtyards

  // ---------- the square across the avenue ----------
  // lawn on a low plinth, a stone-edged reflecting pool, gravel walks, an allée along the avenue
  const P = { x0: -58, x1: -16.6, z0: 0.4, z1: 44 };
  flat(P.x0, P.x1, P.z0, P.z1, -0.3, 0.05, 'grass', { edges: false, cast: false });
  for (const [x0, x1, z0, z1] of [[P.x0, P.x1, P.z0 - 0.25, P.z0], [P.x0, P.x1, P.z1, P.z1 + 0.25], [P.x1, P.x1 + 0.25, P.z0, 19], [P.x1, P.x1 + 0.25, 25.5, P.z1]])
    flat(x0, x1, z0, z1, -0.15, 0.4, 'curb', { fine: true });
  const pool = { x0: -44, x1: -31, z0: 15, z1: 29.5 };
  for (const [x0, x1, z0, z1] of [[pool.x0 - 0.5, pool.x1 + 0.5, pool.z0 - 0.5, pool.z0], [pool.x0 - 0.5, pool.x1 + 0.5, pool.z1, pool.z1 + 0.5],
    [pool.x0 - 0.5, pool.x0, pool.z0, pool.z1], [pool.x1, pool.x1 + 0.5, pool.z0, pool.z1]]) flat(x0, x1, z0, z1, 0, 0.36, 'travertine', { fine: true });
  flat(pool.x0, pool.x1, pool.z0, pool.z1, 0, 0.05, 'darkstone', NO);
  flat(pool.x0, pool.x1, pool.z0, pool.z1, 0.28, 0.3, 'water', { edges: false, cast: false });
  flat(pool.x0 - 3.5, pool.x1 + 3.5, pool.z0 - 3.5, pool.z1 + 3.5, 0.05, 0.07, 'gravel', NO);
  flat(pool.x1 + 3.5, P.x1, 20.5, 24, 0.05, 0.07, 'gravel', NO);   // entrance walk from the avenue
  flat(-38.6, -36.4, P.z0, pool.z0 - 3.5, 0.05, 0.07, 'gravel', NO);
  flat(-38.6, -36.4, pool.z1 + 3.5, P.z1, 0.05, 0.07, 'gravel', NO);
  for (const z of [pool.z0 - 2.3, pool.z1 + 1.6]) for (const x of [-42, -34.5]) {   // benches on the gravel
    flat(x, x + 2.4, z, z + 0.7, 0.07, 0.45, 'travertine', { fine: true });
  }
  for (let z = 2.5; z < 43; z += 4.6) if (z < 18.5 || z > 26) tree(-19.5, z, 1.0);   // allée
  for (let z = 4; z < 42; z += 6.5) tree(P.x0 + 3, z, 1.15);
  for (let x = P.x0 + 8; x < -22; x += 6.5) { tree(x, P.z0 + 3, 1.05); tree(x, P.z1 - 3, 1.05); }
  for (const [cx, cz, n] of [[-50, 12, 5], [-50, 33, 4], [-26, 10, 3], [-27, 36, 3]])   // groves on the lawn
    for (let i = 0; i < n; i++) tree(cx + (r() - 0.5) * 9, cz + (r() - 0.5) * 8, 0.9 + r() * 0.4);
  for (let z = -46; z < 92; z += 8) tree(-63.8 + (r() - 0.5), z, 1.0);   // the far street
  // distant tree belts and roofs towards the hills, low and many, to close the horizon
  for (let i = 0; i < 70; i++) {
    const x = -95 - r() * 25, z = -60 + r() * 160;
    if (r() < 0.55) tree(x, z, 1.2 + r() * 0.6);
    else { const w = 6 + r() * 8, d = 7 + r() * 5, h = FH * (1 + Math.floor(r() * 3)); flat(x, x + w / S, z, z + d / S, 0, h, pick(MASS), NO); }
  }

  for (const [x, z, s] of trees) {
    B.cyl(x, z, 0.12 * s, 0, 2.3 * s, 'site', 'bark', { seg: 6, edges: false, cast: false, r1: 0.08 * s });
    const leaf = pick(['ctxLeaf', 'ctxLeaf', 'ctxLeaf2']);
    B.blob(x, 3.6 * s, z, 1.9 * s, 'site', leaf, { sy: 0.85, cast: false, detail: 2 });
    B.blob(x + 0.5 * s / S, 4.4 * s, z - 0.3 * s / S, 1.25 * s, 'site', leaf, { sy: 0.85, cast: false, detail: 2 });
  }

  // ---------- street lamps ----------
  const lamp = (x, z, ax) => {
    B.cyl(x, z, 0.06, 0, 5.4, 'site', 'blackmetal', { seg: 8, edges: false, cast: false });
    const [dx, dz] = ax === 'x' ? [0, 0.7] : [0.7, 0];
    flat(x - 0.15 + Math.min(0, dx) , x + 0.15 + Math.max(0, dx), z - 0.15 + Math.min(0, dz), z + 0.15 + Math.max(0, dz), 5.3, 5.42, 'blackmetal', NO);
    flat(x + dx - 0.18, x + dx + 0.18, z + dz - 0.18, z + dz + 0.18, 5.22, 5.3, 'opal', NO);
  };
  for (let x = -60; x < 60; x += 15) if (x < -16 || x > -2) lamp(x + 3.5, -12.6, 'x');
  for (let z = -45; z < 90; z += 15) if (z < -16 || z > 0) lamp(-12.9, z + 3.5, 'z');

  // ---------- parked cars along the far kerbs ----------
  const kerbCars = [
    [-20, -11.0, 0, 'carSand', 'hatch'], [-26.5, -11.0, 0, 'carWhite', 'suv'], [27, -11.0, Math.PI, 'carBlack', 'hatch'],
    [36, -11.0, Math.PI, 'carSilver', 'hatch'], [-11.5, 36, Math.PI / 2, 'carNavy', 'suv'], [-11.5, 56, Math.PI / 2, 'carWhite', 'hatch'],
    [-11.5, -26, -Math.PI / 2, 'carGreen', 'hatch'],
  ];
  for (const [x, z, rot, paint, kind] of kerbCars) car(B, x, z, rot, paint, kind, 'site', -0.15);
}
