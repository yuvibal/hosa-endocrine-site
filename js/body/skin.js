import * as THREE from "three";
import { loft, section, sweep, spherePatch, blob, lathe, xf, mergeAll, fbm } from "../core/shapes.js";

const TORSO = [
  // y,      w,     front, back,  cz,     e
  [1.7935, 0.016, 0.018, 0.02, 0.004, 1],
  [1.784, 0.038, 0.043, 0.046, 0.004, 1],
  [1.768, 0.055, 0.061, 0.065, 0.004, 1],
  [1.75, 0.066, 0.072, 0.077, 0.004, 1],
  [1.732, 0.072, 0.081, 0.083, 0.005, 1],
  [1.714, 0.0755, 0.087, 0.085, 0.006, 1],
  [1.696, 0.0765, 0.091, 0.087, 0.006, 1],
  [1.678, 0.0745, 0.093, 0.085, 0.005, 1],
  [1.66, 0.07, 0.09, 0.081, 0.003, 1],
  [1.642, 0.0645, 0.086, 0.075, 0.0, 1],
  [1.624, 0.057, 0.082, 0.069, -0.003, 1],
  [1.606, 0.049, 0.077, 0.061, -0.006, 1],
  [1.588, 0.041, 0.07, 0.053, -0.009, 1],
  [1.572, 0.0355, 0.058, 0.049, -0.012, 1],
  [1.556, 0.035, 0.05, 0.049, -0.014, 1],
  [1.532, 0.04, 0.049, 0.052, -0.016, 1],
  [1.506, 0.045, 0.05, 0.056, -0.018, 0.95],
  [1.478, 0.052, 0.052, 0.061, -0.018, 0.9],
  [1.458, 0.088, 0.058, 0.07, -0.014, 0.82],
  [1.444, 0.15, 0.072, 0.078, -0.01, 0.76],
  [1.43, 0.183, 0.085, 0.084, -0.005, 0.72],
  [1.412, 0.185, 0.093, 0.088, -0.002, 0.74],
  [1.386, 0.171, 0.098, 0.09, 0.0, 0.8],
  [1.354, 0.162, 0.104, 0.092, 0.0, 0.84],
  [1.322, 0.158, 0.108, 0.094, 0.0, 0.86],
  [1.29, 0.155, 0.108, 0.094, 0.0, 0.86],
  [1.254, 0.15, 0.106, 0.092, 0.0, 0.86],
  [1.214, 0.142, 0.103, 0.09, 0.0, 0.86],
  [1.174, 0.134, 0.101, 0.088, 0.0, 0.87],
  [1.134, 0.128, 0.099, 0.086, 0.0, 0.88],
  [1.094, 0.127, 0.101, 0.086, 0.0, 0.88],
  [1.054, 0.132, 0.1, 0.09, 0.0, 0.88],
  [1.014, 0.143, 0.098, 0.098, 0.0, 0.88],
  [0.974, 0.152, 0.094, 0.105, 0.0, 0.9],
  [0.936, 0.155, 0.09, 0.104, 0.0, 0.92],
  [0.902, 0.151, 0.086, 0.096, 0.0, 0.94],
  [0.874, 0.144, 0.08, 0.085, 0.0, 0.96],
  [0.856, 0.135, 0.075, 0.076, 0.0, 1],
];

const LEG = [
  // y,     w,     front, back,  cx
  [0.93, 0.084, 0.078, 0.084, 0.086],
  [0.9, 0.082, 0.078, 0.084, 0.086],
  [0.86, 0.079, 0.076, 0.081, 0.086],
  [0.8, 0.076, 0.074, 0.078, 0.085],
  [0.74, 0.071, 0.071, 0.073, 0.083],
  [0.68, 0.067, 0.068, 0.069, 0.082],
  [0.62, 0.062, 0.064, 0.064, 0.08],
  [0.56, 0.057, 0.058, 0.058, 0.079],
  [0.51, 0.051, 0.053, 0.05, 0.078],
  [0.47, 0.049, 0.05, 0.051, 0.077],
  [0.43, 0.052, 0.049, 0.059, 0.078],
  [0.38, 0.052, 0.048, 0.061, 0.078],
  [0.32, 0.048, 0.045, 0.054, 0.077],
  [0.26, 0.043, 0.041, 0.047, 0.076],
  [0.2, 0.037, 0.035, 0.039, 0.075],
  [0.15, 0.031, 0.03, 0.032, 0.074],
  [0.11, 0.027, 0.027, 0.027, 0.073],
  [0.092, 0.025, 0.026, 0.025, 0.072],
];

const ARM = [
  // t along shoulder->elbow->wrist, radius
  [0.0, 0.052],
  [0.08, 0.05],
  [0.2, 0.046],
  [0.34, 0.042],
  [0.46, 0.039],
  [0.56, 0.042],
  [0.68, 0.042],
  [0.8, 0.036],
  [0.9, 0.031],
  [1.0, 0.027],
];

const HAND = [
  [0.85, 0.028, 0.019, 0.019],
  [0.834, 0.035, 0.021, 0.021],
  [0.81, 0.041, 0.02, 0.02],
  [0.786, 0.043, 0.018, 0.018],
  [0.766, 0.042, 0.016, 0.016],
];

const FOOT = [
  // z,     w,     top,   bot,   cx,    cy
  [-0.076, 0.014, 0.026, 0.026, 0.072, 0.038],
  [-0.06, 0.023, 0.038, 0.032, 0.072, 0.038],
  [-0.035, 0.028, 0.046, 0.03, 0.072, 0.038],
  [-0.005, 0.03, 0.054, 0.028, 0.072, 0.032],
  [0.035, 0.032, 0.042, 0.023, 0.072, 0.03],
  [0.075, 0.034, 0.03, 0.019, 0.073, 0.026],
  [0.112, 0.036, 0.021, 0.015, 0.073, 0.024],
  [0.142, 0.033, 0.015, 0.012, 0.073, 0.022],
  [0.168, 0.028, 0.012, 0.01, 0.072, 0.02],
  [0.188, 0.016, 0.009, 0.008, 0.07, 0.019],
];

const N_TORSO = 36;

function ringXY(z, { w, top, bot, cx = 0, cy = 0, n = 20 }) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push(new THREE.Vector3(cx + c * w, cy + s * (s >= 0 ? top : bot), z));
  }
  return pts;
}

/** Subtle organic surface noise so the skin is not perfectly smooth. */
function relax(geo, amount = 0.0016, freq = 12) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const d = fbm(x * freq, y * freq, z * freq, 3) * amount;
    pos.setXYZ(i, x + nrm.getX(i) * d, y + nrm.getY(i) * d, z + nrm.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}

function torso() {
  const rings = TORSO.map(([y, w, front, back, cz, e]) =>
    section(y, { w, front, back, cz, e, n: N_TORSO })
  );
  return relax(loft(rings, { capStart: true, capEnd: true }));
}

function legSkin(s) {
  const rings = LEG.map(([y, w, front, back, cx]) =>
    section(y, { w, front, back, cx: s * cx, e: 0.98, n: 24 })
  );
  return relax(loft(rings));
}

function footSkin(s) {
  const rings = FOOT.map(([z, w, top, bot, cx, cy]) => ringXY(z, { w, top, bot, cx: s * cx, cy, n: 22 }));
  return relax(loft(rings), 0.0012, 18);
}

function armSkin(s) {
  const path = [
    [s * 0.168, 1.43, 0.004],
    [s * 0.19, 1.3, 0.008],
    [s * 0.202, 1.18, 0.004],
    [s * 0.206, 1.098, -0.004],
    [s * 0.212, 1.0, 0.012],
    [s * 0.214, 0.92, 0.018],
    [s * 0.212, 0.86, 0.022],
  ];
  const lookup = (t) => {
    for (let i = 0; i < ARM.length - 1; i += 1) {
      if (t >= ARM[i][0] && t <= ARM[i + 1][0]) {
        const k = (t - ARM[i][0]) / (ARM[i + 1][0] - ARM[i][0]);
        return ARM[i][1] + (ARM[i + 1][1] - ARM[i][1]) * k;
      }
    }
    return ARM[ARM.length - 1][1];
  };
  return relax(sweep(path, { segments: 42, radial: 24, radius: lookup }), 0.0014, 16);
}

function handSkin(s) {
  const palm = loft(
    HAND.map(([y, w, front, back]) => section(y, { w, front, back, cx: s * 0.206, cz: 0.026, e: 0.7, n: 20 }))
  );
  const fingers = [
    { k: [0.234, 0.764, 0.032], t: [0.241, 0.672, 0.039], r: 0.0098 },
    { k: [0.212, 0.758, 0.03], t: [0.214, 0.656, 0.037], r: 0.0102 },
    { k: [0.19, 0.761, 0.028], t: [0.186, 0.665, 0.035], r: 0.0096 },
    { k: [0.172, 0.768, 0.024], t: [0.165, 0.688, 0.031], r: 0.0086 },
  ].map((f) =>
    sweep(
      [
        [s * f.k[0], f.k[1] + 0.008, f.k[2]],
        [s * (f.k[0] + (f.t[0] - f.k[0]) * 0.45), f.k[1] - (f.k[1] - f.t[1]) * 0.45, f.k[2] + 0.004],
        [s * f.t[0], f.t[1], f.t[2]],
      ],
      { segments: 16, radial: 14, radius: (t) => f.r * (1 - 0.22 * t) }
    )
  );
  const thumb = sweep(
    [
      [s * 0.222, 0.83, 0.032],
      [s * 0.244, 0.796, 0.046],
      [s * 0.262, 0.762, 0.058],
      [s * 0.27, 0.74, 0.064],
    ],
    { segments: 16, radial: 14, radius: (t) => 0.014 - 0.005 * t }
  );
  return relax(mergeAll([palm, ...fingers, thumb]), 0.0008, 24);
}

function toeSkin(s) {
  const toes = [
    { a: [0.052, 0.036, 0.113], b: [0.049, 0.026, 0.182], r: 0.0115 },
    { a: [0.07, 0.031, 0.118], b: [0.069, 0.021, 0.176], r: 0.0088 },
    { a: [0.085, 0.029, 0.115], b: [0.086, 0.02, 0.168], r: 0.0082 },
    { a: [0.098, 0.028, 0.109], b: [0.101, 0.019, 0.158], r: 0.0075 },
    { a: [0.108, 0.027, 0.1], b: [0.111, 0.018, 0.142], r: 0.0066 },
  ];
  return mergeAll(
    toes.map((t) =>
      sweep(
        [
          [s * t.a[0], t.a[1], t.a[2]],
          [s * (t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2, (t.a[2] + t.b[2]) / 2],
          [s * t.b[0], t.b[1], t.b[2]],
        ],
        { segments: 12, radial: 12, radius: (k) => t.r * (1 - 0.2 * k) }
      )
    )
  );
}

function faceFeatures() {
  const parts = [];
  // Nose.
  parts.push(
    sweep(
      [
        [0, 1.716, 0.088],
        [0, 1.696, 0.1],
        [0, 1.676, 0.114],
        [0, 1.664, 0.116],
        [0, 1.654, 0.104],
      ],
      { segments: 18, radial: 16, radius: (t) => 0.007 + 0.009 * Math.sin(Math.PI * t) ** 1.4, flatten: 1.15 }
    )
  );
  [1, -1].forEach((s) => {
    parts.push(blob({ center: [s * 0.012, 1.657, 0.106], radii: [0.008, 0.006, 0.008], noise: 0.04, seed: 940 + s, segs: [12, 10] }));
    // Ear.
    parts.push(
      xf(new THREE.TorusGeometry(0.019, 0.007, 8, 20, Math.PI * 1.5), {
        p: [s * 0.0775, 1.688, -0.012],
        r: [0, s * 1.35, s > 0 ? -1.15 : 1.15],
      })
    );
    parts.push(
      spherePatch({
        center: [s * 0.072, 1.686, -0.012],
        radii: [0.008, 0.018, 0.016],
        segs: [12, 10],
        noise: 0.04,
        seed: 944 + s,
      })
    );
    // Eyelid.
    parts.push(
      spherePatch({
        center: [s * 0.031, 1.7065, 0.0755],
        radii: [0.0155, 0.0145, 0.0135],
        phi: [-1.9, 1.9],
        theta: [0.05, 2.1],
        segs: [16, 14],
        thetaEnd: (u) => 2.1 - 0.62 * Math.exp(-((u - 0.5) ** 2) / 0.06),
        seed: 946 + s,
      })
    );
  });
  // Brow ridges and cheeks read better with a little extra volume.
  parts.push(blob({ center: [0, 1.6, 0.084], radii: [0.026, 0.014, 0.02], noise: 0.04, seed: 950, segs: [16, 12] }));
  return relax(mergeAll(parts), 0.0006, 26);
}

export function buildSkin() {
  const parts = [torso(), faceFeatures()];
  [1, -1].forEach((s) => {
    parts.push(armSkin(s), handSkin(s), legSkin(s), footSkin(s), toeSkin(s));
  });
  const body = mergeAll(parts);

  const hair = mergeAll([
    spherePatch({
      center: [0, 1.7, 0.004],
      radii: [0.0805, 0.1, 0.0945],
      phi: [-2.35, 2.35],
      theta: [0.0, 1.16],
      segs: [34, 18],
      noise: 0.022,
      noiseFreq: 16,
      seed: 960,
      thetaEnd: (u) => {
        const p = -2.35 + 4.7 * u;
        // Hairline dips at the temples, rises across the forehead.
        return Math.abs(p) < 0.95 ? 0.72 + 0.14 * Math.abs(p) : 1.16;
      },
    }),
    spherePatch({
      center: [0, 1.7, 0.004],
      radii: [0.0805, 0.1, 0.0945],
      phi: [2.3, 4.0],
      theta: [1.0, 1.42],
      segs: [18, 8],
      noise: 0.02,
      seed: 961,
    }),
    ...[1, -1].map((s) =>
      sweep(
        [
          [s * 0.012, 1.727, 0.09],
          [s * 0.03, 1.729, 0.084],
          [s * 0.05, 1.722, 0.066],
        ],
        { segments: 10, radial: 8, radius: (t) => 0.0055 - 0.0022 * t, flatten: 0.4 }
      )
    ),
    ...[1, -1].map((s) =>
      sweep(
        [
          [s * 0.038, 1.7, 0.062],
          [s * 0.048, 1.688, 0.05],
          [s * 0.05, 1.664, 0.042],
        ],
        { segments: 8, radial: 7, radius: 0.0035, flatten: 0.5 }
      )
    ),
  ]);

  const nailSpecs = [
    [0.241, 0.668, 0.032],
    [0.214, 0.652, 0.03],
    [0.186, 0.661, 0.028],
    [0.165, 0.685, 0.024],
    [0.272, 0.737, 0.056],
  ];
  const nails = mergeAll(
    [1, -1].flatMap((s) => [
      ...nailSpecs.map((p, i) =>
        blob({ center: [s * p[0], p[1], p[2] - 0.004], radii: [0.0045, 0.006, 0.002], noise: 0.02, seed: 970 + i, segs: [10, 8] })
      ),
      ...[
        [0.049, 0.031, 0.182],
        [0.069, 0.025, 0.176],
        [0.086, 0.024, 0.168],
        [0.101, 0.023, 0.158],
        [0.111, 0.022, 0.142],
      ].map((p, i) =>
        blob({ center: [s * p[0], p[1] + 0.004, p[2]], radii: [0.005, 0.002, 0.005], noise: 0.02, seed: 980 + i, segs: [10, 8] })
      ),
    ])
  );

  const lips = mergeAll([
    xf(new THREE.TorusGeometry(0.0185, 0.0052, 8, 24), { p: [0, 1.6, 0.0885], r: [Math.PI / 2 - 0.25, 0, 0], s: [1, 0.55, 1] }),
  ]);

  const areola = mergeAll(
    [1, -1].map((s) =>
      lathe([[0.0, 0], [0.011, 0.0015], [0.012, 0.002]], {
        segments: 16,
        pos: [s * 0.072, 1.324, 0.104],
        rot: [Math.PI / 2, 0, 0],
      })
    )
  );

  return { body, hair, nails, lips, areola };
}
