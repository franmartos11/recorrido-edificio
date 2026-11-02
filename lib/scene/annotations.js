// Drafting layer: room names, areas, dimension chains, north arrow, scale bar, tree symbols, and
// furniture drawn in line for the apartments the walk doesn't enter (drawing only: no geometry).
// Everything lies on the ground plane of the model (y ≈ 0), so it is part of the same 3D scene.
// A sheet first shows its room names; as it is furnished (setFurnish 0 → 1) the names fade out
// and the furniture lines fade in.
import * as THREE from 'three';
import { INK } from './materials.js';
import { S } from './scale.js';

const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

function textPlane(lines, { h = 0.32, weight = 500, color = '#141414', tracking = 0.12, align = 'center' } = {}) {
  const pxPerM = 360;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const sizes = lines.map((l) => (l.size ?? 1) * h * pxPerM);
  const fontFor = (l, i) => `${l.weight ?? weight} ${sizes[i]}px ${FONT}`;
  let w = 0;
  lines.forEach((l, i) => { ctx.font = fontFor(l, i); ctx.letterSpacing = `${(l.tracking ?? tracking) * sizes[i]}px`; w = Math.max(w, ctx.measureText(l.text).width); });
  const pad = 8, lineGap = 0.35;
  cv.width = Math.ceil(w + pad * 2);
  cv.height = Math.ceil(sizes.reduce((a, s) => a + s * (1 + lineGap), 0) + pad * 2);
  let y = pad;
  lines.forEach((l, i) => {
    ctx.font = fontFor(l, i);
    ctx.letterSpacing = `${(l.tracking ?? tracking) * sizes[i]}px`;
    ctx.fillStyle = l.color ?? color;
    ctx.textBaseline = 'top';
    ctx.textAlign = align;
    const x = align === 'center' ? cv.width / 2 : align === 'left' ? pad : cv.width - pad;
    ctx.fillText(l.text, x, y);
    y += sizes[i] * (1 + lineGap);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const geo = new THREE.PlaneGeometry(cv.width / pxPerM, cv.height / pxPerM);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 4;
  return m;
}

// One drafting sheet lying on a floor at height y. Positions are plan coordinates (× S);
// dimension figures are computed from the scaled geometry, so they always match the model.
function makeSheet(scene, y, build) {
  const group = new THREE.Group();
  const mats = [];
  const lineArr = [], furArr = [], labelMats = [];
  const P = (v) => v * S;
  const seg = (a, b) => lineArr.push(P(a[0]), y + 0.02, P(a[1]), P(b[0]), y + 0.02, P(b[1]));
  // furniture, in plan coordinates
  const fseg = (a, b) => furArr.push(P(a[0]), y + 0.02, P(a[1]), P(b[0]), y + 0.02, P(b[1]));
  const frect = (x0, z0, x1, z1) => { fseg([x0, z0], [x1, z0]); fseg([x1, z0], [x1, z1]); fseg([x1, z1], [x0, z1]); fseg([x0, z1], [x0, z0]); };
  const fcirc = (x, z, r, n = 24) => {   // r in plan units
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      fseg([x + Math.cos(a0) * r, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, z + Math.sin(a1) * r]);
    }
  };
  const segM = (a, b) => lineArr.push(a[0], y + 0.02, a[1], b[0], y + 0.02, b[1]);   // already in metres
  const add = (m, x, z, rot = 0) => { m.position.set(x, y + 0.03, z); if (rot) m.rotation.z = rot; group.add(m); mats.push(m.material); };
  const label = (name, area, x, z, opts = {}) => {
    const l = [{ text: name, weight: 600 }];
    if (area) l.push({ text: area, size: 0.72, weight: 400, color: '#55524c', tracking: 0.06 });
    add(textPlane(l, { h: (opts.h ?? 0.26) * S }), P(x), P(z), opts.rot);
    if (!opts.keep) labelMats.push(mats[mats.length - 1]);
  };
  const dimH = (z, xs, small = true) => {
    seg([xs[0] - 0.4, z], [xs[xs.length - 1] + 0.4, z]);
    xs.forEach((x, i) => {
      seg([x - 0.12, z + 0.12], [x + 0.12, z - 0.12]);
      seg([x, z - 0.25], [x, z + 0.25]);
      if (i) add(textPlane([{ text: ((xs[i] - xs[i - 1]) * S).toFixed(2), weight: 500, tracking: 0.04 }], { h: (small ? 0.2 : 0.26) * S }), P((xs[i] + xs[i - 1]) / 2), P(z - 0.24));
    });
  };
  const dimV = (x, zs, small = true) => {
    seg([x, zs[0] - 0.4], [x, zs[zs.length - 1] + 0.4]);
    zs.forEach((z, i) => {
      seg([x - 0.12, z + 0.12], [x + 0.12, z - 0.12]);
      seg([x - 0.25, z], [x + 0.25, z]);
      if (i) add(textPlane([{ text: ((zs[i] - zs[i - 1]) * S).toFixed(2), weight: 500, tracking: 0.04 }], { h: (small ? 0.2 : 0.26) * S }), P(x - 0.24), P((zs[i] + zs[i - 1]) / 2), Math.PI / 2);
    });
  };
  const circle = (x, z, r, dashed = true, n = 36) => {
    for (let i = 0; i < n; i += dashed ? 2 : 1) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      segM([P(x) + Math.cos(a0) * r, P(z) + Math.sin(a0) * r], [P(x) + Math.cos(a1) * r, P(z) + Math.sin(a1) * r]);
    }
  };
  const northArrowAndScale = (nx, nz) => {
    circle(nx, nz, 0.9 * S, false, 40);
    seg([nx, nz + 0.7], [nx, nz - 1.3]); seg([nx, nz - 1.3], [nx - 0.25, nz - 0.8]); seg([nx, nz - 1.3], [nx + 0.25, nz - 0.8]);
    add(textPlane([{ text: 'N', weight: 600 }], { h: 0.4 * S }), P(nx), P(nz - 1.85));
    const x0 = P(nx - 3.5), z0 = P(nz + 2.6);
    for (let i = 0; i <= 5; i++) segM([x0 + i, z0 - 0.3], [x0 + i, z0]);   // true metres
    segM([x0, z0], [x0 + 5, z0]);
    add(textPlane([{ text: '0     1     2     3     4     5 m', weight: 400, tracking: 0.02 }], { h: 0.2 * S }), x0 + 2.5, z0 + 0.4);
  };
  build({ label, dimH, dimV, circle, seg, northArrowAndScale, add, P, fseg, frect, fcirc });

  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lineArr, 3));
  const lm = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
  const lines = new THREE.LineSegments(lg, lm);
  lines.renderOrder = 4;
  group.add(lines); mats.push(lm);
  const furMats = [];
  if (furArr.length) {
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(furArr, 3));
    const fm = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false });
    const fl = new THREE.LineSegments(fg, fm);
    fl.renderOrder = 4;
    group.add(fl); mats.push(fm); furMats.push(fm);
  }
  mats.forEach((m) => { m.userData.base = m.opacity; });
  scene.add(group);
  let f = 0, a = 1;
  const apply = () => {
    mats.forEach((m) => {
      const k = labelMats.includes(m) ? 1 - f : furMats.includes(m) ? f : 1;
      m.opacity = m.userData.base * a * k;
    });
    group.visible = a > 0.001;
  };
  return {
    group,
    setOpacity(v) { a = v; apply(); },
    setFurnish(v) { if (v !== f) { f = v; apply(); } },
  };
}

const area = (m2) => `${(m2 * S * S).toFixed(1)} m²`;
const M = (m) => m / S;   // metres → plan units

// A studio laid out along x from its inner end (bath, by the corridor) to the window wall:
// bath, kitchen run, a table for two, sofa and coffee table, the bed by the window.
function studioPlan({ frect, fseg, fcirc }, { inner, outer, z0, z1, bath }) {
  const dir = Math.sign(outer - inner), L = Math.abs(outer - inner);
  const X = (d) => inner + dir * d;
  const R = (d0, za, d1, zb, h) => frect(Math.min(X(d0), X(d1)), za, Math.max(X(d0), X(d1)), zb, h);
  const [bw, bz0, bz1] = bath;   // bath depth from the inner end and its z span
  // bath: shower tray with its drain cross, WC, basin
  const sh = Math.min(M(0.9), bz1 - bz0 - M(0.1));
  R(0.06, bz0 + 0.04, 0.06 + sh, bz0 + 0.04 + sh, 0.06);
  fseg([X(0.06), bz0 + 0.04], [X(0.06 + sh), bz0 + 0.04 + sh]);
  R(bw - M(0.62), bz1 - M(0.42), bw - M(0.16), bz1 - 0.04, 0.85);
  fcirc(X(bw - M(0.39)), bz1 - M(0.6), M(0.19), 24, 0.4);
  R(0.06, bz1 - M(0.5), 0.06 + M(0.45), bz1 - 0.04, 0.85);
  fcirc(X(0.06 + M(0.22)), bz1 - M(0.27), M(0.13));
  // kitchen run along the z0 wall, sink and hob
  const k0 = bw + M(0.25), k1 = k0 + M(2.4), kd = M(0.62);
  R(k0, z0 + 0.04, k1, z0 + 0.04 + kd, 0.9);
  R(k0 + M(0.3), z0 + M(0.12), k0 + M(0.8), z0 + M(0.5));
  for (const [dx, dz] of [[1.55, 0.2], [1.85, 0.2], [1.55, 0.45], [1.85, 0.45]]) fcirc(X(k0 + M(dx)), z0 + M(dz), M(0.09), 14);
  // round table for two
  const tx = X(k1 + M(0.2)), tz = z1 - M(0.85);
  fcirc(tx, tz, M(0.4), 24, 0.75);
  for (const s of [-1, 1]) frect(tx + s * M(0.6) - M(0.2), tz - M(0.2), tx + s * M(0.6) + M(0.2), tz + M(0.2), 0.45);
  // bed by the window, head against the z0 wall, nightstands
  const bwid = M(1.6), blen = M(2.0), bc = L - M(0.4) - bwid / 2;
  R(bc - bwid / 2, z0 + 0.04, bc + bwid / 2, z0 + 0.04 + blen, 0.45);
  R(bc - bwid / 2 + M(0.1), z0 + M(0.1), bc - M(0.05), z0 + M(0.5), 0.55);
  R(bc + M(0.05), z0 + M(0.1), bc + bwid / 2 - M(0.1), z0 + M(0.5), 0.55);
  fseg([X(bc - bwid / 2), z0 + M(0.75)], [X(bc + bwid / 2), z0 + M(0.75)]);
  for (const s of [-1, 1]) R(bc + s * (bwid / 2 + M(0.3)) - M(0.22), z0 + 0.04, bc + s * (bwid / 2 + M(0.3)) + M(0.22), z0 + 0.04 + M(0.4), 0.5);
  // sofa against the z1 wall between table and bed, coffee table in front
  const sc = (k1 + M(0.9) + bc - bwid / 2) / 2 + M(0.3), sl = M(1.9);
  R(sc - sl / 2, z1 - M(0.85), sc + sl / 2, z1 - 0.04, 0.42);
  R(sc - sl / 2 + M(0.15), z1 - M(0.85), sc + sl / 2 - M(0.15), z1 - M(0.6), 0.75);
  R(sc - M(0.45), z1 - M(1.6), sc + M(0.45), z1 - M(1.1), 0.38);
}
// the small apartment north of the light well: bed, kitchen and table round a corner bath
function smallPlan({ frect, fseg, fcirc }, { x0, x1, z0, z1 }) {
  frect(x1 - M(1.9), z1 - M(1.7), x1 - 0.06, z1 - 0.06);            // bath walls
  frect(x1 - M(1.0), z1 - M(1.0), x1 - M(0.12), z1 - M(0.12), 0.06); fseg([x1 - M(1.0), z1 - M(1.0)], [x1 - M(0.12), z1 - M(0.12)]);
  fcirc(x1 - M(1.5), z1 - M(0.5), M(0.19), 24, 0.4);
  frect(x0 + 0.06, z0 + M(0.6), x0 + 0.06 + M(0.62), z0 + M(3.0), 0.9);    // kitchen along the corridor wall
  for (const dz of [1.9, 2.2]) for (const dx of [0.2, 0.45]) fcirc(x0 + M(dx), z0 + M(dz), M(0.09), 14);
  const bx = x1 - M(1.0), bz = z0 + M(1.6);                           // bed against the east wall
  frect(bx - M(0.8), bz - M(1.0), x1 - 0.06, bz + M(0.6), 0.45);
  fseg([bx - M(0.8) + M(0.5), bz - M(1.0)], [bx - M(0.8) + M(0.5), bz + M(0.6)]);
  fcirc(x0 + M(1.6), z1 - M(1.2), M(0.4), 24, 0.75);
  for (const s of [-1, 1]) frect(x0 + M(1.6) + s * M(0.6) - M(0.2), z1 - M(1.4), x0 + M(1.6) + s * M(0.6) + M(0.2), z1 - M(1.0), 0.45);
}
// every apartment on a floor that has no modelled interior. `t` supplies frect / fcirc / fseg;
// pieces given a height h (metres) are also built as white blocks in building.js (unitBlocks)
export function drawUnits(t, west) {
  if (west) {
    studioPlan(t, { inner: 6.95, outer: 0.4, z0: 0.3, z1: 2.9, bath: [1.55, 0.3, 1.95] });
    studioPlan(t, { inner: 6.95, outer: 0.4, z0: 6.05, z1: 8.7, bath: [1.55, 6.05, 7.72] });
  }
  smallPlan(t, { x0: 8.7, x1: 11.9, z0: 0.3, z1: 3.5 });
  for (const [z0, z1] of [[0.3, 2.9], [3.0, 5.9], [6.0, 8.7]]) studioPlan(t, { inner: 12.06, outer: 20.1, z0, z1, bath: [1.44, z0, z0 + 1.7] });
}

export function buildAnnotations(scene, floor1Y = 3.62, floor2Y = 6.72) {
  const ground = makeSheet(scene, 0, ({ label, dimH, dimV, circle, seg, northArrowAndScale, add, P }) => {
    label('SHOP 01 · CAFÉ', area(16.7), 3.7, 1.35);
    label('SHOP 02 · CLOTHING', area(18.2), 2.7, 3.85);
    label('SHOP 03 · BOOKS', area(17.3), 2.6, 6.8);
    label('LOBBY', area(20.6), 7.8, 2.1, { rot: Math.PI / 2, h: 0.24 });
    label('PATIO', 'OPEN TO SKY', 10.25, 3.95, { h: 0.2 });
    label('HALL', null, 10.3, 6.25, { h: 0.22 });
    label('STAIR', null, 10.1, 8.3, { h: 0.18 });
    label('CARETAKER', area(18.3), 12.1, 1.3, { h: 0.22 });
    label('ADMIN', area(9.8), 13.1, 6.4, { h: 0.22 });
    label('PARKING', '3 SPACES', 17.2, 4.5);
    label('CAFÉ TERRACE', null, -2.2, 3.6, { rot: Math.PI / 2, h: 0.24 });
    for (const [t, x] of [['P1', 15.35], ['P2', 17.25], ['P3', 19.1]]) label(t, null, x, 7.6, { h: 0.2 });
    label('NORTH STREET', null, 9, -8.2, { h: 0.42, keep: true });
    label('WEST AVENUE', null, -8.5, 9, { h: 0.42, rot: Math.PI / 2, keep: true });
    dimH(-5.1, [0.4, 7.0, 8.6, 11.9, 14.4, 20.4]);
    dimH(-6.1, [0.0, 20.4], false);
    dimV(-5.5, [0, 2.95, 5.95, 9.0]);
    dimV(-6.5, [0, 9.0], false);
    dimV(22.0, [0, 3.6, 5.6, 9.0]);
    for (const [x, z, r] of [[3.8, -2.5, 2.2], [11.7, -2.6, 2.2], [17.0, -2.5, 2.2], [-2.9, 13.5, 2.0], [-2.9, 20, 2.0], [10.25, 4.6, 1.5]]) circle(x, z, r);
    seg([8.9, 7.41], [11.3, 7.41]); seg([11.3, 7.41], [11.1, 7.3]); seg([11.3, 7.41], [11.1, 7.52]);
    seg([8.7, 3.7], [11.8, 5.5]); seg([8.7, 5.5], [11.8, 3.7]);
    northArrowAndScale(25.5, 12.5);
  });
  const floor1 = makeSheet(scene, floor1Y, ({ label, dimH, dimV, seg, northArrowAndScale, ...t }) => {
    drawUnits(t, true);
    label('APT 1.02 · STUDIO', area(6.67 * 2.86), 3.3, 4.75, { h: 0.24 });
    label('BATH', null, 6.2, 3.75, { h: 0.16 });
    label('APT 1.01', null, 2.6, 1.6, { h: 0.22 });
    label('APT 1.03', null, 2.6, 7.4, { h: 0.22 });
    label('CORRIDOR', null, 7.8, 2.3, { h: 0.16, rot: Math.PI / 2 });
    label('LANDING', null, 7.85, 6.6, { h: 0.18, rot: Math.PI / 2 });
    label('STAIR', null, 10.1, 8.3, { h: 0.18 });
    label('LIGHT WELL', null, 10.25, 4.6, { h: 0.18 });
    for (const [t, x, z] of [['APT 1.04', 10.3, 1.6], ['APT 1.05', 16.1, 1.5], ['APT 1.06', 16.1, 4.4], ['APT 1.07', 16.1, 7.4]]) label(t, null, x, z, { h: 0.2 });
    dimH(-1.6, [0.0, 7.0, 8.6, 12.0, 20.4]);
    dimH(-2.6, [0.0, 20.4], false);
    dimV(-1.6, [0, 2.95, 5.95, 9.0]);
    dimV(-2.6, [0, 9.0], false);
    seg([8.7, 3.7], [11.8, 5.5]); seg([8.7, 5.5], [11.8, 3.7]);
    seg([8.9, 7.41], [11.3, 7.41]); seg([11.3, 7.41], [11.1, 7.3]); seg([11.3, 7.41], [11.1, 7.52]);
    northArrowAndScale(25.5, 12.5);
  });
  const floor2 = makeSheet(scene, floor2Y, ({ label, dimH, dimV, seg, northArrowAndScale, ...t }) => {
    drawUnits(t, false);
    label('APT 2.01 · RESIDENCE', area(57.4), 2.8, 3.3, { h: 0.26 });
    label('LIVING · DINING · KITCHEN', null, 2.8, 4.3, { h: 0.15 });
    label('BEDROOM', null, 3.35, 6.5, { h: 0.18 });
    label('BATH', null, 1.2, 8.15, { h: 0.16 });
    label('ENTRY', null, 5.7, 7.3, { h: 0.16 });
    label('CORRIDOR', null, 7.8, 2.3, { h: 0.16, rot: Math.PI / 2 });
    label('LANDING', null, 7.85, 6.6, { h: 0.18, rot: Math.PI / 2 });
    label('STAIR', null, 10.1, 8.3, { h: 0.18 });
    label('LIGHT WELL', null, 10.25, 4.6, { h: 0.18 });
    for (const [t, x, z] of [['APT 2.04', 10.3, 1.6], ['APT 2.05', 16.1, 1.5], ['APT 2.06', 16.1, 4.4], ['APT 2.07', 16.1, 7.4]]) label(t, null, x, z, { h: 0.2 });
    dimH(-1.6, [0.0, 4.5, 7.0, 8.6, 12.0, 20.4]);
    dimH(-2.6, [0.0, 20.4], false);
    dimV(-1.6, [0, 5.8, 9.0]);
    dimV(-2.6, [0, 9.0], false);
    seg([8.7, 3.7], [11.8, 5.5]); seg([8.7, 5.5], [11.8, 3.7]);
    northArrowAndScale(25.5, 12.5);
  });
  ground.setOpacity(1);
  floor1.setOpacity(0);
  floor2.setOpacity(0);
  return { ground, floor1, floor2, setOpacity: (a) => ground.setOpacity(a) };
}
