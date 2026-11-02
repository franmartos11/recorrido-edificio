// Material textures (procedural, generated at load in workers, no downloads), canvas text for
// signage and the paper grain. The recipes themselves live in texgen.js.
import * as THREE from 'three';
import { recipes, NORMALS, genData, normalData, periodicNoise } from './texgen.js';

function gen(size, fn) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const out = [0, 0, 0];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      fn(x / size, y / size, out);
      const i = (y * size + x) * 4;
      d[i] = Math.max(0, Math.min(255, out[0] * 255));
      d[i + 1] = Math.max(0, Math.min(255, out[1] * 255));
      d[i + 2] = Math.max(0, Math.min(255, out[2] * 255));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// Canvas text as a texture (menu boards, signage). Transparent background unless bg is set.
export function textTexture(lines, { w = 1024, h = 512, bg = null, color = '#f2e9d8', pad = 60, align = 'left', font = '"Inter", "Helvetica Neue", Arial, sans-serif' } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  if (bg) { c.fillStyle = bg; c.fillRect(0, 0, w, h); }
  let y = pad;
  for (const l of lines) {
    if (l.gap) { y += l.gap; continue; }
    c.font = `${l.weight ?? 400} ${l.size}px ${l.font ?? font}`;
    c.letterSpacing = `${(l.tracking ?? 0) * l.size}px`;
    c.fillStyle = l.color ?? color;
    c.textBaseline = 'top';
    if (l.right) { c.textAlign = 'right'; c.fillText(l.right, w - pad, y); }
    c.textAlign = l.align ?? align;
    const x = (l.align ?? align) === 'center' ? w / 2 : pad;
    c.fillText(l.text, x, y);
    if (l.rule) { c.fillRect(pad, y + l.size * 1.25, w - pad * 2, 2); }
    y += l.size * (l.lh ?? 1.45);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const mix = (a, b, t) => a + (b - a) * t;

// The material textures are generated in parallel workers, so the page stays responsive and the
// model can be built meanwhile. Fills T (T.oak, …, T.N.oak, …) and resolves when all are in.
export function loadTextures(renderer, T) {
  T.N = {};
  const R = recipes(), names = Object.keys(R);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const make = (data, size, tile, colorSpace) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = colorSpace;
    t.repeat.set(1 / tile, 1 / tile);
    t.anisotropy = aniso;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  const take = ({ name, size, tile, color, normal }) => {
    T[name] = make(color, size, tile, THREE.SRGBColorSpace);
    if (normal) T.N[name] = make(normal, size, tile, THREE.NoColorSpace);
  };
  // the big maps first, spread over the workers so each gets a similar number of pixels
  const W = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
  const jobs = Array.from({ length: W }, () => ({ px: 0, names: [] }));
  for (const n of [...names].sort((a, b) => R[b][0] - R[a][0])) {
    const j = jobs.reduce((m, x) => (x.px < m.px ? x : m));
    j.names.push(n); j.px += R[n][0] ** 2;
  }
  const onMain = (list) => { for (const n of list) { const [size, fn, tile] = R[n]; const color = genData(size, fn); take({ name: n, size, tile, color, normal: NORMALS[n] ? normalData(color, size, NORMALS[n]) : null }); } };
  return Promise.all(jobs.map((j) => new Promise((resolve) => {
    let w;
    try { w = new Worker(new URL('./texworker.js', import.meta.url), { type: 'module' }); }
    catch (e) { onMain(j.names); resolve(); return; }   // no workers: generate here
    w.onmessage = ({ data }) => { if (data.done) { w.terminate(); resolve(); } else take(data); };
    w.onerror = () => { w.terminate(); onMain(j.names.filter((n) => !T[n])); resolve(); };
    w.postMessage({ names: j.names });
  })));
}

// Paper grain for the sheet (CSS overlay)
export function paperDataURL() {
  const N = periodicNoise(7);
  const cv = gen(256, (u, v, o) => {
    const k = 0.5 + 0.5 * (N.n(u, v, 128) - 0.5) + 0.3 * (N.fbm(u, v, 8, 3) - 0.5);
    o[0] = o[1] = o[2] = k;
  });
  return cv.toDataURL('image/png');
}
