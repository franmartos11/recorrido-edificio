// Parked cars for the garage under the overhang: simple stylised models, like the cars in an
// architect's model. A squared-off body and cabin, inset glass, wheel arches, bumpers, lamps.
import { Kit } from './props.js';

// Three bays (x 14.4–16.3, 16.3–18.2, 18.2–20.15), two spaces in tandem in each: half are taken,
// staggered so a clear diagonal runs from the corridor door to the gate.
// [x, z, rot, paint, shape] in plan coordinates; rot −π/2 = nose in (facing south), π/2 = reversed in.
export const CARS = [
  [15.35, 2.3, -Math.PI / 2, 'carGreen', 'hatch'],
  [17.25, 6.8, -Math.PI / 2, 'carSilver', 'suv'],
  [19.15, 2.4, Math.PI / 2, 'carNavy', 'hatch'],
];

// L, W, body height, cabin length / height / offset towards the tail, wheel radius
const SHAPES = {
  hatch: { L: 4.1, W: 1.78, bh: 0.6, cl: 2.3, ch: 0.56, co: -0.35, wr: 0.32 },
  suv:   { L: 4.5, W: 1.88, bh: 0.74, cl: 2.9, ch: 0.64, co: -0.4, wr: 0.36 },
};

export function car(B, x, z, rot, paint, kind, room = 'garage', y = 0) {
  const { L, W, bh, cl, ch, co, wr } = SHAPES[kind];
  const k = new Kit(B, room, x, y, z, rot).at(0, 0, 0);   // local metres, +x = forward
  const y0 = 0.2, yb = y0 + bh;   // squared-off body, wheels half inside it
  k.box(L, bh, W, 0, y0, 0, paint, { r: 0.06, seg: 2 });
  for (const e of [-1, 1]) k.box(0.1, 0.16, W + 0.02, e * (L / 2 - 0.02), y0 + 0.02, 0, 'carTrim', { r: 0.03, edges: false });   // bumpers
  // cabin in paint with inset glass: side windows, windscreen and back light
  const cw = W - 0.16, cx = co;
  k.box(cl, ch, cw, cx, yb, 0, paint, { r: 0.05, seg: 2 });
  const gH = ch - 0.12, gY = yb + 0.05;
  for (const s of [-1, 1]) {
    k.box(cl * 0.4, gH, 0.01, cx - cl * 0.22, gY, s * (cw / 2 + 0.002), 'carGlass', { r: 0, edges: false });
    k.box(cl * 0.4, gH, 0.01, cx + cl * 0.24, gY, s * (cw / 2 + 0.002), 'carGlass', { r: 0, edges: false });
  }
  for (const e of [-1, 1]) k.box(0.01, gH, cw - 0.16, cx + e * (cl / 2 + 0.002), gY, 0, 'carGlass', { r: 0, edges: false });
  for (const wx of [-L / 2 + 0.75, L / 2 - 0.75]) for (const s of [-1, 1]) {
    k.box(wr * 2 + 0.12, wr + 0.1, 0.02, wx, y0, s * (W / 2 + 0.001), 'carTrim', { r: 0, edges: false });   // wheel arch
    k.cyl(wr, wr, 0.24, wx, wr, s * (W / 2 - 0.08), 'rubber', { center: true, rx: Math.PI / 2, seg: 20 });
    k.cyl(wr * 0.55, wr * 0.55, 0.25, wx, wr, s * (W / 2 - 0.08), 'carRim', { center: true, rx: Math.PI / 2, seg: 16 });
  }
  for (const s of [-1, 1]) {
    k.box(0.02, 0.1, 0.34, L / 2 + 0.002, yb - 0.18, s * 0.6, 'headlight', { r: 0, edges: false });
    k.box(0.02, 0.1, 0.34, -L / 2 - 0.002, yb - 0.18, s * 0.6, 'taillight', { r: 0, edges: false });
  }
  for (const e of [-1, 1]) k.box(0.012, 0.11, 0.48, e * (L / 2 + 0.06), y0 + 0.2, 0, 'paintWhite', { edges: false });   // plates
}

export function buildCars(B) {
  for (const [x, z, rot, paint, kind] of CARS) car(B, x, z, rot, paint, kind);
}
