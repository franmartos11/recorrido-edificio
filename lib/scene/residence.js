// Floor 2: the three west studios combined into one residence (Direction B) and its landing. Plan coordinates (× S); furniture in
// real metres through Kit.at().
import {
  Kit, rnd, cupAndSaucer, vase, potPlant, bentwoodChair, barStool, globePendant, sofa, loungeChair,
  coffeeTableRound, books, bowl, floorLamp, diningTable, linearPendant, bed, jar, curtainGeometry, doorLeaf,
  flutedWall, wardrobeFluted, consoleTable, worktopWithSink, gooseneckTap,
} from './props.js';
import { S } from './scale.js';

export function buildResidence(B, L) {
  const R = 'resi', LD = 'landing2', F = L.s2, CT = L.s2Top;   // floor level, ceiling level
  const k = new Kit(B, R, 0, F + 0.02, 0);
  const r = rnd(101);
  const H = CT - F;

  // ---------- envelope linings (plaster on the inside of the white render) ----------
  B.wall('x', 0.26, 0.25, 6.94, F, CT, 0.02, R, 'plaster', [
    { a: 3.2, b: 4.6, y0: 0.9, y1: 2.2 }, { a: 5.9, b: 6.4, y0: 0.9, y1: 2.2 },
  ], { cap: 'ink' });
  B.wall('z', 0.26, 0.27, 8.75, F, CT, 0.02, R, 'plaster', [
    { a: 1.4, b: 2.9, y0: 0.02, y1: 2.45 }, { a: 3.1, b: 4.6, y0: 0.02, y1: 2.45 }, { a: 6.0, b: 7.5, y0: 0.02, y1: 2.45 },
  ], { cap: 'ink' });
  B.wall('x', 8.74, 0.25, 6.94, F, CT, 0.02, R, 'plaster');
  // party wall to the corridor/landing, split per side, with the front door
  B.wall('z', 6.97, 0.25, 8.75, F, CT, 0.06, R, 'plaster', [{ a: 7.8, b: 8.6, y0: 0, y1: 2.35 }]);
  B.wall('z', 7.03, 0.25, 8.75, F, CT, 0.06, LD, 'plaster', [{ a: 7.8, b: 8.6, y0: 0, y1: 2.35 }]);

  // ---------- internal walls ----------
  B.wall('x', 5.8, 0.27, 6.94, F, CT, 0.12, R, 'plaster', [{ a: 4.6, b: 6.94, y0: 0, y1: 2.55 }]);
  B.wall('z', 4.5, 5.86, 8.74, F, CT, 0.12, R, 'plaster', [{ a: 6.1, b: 6.9, y0: 0, y1: 2.3 }]);
  B.wall('x', 7.55, 0.27, 2.2, F, CT, 0.1, R, 'plaster');
  B.wall('z', 2.2, 7.6, 8.74, F, CT, 0.1, R, 'plaster', [{ a: 7.75, b: 8.45, y0: 0, y1: 2.2 }]);
  doorLeaf(k, 'z', 2.2, 7.75, 8.45, { h: 2.18 });
  doorLeaf(k, 'z', 4.5, 6.1, 6.9, { h: 2.28, ajar: 1.5 });

  // floors and ceiling
  B.box(0.27, 6.94, F, F + 0.02, 0.27, 8.74, R, 'oak', { edges: false, cast: false });
  B.box(7.06, 8.7, F, F + 0.02, 0.25, 8.75, LD, 'travertine', { edges: false, cast: false });

  // ---------- kitchen: tall unit, base run with marble, island ----------
  const tall = k.at(6.94, 0, 1.25);
  tall.box(0.64, 2.45, 1.3 * S, -0.32, 0, 0, 'walnut', { r: 0.008 });
  for (const dz of [-0.42, 0.42]) tall.box(0.004, 2.3, 0.004, -0.642, 0.06, dz, 'blackmetal', { edges: false });
  for (const dz of [-0.12, 0.12]) tall.box(0.02, 0.5, 0.02, -0.655, 1.0, dz, 'brass', { r: 0.008, edges: false });
  const run = k.at(6.94, 0, 3.55), runL = 3.3 * S;
  run.box(0.62, 0.08, runL - 0.04, -0.29, 0, 0, 'blackmetal', { r: 0.004, edges: false });
  run.box(0.62, 0.64, runL, -0.31, 0.08, 0, 'walnut', { r: 0.008 });          // carcass, open above for the sink
  for (const xx of [-0.61, -0.01]) run.box(0.02, 0.18, runL, xx, 0.72, 0, 'walnut', { r: 0 });
  for (let i = 1; i < 6; i++) run.box(0.004, 0.76, 0.004, -0.622, 0.11, -runL / 2 + i * runL / 6, 'blackmetal', { edges: false });
  worktopWithSink(run, 0.66, 0.035, runL + 0.02, -0.33, 0.9, 0, -0.36, -runL * 0.3, 0.42, 0.55);
  run.box(0.02, 0.62, runL, -0.012, 0.935, 0, 'marble', { r: 0.004 });
  run.box(0.26, 0.035, runL * 0.62, -0.13, 1.68, -runL * 0.18, 'walnut', { r: 0.008 });
  run.box(0.5, 0.006, 0.7, -0.33, 0.935, runL * 0.3, 'blackmetal', { r: 0.003 });
  gooseneckTap(run, -0.06, 0.935, -runL * 0.3, 0.26, [-1, 0]);
  for (let i = 0; i < 6; i++) {
    const z = -runL * 0.18 - runL * 0.27 + i * runL * 0.1;
    if (i % 2) jar(run, -0.13, 1.715, z, 0.2, i % 4 === 1 ? 'beans' : 'pastry');
    else bowl(run, -0.13, 1.715, z, 0.09, i % 4 ? 'ceramic' : 'glaze');
  }
  run.box(0.3, 0.025, 0.45, -0.3, 0.935, -runL * 0.05, 'walnut', { r: 0.008, ry: 0.1 });
  bowl(run, -0.32, 0.935, runL * 0.05, 0.13, 'glaze');
  for (let i = 0; i < 5; i++) run.sphere(0.04, -0.32 + Math.cos(i * 1.3) * 0.05, 0.98, runL * 0.05 + Math.sin(i * 1.3) * 0.05, 'citrus', { seg: 12, seg2: 10 });

  const isl = k.at(5.0, 0, 3.1), islL = 2.2 * S;
  isl.box(0.95, 0.86, islL - 0.12, 0, 0.0, 0, 'walnut', { r: 0.01 });
  for (let z = -islL / 2 + 0.1; z < islL / 2 - 0.08; z += 0.055) isl.box(0.03, 0.82, 0.036, -0.49, 0.02, z, 'walnut', { r: 0.014, seg: 3, edges: false });
  isl.box(1.1, 0.05, islL, 0, 0.88, 0, 'marble', { r: 0.012 });
  for (const s of [-1, 1]) isl.box(1.1, 0.88, 0.05, 0, 0, s * (islL / 2 - 0.025), 'marble', { r: 0.008 });
  for (const dz of [-0.85, 0, 0.85]) barStool(isl, -0.85, dz, 0.68);
  vase(isl, 0.15, 0.93, -0.75, { h: 0.26, r: 0.07, stems: 7, seed: 31 });
  bowl(isl, 0.1, 0.93, 0.55, 0.15, 'ceramic');
  for (let i = 0; i < 6; i++) isl.sphere(0.035, 0.1 + Math.cos(i * 1.1) * 0.06, 0.975, 0.55 + Math.sin(i * 1.1) * 0.06, 'citrus', { seg: 12, seg2: 10 });
  cupAndSaucer(isl, -0.3, 0.93, 0.1, 0.4); cupAndSaucer(isl, -0.32, 0.93, -0.25, 2.2);
  books(isl, 0.25, 0.93, 0.05, 0.3, r, 3);
  for (const z of [2.45, 3.75]) globePendant(k, 5.0, z, 2.1, H);

  // ---------- dining ----------
  const dn = k.at(3.0, 0, 1.46);
  diningTable(dn, 0, 0, 0, 2.4, 1.0);
  for (const x of [-0.75, 0, 0.75]) { bentwoodChair(dn, x, -0.72, Math.PI, 'walnut', 'rattan'); bentwoodChair(dn, x, 0.72, 0, 'walnut', 'rattan'); }
  vase(dn, 0.0, 0.755, 0.0, { h: 0.3, r: 0.08, stems: 9, seed: 41, mat: 'glaze' });
  for (const x of [-0.6, 0.6]) bowl(dn, x, 0.755, 0.05, 0.11, 'ceramic');
  linearPendant(k, 3.0, 2.0, 1.46, 0, 1.6, H);

  // ---------- living ----------
  k.box(3.0, 0.012, 2.6, 2.3, 0, 4.0, 'wool', { r: 0.004, edges: true });
  sofa(k, 3.54, 4.0, Math.PI / 2, 2.9, 'boucle');
  coffeeTableRound(k, 2.38, 4.0, 0.55, 'travertine');
  const ct = k.at(2.38, 0.37, 4.0);
  books(ct, 0.12, 0, -0.18, 0.4, r, 4);
  bowl(ct, -0.15, 0, 0.12, 0.12, 'walnut');
  vase(ct, 0.2, 0.0, 0.2, { h: 0.18, r: 0.05, stems: 4, seed: 51, mat: 'ceramic', bloom: null });
  loungeChair(k, 1.31, 2.85, -Math.PI / 2, { fab: 'boucle', accent: 'fab4' });
  loungeChair(k, 1.31, 5.08, -Math.PI / 2, { fab: 'boucle', accent: 'fab5' });
  floorLamp(k, 3.62, 2.6);
  potPlant(k, 0.75, 5.3, { r: 0.28, h: 0.6 });
  // large canvas on the wall shared with the bedroom
  const art = k.at(1.8, 0, 5.74);
  art.box(1.7, 1.2, 0.04, 0, 0.95, -0.02, 'walnut', { r: 0.006 });
  art.box(1.62, 1.12, 0.01, 0, 0.99, -0.045, 'fab1', { r: 0.002, edges: false });
  art.box(0.7, 0.8, 0.006, -0.25, 1.15, -0.052, 'fab5', { r: 0.002, edges: false });
  art.box(0.5, 0.35, 0.006, 0.35, 1.25, -0.053, 'fab3', { r: 0.002, edges: false });
  // sheer curtains beside the west windows
  for (const [a, b] of [[1.4, 2.9], [3.1, 4.6], [6.0, 7.5]]) {
    k.geom(curtainGeometry(0.42, H - 0.12, 0.11, 0.025), 'linen', { fine: true }, [0.36, 0.04, a - 0.4]);
    k.geom(curtainGeometry(0.42, H - 0.12, 0.11, 0.025), 'linen', { fine: true }, [0.36, 0.04, b + 0.02]);
  }

  // ---------- entry ----------
  consoleTable(k, 4.56 + 0.18 / S, 7.95, -Math.PI / 2, 1.5, { seed: 61 });

  // ---------- bedroom: bed against a fluted walnut wall, wardrobe beside the door ----------
  flutedWall(k, 1.5, 4.4, 5.86, H - 0.02);
  bed(k, 2.95, 5.86 + 0.92, Math.PI, r);
  k.box(2.6, 0.012, 2.3, 2.95, 0, 6.9, 'wool', { noScale: true, r: 0.004, cast: false });
  wardrobeFluted(k, 4.44 - 0.3 / S, 8.0, Math.PI / 2, 1.4, H - 0.04);
  potPlant(k, 0.62, 6.0, { r: 0.22, h: 0.5, mat: 'pot' });
  // bath: vanity
  const bath = k.at(0.27, 0, 8.15);
  bath.box(0.5, 0.82, 1.1, 0.25, 0.1, 0, 'walnut', { r: 0.01 });
  bath.box(0.52, 0.04, 1.12, 0.26, 0.92, 0, 'marble', { r: 0.008 });

  // ---------- landing ----------
  const ld = new Kit(B, LD, 0, F + 0.02, 0);
  for (const dz of [-0.75, 0.75]) {
    const sc = ld.at(7.06, 0, 8.2);
    sc.box(0.08, 0.3, 0.1, 0.04, 1.75, dz, 'brass', { r: 0.02 });
    sc.box(0.06, 0.2, 0.08, 0.06, 1.8, dz, 'lamp', { r: 0.02, edges: false, cast: false });
  }
  ld.at(7.06, 0, 8.2).box(0.006, 0.08, 0.16, 0.003, 1.55, 0.62, 'brass', { r: 0.002 });
  potPlant(ld, 8.25, 6.3, { r: 0.22, h: 0.55, mat: 'terracotta' });

}
