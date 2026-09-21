import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { LAYERS, SYSTEMS, loadAnatomy, applyState, catalogForSystem, catalogAllParts } from "./anatomy.js";
import { describeHover } from "./hover-info.js";

const canvas = document.getElementById("scene");
const stage = canvas.parentElement;
const themeToggle = document.getElementById("themeToggle");
const restartBtn = document.getElementById("restartBtn");
const layerMount = document.getElementById("layerToggles");
const systemMount = document.getElementById("systemButtons");
const clearBtn = document.getElementById("clearHighlight");
const essentialToggle = document.getElementById("essentialToggle");
const hoverToggle = document.getElementById("hoverToggle");
const hoverCard = document.getElementById("hoverCard");
const hoverCardTitle = document.getElementById("hoverCardTitle");
const hoverCardBody = document.getElementById("hoverCardBody");
const partSearch = document.getElementById("partSearch");
const partList = document.getElementById("partList");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const loaderBar = document.getElementById("loaderBar");
const loaderSpin = document.getElementById("loaderSpin");

const DEFAULT_LAYERS = { skin: true, muscles: true, organs: true, bones: true, veins: true };
const DEFAULT_OPACITY = { skin: 0.16, muscles: 1, organs: 1, bones: 1, veins: 1 };
const layers = { ...DEFAULT_LAYERS };
const layerOpacity = { ...DEFAULT_OPACITY };
const layerControls = [];
let activeSystem = null;
let activePart = null;
let essentialOnly = false;
let hoverDetails = false;
let hoverId = null;
let soloLabel = null;
let partCatalog = [];
let partQuery = "";
let spinning = false;
let spinToken = 0;
let parts = [];

/* ------------------------------------------------------------------ theme */

if (localStorage.getItem("hosa-theme") === "dark") document.documentElement.dataset.theme = "dark";

const isDark = () => document.documentElement.dataset.theme === "dark";

themeToggle.addEventListener("click", () => {
  clearSolo();
  if (isDark()) {
    delete document.documentElement.dataset.theme;
    localStorage.setItem("hosa-theme", "light");
  } else {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("hosa-theme", "dark");
  }
  paintScene();
});

/* ------------------------------------------------------------------ scene */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.02, 60);
camera.position.set(0.18, 0.1, 3.95);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const wantShadows = window.innerWidth > 820;
renderer.shadowMap.enabled = wantShadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableZoom = false;
controls.enableRotate = true;
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.rotateSpeed = 0.85;
controls.target.set(0, -0.01, 0);

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
raycaster.firstHitOnly = true;
const zoomFocus = new THREE.Vector3();
const zoomOffset = new THREE.Vector3();
const viewDir = new THREE.Vector3();
const hitPlane = new THREE.Plane();
const homeTarget = new THREE.Vector3();
const homeOffset = new THREE.Vector3();
const desiredCam = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const sph = new THREE.Spherical();
let homeDistance = 3.2;
let homePolar = Math.PI / 2;
let minZoom = 0.35;
let maxZoom = 5.5;
let bodyHeight = 1.74;
let dragging = false;
const lastPointer = { x: 0, y: 0 };

const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x4a3b2e, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff4e6, 2.1);
key.position.set(1.8, 2.4, 2.6);
key.castShadow = wantShadows;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 8;
key.shadow.camera.left = -1.3;
key.shadow.camera.right = 1.3;
key.shadow.camera.top = 1.4;
key.shadow.camera.bottom = -1.4;
key.shadow.bias = -0.0009;
key.shadow.normalBias = 0.012;
scene.add(key);

const rim = new THREE.DirectionalLight(0xbfd8ff, 0.85);
rim.position.set(-2.2, 1.1, -2.0);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xffffff, 0.35);
fill.position.set(0.4, -1.2, 1.6);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(1.9, 64),
  new THREE.MeshStandardMaterial({ color: 0xd3dde2, roughness: 0.95, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.945;
ground.receiveShadow = true;
scene.add(ground);

function paintScene() {
  const dark = isDark();
  scene.background = new THREE.Color(dark ? 0x080d17 : 0xe9eff2);
  scene.fog = new THREE.Fog(dark ? 0x080d17 : 0xe9eff2, 4.2, 9);
  ground.material.color.set(dark ? 0x121a2a : 0xd3dde2);
  hemi.color.set(dark ? 0xaec4f5 : 0xeaf2ff);
  hemi.groundColor.set(dark ? 0x141c2c : 0x4a3b2e);
  hemi.intensity = dark ? 0.35 : 0.55;
  key.intensity = dark ? 1.5 : 2.1;
  rim.intensity = dark ? 1.1 : 0.85;
  scene.environmentIntensity = dark ? 0.3 : 0.55;
  renderer.toneMappingExposure = dark ? 0.95 : 1.05;
}

paintScene();

/* --------------------------------------------------------------- controls */

function refreshAnatomy() {
  applyState(parts, layers, activeSystem, layerOpacity, activePart, essentialOnly, soloLabel);
}

function clearSolo() {
  if (!soloLabel) return;
  soloLabel = null;
  hideHoverCard();
  renderPartList();
  refreshAnatomy();
}

function setSolo(item) {
  if (soloLabel === item.label) {
    clearSolo();
    return;
  }
  soloLabel = item.label;
  renderPartList();
  refreshAnatomy();
  showHoverCard(item.data);
}

function visibleCatalog() {
  const q = partQuery.trim().toLowerCase();
  if (!q) return partCatalog;
  return partCatalog.filter((item) => item.label.toLowerCase().includes(q));
}

function renderPartList() {
  const items = visibleCatalog();
  partList.replaceChildren();
  if (!partCatalog.length) {
    const empty = document.createElement("p");
    empty.className = "part-empty";
    empty.textContent = "Loading parts…";
    partList.appendChild(empty);
    return;
  }
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "part-empty";
    empty.textContent = "No matching parts";
    partList.appendChild(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "part-opt" + (item.label === soloLabel ? " active" : "");
    btn.textContent = item.label;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", String(item.label === soloLabel));
    btn.addEventListener("click", () => setSolo(item));
    frag.appendChild(btn);
  }
  partList.appendChild(frag);
}

partSearch.addEventListener("input", () => {
  partQuery = partSearch.value;
  renderPartList();
});
renderPartList();

document.querySelector(".app").addEventListener(
  "pointerdown",
  (e) => {
    if (!soloLabel) return;
    if (e.target.closest(".part-finder")) return;
    if (e.target.closest("#scene")) return;
    if (e.target.closest(".rotate-bar")) return;
    if (e.target.closest("#restartBtn")) return;
    clearSolo();
  },
  true,
);

LAYERS.forEach((layer) => {
  const block = document.createElement("div");
  block.className = "system-block layer-block open";
  block.dataset.layer = layer.id;

  const row = document.createElement("div");
  row.className = "system-btn switch-row";
  row.innerHTML = `<span>${layer.label}</span><button type="button" class="switch on" aria-pressed="true" aria-label="Toggle ${layer.label}"></button>`;
  const btn = row.querySelector("button");
  const toggle = () => {
    clearSolo();
    layers[layer.id] = !layers[layer.id];
    btn.classList.toggle("on", layers[layer.id]);
    btn.setAttribute("aria-pressed", String(layers[layer.id]));
    block.classList.toggle("open", layers[layer.id]);
    refreshAnatomy();
  };
  btn.addEventListener("click", toggle);
  row.addEventListener("click", (e) => {
    if (e.target !== btn && !e.target.closest("input")) toggle();
  });

  const drop = document.createElement("div");
  drop.className = "system-drop";
  drop.innerHTML = `<div class="system-drop-inner layer-drop-inner"><label for="opacity-${layer.id}">Opacity</label><input id="opacity-${layer.id}" type="range" min="0" max="100" value="${Math.round(layerOpacity[layer.id] * 100)}" /></div>`;
  const slider = drop.querySelector("input");
  slider.addEventListener("input", () => {
    layerOpacity[layer.id] = Number(slider.value) / 100;
    refreshAnatomy();
  });
  slider.addEventListener("click", (e) => e.stopPropagation());

  block.appendChild(row);
  block.appendChild(drop);
  layerMount.appendChild(block);
  layerControls.push({ id: layer.id, block, btn, slider });
});

SYSTEMS.forEach((system) => {
  const block = document.createElement("div");
  block.className = "system-block";
  block.dataset.system = system.id;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "system-btn";
  btn.textContent = system.label;
  btn.addEventListener("click", () => {
    clearSolo();
    activeSystem = activeSystem === system.id ? null : system.id;
    activePart = null;
    syncSystems();
    refreshAnatomy();
  });

  const drop = document.createElement("div");
  drop.className = "system-drop";
  const inner = document.createElement("div");
  inner.className = "system-drop-inner";
  catalogForSystem(system.id).forEach((item) => {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "system-opt";
    opt.textContent = item.label;
    opt.dataset.part = item.id;
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSolo();
      if (activeSystem !== system.id) {
        activeSystem = system.id;
        activePart = item.id;
      } else {
        activePart = activePart === item.id ? null : item.id;
      }
      syncSystems();
      refreshAnatomy();
    });
    inner.appendChild(opt);
  });
  drop.appendChild(inner);

  block.appendChild(btn);
  block.appendChild(drop);
  systemMount.appendChild(block);
});

clearBtn.addEventListener("click", () => {
  clearSolo();
  activeSystem = null;
  activePart = null;
  syncSystems();
  refreshAnatomy();
});

essentialToggle.addEventListener("click", () => {
  clearSolo();
  essentialOnly = !essentialOnly;
  essentialToggle.classList.toggle("on", essentialOnly);
  essentialToggle.setAttribute("aria-pressed", String(essentialOnly));
  refreshAnatomy();
});
document.querySelectorAll(".essential-row").forEach((row) => {
  row.addEventListener("click", (e) => {
    const btn = row.querySelector(".switch");
    if (btn && e.target !== btn) btn.click();
  });
});

hoverToggle.addEventListener("click", () => {
  clearSolo();
  hoverDetails = !hoverDetails;
  hoverToggle.classList.toggle("on", hoverDetails);
  hoverToggle.setAttribute("aria-pressed", String(hoverDetails));
  if (!hoverDetails) hideHoverCard();
});

function syncSystems() {
  [...systemMount.children].forEach((block) => {
    const on = block.dataset.system === activeSystem;
    block.classList.toggle("open", on);
    block.querySelector(".system-btn")?.classList.toggle("active", on);
    block.querySelectorAll(".system-opt").forEach((opt) => {
      opt.classList.toggle("active", on && opt.dataset.part === activePart);
    });
    if (on) block.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

/* --------------------------------------------------------------- rotation */

let body = null;

function spin(direction) {
  if (spinning || !body) return;
  spinning = true;
  const token = ++spinToken;
  const start = body.rotation.y;
  const end = start + direction * Math.PI * 2;
  const duration = 2200;
  const t0 = performance.now();
  const step = (now) => {
    if (token !== spinToken) {
      spinning = false;
      return;
    }
    const t = Math.min((now - t0) / duration, 1);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    body.rotation.y = start + (end - start) * eased;
    if (t < 1) requestAnimationFrame(step);
    else {
      body.rotation.y = end % (Math.PI * 2);
      spinning = false;
    }
  };
  requestAnimationFrame(step);
}

document.getElementById("rotateCW").addEventListener("click", () => spin(-1));
document.getElementById("rotateCCW").addEventListener("click", () => spin(1));
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") spin(-1);
  if (e.key === "ArrowLeft") spin(1);
});

/* ------------------------------------------------------------------ frame */

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.fov = w / h < 0.95 ? 42 : 30;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", resize);
resize();

const prevent = (e) => {
  if (e.target.closest?.(".panel")) return;
  e.preventDefault();
};
document.addEventListener("wheel", prevent, { passive: false });
document.addEventListener("touchmove", prevent, { passive: false });
document.addEventListener("gesturestart", prevent);

function lockUprightSpin() {
  controls.update();
  const polar = controls.getPolarAngle();
  controls.minPolarAngle = polar;
  controls.maxPolarAngle = polar;
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  homePolar = polar;
}

function rememberHome() {
  homeTarget.copy(controls.target);
  homeOffset.copy(camera.position).sub(controls.target);
  homeDistance = homeOffset.length();
  maxZoom = homeDistance;
  controls.maxDistance = homeDistance;
  desiredCam.copy(camera.position);
  desiredTarget.copy(controls.target);
}

function pointUnderCursor(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  if (body) {
    const hits = raycaster.intersectObject(body, true);
    if (hits.length) return hits[0].point;
  }

  camera.getWorldDirection(viewDir);
  hitPlane.setFromNormalAndCoplanarPoint(viewDir, controls.target);
  if (raycaster.ray.intersectPlane(hitPlane, zoomFocus)) return zoomFocus;
  return controls.target;
}

function settleAtHome() {
  desiredTarget.copy(homeTarget);
  sph.setFromVector3(desiredCam.clone().sub(homeTarget));
  sph.phi = homePolar;
  sph.radius = homeDistance;
  desiredCam.copy(homeTarget).add(zoomOffset.setFromSpherical(sph));
}

function applyZoomPose() {
  camera.position.copy(desiredCam);
  controls.target.copy(desiredTarget);
  controls.update();
}

function panLimitY(dist = camera.position.distanceTo(controls.target)) {
  const span = Math.max(homeDistance - minZoom, 0.001);
  const zoomIn = THREE.MathUtils.clamp((homeDistance - dist) / span, 0, 1);
  const near = bodyHeight * 0.2;
  const far = bodyHeight * 0.58;
  return THREE.MathUtils.lerp(near, far, zoomIn);
}

function clampTargetY(cam, target, dist) {
  const limit = panLimitY(dist);
  const next = THREE.MathUtils.clamp(target.y, -limit, limit);
  const applied = next - target.y;
  if (!applied) return;
  cam.y += applied;
  target.y += applied;
}

function zoomToward(event) {
  event.preventDefault();
  if (!body) return;

  desiredCam.copy(camera.position);
  desiredTarget.copy(controls.target);

  const goingOut = event.deltaY > 0;
  const step = Math.min(Math.abs(event.deltaY), 90);
  const factor = Math.exp((goingOut ? 1 : -1) * step * 0.00105);

  if (goingOut) {
    zoomFocus.copy(desiredTarget);
  } else {
    zoomFocus.copy(pointUnderCursor(event));
  }

  desiredCam.sub(zoomFocus).multiplyScalar(factor).add(zoomFocus);
  desiredTarget.sub(zoomFocus).multiplyScalar(factor).add(zoomFocus);

  zoomOffset.copy(desiredCam).sub(desiredTarget);
  let dist = zoomOffset.length();

  if (goingOut) {
    const pull = THREE.MathUtils.clamp((dist / Math.max(homeDistance, 0.001)) * 0.4, 0.18, 0.65);
    desiredTarget.lerp(homeTarget, pull);
    zoomOffset.copy(desiredCam).sub(desiredTarget);
    dist = zoomOffset.length();
    if (dist >= homeDistance * 0.96) {
      settleAtHome();
    } else if (dist > homeDistance) {
      zoomOffset.setLength(homeDistance);
      desiredCam.copy(desiredTarget).add(zoomOffset);
    }
  } else if (dist < minZoom) {
    zoomOffset.setLength(minZoom);
    desiredCam.copy(desiredTarget).add(zoomOffset);
    dist = minZoom;
  }

  clampTargetY(desiredCam, desiredTarget, dist);
  applyZoomPose();
}

canvas.addEventListener("wheel", zoomToward, { passive: false });

const SYSTEM_LABEL = Object.fromEntries(SYSTEMS.map((s) => [s.id, s.label]));

function cardOpen() {
  return hoverCard.classList.contains("is-visible");
}

function hideHoverCard() {
  hoverId = null;
  hoverCard.classList.remove("is-visible");
  hoverCard.setAttribute("aria-hidden", "true");
}

function showHoverCard(data) {
  const { title, body } = describeHover(data, SYSTEM_LABEL);
  hoverCardTitle.textContent = title;
  hoverCardBody.textContent = body;
  hoverCard.classList.add("is-visible");
  hoverCard.setAttribute("aria-hidden", "false");
}

function isShown(object) {
  let node = object;
  while (node) {
    if (node.visible === false) return false;
    node = node.parent;
  }
  return true;
}

function partDataFromHit(object) {
  let node = object;
  while (node && node !== body) {
    if (node.userData?.label) return node.userData;
    node = node.parent;
  }
  return null;
}

let hoverRaf = 0;
let lastHoverEvent = null;

function inspectHover(event) {
  lastHoverEvent = event;
  if (hoverRaf) return;
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = 0;
    runInspect(lastHoverEvent);
  });
}

function runInspect(event) {
  if (soloLabel) return;
  if (!hoverDetails || dragging || !body || !event) {
    if (cardOpen() && (!hoverDetails || dragging)) hideHoverCard();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(body, true);
  let data = null;
  for (const hit of hits) {
    if (!isShown(hit.object)) continue;
    const next = partDataFromHit(hit.object);
    if (next?.label && layers[next.layer]) {
      data = next;
      break;
    }
  }
  if (!data?.label) {
    hideHoverCard();
    return;
  }
  const id = `${data.layer}:${data.label}`;
  if (id === hoverId) return;
  hoverId = id;
  showHoverCard(data);
}

canvas.addEventListener("pointermove", inspectHover);
canvas.addEventListener("pointerleave", () => {
  if (soloLabel) return;
  hideHoverCard();
});

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  dragging = true;
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
});
window.addEventListener("pointerup", () => {
  dragging = false;
});
canvas.addEventListener("pointermove", (e) => {
  if (!dragging || !body) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
  if (Math.abs(dy) <= Math.abs(dx)) return;
  const dist = camera.position.distanceTo(controls.target);
  const move = -dy * dist * 0.00072;
  const limit = panLimitY(dist);
  const next = THREE.MathUtils.clamp(controls.target.y + move, -limit, limit);
  const applied = next - controls.target.y;
  if (!applied) return;
  camera.position.y += applied;
  controls.target.y += applied;
  desiredCam.y += applied;
  desiredTarget.y += applied;
});

function restartView() {
  spinToken += 1;
  spinning = false;
  activeSystem = null;
  activePart = null;
  essentialOnly = false;
  soloLabel = null;
  partQuery = "";
  partSearch.value = "";
  Object.assign(layers, DEFAULT_LAYERS);
  Object.assign(layerOpacity, DEFAULT_OPACITY);

  layerControls.forEach(({ id, block, btn, slider }) => {
    btn.classList.add("on");
    btn.setAttribute("aria-pressed", "true");
    block.classList.add("open");
    slider.value = String(Math.round(layerOpacity[id] * 100));
  });
  essentialToggle.classList.remove("on");
  essentialToggle.setAttribute("aria-pressed", "false");
  hoverDetails = false;
  hoverToggle.classList.remove("on");
  hoverToggle.setAttribute("aria-pressed", "false");
  hideHoverCard();
  renderPartList();
  syncSystems();

  if (body) body.rotation.y = 0;
  camera.position.copy(homeTarget).add(homeOffset);
  controls.target.copy(homeTarget);
  desiredCam.copy(camera.position);
  desiredTarget.copy(homeTarget);
  lockUprightSpin();
  refreshAnatomy();
}

restartBtn.addEventListener("click", restartView);

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ build */

let realProgress = 0;
let shownProgress = 0;
let circleComplete = false;
let loadReady = false;
let loaderGone = false;
const loaderStarted = performance.now();

function completeLoaderCircle() {
  if (circleComplete) return;
  circleComplete = true;
  loaderSpin?.classList.add("complete");
}

function paintLoader(value) {
  shownProgress = value;
  if (loaderBar) loaderBar.style.width = `${Math.round(value * 100)}%`;
  if (value >= 1) completeLoaderCircle();
}

function finishLoader() {
  loadReady = true;
  const close = () => {
    if (loaderGone) return;
    loaderGone = true;
    loader.classList.add("done");
    setTimeout(() => loader.remove(), 600);
  };
  if (circleComplete && shownProgress >= 1) close();
  else {
    paintLoader(1);
    setTimeout(close, 280);
  }
}

function onProgress(fraction, message) {
  realProgress = Math.max(realProgress, Math.min(fraction, 0.9));
  if (loaderText && !circleComplete) loaderText.textContent = message;
}

function tickLoader(now) {
  if (loaderGone) return;
  const elapsed = now - loaderStarted;
  const idleCreep = Math.min(0.97, elapsed / 8500);
  const chase = Math.max(realProgress, idleCreep, shownProgress + 0.0012);
  const next = Math.min(1, shownProgress + Math.max(0.0018, (chase - shownProgress) * 0.07));
  paintLoader(next);
  if (next >= 1 && !loadReady && loaderText) {
    loaderText.textContent = "Finishing anatomy…";
  }
  if (loadReady && next >= 1) finishLoader();
  else requestAnimationFrame(tickLoader);
}
requestAnimationFrame(tickLoader);

loadAnatomy({ onProgress })
  .then((built) => {
    body = built.group;
    parts = built.parts;
    scene.add(body);
    refreshAnatomy();

    const h = built.stats.height || 1.74;
    bodyHeight = h;
    camera.position.set(0.2, 0.08, Math.max(2.6, h * 1.85));
    controls.target.set(0, 0, 0);
    minZoom = h * 0.12;
    controls.minDistance = minZoom;
    ground.position.y = -h / 2 - 0.01;
    lockUprightSpin();
    rememberHome();

    partCatalog = catalogAllParts(parts);
    renderPartList();
    console.info(`Z-Anatomy loaded in ${built.stats.ms} ms`, built.stats);
    finishLoader();
    tick();
  })
  .catch((err) => {
    console.error(err);
    if (loaderText) loaderText.textContent = "Could not load the anatomy model.";
  });
