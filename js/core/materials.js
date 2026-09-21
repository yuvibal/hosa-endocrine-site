import * as THREE from "three";
import { mulberry32, fbm } from "./shapes.js";

export const PALETTE = {
  bone: 0xe9e1cc,
  cartilage: 0xd6dcdc,
  tooth: 0xf6f2e6,
  muscle: 0x912b26,
  muscleDeep: 0x7d211f,
  tendon: 0xdfd9c6,
  fascia: 0xe8e0c8,
  skin: 0xc79a74,
  nail: 0xe4c3ae,
  artery: 0xa8202a,
  vein: 0x3f5590,
  capillary: 0x8e3a4a,
  nerve: 0xf2e3a8,
  brain: 0xd8b3b0,
  cord: 0xf0dfd8,
  heart: 0xa32a22,
  lung: 0xd98f88,
  liver: 0x7d3327,
  stomach: 0xcf9c78,
  intestine: 0xd08a63,
  colon: 0xc98f6c,
  kidney: 0x9c3f38,
  adrenal: 0xd9b45c,
  spleen: 0x6f2b3a,
  pancreas: 0xdcae72,
  bladder: 0xe0d18c,
  thyroid: 0xbf4f4a,
  thymus: 0xe3b9a0,
  gall: 0x5f7a3a,
  eye: 0xf4f1ea,
  trachea: 0xcdd4d2,
  diaphragm: 0x9c4a3c,
  gonad: 0xc07f8e,
  pituitary: 0xd98fa8,
};

function canvas(size, draw) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  draw(c.getContext("2d"), size);
  return c;
}

function tex(c, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function normalFromHeight(c, strength = 2.2) {
  const size = c.width;
  const src = c.getContext("2d").getImageData(0, 0, size, size).data;
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const ctx = out.getContext("2d");
  const img = ctx.createImageData(size, size);
  const at = (x, y) => src[((((y + size) % size) * size + ((x + size) % size)) * 4)] / 255;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / len) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function grain(ctx, size, { base = 200, amp = 22, freq = 12, octaves = 4 }) {
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = fbm((x / size) * freq, (y / size) * freq, 0.5, octaves);
      const v = Math.max(0, Math.min(255, base + n * amp));
      const i = (y * size + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const boneCanvas = () =>
  canvas(256, (ctx, s) => {
    grain(ctx, s, { base: 224, amp: 16, freq: 9, octaves: 5 });
    const rnd = mulberry32(21);
    for (let i = 0; i < 2600; i += 1) {
      const r = rnd() * 1.5 + 0.2;
      ctx.fillStyle = `rgba(${150 + rnd() * 60 | 0},${150 + rnd() * 60 | 0},${145 + rnd() * 60 | 0},${0.16 + rnd() * 0.2})`;
      ctx.beginPath();
      ctx.arc(rnd() * s, rnd() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 90; i += 1) {
      ctx.strokeStyle = `rgba(190,185,168,${0.1 + rnd() * 0.16})`;
      ctx.lineWidth = 0.4 + rnd();
      ctx.beginPath();
      const x = rnd() * s;
      const y = rnd() * s;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rnd() * 50, y + rnd() * 30, x + rnd() * 70, y - rnd() * 40, x + rnd() * 110 - 30, y + rnd() * 90 - 40);
      ctx.stroke();
    }
  });

const muscleCanvas = () =>
  canvas(256, (ctx, s) => {
    grain(ctx, s, { base: 198, amp: 18, freq: 7, octaves: 4 });
    const rnd = mulberry32(37);
    for (let i = 0; i < 420; i += 1) {
      const y = rnd() * s;
      const dark = rnd() > 0.45;
      ctx.strokeStyle = dark
        ? `rgba(120,120,120,${0.16 + rnd() * 0.3})`
        : `rgba(245,240,235,${0.12 + rnd() * 0.25})`;
      ctx.lineWidth = 0.5 + rnd() * 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, y);
      for (let x = 0; x <= s + 4; x += 16) {
        ctx.lineTo(x, y + Math.sin((x / s) * 9 + i) * 1.5 + (rnd() - 0.5) * 1.1);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 26; i += 1) {
      ctx.strokeStyle = `rgba(252,248,238,${0.12 + rnd() * 0.16})`;
      ctx.lineWidth = 1.6 + rnd() * 2.6;
      const y = rnd() * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + (rnd() - 0.5) * 12);
      ctx.stroke();
    }
  });

const skinCanvas = () =>
  canvas(256, (ctx, s) => {
    grain(ctx, s, { base: 214, amp: 12, freq: 5, octaves: 5 });
    const rnd = mulberry32(53);
    for (let i = 0; i < 6000; i += 1) {
      ctx.fillStyle = `rgba(${170 + rnd() * 50 | 0},${170 + rnd() * 50 | 0},${170 + rnd() * 50 | 0},${0.06 + rnd() * 0.12})`;
      ctx.beginPath();
      ctx.arc(rnd() * s, rnd() * s, 0.35 + rnd() * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 240; i += 1) {
      ctx.strokeStyle = `rgba(160,158,152,${0.05 + rnd() * 0.1})`;
      ctx.lineWidth = 0.3 + rnd() * 0.5;
      const x = rnd() * s;
      const y = rnd() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 26, y + (rnd() - 0.5) * 26);
      ctx.stroke();
    }
  });

const organCanvas = () =>
  canvas(256, (ctx, s) => {
    grain(ctx, s, { base: 208, amp: 26, freq: 6, octaves: 5 });
    const rnd = mulberry32(67);
    for (let i = 0; i < 700; i += 1) {
      ctx.strokeStyle = `rgba(${120 + rnd() * 60 | 0},${120 + rnd() * 60 | 0},${120 + rnd() * 60 | 0},${0.08 + rnd() * 0.22})`;
      ctx.lineWidth = 0.4 + rnd() * 1.3;
      const x = rnd() * s;
      const y = rnd() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rnd() * 30, y + rnd() * 20, x + rnd() * 40, y - rnd() * 25, x + rnd() * 60 - 20, y + rnd() * 50 - 20);
      ctx.stroke();
    }
  });

let cache = null;

export function textures() {
  if (cache) return cache;
  const boneC = boneCanvas();
  const muscleC = muscleCanvas();
  const skinC = skinCanvas();
  const organC = organCanvas();
  cache = {
    bone: tex(boneC, [2, 2]),
    boneN: tex(normalFromHeight(boneC, 1.6), [2, 2]),
    muscle: tex(muscleC, [3, 1]),
    muscleN: tex(normalFromHeight(muscleC, 2.6), [3, 1]),
    skin: tex(skinC, [4, 4]),
    skinN: tex(normalFromHeight(skinC, 1.1), [4, 4]),
    organ: tex(organC, [2, 2]),
    organN: tex(normalFromHeight(organC, 1.8), [2, 2]),
  };
  return cache;
}

export function boneMaterial() {
  const t = textures();
  return new THREE.MeshPhysicalMaterial({
    color: PALETTE.bone,
    map: t.bone,
    normalMap: t.boneN,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: t.bone,
    roughness: 0.68,
    metalness: 0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.55,
    sheen: 0.25,
    sheenColor: new THREE.Color(0xfff6df),
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

export function muscleMaterial(deep = false) {
  const t = textures();
  return new THREE.MeshPhysicalMaterial({
    color: deep ? PALETTE.muscleDeep : PALETTE.muscle,
    map: t.muscle,
    normalMap: t.muscleN,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.52,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.42,
    sheen: 0.5,
    sheenColor: new THREE.Color(0xff9c8e),
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

export function skinMaterial() {
  const t = textures();
  return new THREE.MeshPhysicalMaterial({
    color: PALETTE.skin,
    map: t.skin,
    normalMap: t.skinN,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.66,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.6,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xffc9a8),
    sheenRoughness: 0.8,
    vertexColors: true,
  });
}

export function organMaterial(color, opts = {}) {
  const t = textures();
  return new THREE.MeshPhysicalMaterial({
    color,
    map: t.organ,
    normalMap: t.organN,
    normalScale: new THREE.Vector2(opts.bump ?? 0.5, opts.bump ?? 0.5),
    roughness: opts.roughness ?? 0.36,
    metalness: 0,
    clearcoat: opts.clearcoat ?? 0.6,
    clearcoatRoughness: 0.28,
    sheen: 0.35,
    sheenColor: new THREE.Color(0xffd8d0),
    transparent: (opts.opacity ?? 1) < 1,
    opacity: opts.opacity ?? 1,
    vertexColors: true,
    side: opts.side ?? THREE.FrontSide,
  });
}

export function vesselMaterial(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.2,
    sheen: 0.3,
    vertexColors: true,
  });
}
