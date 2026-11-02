// Roof terrace: oak deck on the west half facing the sunset.
//   north: wood-clad hot tub and two loungers
//   middle: outdoor lounge with fire bowl, rug and string lights
//   south: outdoor kitchen with bar stools
// The service volumes are clad in oak slats; dining stays under the pergola on the east half.
import {
  Kit, rnd, outdoorSofa, lounger, fireBowl, planterBox, diningTable, bentwoodChair, bowl, vase, cupAndSaucer,
  books, coffeeTableRound, hotTub, outdoorKitchen, stringLights, lantern, sideTable, outdoorRug, loungeChair,
} from './props.js';

export function buildRoof(B, L) {
  const R = 'roof', Y = L.roof;
  const k = new Kit(B, R, 0, Y + 0.06, 0);
  const r = rnd(301);
  // one continuous finish over the whole roof: large pale stone pavers (the slab underneath is
  // split between the floor-2 rooms, which would read as patches of different tone), open over
  // the light well; the oak decks sit on top of it
  for (const [x0, x1, z0, z1] of [[0.2, 20.2, 0.2, 3.5], [0.2, 20.2, 5.7, 8.8], [0.2, 8.5, 3.5, 5.7], [12.0, 20.2, 3.5, 5.7]])
    B.box(x0, x1, Y, Y + 0.03, z0, z1, R, 'roofPaver', { edges: false, cast: false });
  // decks
  B.box(0.2, 4.85, Y, Y + 0.06, 0.2, 8.8, R, 'oak', { edges: false, cast: false });
  B.box(15.6, 20.2, Y, Y + 0.06, 0.2, 6.6, R, 'oak', { edges: false, cast: false });

  // oak slat cladding on the two roof volumes
  for (const [x0, x1] of [[4.9, 8.2], [12.0, 15.3]]) {
    for (let z = 2.95; z < 6.18; z += 0.09) B.box(x0 - 0.04, x0, Y, L.towers - 0.05, z, z + 0.05, R, 'oakBoard', { edges: false });
    for (let x = x0 + 0.05; x < x1 - 0.02; x += 0.09) {
      B.box(x, x + 0.05, Y, L.towers - 0.05, 2.86, 2.9, R, 'oakBoard', { edges: false });
      B.box(x, x + 0.05, Y, L.towers - 0.05, 6.2, 6.24, R, 'oakBoard', { edges: false });
    }
  }

  // planters along the north and west parapets
  planterBox(k, 2.5, 0.48, 0, 3.6, 0.42, 0.55);
  planterBox(k, 0.48, 5.9, Math.PI / 2, 5.2, 0.42, 0.55);

  // north: hot tub + loungers with side tables
  hotTub(k, 1.65, 1.75, 1.05, 0.85);
  for (const z of [1.25, 2.3]) lounger(k, 3.75, z, Math.PI / 2);
  sideTable(k, 3.75, 1.78, 0.42, 0.2, 'marble');
  cupAndSaucer(k.at(3.75, 0.42, 1.78), 0, 0, 0, 0.5);
  lantern(k, 2.95, 0, 0.9);

  // middle: outdoor lounge
  outdoorRug(k, 2.45, 4.55, 4.0, 3.0);
  outdoorSofa(k, 3.6, 4.55, Math.PI / 2, 2.6);
  coffeeTableRound(k.at(2.6, 0, 4.55), 0, 0, 0.5, 'concrete');
  const ct = k.at(2.6, 0.37, 4.55);
  bowl(ct, 0.1, 0, 0.1, 0.13, 'glaze'); cupAndSaucer(ct, -0.15, 0, -0.1, 1); books(ct, -0.1, 0, 0.18, 0.5, r, 2);
  fireBowl(k.at(1.45, 0, 4.55), 0, 0);
  loungeChair(k, 1.75, 3.5, Math.PI, { fab: 'linen', wood: 'oakBoard', accent: 'fab5' });
  loungeChair(k, 1.75, 5.6, 0, { fab: 'linen', wood: 'oakBoard', accent: 'fab4' });
  lantern(k, 3.15, 0, 3.35); lantern(k, 3.3, 0, 5.85, 0.6);
  stringLights(k, [[0.75, 3.15], [2.6, 3.05], [4.6, 3.15]], 2.7, 0.3, 9);
  stringLights(k, [[0.75, 6.0], [4.6, 6.0]], 2.7, 0.45, 16);

  // south: outdoor kitchen against the parapet, bar stools facing it
  outdoorKitchen(k, 2.7, 8.8 - 0.37 / 1.3 - 0.06, 0, 3.4);
  vase(k, 1.6, 0.95, 8.45, { h: 0.3, r: 0.07, stems: 6, seed: 13 });

  // ---------- east deck: dining under the pergola ----------
  outdoorRug(k, 17.85, 3.4, 2.9, 3.9);
  const dn = k.at(17.85, 0, 3.4);
  diningTable(dn, 0, 0, Math.PI / 2, 2.2, 0.95);
  for (const z of [-0.7, 0, 0.7]) { bentwoodChair(dn, -0.7, z, -Math.PI / 2, 'blackmetal', 'rattan'); bentwoodChair(dn, 0.7, z, Math.PI / 2, 'blackmetal', 'rattan'); }
  vase(dn, 0, 0.755, 0, { h: 0.25, r: 0.07, stems: 6, seed: 7 });
  // the table laid for six: plates, glasses, two low lanterns, a linen runner
  dn.box(0.32, 0.004, 1.9, 0, 0.755, 0, 'linen', { r: 0.002, edges: false });
  for (const z of [-0.7, 0, 0.7]) for (const s of [-1, 1]) {
    dn.cyl(0.13, 0.12, 0.012, s * 0.3, 0.755, z, 'ceramic', { seg: 28 });
    dn.cyl(0.035, 0.03, 0.11, s * 0.3, 0.755, z + s * 0.2, 'glass', { seg: 14, glass: true, cast: false, edges: false });
  }
  for (const z of [-0.55, 0.55]) lantern(dn, 0, 0.755, z, 0.22);
  // a linear pendant hung from the pergola beams over the table
  dn.box(0.07, 0.05, 1.8, 0, 1.95, 0, 'brass', { r: 0.02 });
  dn.box(0.045, 0.01, 1.72, 0, 1.942, 0, 'opal', { r: 0.004, edges: false, cast: false });
  for (const z of [-0.75, 0.75]) dn.tube([[0, 2.0, z], [0, 2.4, z]], 0.003, 'blackmetal', { ts: 2 });
  // string lights crossing between the pergola posts
  stringLights(k, [[16.3, 1.3], [19.4, 5.5]], 2.3, 0.25, 16);
  stringLights(k, [[19.4, 1.3], [16.3, 5.5]], 2.3, 0.25, 16);
  // sofa at the south end facing the table, side tables and lanterns either side
  outdoorSofa(k, 17.85, 6.05, 0, 2.4);
  for (const x of [16.55, 19.15]) { sideTable(k, x, 6.05, 0.45, 0.2, 'marble'); lantern(k, x + (x < 17 ? -0.05 : 0.05), 0.45, 6.05, 0.3); }
  cupAndSaucer(k.at(19.15, 0.45, 6.05), 0.05, 0, 0, 0.4);
  // planting: a bed along the north parapet, an olive in a big pot in the corner, a bed on the east parapet
  planterBox(k, 17.6, 0.48, 0, 3.6, 0.42, 0.55);
  planterBox(k, 19.7, 0.75, 0, 0.9, 0.9, 0.55);
  planterBox(k, 20.0, 3.6, Math.PI / 2, 3.4, 0.4, 0.5);
  lantern(k, 15.95, 0, 1.0, 0.6); lantern(k, 15.95, 0, 5.9, 0.45);
}
