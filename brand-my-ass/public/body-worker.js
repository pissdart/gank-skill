// Sculpts the body off the main thread and hands the arrays back.
import { buildBodyArrays } from './body.js';

self.onmessage = (e) => {
  const out = buildBodyArrays(e.data.resolution);
  self.postMessage(out, [out.position.buffer, out.normal.buffer, out.index.buffer]);
};
