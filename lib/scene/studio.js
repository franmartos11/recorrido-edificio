// Floor 1: apartment 1.02, the middle west studio (≈ 33 m²), furnished; the floor-1 landing
// and corridor; and the stair flights from floor 1 to floor 2.
// Plan coordinates (× S); furniture in real metres through Kit.at().
import {
  Kit, rnd, vase, potPlant, books, bowl, floorLamp, curtainGeometry, doorLeaf, cupAndSaucer, jar, sideTable,
  flutedWall, bed, wardrobeFluted, consoleTable, worktopWithSink, gooseneckTap,
} from './props.js';
import { S } from './scale.js';
import { buildStair } from './stair.js';

export function buildStudio(B, L) {
  const R = 'studio', LD = 'landing', F = L.s1, CT = L.s1Top, H = CT - F;
  const k = new Kit(B, R, 0, F + 0.02, 0);
  const r = rnd(202);

  // ---------- envelope: each face belongs to the room it faces ----------
  B.wall('x', 2.985, 0.25, 7.0, F, CT, 0.07, R, 'plaster');
  B.wall('x', 2.915, 0.25, 7.0, F, CT, 0.07, 'upper', 'plaster');
  B.wall('x', 5.915, 0.25, 7.0, F, CT, 0.07, R, 'plaster');
  B.wall('x', 5.985, 0.25, 7.0, F, CT, 0.07, 'upper', 'plaster');
  B.wall('z', 6.97, 3.02, 5.88, F, CT, 0.06, R, 'plaster', [{ a: 4.9, b: 5.7, y0: 0, y1: 2.35 }]);
  B.wall('z', 6.97, 0.25, 2.88, F, CT, 0.06, 'upper', 'plaster');
  B.wall('z', 6.97, 6.02, 8.75, F, CT, 0.06, 'upper', 'plaster');
  B.wall('z', 7.03, 0.25, 8.75, F, CT, 0.06, LD, 'plaster', [{ a: 4.9, b: 5.7, y0: 0, y1: 2.35 }]);
  B.wall('z', 0.26, 3.02, 5.88, F, CT, 0.02, R, 'plaster', [{ a: 3.1, b: 4.6, y0: 0.02, y1: 2.45 }]);
  // the two neighbouring studios keep their bathrooms (drawing only)
  B.wall('z', 5.4, 0.25, 1.95, F, CT, 0.12, 'upper', 'plaster');
  B.wall('z', 5.4, 6.02, 7.72, F, CT, 0.12, 'upper', 'plaster');

  // bathroom by the entry
  B.wall('z', 5.4, 3.02, 4.55, F, CT, 0.1, R, 'plaster', [{ a: 3.65, b: 4.35, y0: 0, y1: 2.15 }]);
  B.wall('x', 4.55, 5.4, 6.94, F, CT, 0.1, R, 'plaster');
  doorLeaf(k, 'z', 5.4, 3.65, 4.35, { h: 2.13 });

  // floors
  B.box(0.27, 6.94, F, F + 0.02, 3.02, 5.88, R, 'oak', { edges: false, cast: false });
  B.box(7.06, 8.7, F, F + 0.02, 0.25, 8.75, LD, 'travertine', { edges: false, cast: false });

  // ---------- furniture ----------
  // skirting, recessed downlights, a ceiling slot for the curtain track
  const skirt = (x0, x1, z0, z1) => B.box(x0, x1, F + 0.02, F + 0.11, z0, z1, R, 'paintWhite', { fine: true, cast: false });
  skirt(0.27, 2.98, 5.865, 5.88); skirt(0.27, 0.285, 4.6, 5.88);
  skirt(5.335, 5.35, 3.02, 3.65); skirt(5.335, 5.35, 4.35, 4.55); skirt(5.4, 6.94, 4.6, 4.615);
  skirt(6.925, 6.94, 4.6, 4.9); skirt(6.925, 6.94, 5.7, 5.88);
  for (const [x, z] of [[3.2, 5.42], [4.5, 5.42], [4.2, 3.72], [6.15, 5.3], [6.15, 4.85], [2.0, 3.45]]) {
    k.cyl(0.055, 0.055, 0.012, x, H - 0.032, z, 'blackmetal', { seg: 24, cast: false });
    k.cyl(0.04, 0.04, 0.004, x, H - 0.036, z, 'lamp', { seg: 24, cast: false });
  }
  B.box(0.3, 0.4, CT - 0.03, CT, 3.03, 4.95, R, 'blackmetal', { fine: true, cast: false });

  // bed against a fluted walnut wall, head to the north, beside the French window
  flutedWall(k, 0.45, 3.15, 3.02, H - 0.02);
  bed(k, 1.77, 3.94, Math.PI, r);
  k.box(2.5, 0.012, 2.3, 1.77, 0, 4.2, 'wool', { noScale: true, r: 0.004, cast: false });

  // full-height wardrobe with fluted walnut doors, east of the bed
  wardrobeFluted(k, 4.2, 3.02 + 0.3 / S, Math.PI, 1.65, H - 0.04);

  // travertine pedestal table for two, upholstered chairs, an alabaster disc pendant
  diningSet(k, 3.45, 4.15);
  discPendant(k, 3.45, 4.15, 1.95, H);

  // handleless walnut kitchen along the south wall: marble worktop, waterfall end, tall oven column
  kitchenPremium(k, 3.9, 5.88 - 0.3 / S, 2.4, r);

  // reading corner at the window: a boucle armchair, marble side table, lamp, art above
  cloudChair(k, 1.08, 5.18, 0.25);
  floorLamp(k, 1.62, 5.6);
  sideTable(k, 0.52, 4.9, 0.5, 0.2, 'marble');
  books(k.at(0.52, 0.5, 4.9), 0, 0, 0, 0.3, r, 3);
  potPlant(k, 2.55, 5.55, { r: 0.2, h: 0.45 });
  const art = k.at(1.55, 0, 5.88, Math.PI);
  art.box(1.0, 0.75, 0.035, 0, 1.3, 0.02, 'walnut', { r: 0.006 });
  art.box(0.92, 0.67, 0.01, 0, 1.34, 0.04, 'fab0', { r: 0.002, edges: false });
  art.cyl(0.17, 0.17, 0.006, -0.14, 1.72, 0.047, 'fab5', { rx: Math.PI / 2, center: true, seg: 40, edges: false });
  art.box(0.34, 0.24, 0.006, 0.12, 1.5, 0.049, 'fab4', { r: 0.002, edges: false });
  art.box(0.5, 0.025, 0.05, 0, 2.12, 0.07, 'brass', { r: 0.01, edges: false });          // picture light
  art.box(0.46, 0.006, 0.02, 0, 2.115, 0.085, 'lamp', { edges: false, cast: false });

  // floor-to-ceiling linen drapes at the French window
  k.geom(curtainGeometry(0.5, H - 0.06, 0.09, 0.035), 'linen', { fine: true }, [0.36, 0.02, 3.03]);
  k.geom(curtainGeometry(0.5, H - 0.06, 0.09, 0.035), 'linen', { fine: true }, [0.36, 0.02, 4.45]);

  // bathroom: vanity and a glass shower screen (seen through the door when open)
  const bath = k.at(6.94, 0, 3.8);
  bath.box(0.5, 0.82, 0.9, -0.25, 0.1, 0, 'walnut', { r: 0.01 });
  bath.box(0.52, 0.04, 0.92, -0.26, 0.92, 0, 'marble', { r: 0.008 });

  // ---------- landing / corridor ----------
  const ld = new Kit(B, LD, 0, F + 0.02, 0);
  for (const dz of [-0.75, 0.75]) {
    const sc = ld.at(7.06, 0, 5.3);
    sc.box(0.08, 0.3, 0.1, 0.04, 1.75, dz, 'brass', { r: 0.02 });
    sc.box(0.06, 0.2, 0.08, 0.06, 1.8, dz, 'lamp', { r: 0.02, edges: false, cast: false });
  }
  ld.at(7.06, 0, 5.3).box(0.006, 0.08, 0.16, 0.003, 1.55, 0.62, 'brass', { r: 0.002 });
  potPlant(ld, 8.25, 6.3, { r: 0.22, h: 0.55, mat: 'terracotta' });
  consoleTable(ld, 8.54 - 0.18 / S, 2.0, Math.PI / 2, 1.3, { seed: 81 });

  // stair flights floor 1 → floor 2 (same well as the ground-floor stair)
  buildStair(B, LD, L.s1, L.s2);
}

// ------------------------------------------------------------------------------------------
// Studio 1.02 pieces. Local kits work in real metres.

// Travertine pedestal table, two upholstered walnut chairs.
function diningSet(k, x, z) {
  const c = k.at(x, 0, z);
  c.lathe([[0, 0], [0.27, 0], [0.27, 0.025], [0.13, 0.07], [0.08, 0.3], [0.07, 0.52], [0.11, 0.66], [0.2, 0.71], [0, 0.71]], 0, 0, 0, 'travertine', { seg: 56, edges: true });
  c.lathe([[0, 0.71], [0.465, 0.71], [0.48, 0.722], [0.48, 0.738], [0.465, 0.75], [0, 0.75]], 0, 0, 0, 'travertine', { seg: 72, edges: true });
  for (const s of [-1, 1]) diningChair(c, s * 0.66, 0, s < 0 ? -Math.PI / 2 : Math.PI / 2);
  cupAndSaucer(c, -0.14, 0.75, 0.06, 0.4); cupAndSaucer(c, 0.16, 0.75, -0.08, 2.4);
  vase(c, 0.02, 0.75, 0.2, { h: 0.22, r: 0.055, stems: 5, seed: 71, mat: 'ceramic' });
}
function diningChair(k, x, z, rot) {
  const c = k.at(x, 0, z, rot);   // front faces local −z
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.cyl(0.017, 0.012, 0.41, sx * 0.19, 0, sz * 0.18, 'walnut', { seg: 12, rz: -sx * 0.05, rx: sz * 0.05 });
  c.box(0.47, 0.035, 0.46, 0, 0.39, 0, 'walnut', { r: 0.01 });
  c.box(0.46, 0.075, 0.45, 0, 0.42, -0.005, 'boucle', { r: 0.034, seg: 3 });
  for (const s of [-1, 1]) c.cyl(0.013, 0.013, 0.36, s * 0.2, 0.42, 0.2, 'walnut', { seg: 10, rx: -0.12 });
  c.box(0.5, 0.25, 0.07, 0, 0.6, 0.23, 'boucle', { r: 0.033, seg: 3, rx: -0.12 });
}

// Alabaster disc pendant on a brass rod.
function discPendant(k, x, z, y, ceiling) {
  const c = k.at(x, 0, z);
  c.lathe([[0, ceiling - 0.015], [0.07, ceiling - 0.015], [0.07, ceiling], [0, ceiling]], 0, 0, 0, 'brass', { seg: 24 });
  c.cyl(0.004, 0.004, ceiling - y - 0.1, 0, y + 0.1, 0, 'brass', { seg: 6, cast: false });
  c.lathe([[0, 0.1], [0.05, 0.1], [0.26, 0.045], [0.3, 0.025], [0.29, 0.005], [0, 0]], 0, y, 0, 'opal', { seg: 56, cast: false });
}

// Handleless kitchen: walnut fronts with a finger groove, 6 cm marble worktop with a waterfall
// end, marble splashback, black-glass hob, undermount sink, and a tall oven column.
function kitchenPremium(k, x, z, len, r) {
  const c = k.at(x, 0, z);   // runs along local x, back against local +z
  c.box(len, 0.1, 0.5, 0, 0, 0.04, 'blackmetal', { edges: false });
  c.box(len, 0.63, 0.56, 0, 0.1, 0.02, 'walnut', { r: 0.004 });              // carcass, open above for the sink
  for (const zz of [-0.25, 0.28]) c.box(len, 0.15, 0.02, 0, 0.73, zz, 'walnut', { r: 0 });
  const n = 4, w = len / n;
  for (let i = 0; i < n; i++) {
    const cx = -len / 2 + (i + 0.5) * w;
    if (i === 3) for (const [y, hh] of [[0.11, 0.32], [0.44, 0.2], [0.65, 0.14]]) c.box(w - 0.006, hh - 0.006, 0.02, cx, y, -0.27, 'walnut', { r: 0.004 });
    else c.box(w - 0.006, 0.68, 0.02, cx, 0.11, -0.27, 'walnut', { r: 0.004 });
  }
  c.box(len, 0.035, 0.02, 0, 0.8, -0.262, 'carTrim', { edges: false });
  const sx = -len * 0.25;
  worktopWithSink(c, len + 0.02, 0.06, 0.63, 0.01, 0.88, -0.005, sx, -0.03, 0.5, 0.4);
  c.box(0.06, 0.94, 0.63, -len / 2 - 0.02, 0, -0.005, 'marble', { r: 0.006 });
  c.box(len, 0.62, 0.02, 0, 0.94, 0.285, 'marble', { r: 0.003, edges: false });
  gooseneckTap(c, sx, 0.94, 0.2, 0.22, [0, -1]);
  // black-glass induction hob
  const hx = len * 0.22;
  c.box(0.6, 0.006, 0.5, hx, 0.94, -0.02, 'blackGlass', { r: 0.004, edges: false });
  for (const [dx, dz, rr] of [[-0.14, -0.1, 0.09], [0.14, -0.1, 0.07], [-0.14, 0.1, 0.07], [0.14, 0.1, 0.09]]) c.torus(rr, 0.002, hx + dx, 0.947, -0.02 + dz, 'brushed', { rx: Math.PI / 2, ts: 40 });
  // tall column: oven in black glass, brass bar handles
  const tx = len / 2 + 0.31;
  c.box(0.58, 0.1, 0.5, tx, 0, 0.04, 'blackmetal', { edges: false });
  c.box(0.6, 2.38, 0.6, tx, 0.1, 0, 'walnut', { r: 0.004 });
  c.box(0.56, 0.58, 0.012, tx, 0.86, -0.305, 'blackGlass', { r: 0.004 });
  c.box(0.46, 0.018, 0.03, tx, 1.4, -0.325, 'brass', { r: 0.008, edges: false });
  for (const y of [0.84, 1.48]) c.box(0.6, 0.004, 0.004, tx, y, -0.302, 'blackmetal', { edges: false });
  c.box(0.018, 0.5, 0.03, tx - 0.24, 1.7, -0.32, 'brass', { r: 0.008, edges: false });
  // open walnut shelf with an LED strip beneath
  const shY = 1.56, shX = -len * 0.09;
  c.box(len * 0.82, 0.04, 0.26, shX, shY, 0.17, 'walnut', { r: 0.006 });
  c.box(len * 0.8, 0.008, 0.02, shX, shY - 0.008, 0.08, 'lamp', { edges: false, cast: false });
  for (let i = 0; i < 4; i++) c.cyl(0.13 - i * 0.004, 0.12 - i * 0.004, 0.018, shX - 0.7, shY + 0.04 + i * 0.019, 0.17, 'ceramic', { seg: 32 });
  for (const [dx, h, f] of [[-0.42, 0.18, 'beans'], [-0.3, 0.14, 'pastry'], [-0.19, 0.2, 'beans']]) jar(c, shX + dx, shY + 0.04, 0.18, h, f);
  for (const dx of [0.05, 0.14, 0.23]) c.lathe([[0, 0], [0.035, 0], [0.04, 0.12], [0.036, 0.12], [0.031, 0.006], [0, 0.006]], shX + dx, shY + 0.04, 0.16, 'glass', { seg: 20, glass: true, cast: false });
  vase(c, shX + 0.5, shY + 0.04, 0.17, { h: 0.22, r: 0.06, stems: 5, seed: 91, bloom: null, mat: 'glaze' });
  books(c.at(shX + 0.8, shY + 0.04, 0.17), 0, 0, 0, 0.1, r, 3);
  // on the worktop: board with lemons, olive oil, a bowl
  const wt = 0.94;
  c.box(0.42, 0.025, 0.3, 0.05, wt, 0.12, 'walnut', { r: 0.01, ry: 0.12 });
  for (const [dx, dz] of [[-0.05, 0.1], [0.04, 0.14], [0.02, 0.06]]) c.sphere(0.04, 0.05 + dx, wt + 0.065, dz, 'citrus', { sy: 0.9, seg: 16, seg2: 12 });
  c.lathe([[0, 0], [0.035, 0], [0.036, 0.2], [0.012, 0.25], [0.011, 0.29], [0, 0.29]], 0.32, wt, 0.2, 'oilGlass', { seg: 20 });
  bowl(c, -len * 0.45, wt, 0.0, 0.13, 'glaze');
}

// Deep boucle armchair, all rounded volumes, with a rust velvet cushion.
function cloudChair(k, x, z, rot) {
  const c = k.at(x, 0, z, rot);   // back towards local +z
  c.box(0.8, 0.02, 0.78, 0, 0, 0, 'blackmetal', { edges: false });
  c.box(0.86, 0.36, 0.84, 0, 0.02, 0, 'boucle', { r: 0.16, seg: 5 });
  c.box(0.88, 0.46, 0.24, 0, 0.3, 0.3, 'boucle', { r: 0.11, seg: 5 });
  for (const s of [-1, 1]) c.box(0.2, 0.26, 0.76, s * 0.34, 0.3, 0.02, 'boucle', { r: 0.095, seg: 5 });
  c.box(0.5, 0.12, 0.56, 0, 0.36, -0.06, 'boucle', { r: 0.06, seg: 4 });
  c.box(0.38, 0.3, 0.12, 0.06, 0.46, 0.13, 'fab5', { r: 0.06, seg: 4, rx: -0.25, ry: 0.2 });
}
