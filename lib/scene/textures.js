// Procedural, tileable material textures (generated at load, no downloads).
// Each texture is seamless and sized in metres via `tile` so world-space UVs map 1:1.
// Drop CC0 maps from ambientCG / Poly Haven into assets/textures/ later to replace any slot.
import * as THREE from 'three';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Periodic value noise: lattice of size c wraps, so the texture tiles.
function periodicNoise(seed) {
  const r = rng(seed);
  const lattices = new Map();
  const lat = (c) => {
    if (!lattices.has(c)) {
      const a = new Float32Array(c * c);
      for (let i = 0; i < a.length; i++) a[i] = r();
      lattices.set(c, a);
    }
    return lattices.get(c);
  };
  const s = (t) => t * t * (3 - 2 * t);
  const n = (u, v, cx, cy = cx) => {
    const a = lat(Math.max(cx, cy));
    const C = Math.max(cx, cy);
    const x = ((u % 1) + 1) % 1 * cx, y = ((v % 1) + 1) % 1 * cy;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = s(x - xi), yf = s(y - yi);
    const x0 = xi % cx, x1 = (xi + 1) % cx, y0 = yi % cy, y1 = (yi + 1) % cy;
    const v00 = a[y0 * C + x0], v10 = a[y0 * C + x1], v01 = a[y1 * C + x0], v11 = a[y1 * C + x1];
    return (v00 + (v10 - v00) * xf) + ((v01 + (v11 - v01) * xf) - (v00 + (v10 - v00) * xf)) * yf;
  };
  const fbm = (u, v, base = 4, oct = 5, sx = 1, sy = 1) => {
    let amp = 0.5, sum = 0, norm = 0;
    for (let o = 0; o < oct; o++) {
      const c = base << o;
      sum += amp * n(u, v, c * sx, c * sy);
      norm += amp; amp *= 0.5;
    }
    return sum / norm;
  };
  return { n, fbm, r };
}

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

function toTex(canvas, tile, renderer) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.userData = { canvas, tile, renderer };
  return t;
}

// Tangent-space normal map derived from a texture's luminance (seamless, same tiling).
function normalFrom(tex, strength = 2) {
  const { canvas, tile, renderer } = tex.userData;
  const S = canvas.width;
  const src = canvas.getContext('2d').getImageData(0, 0, S, S).data;
  const L = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) L[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(S, S); const d = img.data;
  const k = strength * S / 512;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const xl = (x - 1 + S) % S, xr = (x + 1) % S, yu = (y - 1 + S) % S, yd = (y + 1) % S;
    const dx = (L[y * S + xr] - L[y * S + xl]) * k, dy = (L[yd * S + x] - L[yu * S + x]) * k;
    const nl = Math.hypot(dx, dy, 1);
    const i = (y * S + x) * 4;
    d[i] = (-dx / nl * 0.5 + 0.5) * 255; d[i + 1] = (dy / nl * 0.5 + 0.5) * 255; d[i + 2] = (1 / nl * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const n = new THREE.CanvasTexture(cv);
  n.wrapS = n.wrapT = THREE.RepeatWrapping;
  n.colorSpace = THREE.NoColorSpace;
  n.repeat.set(1 / tile, 1 / tile);
  n.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return n;
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

export function makeTextures(renderer) {
  const T = {};

  // European oak, wide planks 0.2 m, tile 2.4 m
  {
    const N = periodicNoise(11), R = rng(5);
    const rows = 12, joints = [];
    for (let i = 0; i < rows; i++) joints.push([R(), (R() * 0.5 + 0.5) % 1]);
    const tone = []; for (let i = 0; i < rows * 3; i++) tone.push(R());
    T.oak = toTex(gen(1024, (u, v, o) => {
      const row = Math.floor(v * rows), fv = v * rows - row;
      const [j1, j2] = joints[row];
      const seg = ((u - j1 + 1) % 1) < ((j2 - j1 + 1) % 1) ? 0 : 1;
      const tv = tone[row * 3 + seg];
      const grain = N.fbm(u, v, 2, 5, 1, 24);
      const fine = N.n(u, v, 6, 512);
      let k = 0.86 + 0.18 * tv + 0.22 * (grain - 0.5) + 0.06 * (fine - 0.5);
      const edge = Math.min(fv, 1 - fv) * 0.2 * 1024 / rows; // px from seam
      const du = Math.min(Math.abs(u - j1), Math.abs(u - j2), 1 - Math.abs(u - j1), 1 - Math.abs(u - j2)) * 1024;
      if (edge < 0.9 || du < 0.9) k *= 0.55;
      o[0] = 0.66 * k; o[1] = 0.50 * k; o[2] = 0.35 * k;
    }), 2.4, renderer);
  }

  // Honed travertine, slabs 1.2 x 0.6 m, tile 2.4 m
  {
    const N = periodicNoise(23);
    T.travertine = toTex(gen(1024, (u, v, o) => {
      const sx = u * 2, sy = v * 4;
      const offs = (Math.floor(sy) % 2) * 0.5;
      const fx = (sx + offs) % 1, fy = sy % 1;
      const vein = N.fbm(u, v, 2, 5, 1, 10);
      const band = 0.5 + 0.5 * Math.sin((v * 40 + vein * 9) * Math.PI);
      const pit = N.n(u, v, 256);
      let k = 0.93 + 0.07 * (band - 0.5) + 0.05 * (N.fbm(u, v, 3, 4) - 0.5);
      if (pit > 0.93) k *= 0.88;
      const seam = Math.min(fx, 1 - fx) * 512 < 0.8 || Math.min(fy, 1 - fy) * 256 < 0.8;
      if (seam) k *= 0.78;
      o[0] = 0.86 * k; o[1] = 0.80 * k; o[2] = 0.70 * k;
    }), 2.4, renderer);
  }

  // Lime plaster, warm white, tile 2 m
  {
    const N = periodicNoise(31);
    T.plaster = toTex(gen(512, (u, v, o) => {
      const k = 0.96 + 0.05 * (N.fbm(u, v, 3, 5) - 0.5) + 0.02 * (N.fbm(u, v, 12, 3, 1, 0.5) - 0.5);
      o[0] = 0.93 * k; o[1] = 0.91 * k; o[2] = 0.87 * k;
    }), 2, renderer);
  }

  // Board-marked grey render (ground floor facade), tile 3 m
  {
    const N = periodicNoise(41);
    T.concrete = toTex(gen(512, (u, v, o) => {
      let k = 0.9 + 0.18 * (N.fbm(u, v, 2, 6) - 0.5) + 0.06 * (N.n(u, v, 64) - 0.5);
      if (N.n(u, v, 200) > 0.95) k *= 0.8;
      o[0] = 0.47 * k; o[1] = 0.46 * k; o[2] = 0.445 * k;
    }), 3, renderer);
  }

  // White textured render (upper facade), tile 3 m
  {
    const N = periodicNoise(43);
    T.render = toTex(gen(512, (u, v, o) => {
      const k = 0.95 + 0.06 * (N.fbm(u, v, 4, 5) - 0.5) + 0.05 * (N.n(u, v, 160) - 0.5);
      o[0] = 0.90 * k; o[1] = 0.885 * k; o[2] = 0.86 * k;
    }), 3, renderer);
  }

  // Dark stone-textured bands, tile 2 m
  {
    const N = periodicNoise(53);
    T.darkstone = toTex(gen(512, (u, v, o) => {
      let k = 0.9 + 0.25 * (N.n(u, v, 128) - 0.5) + 0.15 * (N.fbm(u, v, 4, 4) - 0.5);
      if (N.n(u, v, 220) > 0.9) k *= 1.5;
      o[0] = 0.17 * k; o[1] = 0.165 * k; o[2] = 0.16 * k;
    }), 2, renderer);
  }

  // Asphalt, tile 4 m
  {
    const N = periodicNoise(61);
    T.asphalt = toTex(gen(512, (u, v, o) => {
      let k = 0.85 + 0.25 * (N.n(u, v, 256) - 0.5) + 0.2 * (N.fbm(u, v, 2, 5) - 0.5);
      o[0] = 0.19 * k; o[1] = 0.19 * k; o[2] = 0.195 * k;
    }), 4, renderer);
  }

  // Grooved sidewalk pavers, 0.4 m units with 6 cm grooves, tile 1.2 m
  {
    const N = periodicNoise(71);
    T.pavers = toTex(gen(512, (u, v, o) => {
      const g = (v * 20) % 1;
      let k = 0.93 + 0.06 * (N.fbm(u, v, 6, 4) - 0.5);
      if (g < 0.12) k *= 0.82;
      if ((u * 3) % 1 < 0.006 || (v * 3) % 1 < 0.006) k *= 0.7;
      o[0] = 0.78 * k; o[1] = 0.77 * k; o[2] = 0.75 * k;
    }), 1.2, renderer);
  }

  // Dry grass / earth, tile 6 m
  {
    const N = periodicNoise(83);
    T.grass = toTex(gen(512, (u, v, o) => {
      const k = 0.85 + 0.3 * (N.fbm(u, v, 3, 6) - 0.5) + 0.2 * (N.n(u, v, 256) - 0.5);
      o[0] = 0.40 * k; o[1] = 0.42 * k; o[2] = 0.25 * k;
    }), 6, renderer);
  }

  // Pale gravel, tile 1 m
  {
    const N = periodicNoise(97);
    T.gravel = toTex(gen(512, (u, v, o) => {
      const k = 0.8 + 0.35 * (N.n(u, v, 128) - 0.5) + 0.25 * (N.n(u, v, 48) - 0.5);
      o[0] = 0.78 * k; o[1] = 0.74 * k; o[2] = 0.67 * k;
    }), 1, renderer);
  }

  // Terrazzo, cream base with warm and grey chips, tile 1.5 m
  {
    const N = periodicNoise(101), R = rng(17);
    const chips = [];
    for (let i = 0; i < 900; i++) chips.push([R(), R(), 0.002 + R() * 0.008, Math.floor(R() * 4)]);
    const cols = [[0.62, 0.55, 0.47], [0.38, 0.36, 0.34], [0.78, 0.66, 0.55], [0.55, 0.48, 0.40]];
    const grid = new Map();
    chips.forEach((c, i) => { const k = Math.floor(c[0] * 16) + Math.floor(c[1] * 16) * 16; (grid.get(k) ?? grid.set(k, []).get(k)).push(i); });
    T.terrazzo = toTex(gen(1024, (u, v, o) => {
      let k = 0.95 + 0.04 * (N.fbm(u, v, 4, 4) - 0.5);
      o[0] = 0.90 * k; o[1] = 0.87 * k; o[2] = 0.81 * k;
      const gx = Math.floor(u * 16), gy = Math.floor(v * 16);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const list = grid.get(((gx + dx + 16) % 16) + ((gy + dy + 16) % 16) * 16);
        if (!list) continue;
        for (const i of list) {
          const c = chips[i];
          let du = Math.abs(u - c[0]); du = Math.min(du, 1 - du);
          let dv = Math.abs(v - c[1]); dv = Math.min(dv, 1 - dv);
          if (du * du + dv * dv * 1.6 < c[2] * c[2]) { const cc = cols[c[3]]; o[0] = cc[0]; o[1] = cc[1]; o[2] = cc[2]; }
        }
      }
    }), 1.5, renderer);
  }

  // Green zellige tiles 10 cm, glazed and uneven, tile 0.8 m
  {
    const N = periodicNoise(113), R = rng(29);
    const tone = []; for (let i = 0; i < 64; i++) tone.push(R());
    T.zellige = toTex(gen(512, (u, v, o) => {
      const cx = Math.floor(u * 8), cy = Math.floor(v * 8);
      const fx = u * 8 - cx, fy = v * 8 - cy;
      const tv = tone[cy * 8 + cx];
      const pool = N.fbm(u, v, 8, 3);
      let k = 0.75 + 0.35 * tv + 0.25 * (pool - 0.5);
      const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
      if (edge < 0.035) { o[0] = 0.86; o[1] = 0.84; o[2] = 0.78; return; }
      if (edge < 0.09) k *= 1.12;
      o[0] = 0.20 * k; o[1] = 0.36 * k; o[2] = 0.30 * k;
    }), 0.8, renderer);
  }

  // Oak boards for joinery: grain only, no plank seams, tile 1.2 m
  {
    const N = periodicNoise(127);
    T.oakBoard = toTex(gen(512, (u, v, o) => {
      const grain = N.fbm(u, v, 2, 5, 1, 16);
      const k = 0.98 + 0.22 * (grain - 0.5) + 0.05 * (N.n(u, v, 4, 256) - 0.5);
      o[0] = 0.70 * k; o[1] = 0.53 * k; o[2] = 0.37 * k;
    }), 1.2, renderer);
  }

  // Carrara-like marble, tile 1.6 m
  {
    const N = periodicNoise(131);
    T.marble = toTex(gen(1024, (u, v, o) => {
      const w = N.fbm(u, v, 2, 6);
      const vein = Math.abs(Math.sin((u * 3 + v * 2 + w * 3.2) * Math.PI));
      const fine = Math.abs(Math.sin((u * 7 - v * 5 + N.fbm(u, v, 4, 5) * 5) * Math.PI));
      let k = 0.95 - 0.28 * Math.pow(1 - vein, 14) - 0.1 * Math.pow(1 - fine, 22) + 0.03 * (N.n(u, v, 64) - 0.5);
      o[0] = 0.93 * k; o[1] = 0.925 * k; o[2] = 0.915 * k;
    }), 1.6, renderer);
  }
  // Walnut boards, tile 1.2 m
  {
    const N = periodicNoise(137);
    T.walnut = toTex(gen(512, (u, v, o) => {
      const g = N.fbm(u, v, 2, 5, 1, 18);
      const k = 0.95 + 0.35 * (g - 0.5) + 0.06 * (N.n(u, v, 4, 300) - 0.5);
      o[0] = 0.36 * k; o[1] = 0.24 * k; o[2] = 0.17 * k;
    }), 1.2, renderer);
  }
  // Fine fabric weave (greyscale, tinted by material colour), tile 0.08 m
  {
    T.weave = toTex(gen(256, (u, v, o) => {
      const a = Math.sin(u * 64 * Math.PI), b = Math.sin(v * 64 * Math.PI);
      const over = ((Math.floor(u * 32) + Math.floor(v * 32)) % 2) ? a * a : b * b;
      const k = 0.86 + 0.14 * over;
      o[0] = o[1] = o[2] = k;
    }), 0.08, renderer);
  }
  // Bouclé loops, tile 0.25 m
  {
    const N = periodicNoise(139);
    T.boucle = toTex(gen(512, (u, v, o) => {
      const k = 0.8 + 0.3 * N.n(u, v, 96) + 0.1 * N.n(u, v, 40);
      o[0] = 0.95 * k; o[1] = 0.92 * k; o[2] = 0.86 * k;
    }), 0.25, renderer);
  }
  // Rattan cane weave, tile 0.12 m
  {
    T.rattan = toTex(gen(256, (u, v, o) => {
      const d1 = Math.abs(((u + v) * 8) % 1 - 0.5), d2 = Math.abs(((u - v + 1) * 8) % 1 - 0.5);
      const hole = Math.hypot((u * 8) % 1 - 0.5, (v * 8) % 1 - 0.5) < 0.12;
      let k = 0.75 + 0.25 * Math.max(1 - d1 * 4, 1 - d2 * 4, 0);
      if (hole) k = 0.25;
      o[0] = 0.78 * k; o[1] = 0.62 * k; o[2] = 0.42 * k;
    }), 0.12, renderer);
  }
  // Wool rug, tile 0.6 m
  {
    const N = periodicNoise(149);
    T.wool = toTex(gen(512, (u, v, o) => {
      const k = 0.85 + 0.2 * N.n(u, v, 200) + 0.08 * N.fbm(u, v, 4, 4);
      o[0] = 0.86 * k; o[1] = 0.82 * k; o[2] = 0.75 * k;
    }), 0.6, renderer);
  }

  // normal maps derived from the colour maps
  T.N = {};
  for (const [name, s] of Object.entries({
    oak: 3, oakBoard: 2, walnut: 2.5, travertine: 3, plaster: 6, concrete: 5, render: 5, darkstone: 6,
    pavers: 4, terrazzo: 1.5, zellige: 7, marble: 1, asphalt: 4, weave: 3, boucle: 8, rattan: 5, wool: 6, gravel: 6,
  })) T.N[name] = normalFrom(T[name], s);

  return T;
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
