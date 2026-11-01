// The dog-leg stair in the core, one storey per call: two flights of 11 risers around a 1 m landing.
// The lower flight's treads cantilever from a central spine, a sloped half-wall at guard height
// capped in bronze; the upper flight's cantilever from the outer wall. Both flights stay in view
// from the hall and the landing, with glass guards and bronze rails on every open edge.
import * as THREE from 'three';
import { Kit } from './props.js';
import { S } from './scale.js';

const X0 = 8.8, XL = 11.82, TR = 0.205, TT = 0.07;            // plan: foot, landing end, going
const ZA = [7.0, 7.82], ZW = [7.82, 7.92], ZB = [7.92, 8.7];    // lower flight, spine, upper flight

// hallSide: the lower flight's outer edge faces an open hall and needs a guard from tread
// `guardFrom` up (the first treads stay open so the stair can be entered from the side).
// top: no flight continues above y1, so the well needs guards round its edge at that level.
export function buildStair(B, room, y0, y1, { hallSide = false, guardFrom = 3, top = false } = {}) {
  const R = (y1 - y0) / 22, XT = X0 + 11 * TR, yl = y0 + 11 * R;
  const k = new Kit(B, room);
  const pitch1 = (x) => y0 + R * (x - X0) / TR + R * 0.5;      // through the lower flight's tread centres
  const pitch2 = (x) => yl + R * (XT - x) / TR + R * 0.5;      // and the upper flight's

  for (let i = 0; i < 11; i++) {
    const x0 = X0 + i * TR, x1 = x0 + TR + 0.01, t = y0 + (i + 1) * R;
    B.box(x0, x1, t - TT, t, ZA[0], ZA[1], room, 'travertine', { fine: true });
    B.box(x0 + 0.03, x1 - 0.03, t - TT - 0.004, t - TT, ZA[1] - 0.08, ZA[1] - 0.01, room, 'lamp', { edges: false, cast: false });
  }
  B.box(XT, XL, yl - 0.18, yl, ZA[0], ZB[1], room, 'travertine', { fine: true });
  for (let i = 0; i < 11; i++) {
    const x1 = XT - i * TR, x0 = x1 - TR - 0.01, t = yl + (i + 1) * R;
    B.box(x0, x1, t - TT, t, ZB[0], ZB[1], room, 'travertine', { fine: true });
    B.box(x0 + 0.03, x1 - 0.03, t - TT - 0.004, t - TT, ZB[0] + 0.01, ZB[0] + 0.08, room, 'lamp', { edges: false, cast: false });
  }

  // spine: a sloped half-wall following the lower flight at guard height
  const GH = 0.95, sp = new THREE.Shape();
  sp.moveTo(X0 * S, y0); sp.lineTo(XT * S, y0); sp.lineTo(XT * S, pitch1(XT) + GH);
  sp.lineTo(X0 * S, pitch1(X0) + GH); sp.closePath();
  const sg = new THREE.ExtrudeGeometry(sp, { depth: (ZW[1] - ZW[0]) * S, bevelEnabled: false });
  sg.translate(0, 0, ZW[0] * S);
  B.add(sg, room, 'plaster');
  B.cap(X0 * S, XT * S, ZW[0] * S, ZW[1] * S, y0, pitch1(XT) + GH, 'ink');

  const glass = (pts, z) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * S, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false });
    g.translate(0, 0, z * S - 0.0075);
    B.add(g, room, 'glass', { glass: true, cast: false });
  };
  const rail = (a, b, z) => k.tube([[a[0], a[1], z], [b[0], b[1], z]], 0.022, 'bronze', { ts: 4 });

  // bronze cap on the spine; glass guard along the inner edge of the upper flight
  const zs = (ZW[0] + ZW[1]) / 2, zg = ZB[0] + 0.015 / S, xs = X0 + 0.5 * TR;
  rail([X0, pitch1(X0) + GH + 0.01], [XT, pitch1(XT) + GH + 0.01], zs);
  glass([[XT, pitch2(XT) - 0.15], [xs, pitch2(xs) - 0.15], [xs, pitch2(xs) + 0.92], [XT, pitch2(XT) + 0.92]], zg);
  rail([XT, pitch2(XT) + 0.94], [xs, pitch2(xs) + 0.94], zg);

  // hall side of the lower flight and the landing
  if (hallSide) {
    const xg = X0 + guardFrom * TR, z = ZA[0] - 0.028 / S;
    glass([[xg, pitch1(xg) - 0.15], [XT, pitch1(XT) - 0.15], [XT, pitch1(XT) + 0.92], [xg, pitch1(xg) + 0.92]], z);
    glass([[XT + 0.01, yl - 0.18], [XL, yl - 0.18], [XL, yl + 0.92], [XT + 0.01, yl + 0.92]], z);
    rail([xg, pitch1(xg) + 0.94], [XT, pitch1(XT) + 0.94], z);
    rail([XT, pitch1(XT) + 0.94], [XL, yl + 0.94], z);
  }

  // the open well at the top floor: guard the slab edges on its north, east and west sides
  if (top) {
    const G = 1.0, zN = ZA[0] - 0.1 - 0.02 / S, xE = XL + 0.08 + 0.02 / S, xW = X0 - 0.1 + 0.02 / S;
    const run = (a, b, along) => {
      const sh = new THREE.Shape([[0, y1], [(b - a) * S, y1], [(b - a) * S, y1 + G], [0, y1 + G]].map(([u, v]) => new THREE.Vector2(u, v)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false });
      if (along === 'x') g.translate(a * S, 0, zN * S - 0.0075);
      else { g.rotateY(-Math.PI / 2); g.translate((along === 'zE' ? xE : xW) * S + 0.0075, 0, a * S); }
      B.add(g, room, 'glass', { glass: true, cast: false });
    };
    run(xW, xE, 'x'); run(zN, ZB[1], 'zE'); run(zN, ZB[0], 'zW');
    rail([xW, y1 + G + 0.02], [xE, y1 + G + 0.02], zN);
    k.tube([[xE, y1 + G + 0.02, zN], [xE, y1 + G + 0.02, ZB[1]]], 0.022, 'bronze', { ts: 4 });
    k.tube([[xW, y1 + G + 0.02, zN], [xW, y1 + G + 0.02, ZB[0]]], 0.022, 'bronze', { ts: 4 });
  }

  // handrail on brackets along the outer wall for the upper flight
  const hand = (xa, xb, f, z, zWall) => {
    k.tube([[xa, f(xa) + 0.88, z], [xb, f(xb) + 0.88, z]], 0.02, 'bronze', { ts: 4 });
    for (let j = 0; j < 3; j++) { const x = xa + (xb - xa) * (j + 0.5) / 3; k.tube([[x, f(x) + 0.86, z], [x, f(x) + 0.86, zWall]], 0.008, 'bronze', { ts: 2 }); }
  };
  hand(XT - 0.05, X0 + 0.15, pitch2, ZB[1] - 0.07 / S, ZB[1] + 0.05);
}
