// "Drawing → material" reveal.
// Every mesh and ink line belongs to a room. A room has a wipe origin + radius in world space.
// Outside the radius the surface renders as paper (flat, lightly shaded); inside it renders the
// real PBR material. Ink lines fade out as the wipe passes them.
import * as THREE from 'three';
import { textTexture } from './textures';

export const PAPER = new THREE.Color('#f4f1ea');
export const INK = new THREE.Color('#141414');

export class Room {
  constructor(name) {
    this.name = name;
    this.uOrigin = { value: new THREE.Vector3() };
    this.uRadius = { value: -1 };
    this.uSoft = { value: 2.5 };
  }
  set(origin, radius, soft) {
    if (origin) this.uOrigin.value.copy(origin);
    this.uRadius.value = radius;
    if (soft !== undefined) this.uSoft.value = soft;
  }
}

export const shared = {
  uLineAlpha: { value: 1 },   // global ink strength (plan annotations fade on descent)
  uPaper: { value: new THREE.Vector3(PAPER.r, PAPER.g, PAPER.b) },
  // plan sheets: everything between the floor and the cut is hidden, so a sheet first reads as walls
  // and labels alone; x = bottom of the band for meshes, y = for lines, z = top. Off when x ≥ z.
  uHide: { value: new THREE.Vector3(1e5, 1e5, -1e5) },
};

const REVEAL_FN = /* glsl */`
uniform vec3 uOrigin; uniform float uRadius; uniform float uSoft;
varying vec3 vWPos;
float revealAmt() {
  float d = distance(vWPos.xz, uOrigin.xz);
  return 1.0 - smoothstep(uRadius - uSoft, uRadius, d);
}
`;

export function patchMesh(mat, room, { glass = false } = {}) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uOrigin = room.uOrigin;
    s.uniforms.uRadius = room.uRadius;
    s.uniforms.uSoft = room.uSoft;
    s.uniforms.uPaper = shared.uPaper;
    s.uniforms.uHide = shared.uHide;
    s.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vWN;\n' + s.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      #ifdef USE_INSTANCING
        vWPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
      #else
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * objectNormal);
      #endif`
    );
    s.fragmentShader = REVEAL_FN + 'varying vec3 vWN;\nuniform vec3 uPaper;\nuniform vec3 uHide;\n' + s.fragmentShader.replace(
      '#include <dithering_fragment>',
      /* glsl */`
      // (and the undersides of pieces standing on the floor, which sit just below the band)
      if (vWPos.y < uHide.z && (vWPos.y > uHide.x || (vWN.y < -0.5 && vWPos.y > uHide.x - 0.03))) discard;
      float rv = revealAmt();
      vec3 n = normalize(vWN);
      float sh = 0.84 + 0.16 * clamp(0.55 + 0.45 * n.y + 0.22 * n.x - 0.12 * n.z, 0.0, 1.0);
      vec3 paper = uPaper * sh;
      float front = smoothstep(0.0, 0.35, rv) * (1.0 - smoothstep(0.35, 1.0, rv));
      gl_FragColor.rgb = mix(paper, gl_FragColor.rgb, rv);
      gl_FragColor.rgb += vec3(0.10, 0.06, 0.02) * front;   // warm leading edge of the wipe
      ${glass ? 'gl_FragColor.a = mix(0.06, gl_FragColor.a, rv);' : ''}
      #include <dithering_fragment>`
    );
  };
  mat.customProgramCacheKey = () => 'reveal-mesh' + (glass ? '-g' : '');
  return mat;
}

export function patchLine(mat, room) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uOrigin = room.uOrigin;
    s.uniforms.uRadius = room.uRadius;
    s.uniforms.uSoft = room.uSoft;
    s.uniforms.uLineAlpha = shared.uLineAlpha;
    s.uniforms.uHide = shared.uHide;
    s.vertexShader = 'varying vec3 vWPos;\n' + s.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    );
    s.fragmentShader = REVEAL_FN + 'uniform float uLineAlpha;\nuniform vec3 uHide;\n' + s.fragmentShader.replace(
      '#include <dithering_fragment>',
      `if (vWPos.y > uHide.y && vWPos.y < uHide.z) discard;\ngl_FragColor.a *= (1.0 - revealAmt()) * uLineAlpha;\n#include <dithering_fragment>`
    );
  };
  mat.customProgramCacheKey = () => 'reveal-line';
  return mat;
}

// PBR material library. Interiors get reduced env intensity as a cheap stand-in for occlusion.
// Every textured surface carries a normal map derived from its colour map.
export function makeMaterialLib(T) {
  const std = (o) => new THREE.MeshStandardMaterial({
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...o,
  });
  // automotive paint: metallic base under a clear coat
  const paint = (color, metalness, roughness) => new THREE.MeshPhysicalMaterial({
    color, metalness, roughness, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const N = (name, s = 1) => ({ normalMap: T.N[name], normalScale: new THREE.Vector2(s, s) });
  const fab = (color) => () => std({ map: T.weave, color, roughness: 0.95, envMapIntensity: 0.35, side: THREE.DoubleSide, ...N('weave', 0.8) });

  const menuTex = textTexture([
    { text: 'ESPRESSO BAR', size: 46, weight: 600, tracking: 0.25, rule: true, lh: 2.2 },
    { text: 'Espresso', size: 40, right: '2.80' }, { text: 'Cortado', size: 40, right: '3.20' },
    { text: 'Flat white', size: 40, right: '3.80' }, { text: 'Filter, single origin', size: 40, right: '4.20' },
    { gap: 34 },
    { text: 'BAKERY', size: 46, weight: 600, tracking: 0.25, rule: true, lh: 2.2 },
    { text: 'Butter croissant', size: 40, right: '3.40' }, { text: 'Cardamom bun', size: 40, right: '3.90' },
    { text: 'Burnt basque cheesecake', size: 40, right: '5.60' },
  ], { w: 1024, h: 1024, bg: '#1d2420', color: '#efe6d4', pad: 80 });
  const signCafe = textTexture([{ text: 'CAFÉ', size: 150, weight: 600, tracking: 0.3, align: 'center' }],
    { w: 1024, h: 1024, color: '#c9a568', pad: 430 });
  const signWC = textTexture([{ text: 'WC', size: 300, weight: 500, tracking: 0.1, align: 'center' }], { w: 512, h: 512, color: '#b8925a', pad: 100 });
  const signAtelier = textTexture([{ text: 'ATELIER', size: 120, weight: 500, tracking: 0.5, align: 'center' }],
    { w: 1600, h: 256, color: '#c9a568', pad: 60 });
  const signBooks = textTexture([{ text: 'BOOKS & PAPER', size: 120, weight: 500, tracking: 0.35, align: 'center' }],
    { w: 1600, h: 256, color: '#c9a568', pad: 60 });

  return {
    concrete:   () => std({ map: T.concrete, roughness: 0.92, ...N('concrete') }),
    render:     () => std({ map: T.render, roughness: 0.95, ...N('render', 0.7) }),
    darkstone:  () => std({ map: T.darkstone, roughness: 0.9, ...N('darkstone') }),
    plaster:    () => std({ map: T.plaster, color: '#e2dbd0', roughness: 0.93, envMapIntensity: 0.28, ...N('plaster', 0.6) }),
    ceiling:    () => std({ map: T.plaster, color: '#ebe6dd', roughness: 0.95, envMapIntensity: 0.22, ...N('plaster', 0.4) }),
    travertine: () => std({ map: T.travertine, roughness: 0.38, envMapIntensity: 0.35, ...N('travertine', 0.6) }),
    oak:        () => std({ map: T.oak, roughness: 0.5, envMapIntensity: 0.32, ...N('oak', 0.6) }),
    asphalt:    () => std({ map: T.asphalt, roughness: 0.97, ...N('asphalt') }),
    pavers:     () => std({ map: T.pavers, roughness: 0.9, ...N('pavers') }),
    curb:       () => std({ map: T.concrete, color: '#d8d4cc', roughness: 0.9, ...N('concrete', 0.6) }),
    grass:      () => std({ map: T.grass, roughness: 1 }),
    gravel:     () => std({ map: T.gravel, roughness: 1, envMapIntensity: 0.5, ...N('gravel') }),
    bronze:     () => std({ color: '#5a4632', metalness: 0.85, roughness: 0.38 }),
    brass:      () => std({ color: '#b8925a', metalness: 1, roughness: 0.28 }),
    blackmetal: () => std({ color: '#1c1c1c', metalness: 0.6, roughness: 0.45 }),
    neighbor:   () => std({ map: T.render, color: '#efe9e0', roughness: 0.95 }),
    ctxA:       () => std({ map: T.render, color: '#f1ece4', roughness: 0.95 }),
    ctxB:       () => std({ map: T.render, color: '#e8ddcd', roughness: 0.95 }),
    ctxC:       () => std({ map: T.render, color: '#ddd6cc', roughness: 0.95 }),
    ctxD:       () => std({ map: T.render, color: '#e2cdb8', roughness: 0.95 }),
    ctxLeaf:    () => std({ color: '#7d8a68', roughness: 0.9, envMapIntensity: 0.5 }),
    ctxLeaf2:   () => std({ color: '#66734f', roughness: 0.9, envMapIntensity: 0.5 }),
    ctxGlass:   () => std({ color: '#4a5257', metalness: 0.4, roughness: 0.18, envMapIntensity: 0.9 }),
    bark:       () => std({ map: T.concrete, color: '#8c7b68', roughness: 1, envMapIntensity: 0.4, ...N('concrete', 1.6) }),
    sage:       () => std({ color: '#8d9b86', roughness: 0.7, side: THREE.DoubleSide }),
    soil:       () => std({ map: T.gravel, color: '#4a3c30', roughness: 1, envMapIntensity: 0.3, ...N('gravel', 1.2) }),
    pebble:     () => std({ map: T.concrete, color: '#cfc8bb', roughness: 0.55, envMapIntensity: 0.5, ...N('concrete', 0.4) }),
    leaf:       () => std({ color: '#5f6e45', roughness: 0.85, flatShading: true }),
    leafDark:   () => std({ color: '#47553a', roughness: 0.9, flatShading: true }),
    pot:        () => std({ color: '#8a7f73', roughness: 0.8, envMapIntensity: 0.5, ...N('concrete', 0.5) }),
    terracotta: () => std({ color: '#a8694a', roughness: 0.85, envMapIntensity: 0.4, ...N('concrete', 0.6) }),
    linen:      () => std({ map: T.weave, color: '#ddd5c7', roughness: 1, envMapIntensity: 0.45, side: THREE.DoubleSide, ...N('weave', 0.7) }),
    lamp:       () => std({ color: '#fff3df', emissive: '#ffd9a0', emissiveIntensity: 2.2 }),
    opal:       () => std({ color: '#fff6e8', emissive: '#ffd49a', emissiveIntensity: 1.6, roughness: 0.4 }),
    oakBoard:   () => std({ map: T.oakBoard, roughness: 0.45, envMapIntensity: 0.38, ...N('oakBoard', 0.5) }),
    walnut:     () => std({ map: T.walnut, roughness: 0.42, envMapIntensity: 0.4, ...N('walnut', 0.5) }),
    marble:     () => std({ map: T.marble, roughness: 0.18, envMapIntensity: 0.55, ...N('marble', 0.3) }),
    terrazzo:   () => std({ map: T.terrazzo, roughness: 0.28, envMapIntensity: 0.45, ...N('terrazzo', 0.4) }),
    zellige:    () => std({ map: T.zellige, roughness: 0.12, envMapIntensity: 0.95, ...N('zellige', 1.2) }),
    chrome:     () => std({ color: '#d8d8d8', metalness: 1, roughness: 0.14 }),
    ceramic:    () => std({ color: '#efebe3', roughness: 0.3, envMapIntensity: 0.55 }),
    glaze:      () => std({ color: '#b7a58c', roughness: 0.22, envMapIntensity: 0.7 }),
    leather:    () => std({ color: '#6e4127', roughness: 0.5, envMapIntensity: 0.45, ...N('boucle', 0.15) }),
    leatherBk:  () => std({ color: '#1f1b18', roughness: 0.45, envMapIntensity: 0.5, ...N('boucle', 0.15) }),
    boucle:     () => std({ map: T.boucle, roughness: 1, envMapIntensity: 0.4, ...N('boucle', 1.2) }),
    rattan:     () => std({ map: T.rattan, roughness: 0.8, envMapIntensity: 0.4, ...N('rattan', 1) }),
    wool:       () => std({ map: T.wool, roughness: 1, envMapIntensity: 0.35, ...N('wool', 1) }),
    kraft:      () => std({ color: '#b08a5e', roughness: 0.9, envMapIntensity: 0.4, ...N('weave', 0.2) }),
    pastry:     () => std({ color: '#c47c37', roughness: 0.55, envMapIntensity: 0.5, ...N('boucle', 0.4) }),
    water:      () => std({ color: '#5f99a3', metalness: 0.1, roughness: 0.04, envMapIntensity: 1.2, transparent: true, opacity: 0.85 }),
    paintWhite: () => std({ color: '#e9e4da', roughness: 0.55, envMapIntensity: 0.4 }),
    signWC:     () => std({ map: signWC, transparent: true, alphaTest: 0.4, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
    citrus:     () => std({ color: '#e0a83a', roughness: 0.45 }),
    berry:      () => std({ color: '#7d1d2a', roughness: 0.3 }),
    stem:       () => std({ color: '#5d6b3d', roughness: 0.8 }),
    blossom:    () => std({ color: '#f2dccb', roughness: 0.7, side: THREE.DoubleSide }),
    beans:      () => std({ color: '#3b2416', roughness: 0.6, ...N('gravel', 1) }),
    menu:       () => std({ map: menuTex, roughness: 0.8, envMapIntensity: 0.2 }),
    signCafe:   () => std({ map: signCafe, transparent: true, alphaTest: 0.4, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
    signBooks:  () => std({ map: signBooks, transparent: true, alphaTest: 0.4, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
    signAtelier:() => std({ map: signAtelier, transparent: true, alphaTest: 0.4, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
    paintGreen: () => std({ color: '#1f2b25', roughness: 0.55, envMapIntensity: 0.5 }),
    blackGlass: () => std({ color: '#0d0e10', metalness: 0.2, roughness: 0.06, envMapIntensity: 1.2 }),
    brushed:    () => std({ color: '#b9bbbc', metalness: 1, roughness: 0.35 }),
    oilGlass:   () => std({ color: '#3d4a24', metalness: 0.2, roughness: 0.08, envMapIntensity: 1 }),
    carGreen:   () => paint('#6f8a74', 0.2, 0.4),
    carSilver:  () => paint('#d9d5cc', 0.2, 0.4),
    carNavy:    () => paint('#3c5570', 0.2, 0.4),
    carSand:    () => paint('#c9b597', 0.2, 0.4),
    carWhite:   () => paint('#ebe8e1', 0.2, 0.4),
    carBlack:   () => paint('#222428', 0.3, 0.35),
    carTrim:    () => std({ color: '#191a1b', roughness: 0.6, envMapIntensity: 0.4 }),
    carGlass:   () => std({ color: '#2a3238', metalness: 0.3, roughness: 0.12, envMapIntensity: 1.1 }),
    carRim:     () => std({ color: '#8d9091', metalness: 0.9, roughness: 0.32 }),
    rubber:     () => std({ color: '#151515', roughness: 0.9, envMapIntensity: 0.2 }),
    headlight:  () => std({ color: '#f4f1ea', emissive: '#fff4e0', emissiveIntensity: 0.25, roughness: 0.1 }),
    taillight:  () => std({ color: '#6e1414', emissive: '#7a1010', emissiveIntensity: 0.35, roughness: 0.2 }),
    mirror:     () => std({ color: '#ffffff', metalness: 1, roughness: 0.03, envMapIntensity: 1 }),
    cake0:      () => std({ color: '#c9874e', roughness: 0.7, ...N('boucle', 0.3) }),
    cake1:      () => std({ color: '#efe3cf', roughness: 0.5 }),
    cake2:      () => std({ color: '#5e2f20', roughness: 0.45 }),
    fab0: fab('#e7dfd1'), fab1: fab('#c6b293'), fab2: fab('#86654c'),
    fab3: fab('#3c3d37'), fab4: fab('#6b7156'), fab5: fab('#a4563b'),
    glass:      () => new THREE.MeshStandardMaterial({
      color: '#a9b8b8', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.14,
      depthWrite: false, envMapIntensity: 0.7,
    }),
  };
}
