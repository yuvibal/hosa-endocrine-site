/**
 * Canonical 1.80 m standing figure. Units are metres, feet on y = 0.
 * +x is the subject's right, +z is anterior (front), -z posterior (back).
 * Every layer (bone, muscle, vessel, organ, skin) is built from these landmarks
 * so the layers actually line up with one another.
 */

export const HEIGHT = 1.8;

export const L = {
  headCenter: [0, 1.697, 0.006],
  headRadii: [0.077, 0.099, 0.096],
  vertex: [0, 1.796, 0.006],
  glabella: [0, 1.727, 0.098],
  nasion: [0, 1.708, 0.096],
  noseTip: [0, 1.667, 0.118],
  chin: [0, 1.566, 0.083],
  jawAngle: [0.058, 0.0, 0.0],
  earCenter: [0.075, 1.688, -0.012],
  eye: [0.031, 1.706, 0.081],
  mouth: [0, 1.601, 0.095],
  neckTop: [0, 1.6, -0.01],
  neckBase: [0, 1.45, -0.012],

  jugularNotch: [0, 1.438, 0.071],
  xiphoid: [0, 1.216, 0.09],
  nipple: [0.072, 1.324, 0.106],
  acromion: [0.19, 1.452, 0.0],
  shoulder: [0.175, 1.418, 0.005],
  elbow: [0.206, 1.098, -0.008],
  wrist: [0.212, 0.852, 0.018],
  knuckle: [0.213, 0.762, 0.03],
  fingerTip: [0.213, 0.657, 0.032],

  navel: [0, 1.099, 0.099],
  iliacCrest: [0.126, 1.046, 0.012],
  asis: [0.104, 1.016, 0.072],
  pubis: [0, 0.896, 0.052],
  hip: [0.088, 0.925, 0.008],
  knee: [0.078, 0.492, 0.016],
  ankle: [0.072, 0.079, -0.012],
  heel: [0.072, 0.037, -0.07],
  ball: [0.079, 0.023, 0.112],
  toeTip: [0.079, 0.019, 0.186],
};

const SPINE_Z = [
  [1.6, -0.024],
  [1.572, -0.028],
  [1.5, -0.042],
  [1.44, -0.053],
  [1.36, -0.065],
  [1.28, -0.073],
  [1.2, -0.07],
  [1.14, -0.061],
  [1.08, -0.049],
  [1.02, -0.041],
  [0.96, -0.05],
  [0.9, -0.044],
  [0.86, -0.028],
];

/** Anterior/posterior position of the vertebral column at a given height. */
export function spineZ(y) {
  if (y >= SPINE_Z[0][0]) return SPINE_Z[0][1];
  for (let i = 0; i < SPINE_Z.length - 1; i += 1) {
    const [y0, z0] = SPINE_Z[i];
    const [y1, z1] = SPINE_Z[i + 1];
    if (y <= y0 && y >= y1) {
      const t = (y0 - y) / (y0 - y1);
      return z0 + (z1 - z0) * t;
    }
  }
  return SPINE_Z[SPINE_Z.length - 1][1];
}

export function spineAt(y, dz = 0) {
  return [0, y, spineZ(y) + dz];
}

const range = (n, from, to) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

const cervicalY = range(7, 1.572, 1.452);
const thoracicY = range(12, 1.432, 1.136);
const lumbarY = range(5, 1.106, 1.006);

export const VERTEBRAE = [
  ...cervicalY.map((y, i) => ({
    name: `C${i + 1} vertebra`,
    kind: "cervical",
    y,
    bodyR: 0.0155 + i * 0.0006,
    spinous: 0.023 + i * 0.004,
    transverse: 0.026,
  })),
  ...thoracicY.map((y, i) => ({
    name: `T${i + 1} vertebra`,
    kind: "thoracic",
    y,
    bodyR: 0.0175 + i * 0.00055,
    spinous: 0.042,
    transverse: 0.03,
  })),
  ...lumbarY.map((y, i) => ({
    name: `L${i + 1} vertebra`,
    kind: "lumbar",
    y,
    bodyR: 0.0245 + i * 0.0008,
    spinous: 0.036,
    transverse: 0.033,
  })),
];

export const THORACIC_Y = thoracicY;

/** Half-width of the rib cage at a given thoracic index (0..11). */
export function ribWidth(i) {
  const t = i / 11;
  return 0.044 + 0.092 * Math.sin(Math.PI * Math.min(1, 0.2 + t * 0.76));
}

export const STERNUM = { top: 1.438, bottom: 1.216, z: 0.079 };

export function mirrorSide(p) {
  return [-p[0], p[1], p[2]];
}

/** Points along the arm, optionally on the left side. */
export function arm(side = 1) {
  const s = (p) => [p[0] * side, p[1], p[2]];
  return {
    acromion: s(L.acromion),
    shoulder: s(L.shoulder),
    elbow: s(L.elbow),
    wrist: s(L.wrist),
    knuckle: s(L.knuckle),
    tip: s(L.fingerTip),
  };
}

export function leg(side = 1) {
  const s = (p) => [p[0] * side, p[1], p[2]];
  return {
    hip: s(L.hip),
    knee: s(L.knee),
    ankle: s(L.ankle),
    heel: s(L.heel),
    ball: s(L.ball),
    toe: s(L.toeTip),
  };
}
