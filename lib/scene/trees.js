// Trees and shrubs: a curved, gnarled trunk and forking limbs plus a few hundred leaf cards (instanced),
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

// A tapered, slightly gnarled limb along a smooth curve through `points`.
function taperTube(points, r0, r1, R, gnarl = 0) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const seg = 16, rad = 10, fr = curve.computeFrenetFrames(seg, false), ph = R() * 10;
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, p = curve.getPointAt(t), n = fr.normals[i], b = fr.binormals[i];
    const r = (r0 + (r1 - r0) * t) * (1 + 0.35 * Math.max(0, 1 - t * 8) * gnarl);   // root flare
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      const k = r * (1 + gnarl * (0.16 * Math.sin(a * 3 + t * 7 + ph) + 0.08 * Math.sin(a * 5 - t * 13)));
      const c = Math.cos(a) * k, sn = Math.sin(a) * k;
      pos.push(p.x + n.x * c + b.x * sn, p.y + n.y * c + b.y * sn, p.z + n.z * c + b.z * sn);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j;
    idx.push(a, a + 1, a + rad + 1, a + 1, a + rad + 2, a + rad + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
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
    const V3 = (a, b, c) => new THREE.Vector3(a, b, c);
    const lx = (R() - 0.5) * 0.4 * s, lz = (R() - 0.5) * 0.4 * s;
    const top = V3(x + lx, base + 2.1 * s, z + lz);
    P.limbs.push(taperTube([
      V3(x, base, z),
      V3(x + lx * 0.1 + (R() - 0.5) * 0.14 * s, base + 0.7 * s, z + lz * 0.1 + (R() - 0.5) * 0.14 * s),
      V3(x + lx * 0.7 + (R() - 0.5) * 0.12 * s, base + 1.45 * s, z + lz * 0.7 + (R() - 0.5) * 0.12 * s),
      top,
    ], 0.13 * s, 0.075 * s, R, 1));
    const cy = o.cy ?? base + 3.55 * s;
    const rx = o.rx ?? 1.9 * s, rz = o.rz ?? rx;
    // four scaffold limbs from the crown, each forking twice towards the edge of the canopy
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + R() * 0.7;
      const from = top.clone().add(V3(0, -(0.05 + R() * 0.25) * s, 0));
      const mid = V3(x + Math.cos(a) * rx * 0.3, top.y + (0.45 + R() * 0.3) * s, z + Math.sin(a) * rz * 0.3);
      const tip = V3(x + Math.cos(a) * rx * 0.62, cy + (R() - 0.35) * 0.6 * s, z + Math.sin(a) * rz * 0.62);
      P.limbs.push(taperTube([from, mid, tip], 0.07 * s, 0.028 * s, R, 0.5));
      for (let f = 0; f < 2; f++) {
        const b = a + (f ? 0.55 : -0.55) + (R() - 0.5) * 0.3;
        const start = mid.clone().lerp(tip, 0.35 + R() * 0.3);
        const end = V3(x + Math.cos(b) * rx * (0.7 + R() * 0.15), cy + (R() - 0.2) * 0.7 * s, z + Math.sin(b) * rz * (0.7 + R() * 0.15));
        P.limbs.push(taperTube([start, start.clone().lerp(end, 0.5).add(V3(0, 0.12 * s, 0)), end], 0.035 * s, 0.01 * s, R, 0));
      }
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
