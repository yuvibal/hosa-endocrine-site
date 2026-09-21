import * as THREE from "three";
import {
  sweep,
  loft,
  section,
  spherePatch,
  blob,
  lathe,
  xf,
  mergeAll,
  v3,
  mir,
  tint,
} from "../core/shapes.js";
import { L, VERTEBRAE, THORACIC_Y, STERNUM, spineZ, ribWidth } from "./landmarks.js";

const SKULL = { c: [0, 1.694, 0.004], r: [0.0716, 0.0928, 0.0894] };

const bump = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w) ** 1.5;

/** Diaphysis with flared epiphyses at both ends. */
function longBone(a, b, o = {}) {
  const {
    shaft = 0.012,
    top = 2,
    bot = 2,
    bow = 0,
    bowAxis = [0, 0, 1],
    radial = 12,
    segments = 22,
    flatten = 1,
    seed = 1,
    heads = true,
  } = o;
  const A = v3(a);
  const B = v3(b);
  const len = A.distanceTo(B);
  const bowVec = v3(bowAxis).normalize().multiplyScalar(bow * len);
  const at = (t) => A.clone().lerp(B, t).add(bowVec.clone().multiplyScalar(Math.sin(Math.PI * t)));
  const pts = [0, 0.12, 0.28, 0.5, 0.72, 0.88, 1].map(at);
  const body = sweep(pts, {
    segments,
    radial,
    flatten,
    radius: (t) => shaft * (1 + (top - 1) * bump(t, 0, 0.22) + (bot - 1) * bump(t, 1, 0.22)),
  });
  if (!heads) return body;
  const eA = blob({
    center: A.toArray(),
    radii: [shaft * top * 0.9, shaft * top * 0.72, shaft * top * 0.86],
    noise: 0.06,
    seed,
    segs: [14, 10],
  });
  const eB = blob({
    center: B.toArray(),
    radii: [shaft * bot * 0.9, shaft * bot * 0.72, shaft * bot * 0.86],
    noise: 0.06,
    seed: seed + 1,
    segs: [14, 10],
  });
  return mergeAll([body, eA, eB]);
}

function smallBone(center, radii, seed = 3, noise = 0.1) {
  return blob({ center, radii, noise, noiseFreq: 11, seed, segs: [14, 10] });
}

/* ------------------------------------------------------------------ skull */

function cranialPatch(opts) {
  return spherePatch({ center: SKULL.c, radii: SKULL.r, segs: [26, 16], noise: 0.012, ...opts });
}

function frontalBone() {
  // Lower border dips at the supraorbital margins and the nasal notch.
  const vault = cranialPatch({
    phi: [-0.96, 0.96],
    theta: [0.05, 1.2],
    seed: 2,
    thetaEnd: (u) => {
      const p = -0.96 + 1.92 * u;
      const orbit = 1.2 + 0.1 * Math.exp(-((Math.abs(p) - 0.46) ** 2) / 0.02);
      const nasal = Math.abs(p) < 0.12 ? 0.16 : 0;
      return orbit + nasal;
    },
  });
  const browR = sweep(
    [
      [0.008, 1.735, 0.09],
      [0.03, 1.737, 0.086],
      [0.052, 1.73, 0.068],
    ],
    { radius: 0.0075, radial: 8, segments: 10 }
  );
  const browL = sweep(
    [
      [-0.008, 1.735, 0.09],
      [-0.03, 1.737, 0.086],
      [-0.052, 1.73, 0.068],
    ],
    { radius: 0.0075, radial: 8, segments: 10 }
  );
  const orbitR = orbitRim(1);
  const orbitL = orbitRim(-1);
  return mergeAll([vault, browR, browL, orbitR, orbitL]);
}

function orbitRim(s) {
  const pts = [];
  for (let i = 0; i <= 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    pts.push([s * (0.032 + Math.cos(a) * 0.021), 1.706 + Math.sin(a) * 0.019, 0.078 - Math.abs(Math.cos(a)) * 0.006]);
  }
  return sweep(pts, { radius: 0.0042, radial: 7, segments: 20, closed: true });
}

function skullBones() {
  const out = [];
  out.push({ name: "Frontal bone", geo: frontalBone() });
  [1, -1].forEach((s) => {
    out.push({
      name: `Parietal bone (${s > 0 ? "right" : "left"})`,
      geo: cranialPatch({
        phi: s > 0 ? [0.9, 2.08] : [-2.08, -0.9],
        theta: [0.03, 0.98],
        seed: 4 + s,
      }),
    });
  });
  out.push({
    name: "Occipital bone",
    geo: mergeAll([
      cranialPatch({ phi: [2.12, 4.16], theta: [0.06, 1.42], seed: 7 }),
      // Foramen magnum rim + occipital condyles.
      xf(new THREE.TorusGeometry(0.019, 0.0055, 8, 18), { p: [0, 1.607, -0.018], r: [Math.PI / 2, 0, 0] }),
    ]),
  });
  [1, -1].forEach((s) => {
    out.push({
      name: `Temporal bone (${s > 0 ? "right" : "left"})`,
      geo: mergeAll([
        cranialPatch({
          phi: s > 0 ? [1.02, 2.16] : [-2.16, -1.02],
          theta: [0.95, 1.52],
          seed: 9 + s,
        }),
        // Zygomatic process forming the posterior half of the arch.
        sweep(
          [
            [s * 0.069, 1.676, -0.006],
            [s * 0.064, 1.673, 0.022],
            [s * 0.056, 1.669, 0.042],
          ],
          { radius: 0.0055, radial: 8, segments: 10 }
        ),
        // Mastoid process.
        blob({ center: [s * 0.058, 1.634, -0.028], radii: [0.012, 0.018, 0.013], noise: 0.08, seed: 12 }),
        // Styloid process.
        sweep(
          [
            [s * 0.043, 1.628, -0.006],
            [s * 0.04, 1.608, 0.004],
          ],
          { radius: 0.0022, radial: 6, segments: 6 }
        ),
      ]),
    });
  });
  out.push({
    name: "Sphenoid bone",
    geo: mergeAll([
      blob({ center: [0, 1.664, 0.026], radii: [0.026, 0.013, 0.02], noise: 0.06, seed: 14 }),
      sweep(
        [
          [-0.056, 1.677, 0.024],
          [0, 1.668, 0.03],
          [0.056, 1.677, 0.024],
        ],
        { radius: 0.007, flatten: 0.4, radial: 8, segments: 14 }
      ),
    ]),
  });
  out.push({
    name: "Ethmoid bone",
    geo: mergeAll([
      blob({ center: [0, 1.678, 0.058], radii: [0.013, 0.014, 0.016], noise: 0.07, seed: 16 }),
      blob({ center: [0, 1.694, 0.062], radii: [0.005, 0.009, 0.012], noise: 0.05, seed: 17 }),
    ]),
  });

  [1, -1].forEach((s) => {
    out.push({
      name: `Maxilla (${s > 0 ? "right" : "left"})`,
      geo: mergeAll([
        spherePatch({
          center: [s * 0.022, 1.639, 0.05],
          radii: [0.031, 0.036, 0.045],
          phi: s > 0 ? [-0.5, 1.5] : [-1.5, 0.5],
          theta: [0.55, 1.95],
          segs: [16, 14],
          noise: 0.03,
          seed: 20 + s,
        }),
        // Alveolar arch carrying the upper teeth.
        sweep(
          [
            [s * 0.002, 1.602, 0.086],
            [s * 0.019, 1.601, 0.079],
            [s * 0.03, 1.603, 0.058],
            [s * 0.033, 1.606, 0.036],
          ],
          { radius: 0.0062, flatten: 0.7, radial: 8, segments: 12 }
        ),
      ]),
    });
    out.push({
      name: `Zygomatic bone (${s > 0 ? "right" : "left"})`,
      geo: mergeAll([
        blob({ center: [s * 0.051, 1.679, 0.055], radii: [0.014, 0.013, 0.015], noise: 0.08, seed: 24 + s }),
        sweep(
          [
            [s * 0.056, 1.671, 0.044],
            [s * 0.06, 1.672, 0.026],
            [s * 0.058, 1.674, 0.008],
          ],
          { radius: 0.0048, radial: 8, segments: 10 }
        ),
      ]),
    });
    out.push({
      name: `Nasal bone (${s > 0 ? "right" : "left"})`,
      geo: sweep(
        [
          [s * 0.006, 1.711, 0.094],
          [s * 0.008, 1.695, 0.1],
          [s * 0.007, 1.681, 0.101],
        ],
        { radius: 0.0055, flatten: 0.45, radial: 8, segments: 10 }
      ),
    });
    out.push({
      name: `Lacrimal bone (${s > 0 ? "right" : "left"})`,
      geo: smallBone([s * 0.019, 1.702, 0.072], [0.005, 0.008, 0.005], 28 + s, 0.06),
    });
    out.push({
      name: `Palatine bone (${s > 0 ? "right" : "left"})`,
      geo: xf(new THREE.BoxGeometry(0.016, 0.004, 0.022, 2, 1, 3), { p: [s * 0.012, 1.6, 0.05] }),
    });
    out.push({
      name: `Inferior nasal concha (${s > 0 ? "right" : "left"})`,
      geo: sweep(
        [
          [s * 0.008, 1.64, 0.084],
          [s * 0.012, 1.638, 0.068],
          [s * 0.011, 1.636, 0.052],
        ],
        { radius: 0.0035, flatten: 0.5, radial: 6, segments: 8 }
      ),
    });
  });
  out.push({
    name: "Vomer",
    geo: xf(new THREE.BoxGeometry(0.0035, 0.026, 0.034, 1, 3, 4), { p: [0, 1.628, 0.05] }),
  });
  out.push({ name: "Mandible", geo: mandible() });

  [1, -1].forEach((s) => {
    out.push({ name: `Malleus (${s > 0 ? "right" : "left"})`, geo: smallBone([s * 0.05, 1.673, -0.004], [0.0028, 0.0042, 0.0028], 31 + s, 0.05) });
    out.push({ name: `Incus (${s > 0 ? "right" : "left"})`, geo: smallBone([s * 0.0545, 1.6715, -0.007], [0.0026, 0.0034, 0.0026], 33 + s, 0.05) });
    out.push({ name: `Stapes (${s > 0 ? "right" : "left"})`, geo: smallBone([s * 0.058, 1.6695, -0.009], [0.0018, 0.0024, 0.0018], 35 + s, 0.05) });
  });
  out.push({
    name: "Hyoid bone",
    geo: sweep(
      [
        [0.024, 1.552, 0.03],
        [0.018, 1.549, 0.05],
        [0, 1.548, 0.058],
        [-0.018, 1.549, 0.05],
        [-0.024, 1.552, 0.03],
      ],
      { radius: 0.0038, radial: 7, segments: 16 }
    ),
  });
  return out;
}

function mandible() {
  const arch = sweep(
    [
      [0.058, 1.664, -0.026],
      [0.056, 1.628, -0.016],
      [0.052, 1.598, 0.014],
      [0.038, 1.577, 0.055],
      [0.014, 1.569, 0.081],
      [-0.014, 1.569, 0.081],
      [-0.038, 1.577, 0.055],
      [-0.052, 1.598, 0.014],
      [-0.056, 1.628, -0.016],
      [-0.058, 1.664, -0.026],
    ],
    {
      segments: 44,
      radial: 10,
      flatten: 0.62,
      radius: (t) => 0.0088 + 0.0042 * Math.sin(Math.PI * t) - 0.002 * bump(t, 0.5, 0.25),
    }
  );
  const ramusR = sweep(
    [
      [0.056, 1.667, -0.024],
      [0.053, 1.68, -0.012],
    ],
    { radius: 0.0072, flatten: 0.55, radial: 8, segments: 8 }
  );
  const ramusL = sweep(
    [
      [-0.056, 1.667, -0.024],
      [-0.053, 1.68, -0.012],
    ],
    { radius: 0.0072, flatten: 0.55, radial: 8, segments: 8 }
  );
  const coronoidR = sweep(
    [
      [0.05, 1.66, -0.008],
      [0.046, 1.678, 0.006],
    ],
    { radius: 0.005, flatten: 0.4, radial: 7, segments: 8 }
  );
  const coronoidL = sweep(
    [
      [-0.05, 1.66, -0.008],
      [-0.046, 1.678, 0.006],
    ],
    { radius: 0.005, flatten: 0.4, radial: 7, segments: 8 }
  );
  return mergeAll([arch, ramusR, ramusL, coronoidR, coronoidL]);
}

/* -------------------------------------------------------------- vertebrae */

function vertebraBone(spec, index) {
  const { y, bodyR, spinous, transverse, kind } = spec;
  const z = spineZ(y);
  const h = kind === "lumbar" ? 0.0245 : kind === "thoracic" ? 0.0195 : 0.0135;
  const parts = [];
  const atlas = kind === "cervical" && index === 0;

  if (!atlas) {
    parts.push(
      lathe(
        [
          [bodyR * 0.96, -h / 2],
          [bodyR, -h / 2 + 0.002],
          [bodyR * 0.89, 0],
          [bodyR, h / 2 - 0.002],
          [bodyR * 0.96, h / 2],
        ],
        { segments: 18, pos: [0, y, z] }
      )
    );
  }
  if (kind === "cervical" && index === 1) {
    // Dens of the axis.
    parts.push(sweep([[0, y + h / 2, z], [0, y + h / 2 + 0.015, z - 0.001]], { radius: 0.0055, radial: 8, segments: 6 }));
  }

  const aw = bodyR * (atlas ? 1.25 : 1.05);
  const ad = bodyR * (kind === "lumbar" ? 1.5 : 1.65);
  parts.push(
    sweep(
      [
        [aw, y, z + (atlas ? 0.006 : -0.001)],
        [aw * 0.95, y, z - ad * 0.55],
        [aw * 0.5, y, z - ad * 0.95],
        [0, y, z - ad * 1.05],
        [-aw * 0.5, y, z - ad * 0.95],
        [-aw * 0.95, y, z - ad * 0.55],
        [-aw, y, z + (atlas ? 0.006 : -0.001)],
      ],
      { radius: kind === "lumbar" ? 0.0062 : 0.0052, radial: 8, segments: 22 }
    )
  );

  if (!atlas) {
    const tipDrop = kind === "thoracic" ? 0.72 : 0.35;
    parts.push(
      sweep(
        [
          [0, y, z - ad * 1.02],
          [0, y - spinous * tipDrop * 0.5, z - ad - spinous * 0.5],
          [0, y - spinous * tipDrop, z - ad - spinous],
        ],
        {
          radial: 8,
          segments: 12,
          flatten: 0.45,
          radius: (t) => 0.0062 - 0.0026 * t,
        }
      )
    );
  }

  [1, -1].forEach((s) => {
    parts.push(
      sweep(
        [
          [s * aw * 0.85, y, z - ad * 0.6],
          [s * transverse, y + 0.002, z - ad * 0.75],
        ],
        { radial: 7, segments: 8, radius: (t) => 0.0052 - 0.0016 * t }
      )
    );
    [1, -1].forEach((v) => {
      parts.push(
        smallBone(
          [s * aw * 0.8, y + v * h * 0.72, z - ad * 0.72],
          [0.005, 0.0042, 0.005],
          40 + index * 4 + s + v,
          0.05
        )
      );
    });
  });
  return mergeAll(parts);
}

function sacrumBone() {
  const rings = [];
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    const y = 0.998 - t * 0.088;
    const w = 0.055 - t * 0.032;
    const z = spineZ(y);
    rings.push(section(y, { w, front: 0.014 - t * 0.005, back: 0.02 - t * 0.008, cz: z, n: 18, e: 0.85 }));
  }
  const body = loft(rings);
  const extras = [];
  for (let i = 0; i < 4; i += 1) {
    const y = 0.982 - i * 0.021;
    [1, -1].forEach((s) =>
      extras.push(smallBone([s * (0.03 - i * 0.004), y, spineZ(y) - 0.016], [0.006, 0.005, 0.006], 70 + i * 2 + s, 0.06))
    );
  }
  return mergeAll([body, ...extras]);
}

function coccyxBone() {
  return sweep(
    [
      [0, 0.906, spineZ(0.906) - 0.004],
      [0, 0.892, spineZ(0.892) + 0.006],
      [0, 0.878, spineZ(0.878) + 0.016],
    ],
    { radial: 8, segments: 10, flatten: 0.7, radius: (t) => 0.011 - 0.0062 * t }
  );
}

/* ------------------------------------------------------------- thorax */

function ribBone(i, s) {
  const y = THORACIC_Y[i];
  const z = spineZ(y);
  const w = ribWidth(i);
  const drop = 0.022 + i * 0.008;
  const pts = [[s * 0.022, y, z + 0.004], [s * w * 0.45, y - 0.006, z - 0.024], [s * w * 0.94, y - 0.018, z + 0.014]];
  if (i < 7) {
    pts.push([s * w * 0.9, y - drop * 0.6, z + 0.07]);
    pts.push([s * 0.036, STERNUM.top - 0.016 - i * 0.026, STERNUM.z - 0.008]);
  } else if (i < 10) {
    pts.push([s * w * 0.88, y - drop * 0.8, z + 0.056]);
    pts.push([s * (w * 0.6), y - drop * 1.25, 0.042]);
  } else {
    pts.push([s * w * 0.8, y - drop * 0.55, z + 0.036]);
  }
  return sweep(pts, {
    segments: 30,
    radial: 9,
    flatten: 0.5,
    radius: (t) => 0.0062 - 0.0016 * t,
  });
}

function sternumBone() {
  const spec = [
    [1.438, 0.024],
    [1.418, 0.029],
    [1.392, 0.026],
    [1.372, 0.021],
    [1.32, 0.019],
    [1.268, 0.017],
    [1.242, 0.013],
    [1.228, 0.008],
    [1.216, 0.004],
  ];
  const rings = spec.map(([y, w]) =>
    section(y, { w, front: 0.0055, back: 0.0055, cz: STERNUM.z, n: 14, e: 0.8 })
  );
  return loft(rings);
}

function costalCartilage() {
  const parts = [];
  for (let i = 0; i < 10; i += 1) {
    [1, -1].forEach((s) => {
      const y = THORACIC_Y[i];
      const z = spineZ(y);
      const w = ribWidth(i);
      const drop = 0.022 + i * 0.008;
      if (i < 7) {
        parts.push(
          sweep(
            [
              [s * 0.036, STERNUM.top - 0.016 - i * 0.026, STERNUM.z - 0.008],
              [s * 0.026, STERNUM.top - 0.016 - i * 0.026, STERNUM.z - 0.002],
            ],
            { radius: 0.0055, radial: 7, segments: 6 }
          )
        );
      } else {
        parts.push(
          sweep(
            [
              [s * w * 0.6, y - drop * 1.25, 0.042],
              [s * (w * 0.4), y - drop * 1.6 + 0.01, 0.058],
              [s * 0.04, STERNUM.bottom - 0.004, STERNUM.z - 0.006],
            ],
            { radius: 0.005, radial: 7, segments: 14 }
          )
        );
      }
      void z;
    });
  }
  return mergeAll(parts);
}

function intervertebralDiscs() {
  const parts = [];
  for (let i = 0; i < VERTEBRAE.length - 1; i += 1) {
    const a = VERTEBRAE[i];
    const b = VERTEBRAE[i + 1];
    const y = (a.y + b.y) / 2;
    const r = (a.bodyR + b.bodyR) / 2;
    parts.push(lathe([[r * 0.98, -0.004], [r * 1.02, 0], [r * 0.98, 0.004]], { segments: 16, pos: [0, y, spineZ(y)] }));
  }
  return mergeAll(parts);
}

/* --------------------------------------------------------- upper limb */

function upperLimb(s) {
  const side = s > 0 ? "right" : "left";
  const out = [];

  out.push({
    name: `Clavicle (${side})`,
    geo: sweep(
      [
        [s * 0.014, 1.431, 0.07],
        [s * 0.06, 1.442, 0.052],
        [s * 0.118, 1.447, 0.022],
        [s * 0.171, 1.452, 0.008],
      ],
      { segments: 20, radial: 9, radius: (t) => 0.008 - 0.0018 * Math.sin(Math.PI * t) }
    ),
  });

  out.push({
    name: `Scapula (${side})`,
    geo: mergeAll([
      spherePatch({
        center: [0, 1.335, -0.016],
        radii: [0.152, 0.2, 0.118],
        phi: s > 0 ? [1.82, 2.78] : [-2.78, -1.82],
        theta: [0.62, 1.48],
        segs: [18, 16],
        noise: 0.015,
        seed: 80 + s,
        thetaEnd: (u) => 1.48 - 0.42 * Math.max(0, u - 0.55) ** 1.2,
      }),
      // Spine of the scapula and acromion.
      sweep(
        [
          [s * 0.048, 1.418, -0.082],
          [s * 0.104, 1.432, -0.06],
          [s * 0.162, 1.446, -0.024],
          [s * 0.186, 1.452, 0.006],
        ],
        { segments: 18, radial: 9, flatten: 0.55, radius: (t) => 0.0088 - 0.0018 * t }
      ),
      // Glenoid fossa.
      lathe([[0.001, 0], [0.019, 0.002], [0.02, 0.008], [0.001, 0.009]], {
        segments: 18,
        pos: [s * 0.168, 1.418, 0.004],
        rot: [0, 0, s * 1.35],
      }),
      // Coracoid process.
      sweep(
        [
          [s * 0.13, 1.424, -0.01],
          [s * 0.118, 1.428, 0.016],
          [s * 0.1, 1.424, 0.032],
        ],
        { segments: 12, radial: 8, radius: 0.0062 }
      ),
    ]),
  });

  const sh = [s * 0.172, 1.412, 0.004];
  const el = [s * 0.206, 1.098, -0.008];
  out.push({
    name: `Humerus (${side})`,
    geo: mergeAll([
      longBone(sh, el, { shaft: 0.0142, top: 1.55, bot: 1.9, bow: 0.02, bowAxis: [s * 1, 0, 0.3], seed: 90 }),
      blob({ center: [s * 0.16, 1.424, 0.0], radii: [0.024, 0.023, 0.024], noise: 0.05, seed: 91 }),
      blob({ center: [s * 0.192, 1.418, 0.006], radii: [0.011, 0.014, 0.011], noise: 0.06, seed: 92 }),
    ]),
  });

  out.push({
    name: `Radius (${side})`,
    geo: longBone([s * 0.222, 1.092, -0.002], [s * 0.228, 0.856, 0.014], {
      shaft: 0.0082,
      top: 1.5,
      bot: 2.1,
      bow: 0.018,
      bowAxis: [s * 1, 0, 0.4],
      seed: 94,
    }),
  });
  out.push({
    name: `Ulna (${side})`,
    geo: mergeAll([
      longBone([s * 0.191, 1.104, -0.012], [s * 0.198, 0.852, 0.016], {
        shaft: 0.0086,
        top: 2.2,
        bot: 1.35,
        bow: 0.014,
        bowAxis: [-s * 1, 0, 0.3],
        seed: 96,
      }),
      // Olecranon.
      blob({ center: [s * 0.196, 1.112, -0.026], radii: [0.011, 0.013, 0.012], noise: 0.06, seed: 97 }),
    ]),
  });

  const carpals = [
    ["Scaphoid", 0.028, 0.846, 0.026],
    ["Lunate", 0.01, 0.847, 0.021],
    ["Triquetrum", -0.008, 0.846, 0.014],
    ["Pisiform", -0.014, 0.839, 0.032],
    ["Trapezium", 0.03, 0.831, 0.032],
    ["Trapezoid", 0.014, 0.83, 0.026],
    ["Capitate", 0.0, 0.829, 0.022],
    ["Hamate", -0.016, 0.83, 0.018],
  ];
  carpals.forEach(([n, dx, y, z], i) => {
    out.push({
      name: `${n} (${side})`,
      geo: smallBone([s * (0.206 + dx), y, z], [0.0082, 0.0072, 0.0078], 100 + i * 3 + s, 0.12),
    });
  });

  const fingers = [
    { n: "thumb", mcA: [0.03, 0.828, 0.03], mcB: [0.05, 0.792, 0.05], ph: [[0.06, 0.769, 0.062], [0.066, 0.75, 0.069]] },
    { n: "index", mcA: [0.016, 0.822, 0.026], mcB: [0.028, 0.764, 0.032], ph: [[0.031, 0.722, 0.036], [0.033, 0.694, 0.038], [0.034, 0.674, 0.039]] },
    { n: "middle", mcA: [0.002, 0.822, 0.023], mcB: [0.006, 0.758, 0.03], ph: [[0.007, 0.712, 0.034], [0.008, 0.68, 0.036], [0.008, 0.658, 0.037]] },
    { n: "ring", mcA: [-0.012, 0.822, 0.02], mcB: [-0.016, 0.761, 0.028], ph: [[-0.018, 0.718, 0.032], [-0.019, 0.688, 0.034], [-0.02, 0.667, 0.035]] },
    { n: "little", mcA: [-0.024, 0.823, 0.017], mcB: [-0.034, 0.768, 0.024], ph: [[-0.038, 0.732, 0.028], [-0.04, 0.708, 0.03], [-0.041, 0.69, 0.031]] },
  ];
  const ord = ["1st", "2nd", "3rd", "4th", "5th"];
  fingers.forEach((f, fi) => {
    const abs = (p) => [s * (0.206 + p[0]), p[1], p[2]];
    out.push({
      name: `${ord[fi]} metacarpal (${side})`,
      geo: longBone(abs(f.mcA), abs(f.mcB), { shaft: 0.0048, top: 1.5, bot: 1.7, radial: 9, segments: 12, seed: 130 + fi }),
    });
    let prev = abs(f.mcB);
    const labels = f.ph.length === 2 ? ["Proximal", "Distal"] : ["Proximal", "Middle", "Distal"];
    f.ph.forEach((p, pi) => {
      const cur = abs(p);
      out.push({
        name: `${labels[pi]} phalanx, ${f.n} (${side})`,
        geo: longBone(prev, cur, {
          shaft: 0.0042 - pi * 0.0005,
          top: 1.45,
          bot: 1.3,
          radial: 8,
          segments: 10,
          seed: 140 + fi * 4 + pi,
        }),
      });
      prev = cur;
    });
  });
  return out;
}

/* --------------------------------------------------------- lower limb */

function hipBone(s) {
  return mergeAll([
    // Iliac blade wrapped on an ellipsoid.
    spherePatch({
      center: [0, 0.972, 0.004],
      radii: [0.128, 0.118, 0.104],
      phi: s > 0 ? [0.42, 2.44] : [-2.44, -0.42],
      theta: [0.28, 1.05],
      segs: [22, 14],
      noise: 0.018,
      seed: 160 + s,
      thetaEnd: (u) => 1.05 - 0.22 * Math.max(0, 0.35 - u) - 0.2 * Math.max(0, u - 0.7),
    }),
    // Iliac crest rim.
    sweep(
      [
        [s * 0.09, 1.018, 0.07],
        [s * 0.122, 1.04, 0.026],
        [s * 0.118, 1.046, -0.026],
        [s * 0.078, 1.032, -0.062],
        [s * 0.04, 1.0, -0.072],
      ],
      { segments: 20, radial: 9, radius: 0.0082, flatten: 0.7 }
    ),
    // Acetabulum.
    lathe([[0.001, 0], [0.026, 0.004], [0.028, 0.013], [0.001, 0.014]], {
      segments: 20,
      pos: [s * 0.072, 0.928, 0.008],
      rot: [0, 0, s * 1.5],
    }),
    // Superior + inferior pubic ramus to the symphysis.
    sweep(
      [
        [s * 0.058, 0.922, 0.032],
        [s * 0.034, 0.908, 0.056],
        [s * 0.008, 0.898, 0.056],
      ],
      { segments: 14, radial: 8, radius: 0.0088, flatten: 0.8 }
    ),
    sweep(
      [
        [s * 0.008, 0.894, 0.054],
        [s * 0.03, 0.884, 0.03],
        [s * 0.046, 0.882, -0.004],
      ],
      { segments: 14, radial: 8, radius: 0.0078 }
    ),
    // Ischium + tuberosity.
    sweep(
      [
        [s * 0.07, 0.918, -0.008],
        [s * 0.062, 0.894, -0.026],
        [s * 0.05, 0.878, -0.028],
      ],
      { segments: 12, radial: 8, radius: 0.0105 }
    ),
    blob({ center: [s * 0.052, 0.876, -0.024], radii: [0.015, 0.013, 0.016], noise: 0.07, seed: 164 }),
  ]);
}

function lowerLimb(s) {
  const side = s > 0 ? "right" : "left";
  const out = [];
  out.push({ name: `Hip bone (${side})`, geo: hipBone(s) });

  const knee = [s * 0.076, 0.496, 0.014];
  out.push({
    name: `Femur (${side})`,
    geo: mergeAll([
      longBone([s * 0.098, 0.912, 0.0], knee, {
        shaft: 0.019,
        top: 1.5,
        bot: 2.2,
        bow: 0.022,
        bowAxis: [0, 0, 1],
        seed: 170,
      }),
      // Neck + head into the acetabulum.
      sweep(
        [
          [s * 0.098, 0.918, 0.0],
          [s * 0.082, 0.929, 0.006],
          [s * 0.07, 0.932, 0.008],
        ],
        { segments: 10, radial: 10, radius: 0.0125 }
      ),
      blob({ center: [s * 0.067, 0.932, 0.009], radii: [0.021, 0.021, 0.021], noise: 0.04, seed: 171 }),
      // Greater + lesser trochanter.
      blob({ center: [s * 0.107, 0.932, -0.006], radii: [0.016, 0.022, 0.017], noise: 0.08, seed: 172 }),
      blob({ center: [s * 0.086, 0.903, -0.012], radii: [0.009, 0.01, 0.009], noise: 0.08, seed: 173 }),
      // Femoral condyles.
      blob({ center: [s * 0.062, 0.494, 0.012], radii: [0.016, 0.02, 0.023], noise: 0.05, seed: 174 }),
      blob({ center: [s * 0.092, 0.494, 0.012], radii: [0.016, 0.02, 0.023], noise: 0.05, seed: 175 }),
    ]),
  });
  out.push({
    name: `Patella (${side})`,
    geo: blob({ center: [s * 0.077, 0.489, 0.046], radii: [0.019, 0.022, 0.009], noise: 0.07, seed: 176 }),
  });
  out.push({
    name: `Tibia (${side})`,
    geo: mergeAll([
      longBone([s * 0.072, 0.478, 0.012], [s * 0.07, 0.09, -0.006], {
        shaft: 0.0148,
        top: 1.95,
        bot: 1.45,
        bow: 0.008,
        bowAxis: [0, 0, 1],
        flatten: 0.9,
        seed: 178,
      }),
      // Medial malleolus.
      blob({ center: [s * 0.058, 0.088, -0.008], radii: [0.009, 0.015, 0.011], noise: 0.06, seed: 179 }),
    ]),
  });
  out.push({
    name: `Fibula (${side})`,
    geo: mergeAll([
      longBone([s * 0.1, 0.466, 0.004], [s * 0.093, 0.082, -0.01], {
        shaft: 0.0062,
        top: 1.7,
        bot: 1.9,
        seed: 180,
      }),
      blob({ center: [s * 0.094, 0.076, -0.01], radii: [0.008, 0.016, 0.01], noise: 0.06, seed: 181 }),
    ]),
  });

  const tarsals = [
    ["Calcaneus", [0.0, 0.041, -0.05], [0.019, 0.02, 0.036]],
    ["Talus", [0.0, 0.074, -0.01], [0.017, 0.015, 0.021]],
    ["Navicular", [-0.008, 0.062, 0.021], [0.012, 0.012, 0.008]],
    ["Cuboid", [0.016, 0.052, 0.016], [0.013, 0.012, 0.013]],
    ["Medial cuneiform", [-0.014, 0.056, 0.042], [0.009, 0.012, 0.011]],
    ["Intermediate cuneiform", [0.0, 0.057, 0.04], [0.008, 0.011, 0.01]],
    ["Lateral cuneiform", [0.012, 0.055, 0.038], [0.008, 0.011, 0.01]],
  ];
  tarsals.forEach(([n, d, r], i) => {
    out.push({
      name: `${n} (${side})`,
      geo: smallBone([s * (0.072 + d[0]), d[1], d[2]], r, 190 + i * 3 + s, 0.11),
    });
  });

  const toes = [
    { n: "hallux", mtA: [-0.016, 0.052, 0.054], mtB: [-0.02, 0.036, 0.113], ph: [[-0.022, 0.028, 0.152], [-0.023, 0.024, 0.174]] },
    { n: "2nd toe", mtA: [0.0, 0.053, 0.052], mtB: [-0.002, 0.031, 0.118], ph: [[-0.003, 0.024, 0.151], [-0.003, 0.021, 0.168], [-0.003, 0.019, 0.181]] },
    { n: "3rd toe", mtA: [0.012, 0.052, 0.05], mtB: [0.013, 0.029, 0.115], ph: [[0.014, 0.023, 0.146], [0.014, 0.02, 0.162], [0.014, 0.019, 0.174]] },
    { n: "4th toe", mtA: [0.022, 0.051, 0.046], mtB: [0.026, 0.028, 0.109], ph: [[0.028, 0.022, 0.137], [0.029, 0.02, 0.152], [0.029, 0.018, 0.163]] },
    { n: "5th toe", mtA: [0.03, 0.05, 0.028], mtB: [0.036, 0.027, 0.1], ph: [[0.038, 0.021, 0.124], [0.039, 0.019, 0.137], [0.039, 0.018, 0.147]] },
  ];
  const ord = ["1st", "2nd", "3rd", "4th", "5th"];
  toes.forEach((f, fi) => {
    const abs = (p) => [s * (0.072 + p[0]), p[1], p[2]];
    out.push({
      name: `${ord[fi]} metatarsal (${side})`,
      geo: longBone(abs(f.mtA), abs(f.mtB), {
        shaft: fi === 0 ? 0.0068 : 0.0048,
        top: 1.5,
        bot: 1.6,
        radial: 9,
        segments: 12,
        seed: 210 + fi,
      }),
    });
    let prev = abs(f.mtB);
    const labels = f.ph.length === 2 ? ["Proximal", "Distal"] : ["Proximal", "Middle", "Distal"];
    f.ph.forEach((p, pi) => {
      const cur = abs(p);
      out.push({
        name: `${labels[pi]} phalanx, ${f.n} (${side})`,
        geo: longBone(prev, cur, {
          shaft: (fi === 0 ? 0.0058 : 0.0038) - pi * 0.0004,
          top: 1.4,
          bot: 1.3,
          radial: 8,
          segments: 8,
          seed: 220 + fi * 4 + pi,
        }),
      });
      prev = cur;
    });
  });
  return out;
}

/* ------------------------------------------------------------- assembly */

export function buildSkeleton() {
  const bones = [];
  bones.push(...skullBones());
  VERTEBRAE.forEach((spec, i) => bones.push({ name: spec.name, geo: vertebraBone(spec, i % (spec.kind === "cervical" ? 7 : 99)) }));
  bones.push({ name: "Sacrum", geo: sacrumBone() });
  bones.push({ name: "Coccyx", geo: coccyxBone() });
  for (let i = 0; i < 12; i += 1) {
    [1, -1].forEach((s) =>
      bones.push({ name: `Rib ${i + 1} (${s > 0 ? "right" : "left"})`, geo: ribBone(i, s) })
    );
  }
  bones.push({ name: "Sternum", geo: sternumBone() });
  bones.push(...upperLimb(1), ...upperLimb(-1));
  bones.push(...lowerLimb(1), ...lowerLimb(-1));

  const geo = mergeAll(bones.map((b) => tint(b.geo, 0.99, 0.07, 5)));
  const cartilage = mergeAll([costalCartilage(), intervertebralDiscs(), jointCartilage()]);

  return { geometry: geo, cartilage, names: bones.map((b) => b.name), count: bones.length };
}

function jointCartilage() {
  const parts = [];
  const pad = (c, r, seed) => parts.push(blob({ center: c, radii: r, noise: 0.05, seed, segs: [12, 8] }));
  [1, -1].forEach((s) => {
    pad([s * 0.077, 0.494, 0.03], [0.026, 0.008, 0.02], 300 + s);
    pad([s * 0.206, 1.1, -0.006], [0.015, 0.007, 0.014], 302 + s);
    pad([s * 0.212, 0.856, 0.014], [0.015, 0.006, 0.014], 304 + s);
    pad([s * 0.071, 0.086, -0.006], [0.015, 0.006, 0.017], 306 + s);
    pad([s * 0.17, 1.418, 0.004], [0.018, 0.016, 0.017], 308 + s);
  });
  // Nasal septum + auricular cartilage give the face its shape.
  parts.push(
    sweep(
      [
        [0, 1.678, 0.1],
        [0, 1.665, 0.116],
        [0, 1.652, 0.104],
        [0, 1.648, 0.088],
      ],
      { radius: (t) => 0.007 + 0.006 * Math.sin(Math.PI * t), radial: 10, segments: 14, flatten: 0.8 }
    )
  );
  [1, -1].forEach((s) => {
    parts.push(
      xf(new THREE.TorusGeometry(0.019, 0.006, 8, 18, Math.PI * 1.45), {
        p: [s * 0.078, 1.688, -0.014],
        r: [0, s * (Math.PI / 2 - 0.25), s > 0 ? -1.1 : 1.1],
      })
    );
  });
  return mergeAll(parts);
}

export { SKULL };
export const mirrorBone = mir;
