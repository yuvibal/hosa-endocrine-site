import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SOURCES, classify, GLB_PARTS, RULES } from "../tools/classify.js";
import { prettyLabel } from "./hover-info.js";

export const LAYERS = [
  { id: "skin", label: "Skin" },
  { id: "muscles", label: "Muscles" },
  { id: "organs", label: "Organs" },
  { id: "bones", label: "Bones" },
  { id: "veins", label: "Veins" },
];

export const SYSTEMS = [
  { id: "skeletal", label: "Skeletal" },
  { id: "muscular", label: "Muscular" },
  { id: "nervous", label: "Nervous" },
  { id: "endocrine", label: "Endocrine" },
  { id: "cardiovascular", label: "Cardiovascular" },
  { id: "respiratory", label: "Respiratory" },
  { id: "digestive", label: "Digestive" },
  { id: "urinary", label: "Urinary" },
  { id: "lymphatic", label: "Lymphatic" },
  { id: "integumentary", label: "Integumentary" },
];

const CM_TO_M = 0.01;

function slim(geometry) {
  const g = geometry;
  for (const attr of Object.keys(g.attributes)) {
    if (attr !== "position" && attr !== "normal") g.deleteAttribute(attr);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  g.morphAttributes = {};
  return g;
}

function makeMaterial(def) {
  const opacity = def.opacity ?? 1;
  const sheet = opacity < 1;
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(def.color),
    roughness: def.layer === "skin" ? 0.72 : def.layer === "bones" ? 0.62 : 0.48,
    metalness: 0,
    transparent: sheet,
    opacity,
    side: sheet ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: !sheet,
  });
}

function loadGltf(url, draco) {
  return new GLTFLoader().setDRACOLoader(draco).loadAsync(url);
}

function loadFbx(url, onProgress) {
  return new Promise((resolve, reject) => {
    new FBXLoader().load(url, resolve, onProgress, reject);
  });
}

function register(group, parts, mesh, def, count) {
  mesh.name = def.label;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    id: def.id,
    label: def.label,
    layer: def.layer,
    systems: def.systems,
    baseColor: new THREE.Color(def.color),
    baseOpacity: def.opacity ?? 1,
    structures: count,
  };
  group.add(mesh);
  parts.push(mesh);
}

function mergeBucket(geos) {
  const clean = geos.map(slim);
  const merged = mergeGeometries(clean, false);
  clean.forEach((g) => {
    if (g !== merged) g.dispose();
  });
  return merged;
}

export async function loadAnatomy({ onProgress = () => {} } = {}) {
  const t0 = performance.now();
  const group = new THREE.Group();
  const parts = [];
  const counts = { bones: 0, muscles: 0, organs: 0, veins: 0, skin: 0, structures: 0 };

  const draco = new DRACOLoader().setDecoderPath("assets/draco/");

  onProgress(0.04, "Loading skeleton and muscles");
  const glb = await loadGltf("assets/body.glb", draco);
  glb.scene.updateMatrixWorld(true);

  const glbMats = {
    bone: makeMaterial(GLB_PARTS.bone),
    muscle: makeMaterial(GLB_PARTS.muscle),
  };
  glb.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const type = o.userData?.type;
    const def = GLB_PARTS[type];
    if (!def) return;
    const g = slim(o.geometry.clone());
    g.applyMatrix4(o.matrixWorld);
    const mesh = new THREE.Mesh(g, glbMats[type]);
    register(group, parts, mesh, { ...def, label: prettyLabel(o.name || def.label) }, 1);
    counts.structures += 1;
    counts[def.layer] += 1;
  });
  draco.dispose();

  const fbxEntries = Object.entries(SOURCES);
  for (let i = 0; i < fbxEntries.length; i += 1) {
    const [source, file] = fbxEntries[i];
    const start = 0.18 + (i / fbxEntries.length) * 0.72;
    onProgress(start, `Loading ${file.replace(/100\.fbx|\.fbx/g, "").replace(/([A-Z])/g, " $1").trim()}`);

    let root;
    try {
      root = await loadFbx("assets/fbx/" + encodeURIComponent(file), (ev) => {
        if (!ev.total) return;
        onProgress(start + (ev.loaded / ev.total) * (0.72 / fbxEntries.length) * 0.7, `Loading ${file}`);
      });
    } catch (err) {
      console.warn("Skipped", file, err);
      continue;
    }

    root.updateMatrixWorld(true);
    const buckets = new Map();
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position) return;
      const rule = classify(source, o.name);
      if (!rule) return;
      const g = slim(o.geometry.clone());
      g.applyMatrix4(o.matrixWorld);
      g.scale(CM_TO_M, CM_TO_M, CM_TO_M);
      if (!buckets.has(rule.id)) buckets.set(rule.id, { rule, geos: [] });
      buckets.get(rule.id).geos.push(g);
    });
    root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });

    for (const { rule, geos } of buckets.values()) {
      const merged = mergeBucket(geos);
      if (!merged) continue;
      register(group, parts, new THREE.Mesh(merged, makeMaterial(rule)), rule, geos.length);
      counts.structures += geos.length;
      if (rule.layer in counts) counts[rule.layer] += geos.length;
    }
    onProgress(start + 0.72 / fbxEntries.length, `Packed ${file}`);
  }

  const box = new THREE.Box3().setFromObject(group);
  const centre = box.getCenter(new THREE.Vector3());
  const height = box.max.y - box.min.y;
  group.position.set(-centre.x, -centre.y, -centre.z);

  onProgress(1, "Ready");
  return {
    group,
    parts,
    stats: {
      ...counts,
      height,
      ms: Math.round(performance.now() - t0),
    },
  };
}

export function catalogAllParts(parts) {
  const seen = new Set();
  const items = [];
  for (const mesh of parts) {
    const label = prettyLabel(mesh.userData.label);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    items.push({
      label,
      layer: mesh.userData.layer,
      id: mesh.userData.id,
      systems: mesh.userData.systems,
      data: {
        id: mesh.userData.id,
        label,
        layer: mesh.userData.layer,
        systems: mesh.userData.systems,
      },
    });
  }
  items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return items;
}

export function catalogForSystem(systemId) {
  const items = [];
  const seen = new Set();
  const pool = [...Object.values(GLB_PARTS), ...Object.values(RULES).flat()];
  for (const rule of pool) {
    if (!rule?.id || rule.drop || !rule.systems?.includes(systemId) || seen.has(rule.id)) continue;
    seen.add(rule.id);
    items.push({ id: rule.id, label: rule.label });
  }
  return items;
}

export const ACCESSORY_IDS = new Set([
  "hair",
  "nails",
  "pleura",
  "peritoneum",
  "meninges",
  "lymph-nodes",
  "lymph-vessels",
]);

export function applyState(parts, layers, systemId, layerOpacity = {}, partId = null, essentialOnly = false, soloLabel = null) {
  parts.forEach((mesh) => {
    const { layer, systems, baseColor, baseOpacity, id, label } = mesh.userData;
    if (soloLabel) {
      mesh.visible = prettyLabel(label) === soloLabel;
      if (!mesh.visible) return;
      const mat = mesh.material;
      const amount = layerOpacity[layer] ?? 1;
      const opacity = layer === "skin" ? Math.max(amount, 0.55) : baseOpacity * amount;
      mat.color.copy(baseColor);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
      mat.opacity = opacity;
      mat.transparent = opacity < 1;
      mat.depthWrite = opacity > 0.85;
      mat.side = opacity < 1 ? THREE.DoubleSide : THREE.FrontSide;
      mat.needsUpdate = true;
      return;
    }
    const highlighted = (!systemId || systems.includes(systemId)) && (!partId || id === partId);
    const necessary = essentialOnly
      ? systemId || partId
        ? highlighted
        : !ACCESSORY_IDS.has(id)
      : highlighted;
    const hideExtras = essentialOnly && !!(systemId || partId) && !necessary;
    mesh.visible = !!layers[layer] && !hideExtras;
    if (!mesh.visible) return;

    const mat = mesh.material;
    const amount = layerOpacity[layer] ?? 1;

    let opacity = layer === "skin" ? amount : baseOpacity * amount;
    if (essentialOnly && !necessary) opacity = Math.min(opacity, 0.1);
    else if (!essentialOnly && !highlighted) opacity = Math.min(opacity, layer === "skin" ? 0.04 : 0.08);

    if (highlighted) {
      mat.color.copy(baseColor);
      mat.emissive.setHex(systemId ? baseColor.getHex() : 0x000000);
      mat.emissiveIntensity = systemId ? 0.22 : 0;
    } else if (essentialOnly) {
      mat.color.copy(baseColor);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    } else {
      const grey = baseColor.getHSL({ h: 0, s: 0, l: 0 }).l * 0.55 + 0.2;
      mat.color.setRGB(grey, grey, grey);
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }

    mat.opacity = opacity;
    mat.transparent = opacity < 1;
    mat.depthWrite = opacity > 0.85;
    mat.side = opacity < 1 ? THREE.DoubleSide : THREE.FrontSide;
    mat.needsUpdate = true;
  });
}
