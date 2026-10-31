// Trees and shrubs: a few tapered branches plus a few hundred leaf cards (instanced),
// with a procedural olive-leaf cluster texture. In drawing mode they read as white model trees.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patchMesh, patchLine, INK } from './materials.js';
import { S } from './scale.js';

function rnd(seed) { let a = seed | 0; return () => { a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function leafTexture() {
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const R = rnd(9);
  const pal = ['#6c7a52', '#5b6946', '#7f8a63', '#4b5839', '#909a74', '#a3a985'];
  c.strokeStyle = '#5a4a3a'; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(S / 2, S / 2); c.lineTo(S * (0.15 + R() * 0.7), S * (0.15 + R() * 0.7)); c.stroke(); }
  for (let i = 0; i < 110; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * S * 0.42;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    c.save(); c.translate(x, y); c.rotate(R() * Math.PI * 2);
    c.fillStyle = pal[Math.floor(R() * pal.length)];
    c.beginPath(); c.ellipse(0, 0, 11 + R() * 9, 3 + R() * 2.5, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function limb(a, b, r0, r1) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), 9, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

export function buildTrees(scene, lib, rooms, trees, shrubs) {
  const leafMap = leafTexture();
  const per = {};
  const get = (room) => (per[room] ??= { limbs: [], cards: [] });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  const canopy = (P, R, cx, cy, cz, rx, ry, n, size, rz = rx) => {
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1, th = R() * Math.PI * 2, rr = 0.55 + 0.45 * Math.cbrt(R());
      const s = Math.sqrt(1 - u * u);
      v.set(cx + Math.cos(th) * s * rx * rr, cy + u * ry * rr, cz + Math.sin(th) * s * rz * rr);
      e.set(R() * Math.PI, R() * Math.PI, R() * Math.PI); q.setFromEuler(e);
      const k = size * (0.75 + R() * 0.55); sc.set(k, k, k);
      P.cards.push(m4.compose(v, q, sc).clone());
    }
  };

  trees.forEach(([x0, z0, s, base, room, o = {}], idx) => {
    const x = x0 * S, z = z0 * S;
    const R = rnd(idx * 131 + 7), P = get(room);
    const top = new THREE.Vector3(x + (R() - 0.5) * 0.3, base + 2.1 * s, z + (R() - 0.5) * 0.3);
    P.limbs.push(limb(new THREE.Vector3(x, base, z), top, 0.12 * s, 0.085 * s));
    const cy = o.cy ?? base + 3.55 * s;
    const rx = o.rx ?? 1.9 * s, rz = o.rz ?? rx;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + R();
      const tip = new THREE.Vector3(x + Math.cos(a) * rx * 0.58, cy + (R() - 0.3) * 0.8 * s, z + Math.sin(a) * rz * 0.58);
      P.limbs.push(limb(top, tip, 0.07 * s, 0.025 * s));
    }
    canopy(P, R, x, cy, z, rx, o.ry ?? 1.15 * s, o.n ?? Math.round(320 * s), 0.85 * s, rz);
  });
  shrubs.forEach(([x0, z0, s, base, room], idx) => {
    const x = x0 * S, z = z0 * S;
    const R = rnd(idx * 77 + 3), P = get(room);
    canopy(P, R, x, base + 0.42 * s, z, 0.75 * s, 0.5 * s, 70, 0.55 * s);
  });

  const cardGeo = new THREE.PlaneGeometry(1, 1);
  for (const [room, P] of Object.entries(per)) {
    if (P.limbs.length) {
      const g = mergeGeometries(P.limbs.map((x) => x.toNonIndexed()));
      const m = new THREE.Mesh(g, patchMesh(lib.bark(), rooms[room]));
      m.castShadow = m.receiveShadow = true; scene.add(m);
      const lm = patchLine(new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35, depthWrite: false }), rooms[room]);
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(g, 50), lm); l.renderOrder = 3; scene.add(l);
    }
    const mat = patchMesh(new THREE.MeshStandardMaterial({
      map: leafMap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, envMapIntensity: 0.6,
    }), rooms[room]);
    const im = new THREE.InstancedMesh(cardGeo, mat, P.cards.length);
    P.cards.forEach((mm, i) => im.setMatrixAt(i, mm));
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
  }
}
