// Texture worker: generates a share of the procedural textures (colour + normal map) off the main
// thread and hands the pixel buffers back without copying.
import { recipes, NORMALS, genData, normalData } from './texgen.js';

self.onmessage = ({ data: { names } }) => {
  const R = recipes();
  for (const name of names) {
    const [size, fn, tile] = R[name];
    const color = genData(size, fn);
    const normal = NORMALS[name] ? normalData(color, size, NORMALS[name]) : null;
    self.postMessage({ name, size, tile, color, normal }, normal ? [color.buffer, normal.buffer] : [color.buffer]);
  }
  self.postMessage({ done: true });
};
