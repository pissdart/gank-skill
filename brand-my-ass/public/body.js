// The body. Sculpted from a signed distance field, polygonised with marching
// cubes, lit like a white studio. Exposes slots as stencils on the skin,
// numbered markers in the DOM, and sponsor tattoos as decals.

import * as THREE from './vendor/three/three.module.min.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { MarchingCubes } from './vendor/three/MarchingCubes.js';
import { DecalGeometry } from './vendor/three/DecalGeometry.js';
import * as BufferGeometryUtils from './vendor/three/BufferGeometryUtils.js';

/* ---------------------------------------------------------------- sdf --- */

const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a, b, k) => -smin(-a, -b, k);

const ellipsoid = (x, y, z, cx, cy, cz, rx, ry, rz) => {
  const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
  const k0 = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const k1 = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) + (dz * dz) / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
};

const capsule = (x, y, z, ax, ay, az, bx, by, bz, r) => {
  const pax = x - ax, pay = y - ay, paz = z - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(Math.max((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0), 1);
  const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
};

// Body space: x left/right, y up, z towards the viewer. The viewer looks at
// the back, so the back is +z. Units: the marching-cubes cube is [-1, 1]^3.
function bodySDF(x, y, z) {
  // torso, stacked ellipsoids from shoulders to pelvis
  let d = ellipsoid(x, y, z, 0, 0.62, -0.01, 0.5, 0.17, 0.2);
  d = smin(d, ellipsoid(x, y, z, 0, 0.44, 0, 0.43, 0.3, 0.2), 0.1);
  d = smin(d, ellipsoid(x, y, z, 0, 0.2, 0, 0.37, 0.3, 0.18), 0.1);
  d = smin(d, ellipsoid(x, y, z, 0, -0.02, 0, 0.3, 0.22, 0.16), 0.1);
  d = smin(d, ellipsoid(x, y, z, 0, -0.2, 0, 0.42, 0.2, 0.19), 0.09);
  // scapulae, a little relief under the skin
  d = smin(d, ellipsoid(x, y, z, -0.2, 0.36, 0.13, 0.14, 0.16, 0.08), 0.09);
  d = smin(d, ellipsoid(x, y, z, 0.2, 0.36, 0.13, 0.14, 0.16, 0.08), 0.09);
  // glutes
  d = smin(d, ellipsoid(x, y, z, -0.195, -0.38, 0.11, 0.25, 0.235, 0.245), 0.065);
  d = smin(d, ellipsoid(x, y, z, 0.195, -0.38, 0.11, 0.25, 0.235, 0.245), 0.065);
  // thighs, cut at the bottom of the cube
  d = smin(d, capsule(x, y, z, -0.19, -0.42, 0.02, -0.2, -1.3, -0.03, 0.17), 0.07);
  d = smin(d, capsule(x, y, z, 0.19, -0.42, 0.02, 0.2, -1.3, -0.03, 0.17), 0.07);
  // neck and deltoid stubs, cut like a torso fragment
  d = smin(d, capsule(x, y, z, 0, 0.55, -0.03, 0, 1.3, -0.03, 0.105), 0.08);
  d = smin(d, ellipsoid(x, y, z, -0.5, 0.58, -0.02, 0.115, 0.14, 0.125), 0.09);
  d = smin(d, ellipsoid(x, y, z, 0.5, 0.58, -0.02, 0.115, 0.14, 0.125), 0.09);
  // spine furrow, gluteal cleft, dimples of Venus
  d = smax(d, -capsule(x, y, z, 0, 0.7, 0.215, 0, -0.12, 0.2, 0.028), 0.07);
  d = smax(d, -capsule(x, y, z, 0, -0.2, 0.26, 0, -0.64, 0.24, 0.036), 0.05);
  d = smax(d, -ellipsoid(x, y, z, -0.085, -0.13, 0.205, 0.035, 0.03, 0.03), 0.045);
  d = smax(d, -ellipsoid(x, y, z, 0.085, -0.13, 0.205, 0.035, 0.03, 0.03), 0.045);
  // clip: flat cuts at mid-thigh and above the shoulders
  d = Math.max(d, -0.88 - y);
  d = Math.max(d, y - 0.9);
  return d;
}

// Runs inside a Worker (see body-worker.js) so the page never freezes.
export function buildBodyArrays(resolution) {
  const mc = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, false, 400000);
  mc.isolation = 80;
  const { size, size2, halfsize, field } = mc;
  const K = 100;
  for (let z = 0; z < size; z++) {
    const fz = (z - halfsize) / halfsize;
    for (let y = 0; y < size; y++) {
      const fy = (y - halfsize) / halfsize;
      const row = z * size2 + y * size;
      for (let x = 0; x < size; x++) {
        const fx = (x - halfsize) / halfsize;
        field[row + x] = 80 - K * bodySDF(fx, fy, fz);
      }
    }
  }
  mc.update();
  const n = mc.count * 3;
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mc.positionArray.slice(0, n), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mc.normalArray.slice(0, n), 3));
  geometry = BufferGeometryUtils.mergeVertices(geometry, 1e-4);
  return {
    position: geometry.attributes.position.array,
    normal: geometry.attributes.normal.array,
    index: geometry.index.array,
  };
}

function buildBodyGeometry(resolution) {
  return new Promise((resolve, reject) => {
    const finish = ({ position, normal, index }) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      resolve(geometry);
    };
    let worker;
    try {
      worker = new Worker(new URL('./body-worker.js', import.meta.url), { type: 'module' });
    } catch {
      return finish(buildBodyArrays(resolution));
    }
    worker.onmessage = (e) => { worker.terminate(); finish(e.data); };
    worker.onerror = () => { worker.terminate(); try { finish(buildBodyArrays(resolution)); } catch (err) { reject(err); } };
    worker.postMessage({ resolution });
  });
}

/* ------------------------------------------------------------ textures --- */

function stencilTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 512);
  g.strokeStyle = '#151515';
  g.lineWidth = 10;
  g.setLineDash([26, 18]);
  g.lineCap = 'round';
  g.beginPath();
  g.roundRect(24, 24, 464, 464, 70);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const INK = '#17151a';

function inkify(g, w, h) {
  // Turn whatever got drawn into single-colour ink: darkness becomes opacity.
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const ink = [0x17, 0x15, 0x1a];
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const a = (d[i + 3] / 255) * Math.pow(Math.max(0, 1 - lum * 1.15), 1.6);
    d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2];
    d[i + 3] = Math.round(a * 235);
  }
  g.putImageData(img, 0, 0);
}

function fitText(g, text, maxW, maxH, family, weight = 700) {
  let size = maxH;
  for (; size > 8; size -= 2) {
    g.font = `${weight} ${size}px ${family}`;
    if (g.measureText(text).width <= maxW) break;
  }
  return size;
}

async function tattooTexture({ company, domain, custom, aspect, vertical }) {
  const W = 1024, H = Math.round(1024 / aspect);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);

  let logo = null;
  if (domain) {
    logo = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im.naturalWidth >= 64 ? im : null); // tiny favicons ink badly; text only
      im.onerror = () => res(null);
      im.src = `/api/logo?domain=${encodeURIComponent(domain)}`;
    });
  }
  try { await document.fonts.load('700 80px "Pirata One"'); } catch {}
  const family = '"Pirata One", "Manrope", serif';
  g.fillStyle = '#000';
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  if (vertical) {
    // one line running down the spine
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(Math.PI / 2);
    const text = (custom || company || '').toUpperCase();
    const size = fitText(g, text, H * 0.9, W * 0.62, family);
    g.font = `700 ${size}px ${family}`;
    g.fillText(text, 0, 0);
    g.restore();
  } else if (logo) {
    const pad = H * 0.12;
    const logoH = H * 0.52;
    const s = Math.min(logoH / logo.height, (W * 0.5) / logo.width);
    const lw = logo.width * s, lh = logo.height * s;
    g.imageSmoothingQuality = 'high';
    g.drawImage(logo, (W - lw) / 2, pad, lw, lh);
    const text = (custom || company).toUpperCase();
    const size = fitText(g, text, W * 0.86, H * 0.24, family);
    g.font = `700 ${size}px ${family}`;
    g.fillText(text, W / 2, pad + lh + (H - pad - lh) / 2);
  } else {
    const text = (custom || company).toUpperCase();
    const size = fitText(g, text, W * 0.86, H * 0.6, family);
    g.font = `700 ${size}px ${family}`;
    g.fillText(text, W / 2, H / 2);
  }
  inkify(g, W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* -------------------------------------------------------------- viewer --- */

export async function createBodyViewer({ container, slots, onSelect, onHover, resolution = 104 }) {
  container.classList.add('is-loading');
  const canvas = document.createElement('canvas');
  canvas.className = 'body-canvas';
  container.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const HOME = new THREE.Vector3(0.75, 0.45, 4.15);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI * 0.32;
  controls.maxPolarAngle = Math.PI * 0.62;
  // back side only: the model never turns far enough to show the front
  controls.minAzimuthAngle = -Math.PI * 0.36;
  controls.maxAzimuthAngle = Math.PI * 0.36;
  controls.rotateSpeed = 0.6;

  // white studio
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d3cc, 1.35));
  const key = new THREE.DirectionalLight(0xfff4ea, 2.3);
  key.position.set(2.2, 3.2, 3.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  const sc = key.shadow.camera;
  sc.near = 1; sc.far = 12; sc.left = -2; sc.right = 2; sc.top = 2.5; sc.bottom = -2;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.75);
  fill.position.set(-3, 1, 2.5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-1, 2.5, -3);
  scene.add(rim);

  const skin = new THREE.MeshPhysicalMaterial({
    color: 0xf0e8df,
    roughness: 0.58,
    metalness: 0,
    sheen: 0.5,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(0xffe7d6),
    specularIntensity: 0.35,
  });

  const body = new THREE.Mesh(await buildBodyGeometry(resolution), skin);
  container.classList.remove('is-loading');
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.14 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.88;
  floor.receiveShadow = true;
  scene.add(floor);

  // place each slot on the skin
  const raycaster = new THREE.Raycaster();
  const stencilMap = stencilTexture();
  const placed = new Map();
  const markers = document.createElement('div');
  markers.className = 'body-markers';
  container.append(markers);

  for (const slot of slots) {
    const dir = new THREE.Vector3(...slot.dir).normalize();
    const anchor = new THREE.Vector3(...slot.anchor);
    raycaster.set(anchor.clone().add(dir.clone().multiplyScalar(1.5)), dir.clone().negate());
    const hit = raycaster.intersectObject(body, false)[0];
    if (!hit) { console.warn('slot did not land on the body', slot.id); continue; }
    const point = hit.point.clone();
    const normal = hit.face.normal.clone().normalize();
    const helper = new THREE.Object3D();
    helper.position.copy(point);
    helper.lookAt(point.clone().add(normal));
    // keep "up" along the body's up so text reads upright
    const orientation = helper.rotation.clone();
    const [w, h] = slot.decal;
    const size = new THREE.Vector3(w, h, 0.22);

    const stencil = new THREE.Mesh(
      new DecalGeometry(body, point, orientation, size),
      new THREE.MeshBasicMaterial({
        map: stencilMap, transparent: true, opacity: 0.32, depthTest: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, toneMapped: false,
      }),
    );
    stencil.renderOrder = 1;
    scene.add(stencil);

    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'body-marker';
    marker.dataset.slot = String(slot.id);
    marker.setAttribute('aria-label', `${slot.name}: place bid`);
    marker.innerHTML = `<b>${String(slot.id).padStart(2, '0')}</b><span></span>`;
    marker.addEventListener('click', () => onSelect?.(slot.id));
    marker.addEventListener('pointerenter', () => onHover?.(slot.id, true));
    marker.addEventListener('pointerleave', () => onHover?.(slot.id, false));
    markers.append(marker);

    placed.set(slot.id, { slot, point, normal, orientation, size, stencil, marker, tattoo: null, state: null });
  }

  /* -- sizing -- */
  let width = 1, height = 1;
  function resize() {
    const r = container.getBoundingClientRect();
    width = Math.max(1, Math.round(r.width));
    height = Math.max(1, Math.round(r.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // keep the whole body in frame on narrow screens
    const base = 26;
    camera.fov = camera.aspect < 1 ? Math.min(46, base / camera.aspect) : base;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  /* -- idle motion -- */
  let lastInteraction = -1e9;
  let userDriven = false;
  controls.addEventListener('start', () => { userDriven = true; lastInteraction = performance.now(); });
  controls.addEventListener('end', () => { lastInteraction = performance.now(); });
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  let running = true;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    const idle = performance.now() - lastInteraction > 4000;
    if (idle) {
      // slow sway around the target; ease back in after the user lets go
      const target = HOME.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(t * 0.22) * 0.55);
      if (userDriven) {
        camera.position.lerp(target, 0.03);
        if (camera.position.distanceTo(target) < 0.01) userDriven = false;
      } else {
        camera.position.copy(target);
      }
    }
    controls.update();
    renderer.render(scene, camera);
    // project markers
    camera.getWorldDirection(camDir);
    for (const p of placed.values()) {
      tmp.copy(p.point).project(camera);
      const facing = p.normal.dot(camDir) < -0.12 && tmp.z < 1;
      const x = (tmp.x * 0.5 + 0.5) * width;
      const y = (-tmp.y * 0.5 + 0.5) * height;
      p.marker.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      p.marker.classList.toggle('is-hidden', !facing);
    }
  }
  frame();

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) frame();
  });

  /* -- api -- */
  const api = {
    scene, camera, renderer, body,

    setSlotState(id, state) {
      const p = placed.get(Number(id));
      if (!p) return;
      const next = state ? `${state.company}|${state.domain}|${state.custom || ''}` : '';
      const prev = p.state ? `${p.state.company}|${p.state.domain}|${p.state.custom || ''}` : '';
      p.marker.querySelector('span').textContent = state?.priceLabel || '';
      p.marker.classList.toggle('is-held', !!state);
      if (next === prev) return;
      p.state = state;
      if (p.tattoo) { scene.remove(p.tattoo); p.tattoo.material.map?.dispose(); p.tattoo.geometry.dispose(); p.tattoo = null; }
      if (!state) return;
      const token = (p.token = Symbol());
      tattooTexture({
        company: state.company, domain: state.domain, custom: state.custom,
        aspect: p.size.x / p.size.y, vertical: !!p.slot.customField && p.size.y > p.size.x,
      }).then((map) => {
        if (p.token !== token) { map.dispose(); return; }
        const mesh = new THREE.Mesh(
          new DecalGeometry(body, p.point, p.orientation, p.size),
          new THREE.MeshStandardMaterial({
            map, transparent: true, depthTest: true, depthWrite: false, roughness: 0.9, metalness: 0,
            polygonOffset: true, polygonOffsetFactor: -4,
          }),
        );
        mesh.renderOrder = 2;
        scene.add(mesh);
        p.tattoo = mesh;
        p.stencil.material.opacity = 0.12;
      });
    },

    highlight(id, on) {
      for (const p of placed.values()) {
        const active = on && p.slot.id === Number(id);
        p.marker.classList.toggle('is-active', active);
        p.stencil.material.opacity = active ? 0.85 : p.tattoo ? 0.12 : 0.32;
      }
    },

    // Render a close-up of a slot and return it as a data URL.
    thumbnail(id, w = 340, h = 232) {
      const p = placed.get(Number(id));
      if (!p) return '';
      const cam = new THREE.PerspectiveCamera(22, w / h, 0.05, 50);
      const up = new THREE.Vector3(0, 1, 0);
      const reach = Math.max(p.size.x, p.size.y) * 2.6 + 0.55;
      const back = p.normal.clone().multiplyScalar(reach).add(up.clone().multiplyScalar(reach * 0.18));
      cam.position.copy(p.point).add(back);
      cam.lookAt(p.point);
      const wasOn = p.stencil.material.opacity;
      p.stencil.material.opacity = 0.9;
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(2);
      renderer.render(scene, cam);
      const url = renderer.domElement.toDataURL('image/png');
      p.stencil.material.opacity = wasOn;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      return url;
    },

    focus(id) {
      const p = placed.get(Number(id));
      if (!p) return;
      const az = Math.atan2(p.normal.x, p.normal.z);
      const clamped = Math.max(controls.minAzimuthAngle, Math.min(controls.maxAzimuthAngle, az));
      const target = HOME.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), clamped);
      userDriven = true;
      lastInteraction = performance.now() + 1500;
      const start = camera.position.clone();
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 700);
        const e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(start, target, e);
        if (k < 1) requestAnimationFrame(step);
      };
      step();
    },
  };
  return api;
}
