// The three shop units on the west (corner) side of the ground floor.
//   Shop 01 (z 0.25–2.88)  — café: fluted oak counter, green zellige back bar, window bar, globe pendants
//   Shop 02 (z 3.02–5.88)  — clothing store: hanging rail, oak cube shelving, travertine plinth, fitting room
//   Shop 03 (z 6.02–8.75)  — left as a drawing for now
// Inner faces of each unit belong to its own room, so each one turns from drawing to material
// only when the camera walks in.

import {
  Kit, rnd, cupAndSaucer, saucer, croissant, cake, jar, vase, potPlant, bentwoodChair, barStool, bistroTable,
  ottoman, globePendant, trackSpot, espressoMachine, grinder, hangerWithGarment, curtainGeometry, dressForm,
  handbag, foldedStack, doorLeaf,
} from './props.js';

const FABRICS = ['fab0', 'fab1', 'fab2', 'fab3', 'fab4', 'fab5'];

export function buildShops(B, G, GT) {
  const XI = 0.65, XE = 6.925;   // inner faces: west façade / shop–lobby wall

  // ---------- shared envelope, split per room ----------
  B.wall('x', 2.915, XI, XE, G, GT, 0.07, 'cafe', 'plaster');
  B.wall('x', 2.985, XI, XE, G, GT, 0.07, 'boutique', 'plaster');
  B.wall('x', 5.915, XI, XE, G, GT, 0.07, 'boutique', 'plaster');
  B.wall('x', 5.985, XI, XE, G, GT, 0.07, 'shop3', 'plaster');
  B.box(6.925, 7.0, G, GT, 0.25, 2.88, 'cafe', 'plaster', { cap: 'ink', fine: true });
  B.box(6.925, 7.0, G, GT, 3.02, 5.88, 'boutique', 'plaster', { cap: 'ink', fine: true });
  B.box(6.925, 7.0, G, GT, 6.02, 8.75, 'shop3', 'plaster', { cap: 'ink', fine: true });

  // plaster lining on the inside of the concrete façade (piers + heads)
  const lineW = (room, z0, z1, y0 = G, y1 = GT) => B.box(XI, XI + 0.02, y0, y1, z0, z1, room, 'plaster', { edges: false });
  const lineN = (room, x0, x1, y0 = G, y1 = GT) => B.box(x0, x1, y0, y1, 0.25, 0.27, room, 'plaster', { edges: false });
  lineN('cafe', XI, 0.9); lineN('cafe', 5.4, XE); lineN('cafe', 0.9, 5.4, 2.9, GT);
  lineW('cafe', 0.27, 0.5); lineW('cafe', 1.8, 1.88); lineW('cafe', 2.78, 2.88);
  lineW('cafe', 0.5, 1.8, 2.9, GT); lineW('cafe', 1.88, 2.78, 2.7, GT);
  lineW('boutique', 3.02, 3.15); lineW('boutique', 4.05, 4.15); lineW('boutique', 5.6, 5.88);
  lineW('boutique', 3.15, 4.05, 2.7, GT); lineW('boutique', 4.15, 5.6, 2.9, GT);

  // floors
  B.box(XI, XE, -0.02, 0, 0.25, 2.88, 'cafe', 'terrazzo', { edges: false, cast: false });
  B.box(XI, XE, -0.02, 0, 3.02, 5.88, 'boutique', 'oak', { edges: false, cast: false });
  B.box(XI, XE, -0.02, 0, 6.02, 8.75, 'shop3', 'curb', { edges: false, cast: false });

  cafe(B, G, GT);
  boutique(B, G, GT);
  street(B);

  // ---------- shop 03: shell only ----------
  B.wall('z', 5.6, 7.35, 8.75, G, GT, 0.1, 'shop3', 'plaster', [{ a: 7.6, b: 8.35, y0: 0, y1: 2.1 }]);
  doorLeaf(new Kit(B, 'shop3'), 'z', 5.6, 7.6, 8.35, { sign: 'signWC' });
  B.wall('x', 7.35, 5.6, XE, G, GT, 0.1, 'shop3', 'plaster');
}

// ------------------------------------------------------------------------------------------
function cafe(B, G, GT) {
  const R = 'cafe', k = new Kit(B, R), r = rnd(7);
  // WC + pantry at the east end
  B.wall('z', 5.6, 0.25, 1.6, G, GT, 0.1, R, 'plaster', [{ a: 0.5, b: 1.25, y0: 0, y1: 2.1 }]);
  B.wall('x', 1.6, 5.6, 6.925, G, GT, 0.1, R, 'plaster');
  for (const y of [0.9, 1.4, 1.9]) {
    k.box(0.6, 0.03, 1.15, 6.6, y, 2.27, 'walnut', { r: 0.006 });
    for (let z = 1.8; z < 2.8; z += 0.17) {
      if (r() < 0.5) k.at(6.6 + (r() - 0.5) * 0.2, y + 0.03, z, (r() - 0.5) * 0.3).box(0.12, 0.2 + r() * 0.05, 0.08, 0, 0, 0, 'kraft', { r: 0.012, seg: 3 });
      else jar(k, 6.6, y + 0.03, z, 0.16 + r() * 0.06, r() < 0.5 ? 'beans' : 'pastry');
    }
  }

  // front counter: fluted oak, marble top, brass foot rail  (z 1.35–1.77 plan → 0.8 m barista aisle)
  const FZ = 1.558, FD = 0.423;   // counter centre / depth (plan)
  k.box(2.9, 0.92, FD, 3.85, 0.07, FZ, 'oakBoard', { r: 0.01 });
  k.box(2.86, 0.07, FD - 0.06, 3.85, 0, FZ + 0.02, 'blackmetal', { r: 0.004, edges: false });
  for (let x = 2.43; x < 5.28; x += 0.05) k.box(0.036, 0.88, 0.03, x, 0.09, FZ - FD / 2 - 0.012, 'oakBoard', { r: 0.014, seg: 3, edges: false });
  k.box(3.02, 0.04, FD + 0.08, 3.85, 0.99, FZ - 0.01, 'marble', { r: 0.014, seg: 3 });
  const RZ = FZ - FD / 2 - 0.09;
  k.tube([[2.45, 0.15, RZ], [5.25, 0.15, RZ]], 0.015, 'brass', { ts: 4 });
  for (const x of [2.6, 3.85, 5.1]) k.tube([[x, 0.15, RZ], [x, 0.12, RZ + 0.1]], 0.008, 'brass', { ts: 2 });

  // pastry case: glass with brass frame, cakes, croissants
  const PZ0 = FZ - 0.17, PZ1 = FZ + 0.15, PC = (PZ0 + PZ1) / 2;
  k.box(0.94, 0.03, 0.36, 2.95, 1.03, PC, 'walnut', { r: 0.006 });
  B.box(2.5, 3.4, 1.06, 1.42, PZ0, PZ1, R, 'glass', { glass: true, cast: false, fine: true });
  for (const [x, z] of [[2.5, PZ0], [3.4, PZ0], [2.5, PZ1], [3.4, PZ1]]) k.box(0.012, 0.36, 0.012, x, 1.06, z, 'brass', { edges: false });
  k.tube([[2.5, 1.42, PZ0], [3.4, 1.42, PZ0], [3.4, 1.42, PZ1], [2.5, 1.42, PZ1]], 0.006, 'brass', { closed: true, ts: 24 });
  B.box(2.52, 3.38, 1.235, 1.24, PZ0 + 0.02, PZ1 - 0.02, R, 'glass', { glass: true, cast: false, edges: false });
  cake(k, 2.73, 1.06, PC - 0.04, 'cake0', 'cake1');
  cake(k, 3.15, 1.06, PC - 0.04, 'cake2', 'cake2', 0.08);
  saucer(k, 2.75, 1.24, PC + 0.02, 'ceramic', 0.11);
  croissant(k, 2.71, 1.247, PC - 0.01, 0.4); croissant(k, 2.8, 1.247, PC + 0.05, -0.5);
  saucer(k, 3.15, 1.24, PC + 0.02, 'ceramic', 0.11);
  for (const [dx, dz] of [[-0.04, -0.03], [0.04, -0.02], [0, 0.04]]) k.sphere(0.035, 3.15 + dx, 1.27, PC + 0.02 + dz, 'pastry', { sy: 0.75, seg: 14, seg2: 10 });
  // cake stand under a glass dome
  k.lathe([[0, 0], [0.07, 0], [0.03, 0.02], [0.02, 0.1], [0.14, 0.11], [0.15, 0.12], [0, 0.12]], 3.75, 1.03, FZ, 'ceramic', { seg: 36 });
  cake(k, 3.75, 1.15, FZ, 'cake1', 'cake1', 0.09);
  k.lathe([[0.135, 0], [0.135, 0.17], [0.1, 0.25], [0.02, 0.27], [0.02, 0.3], [0, 0.31]], 3.75, 1.15, FZ, 'glass', { seg: 36, glass: true, cast: false });
  // till tablet, cups, flowers
  const till = k.at(4.55, 1.03, FZ + 0.02);
  till.box(0.04, 0.05, 0.04, 0, 0, 0, 'brass', { r: 0.008, edges: false });
  till.box(0.25, 0.18, 0.012, 0, 0.04, -0.02, 'blackmetal', { r: 0.006, rx: -0.4 });
  cupAndSaucer(k, 4.15, 1.03, FZ - 0.08, 0.6); cupAndSaucer(k, 4.95, 1.03, FZ - 0.1, 2.4);
  vase(k, 5.18, 1.03, FZ + 0.04, { h: 0.22, r: 0.06, stems: 6, seed: 11 });

  // back bar: deep walnut cabinet (0.64 m) so the machine sits fully on it, marble top, zellige
  const BZ = 2.631, BD = 0.492;
  k.box(3.2, 0.86, BD, 4.0, 0.04, BZ, 'walnut', { r: 0.008 });
  k.box(3.16, 0.04, BD - 0.06, 4.0, 0, BZ + 0.02, 'blackmetal', { r: 0.004, edges: false });
  for (let x = 2.8; x < 5.6; x += 0.8) k.box(0.004, 0.78, 0.004, x, 0.08, BZ - BD / 2 - 0.002, 'blackmetal', { edges: false });
  k.box(3.24, 0.035, BD + 0.03, 4.0, 0.9, BZ - 0.01, 'marble', { r: 0.01 });
  B.box(2.4, 5.6, 0.935, 2.5, 2.865, 2.88, R, 'zellige', { edges: false });
  for (const y of [1.66, 2.12]) {
    k.box(2.8, 0.035, 0.22, 4.0, y, 2.75, 'walnut', { r: 0.008 });
    for (const x of [2.75, 5.25]) k.box(0.02, 0.06, 0.18, x, y - 0.06, 2.77, 'brass', { r: 0.004, edges: false });
    for (let x = 2.72; x < 5.3; x += 0.13) {
      const t = r();
      if (t < 0.55) cupAndSaucer(k, x, y + 0.035, 2.74, r() * 6);
      else if (t < 0.8) jar(k, x, y + 0.035, 2.75, 0.17, 'beans');
      else k.at(x, y + 0.035, 2.76, (r() - 0.5) * 0.4).box(0.11, 0.22, 0.08, 0, 0, 0, 'kraft', { r: 0.014, seg: 3 });
    }
  }
  espressoMachine(k, 3.95, 0.935, BZ - 0.02, 0);
  grinder(k, 4.8, 0.935, BZ + 0.04);
  cupAndSaucer(k, 3.2, 0.935, BZ - 0.05, 1.2); cupAndSaucer(k, 3.35, 0.935, BZ - 0.08, 2.0);
  for (const x of [2.95, 3.85, 4.75]) globePendant(k, x, FZ, 2.38, GT);

  // WC door with a brass sign
  doorLeaf(k, 'z', 5.6, 0.5, 1.25, { sign: 'signWC' });

  // menu board above the WC door
  k.box(0.03, 0.9, 0.9, 5.535, 2.18, 0.93, 'walnut', { r: 0.008 });
  k.plane(0.82, 0.82, 5.516, 2.63, 0.93, 'menu', { ry: -Math.PI / 2 });

  // window bar along the north glazing
  k.box(4.35, 0.04, 0.36, 3.125, 1.02, 0.45, 'walnut', { r: 0.012, seg: 3 });
  for (const x of [1.1, 3.1, 5.15]) k.box(0.03, 0.03, 0.3, x, 0.99, 0.43, 'brass', { r: 0.006, edges: false });
  for (const x of [2.3, 3.0, 3.7, 4.4]) barStool(k, x, 0.8);
  cupAndSaucer(k, 2.35, 1.06, 0.42, 1); cupAndSaucer(k, 4.32, 1.06, 0.46, 2);
  vase(k, 3.55, 1.06, 0.4, { h: 0.16, r: 0.045, stems: 4, seed: 3, mat: 'ceramic' });

  // marble bistro table, two bentwood chairs
  bistroTable(k, 1.55, 1.0);
  bentwoodChair(k, 1.03, 1.0, -Math.PI / 2);
  bentwoodChair(k, 2.07, 1.0, Math.PI / 2);
  cupAndSaucer(k, 1.45, 0.755, 0.9, 0.5);
  saucer(k, 1.68, 0.755, 1.1, 'ceramic', 0.1); croissant(k, 1.66, 0.763, 1.08, 1.0);
  vase(k, 1.55, 0.755, 0.8, { h: 0.12, r: 0.035, stems: 3, seed: 5 });

  // planters (leaves come from trees.js)
  potPlant(k, 5.3, 1.22, { r: 0.2, h: 0.42 });
  potPlant(k, 6.55, 2.55, { r: 0.18, h: 0.42, mat: 'pot' });
}

// ------------------------------------------------------------------------------------------
function boutique(B, G, GT) {
  const R = 'boutique', k = new Kit(B, R), r = rnd(42);
  // WC and fitting room at the east end
  B.wall('z', 5.6, 3.02, 4.4, G, GT, 0.1, R, 'plaster', [{ a: 3.6, b: 4.3, y0: 0, y1: 2.1 }]);
  B.wall('x', 4.4, 5.6, 6.925, G, GT, 0.1, R, 'plaster');
  doorLeaf(k, 'z', 5.6, 3.6, 4.3, { sign: 'signWC' });
  k.tube([[5.58, 2.4, 4.45], [5.58, 2.4, 5.88]], 0.012, 'brass', { ts: 2 });
  k.geom(curtainGeometry(1.43, 2.33), 'linen', { fine: true }, [5.58, 0.05, 4.45]);
  k.box(0.4, 0.45, 1.0, 6.65, 0, 5.15, 'walnut', { r: 0.01 });
  for (const z of [4.8, 5.2, 5.6]) k.tube([[6.92, 1.8, z], [6.86, 1.79, z], [6.85, 1.83, z]], 0.006, 'brass', { ts: 6 });

  // brass rail dropped from the ceiling, wooden hangers, draped garments graded by tone
  k.tube([[1.0, 1.74, 5.555], [4.1, 1.74, 5.555]], 0.012, 'brass', { ts: 2 });
  for (const x of [1.04, 4.06]) {
    k.tube([[x, 1.74, 5.555], [x, GT, 5.555]], 0.008, 'brass', { ts: 2 });
    k.lathe([[0, -0.015], [0.03, -0.015], [0.03, 0], [0, 0]], x, GT, 5.555, 'brass', { seg: 16 });
  }
  const palette = ['fab0', 'fab0', 'fab1', 'fab1', 'fab1', 'fab2', 'fab2', 'fab5', 'fab5', 'fab4', 'fab4', 'fab3', 'fab3', 'fab3'];
  let i = 0;
  for (let x = 1.16; x < 3.98; x += 0.105 + r() * 0.035, i++) {
    const t = r(), kind = t < 0.25 ? 'dress' : t < 0.55 ? 'coat' : 'shirt';
    const len = kind === 'dress' ? 1.05 + r() * 0.12 : kind === 'coat' ? 0.95 + r() * 0.1 : 0.68 + r() * 0.1;
    const fab = palette[Math.min(palette.length - 1, Math.floor((i / 26) * palette.length))];
    hangerWithGarment(k, x, 1.74, 5.555, fab, { len, w: 0.4 + r() * 0.06, kind, seed: i * 13 + 5, tilt: (r() - 0.5) * 0.12 });
  }

  // framed linen canvas
  k.box(0.95, 1.5, 0.03, 4.78, 0.85, 5.865, 'walnut', { r: 0.006 });
  B.box(4.33, 5.22, 0.88, 2.32, 5.84, 5.85, R, 'fab1', { edges: false });
  B.box(4.5, 5.05, 1.25, 1.95, 5.835, 5.84, R, 'fab2', { edges: false });

  // oak cube shelving with folded stacks, bags and boxes
  const X = [1.3, 2.17, 3.04, 3.9], Yv = [0.04, 0.6, 1.16, 1.72, 2.28];
  X.forEach((x) => k.box(0.03, 2.3, 0.39, x, 0, 3.225, 'oakBoard', { r: 0.006 }));
  Yv.forEach((y) => k.box(2.63, 0.025, 0.39, 2.6, y, 3.225, 'oakBoard', { r: 0.006 }));
  for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) {
    const cx = (X[a] + X[a + 1]) / 2, y0 = Yv[b] + 0.025;
    if (a === 1 && b === 2) { handbag(k, cx, y0, 3.25, 0.15, 'leather'); continue; }
    if (a === 2 && b === 3) { handbag(k, cx, y0, 3.25, -0.2, 'leatherBk'); continue; }
    if (b === 0) { for (let n = 0; n < 2; n++) k.at(cx, y0 + n * 0.12, 3.24, (r() - 0.5) * 0.06).box(0.34, 0.12, 0.3, 0, 0, 0, 'kraft', { r: 0.008 }); continue; }
    const f = FABRICS[Math.floor(r() * FABRICS.length)];
    foldedStack(k, cx, y0, 3.24, Array.from({ length: 3 + Math.floor(r() * 3) }, () => f), r);
  }

  // wool rug, travertine plinth with stacks, a bag and a vase of dried stems
  k.cyl(1.05, 1.05, 0.012, 3.05, 0, 4.55, 'wool', { seg: 64, cast: false });
  k.box(1.3, 0.72, 0.56, 3.05, 0.012, 4.58, 'travertine', { r: 0.02, seg: 3 });
  foldedStack(k, 2.62, 0.732, 4.6, ['fab0', 'fab0', 'fab0', 'fab0'], r);
  foldedStack(k, 3.0, 0.732, 4.52, ['fab3', 'fab3', 'fab3'], r);
  handbag(k, 3.45, 0.732, 4.66, 0.4, 'leather');
  vase(k, 3.55, 0.732, 4.4, { h: 0.3, r: 0.07, stems: 7, seed: 21, bloom: null, mat: 'glaze' });
  ottoman(k, 3.95, 5.02);

  // cash desk
  k.box(1.0, 0.9, 0.44, 4.8, 0.06, 3.28, 'travertine', { r: 0.015, seg: 3 });
  k.box(0.96, 0.06, 0.4, 4.8, 0, 3.28, 'brass', { r: 0.004 });
  k.at(4.5, 0.96, 3.3).box(0.08, 0.02, 0.15, 0, 0, 0, 'blackmetal', { r: 0.006 });
  k.at(4.92, 0.96, 3.34).box(0.32, 0.06, 0.22, 0, 0, 0, 'kraft', { r: 0.006 });
  vase(k, 5.18, 0.96, 3.22, { h: 0.2, r: 0.05, stems: 5, seed: 8, bloom: null, mat: 'ceramic' });

  dressForm(k, 1.3, 4.8, 0.5);
  potPlant(k, 1.0, 5.55, { r: 0.24, h: 0.5, mat: 'pot' });

  // ceiling track with spots
  for (const [z, rot] of [[3.95, Math.PI], [5.0, 0]]) {
    B.box(1.0, 5.4, GT - 0.035, GT, z - 0.018, z + 0.018, R, 'blackmetal', { fine: true, cast: false });
    for (let x = 1.4; x < 5.3; x += 0.9) trackSpot(k, x, GT - 0.035, z, rot);
  }
}

// ------------------------------------------------------------------------------------------
// Terrace furniture and shop signage (outside, part of the street reveal).
function street(B) {
  const k = new Kit(B, 'site');
  for (const [x, z] of [[-1.7, 6.3], [-1.7, 7.7], [-3.3, 7.0]]) {
    bistroTable(k, x, z, 'marble', 0.3);
    bentwoodChair(k, x - 0.5, z, -Math.PI / 2, 'blackmetal', 'rattan');
    bentwoodChair(k, x + 0.5, z, Math.PI / 2, 'blackmetal', 'rattan');
    cupAndSaucer(k, x + 0.08, 0.755, z - 0.05, 1);
  }
  // market umbrella
  k.cyl(0.02, 0.02, 2.5, -2.5, 0, 7.0, 'brass', { seg: 10 });
  k.cyl(0.03, 1.35, 0.45, -2.5, 2.05, 7.0, 'linen', { seg: 10, open: true });
  k.sphere(0.035, -2.5, 2.52, 7.0, 'brass');
  // café blade sign
  k.tube([[0.4, 2.95, 1.35], [-0.5, 2.95, 1.35]], 0.012, 'brass', { ts: 2 });
  for (const x of [-0.12, -0.38]) k.tube([[x, 2.95, 1.35], [x, 2.82, 1.35]], 0.004, 'brass', { ts: 2 });
  k.cyl(0.27, 0.27, 0.03, -0.25, 2.55, 1.35, 'paintGreen', { rx: Math.PI / 2, center: true, seg: 48, edges: true });
  k.torus(0.27, 0.01, -0.25, 2.55, 1.35, 'brass', { ts: 48 });
  k.plane(0.5, 0.5, -0.25, 2.55, 1.334, 'signCafe', { ry: Math.PI });
  k.plane(0.5, 0.5, -0.25, 2.55, 1.366, 'signCafe');
  // boutique: gold letters on the glass
  k.plane(1.3, 0.21, 0.505, 2.35, 4.88, 'signAtelier', { ry: -Math.PI / 2 });
}
