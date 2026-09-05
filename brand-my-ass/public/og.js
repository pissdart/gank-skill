import { createBodyViewer } from './body.js';
import { SLOTS } from './config.js';
const v = await createBodyViewer({ container: document.getElementById('v'), slots: SLOTS });
v.camera.position.set(1.2, 0.5, 3.9);
