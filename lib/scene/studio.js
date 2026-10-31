// Floor 1: apartment 1.02, the middle west studio (≈ 33 m²), furnished; the floor-1 landing
// and corridor; and the stair flights from floor 1 to floor 2.
// Plan coordinates (× S); furniture in real metres through Kit.at().
import {
  Kit, rnd, vase, potPlant, bentwoodChair, globePendant, loungeChair, books, bowl, floorLamp, bed,
  curtainGeometry, doorLeaf, kitchenette, wardrobe, smallTable, cupAndSaucer, sideTable,
} from './props.js';
import { S } from './scale.js';

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
  // bed against the north wall, head to the north, beside the French window
  bed(k, 1.77, 3.88, Math.PI);
  k.box(2.0, 0.01, 1.6, 1.77, 0, 4.2, 'wool', { r: 0.004 });
  const art = k.at(1.77, 0, 3.02);
  art.box(1.2, 0.8, 0.035, 0, 1.35, 0.02, 'walnut', { r: 0.006 });
  art.box(1.12, 0.72, 0.01, 0, 1.39, 0.04, 'fab0', { r: 0.002, edges: false });
  art.box(0.5, 0.5, 0.006, 0.15, 1.5, 0.047, 'fab4', { r: 0.002, edges: false });

  // wardrobe on the north wall, east of the bed
  wardrobe(k, 4.2, 3.02 + 0.3 / S, Math.PI, 1.65, 2.35);

  // round marble table for two with a globe pendant
  const tb = k.at(3.45, 0, 4.15);
  smallTable(tb, 0, 0, 0.42);
  bentwoodChair(tb, -0.62, 0, -Math.PI / 2, 'walnut', 'rattan');
  bentwoodChair(tb, 0.62, 0, Math.PI / 2, 'walnut', 'rattan');
  cupAndSaucer(tb, -0.12, 0.75, 0.05, 0.4); cupAndSaucer(tb, 0.15, 0.75, -0.08, 2.4);
  vase(tb, 0.02, 0.75, 0.18, { h: 0.16, r: 0.045, stems: 4, seed: 71, mat: 'ceramic' });
  globePendant(k, 3.45, 4.15, 2.05, H);

  // kitchenette along the south wall, fridge column at its east end
  kitchenette(k, 3.9, 5.88 - 0.3 / S, 0, 2.4);

  // reading corner at the window
  loungeChair(k, 1.0, 5.15, 0);
  floorLamp(k, 1.55, 5.55);
  sideTable(k, 0.6, 4.85, 0.5, 0.2, 'marble');
  books(k.at(0.6, 0.5, 4.85), 0, 0, 0, 0.3, r, 3);
  potPlant(k, 2.55, 5.55, { r: 0.2, h: 0.45 });

  // sheer curtains at the French window
  k.geom(curtainGeometry(0.42, H - 0.12, 0.11, 0.025), 'linen', { fine: true }, [0.36, 0.04, 3.1 - 0.4]);
  k.geom(curtainGeometry(0.42, H - 0.12, 0.11, 0.025), 'linen', { fine: true }, [0.36, 0.04, 4.6 + 0.02]);

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
  const cs = ld.at(8.35, 0, 2.0);
  cs.box(0.35, 0.8, 1.3, -0.17, 0, 0, 'walnut', { r: 0.01 });
  vase(cs, -0.17, 0.8, 0.3, { h: 0.35, r: 0.08, stems: 6, seed: 81, bloom: null });

  // stair flights floor 1 → floor 2 (same well as the ground-floor stair)
  const rise = (L.s2 - L.s1) / 22, TR = 0.24;
  // open (floating) treads so the flights read as light folded plates, not solid blocks
  const T = 0.32;
  for (let i = 0; i < 11; i++) { const top = F + (i + 1) * rise; B.box(8.8 + i * TR, 8.8 + (i + 1) * TR, Math.max(F, top - T), top, 7.0, 7.82, LD, 'travertine', { fine: true }); }
  B.box(11.44, 11.82, F + 11 * rise - 0.2, F + 11 * rise, 7.0, 8.7, LD, 'travertine', { fine: true });
  for (let i = 0; i < 11; i++) { const top = F + 11 * rise + (i + 1) * rise; B.box(11.44 - (i + 1) * TR, 11.44 - i * TR, top - T, top, 7.92, 8.7, LD, 'travertine', { fine: true }); }
  // handrail along the void
  ld.tube([[8.8, 0.95, 7.86], [11.44, 0.95 + 11 * rise, 7.86]], 0.02, 'brass', { ts: 4 });
}
