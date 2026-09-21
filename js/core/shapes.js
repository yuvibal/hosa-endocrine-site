import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const v3 = (p) => (p && p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]));
export const toV3 = (pts) => pts.map(v3);
export const mir = (p) => [-p[0], p[1], p[2]];
export const mirPath = (pts) => pts.map(mir);
export const lerpP = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const addP = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(i, j, k) {
  let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;

export function noise3(x, y, z) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  const fx = fade(x - i);
  const fy = fade(y - j);
  const fz = fade(z - k);
  const c = (a, b, d) => hash3(i + a, j + b, k + d);
  const x00 = mix(c(0, 0, 0), c(1, 0, 0), fx);
  const x10 = mix(c(0, 1, 0), c(1, 1, 0), fx);
  const x01 = mix(c(0, 0, 1), c(1, 0, 1), fx);
  const x11 = mix(c(0, 1, 1), c(1, 1, 1), fx);
  return mix(mix(x00, x10, fy), mix(x01, x11, fy), fz) * 2 - 1;
}

export function fbm(x, y, z, octaves = 4, gain = 0.5, lac = 2.07) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    sum += noise3(x, y, z) * amp;
    norm += amp;
    amp *= gain;
    x *= lac;
    y *= lac;
    z *= lac;
  }
  return sum / norm;
}

/**
 * Sweeps a (possibly flattened) cross-section along a smooth curve.
 * `radius` and `flatten` accept numbers or functions of t (0..1).
 */
export function sweep(points, opts = {}) {
  const {
    segments = 26,
    radial = 10,
    radius = 0.01,
    flatten = 1,
    closed = false,
    caps = true,
    tension = 0.5,
    twist = 0,
    jitter = 0,
    seed = 7,
  } = opts;

  const curve = new THREE.CatmullRomCurve3(toV3(points), closed, "catmullrom", tension);
  const frames = curve.computeFrenetFrames(segments, closed);
  const rf = typeof radius === "function" ? radius : () => radius;
  const ff = typeof flatten === "function" ? flatten : () => flatten;
  const rnd = mulberry32(seed);

  const pos = [];
  const uv = [];
  const idx = [];
  const ringCount = segments + 1;

  for (let i = 0; i < ringCount; i += 1) {
    const t = i / segments;
    const P = curve.getPointAt(Math.min(t, 1));
    const fi = Math.min(i, frames.normals.length - 1);
    const N = frames.normals[fi];
    const B = frames.binormals[fi];
    const baseR = rf(t);
    const f = ff(t);
    for (let j = 0; j <= radial; j += 1) {
      const a = (j / radial) * Math.PI * 2 + twist * t;
      const wob = jitter ? 1 + (rnd() - 0.5) * jitter : 1;
      const ca = Math.cos(a) * baseR * wob;
      const sa = Math.sin(a) * baseR * f * wob;
      pos.push(P.x + N.x * ca + B.x * sa, P.y + N.y * ca + B.y * sa, P.z + N.z * ca + B.z * sa);
      uv.push(t, j / radial);
    }
  }

  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  if (caps && !closed) {
    const startC = pos.length / 3;
    const p0 = curve.getPointAt(0);
    pos.push(p0.x, p0.y, p0.z);
    uv.push(0, 0.5);
    for (let j = 0; j < radial; j += 1) idx.push(startC, j + 1, j);
    const endC = pos.length / 3;
    const p1 = curve.getPointAt(1);
    pos.push(p1.x, p1.y, p1.z);
    uv.push(1, 0.5);
    const base = segments * (radial + 1);
    for (let j = 0; j < radial; j += 1) idx.push(endC, base + j, base + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Lofts a surface through a list of rings (each ring is an array of the same length). */
export function loft(rings, { closedRing = true, capStart = true, capEnd = true } = {}) {
  const n = rings[0].length;
  const pos = [];
  const uv = [];
  const idx = [];

  rings.forEach((ring, i) => {
    const t = i / (rings.length - 1);
    for (let j = 0; j <= n; j += 1) {
      const p = ring[j % n];
      pos.push(p.x, p.y, p.z);
      uv.push(j / n, t);
    }
  });

  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let j = 0; j < (closedRing ? n : n - 1); j += 1) {
      const a = i * (n + 1) + j;
      const b = a + n + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const cap = (ring, flip) => {
    const c = new THREE.Vector3();
    ring.forEach((p) => c.add(p));
    c.multiplyScalar(1 / ring.length);
    const centerIdx = pos.length / 3;
    pos.push(c.x, c.y, c.z);
    uv.push(0.5, 0.5);
    const ringStart = pos.length / 3;
    ring.forEach((p, j) => {
      pos.push(p.x, p.y, p.z);
      uv.push(j / ring.length, flip ? 0 : 1);
    });
    for (let j = 0; j < ring.length; j += 1) {
      const a = ringStart + j;
      const b = ringStart + ((j + 1) % ring.length);
      if (flip) idx.push(centerIdx, b, a);
      else idx.push(centerIdx, a, b);
    }
  };

  if (capStart) cap(rings[0], true);
  if (capEnd) cap(rings[rings.length - 1], false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Solid slab between two lengthwise border curves — used for sheet muscles
 * (trapezius, latissimus dorsi, obliques) and membranes.
 */
export function sheet(edgeA, edgeB, opts = {}) {
  const { samples = 16, across = 5, thickness = 0.006, bulge = 0.005, tension = 0.5 } = opts;
  const cA = new THREE.CatmullRomCurve3(toV3(edgeA), false, "catmullrom", tension);
  const cB = new THREE.CatmullRomCurve3(toV3(edgeB), false, "catmullrom", tension);
  const rings = [];
  const h = thickness / 2;
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const A = cA.getPoint(t);
    const B = cB.getPoint(t);
    const tan = cA.getTangent(t).add(cB.getTangent(t)).normalize();
    const w = B.clone().sub(A);
    const n = new THREE.Vector3().crossVectors(tan, w).normalize();
    const taper = Math.sin(Math.PI * Math.min(0.999, Math.max(0.001, t))) ** 0.3;
    const top = [];
    const bot = [];
    for (let j = 0; j < across; j += 1) {
      const u = j / (across - 1);
      const base = A.clone().addScaledVector(w, u);
      top.push(base.clone().addScaledVector(n, h + bulge * Math.sin(Math.PI * u) * taper));
      bot.push(base.clone().addScaledVector(n, -h * 0.75));
    }
    rings.push([...top, ...bot.reverse()]);
  }
  return loft(rings, { closedRing: true, capStart: true, capEnd: true });
}

/**
 * Cross-section ring: super-ellipse with independent front/back depth.
 * Returns Vector3[] ordered counter-clockwise viewed from +Y.
 */
export function section(y, opts) {
  const {
    w = 0.1,
    front = 0.08,
    back = 0.08,
    cx = 0,
    cz = 0,
    e = 1,
    n = 28,
    squash = 1,
  } = opts;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const sx = Math.sign(c) * Math.pow(Math.abs(c), e) * w;
    const d = s >= 0 ? front : back;
    const sz = Math.sign(s) * Math.pow(Math.abs(s), e) * d;
    pts.push(new THREE.Vector3(cx + sx, y, cz + sz * squash));
  }
  return pts;
}

/** Ellipsoid patch with explicit angular ranges. phi: 0=front(+z), PI/2=right(+x). */
export function spherePatch({
  center = [0, 0, 0],
  radii = [1, 1, 1],
  phi = [0, Math.PI * 2],
  theta = [0, Math.PI],
  segs = [22, 16],
  noise = 0,
  noiseFreq = 9,
  seed = 3,
  flat = 0,
  thetaEnd = null,
  thetaStart = null,
}) {
  const [cx, cy, cz] = center;
  const [rx, ry, rz] = radii;
  const [np, nt] = segs;
  const pos = [];
  const uv = [];
  const idx = [];
  const off = seed * 13.37;

  for (let j = 0; j <= nt; j += 1) {
    const tv = j / nt;
    for (let i = 0; i <= np; i += 1) {
      const tu = i / np;
      const ph = phi[0] + (phi[1] - phi[0]) * tu;
      const t0 = thetaStart ? thetaStart(tu) : theta[0];
      const t1 = thetaEnd ? thetaEnd(tu) : theta[1];
      const th = t0 + (t1 - t0) * tv;
      const sx = Math.sin(th) * Math.sin(ph);
      const sy = Math.cos(th);
      const sz = Math.sin(th) * Math.cos(ph);
      let k = 1;
      if (noise) k += noise * fbm(sx * noiseFreq + off, sy * noiseFreq + off, sz * noiseFreq + off, 3);
      const px = cx + rx * sx * k;
      const py = cy + ry * sy * k;
      const pz = cz + rz * sz * k * (1 - flat * Math.abs(sx));
      pos.push(px, py, pz);
      uv.push(tu, tv);
    }
  }

  for (let j = 0; j < nt; j += 1) {
    for (let i = 0; i < np; i += 1) {
      const a = j * (np + 1) + i;
      const b = a + np + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function blob({ center = [0, 0, 0], radii = [1, 1, 1], noise = 0.08, noiseFreq = 7, seed = 5, segs = [20, 14] }) {
  return spherePatch({ center, radii, noise, noiseFreq, seed, segs });
}

export function lathe(profile, { segments = 24, rot = [0, 0, 0], pos = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0006), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  return xf(geo, { p: pos, r: rot, s: scale });
}

export function xf(geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(
    v3(p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2])),
    v3(s)
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Places a geometry that was authored along +Y (centered on origin) between points a and b. */
export function placeAlong(geo, a, b, roll = 0) {
  const A = v3(a);
  const B = v3(b);
  const dir = B.clone().sub(A);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll));
  geo.applyQuaternion(q);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  geo.translate(mid.x, mid.y, mid.z);
  return geo;
}

export function dist(a, b) {
  return v3(a).distanceTo(v3(b));
}

/** Tints a merged geometry by baking a luminance multiplier into vertex colors. */
export function tint(geo, l = 1, variance = 0, seed = 11) {
  const count = geo.attributes.position.count;
  const arr = new Float32Array(count * 3);
  const rnd = mulberry32(seed);
  const base = l + (variance ? (rnd() - 0.5) * variance : 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < count; i += 1) {
    const n = variance
      ? base + fbm(pos.getX(i) * 26, pos.getY(i) * 26, pos.getZ(i) * 26, 2) * variance * 0.5
      : base;
    arr[i * 3] = n;
    arr[i * 3 + 1] = n;
    arr[i * 3 + 2] = n;
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(arr, 3));
  return geo;
}

const KEEP = ["position", "normal", "uv", "color"];

export function normalize(geo) {
  if (!geo.index) {
    const count = geo.attributes.position.count;
    geo.setIndex(Array.from({ length: count }, (_, i) => i));
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.attributes.uv) {
    const c = geo.attributes.position.count;
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(c * 2), 2));
  }
  if (!geo.attributes.color) tint(geo, 1);
  Object.keys(geo.attributes).forEach((k) => {
    if (!KEEP.includes(k)) geo.deleteAttribute(k);
  });
  geo.morphAttributes = {};
  return geo;
}

export function mergeAll(geos) {
  const clean = geos.filter(Boolean).map(normalize);
  if (!clean.length) return null;
  if (clean.length === 1) return clean[0];
  const merged = mergeGeometries(clean, false);
  clean.forEach((g) => g.dispose());
  return merged;
}
