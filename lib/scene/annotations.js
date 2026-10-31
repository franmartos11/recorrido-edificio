// Drafting layer: room names, areas, dimension chains, north arrow, scale bar, tree symbols.
// Everything lies on the ground plane of the model (y ≈ 0), so it is part of the same 3D scene.
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
  const lineArr = [];
  const P = (v) => v * S;
  const seg = (a, b) => lineArr.push(P(a[0]), y + 0.02, P(a[1]), P(b[0]), y + 0.02, P(b[1]));
  const segM = (a, b) => lineArr.push(a[0], y + 0.02, a[1], b[0], y + 0.02, b[1]);   // already in metres
  const add = (m, x, z, rot = 0) => { m.position.set(x, y + 0.03, z); if (rot) m.rotation.z = rot; group.add(m); mats.push(m.material); };
  const label = (name, area, x, z, opts = {}) => {
    const l = [{ text: name, weight: 600 }];
    if (area) l.push({ text: area, size: 0.72, weight: 400, color: '#55524c', tracking: 0.06 });
    add(textPlane(l, { h: (opts.h ?? 0.26) * S }), P(x), P(z), opts.rot);
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
  build({ label, dimH, dimV, circle, seg, northArrowAndScale, add, P });

  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lineArr, 3));
  const lm = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false });
  const lines = new THREE.LineSegments(lg, lm);
  lines.renderOrder = 4;
  group.add(lines); mats.push(lm);
  mats.forEach((m) => { m.userData.base = m.opacity; });
  scene.add(group);
  return {
    group,
    setOpacity(a) { mats.forEach((m) => { m.opacity = m.userData.base * a; }); group.visible = a > 0.001; },
  };
}

const area = (m2) => `${(m2 * S * S).toFixed(1)} m²`;

export function buildAnnotations(scene, floor1Y = 3.62) {
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
    label('NORTH STREET', null, 9, -8.2, { h: 0.42 });
    label('WEST AVENUE', null, -8.5, 9, { h: 0.42, rot: Math.PI / 2 });
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
  const floor1 = makeSheet(scene, floor1Y, ({ label, dimH, dimV, seg, northArrowAndScale }) => {
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
  ground.setOpacity(1);
  floor1.setOpacity(0);
  return { ground, floor1, setOpacity: (a) => ground.setOpacity(a) };
}
