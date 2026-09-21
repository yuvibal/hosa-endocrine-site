import * as THREE from "three";
import {
  sweep,
  loft,
  section,
  spherePatch,
  blob,
  lathe,
  xf,
  placeAlong,
  mergeAll,
  v3,
} from "../core/shapes.js";
import { PALETTE } from "../core/materials.js";
import { THORACIC_Y, spineZ, VERTEBRAE } from "./landmarks.js";

const tube = (pts, r0, r1 = null, o = {}) =>
  sweep(pts, {
    segments: o.segments ?? Math.max(12, pts.length * 6),
    radial: o.radial ?? 10,
    flatten: o.flatten ?? 1,
    radius: typeof r0 === "function" ? r0 : (t) => r0 + ((r1 ?? r0) - r0) * t,
  });

/* ------------------------------------------------------------------ brain */

function brain() {
  const hemis = [1, -1].map((s) =>
    blob({
      center: [s * 0.03, 1.716, 0.0],
      radii: [0.032, 0.05, 0.068],
      noise: 0.075,
      noiseFreq: 26,
      seed: 600 + s,
      segs: [30, 22],
    })
  );
  return mergeAll(hemis);
}

function cerebellum() {
  return mergeAll(
    [1, -1].map((s) =>
      blob({
        center: [s * 0.024, 1.649, -0.046],
        radii: [0.024, 0.017, 0.022],
        noise: 0.06,
        noiseFreq: 52,
        seed: 604 + s,
        segs: [24, 18],
      })
    )
  );
}

/* ---------------------------------------------------------------- thorax */

function heart() {
  const ventricles = lathe(
    [
      [0.0, 0.062],
      [0.044, 0.056],
      [0.05, 0.03],
      [0.05, 0.0],
      [0.045, -0.026],
      [0.032, -0.046],
      [0.016, -0.06],
      [0.0, -0.065],
    ],
    { segments: 28 }
  );
  placeAlong(ventricles, [0.024, 1.322, 0.026], [-0.03, 1.208, 0.064]);
  const rightAtrium = blob({
    center: [0.036, 1.318, 0.03],
    radii: [0.023, 0.021, 0.024],
    noise: 0.05,
    seed: 610,
  });
  const leftAtrium = blob({
    center: [-0.012, 1.33, 0.012],
    radii: [0.021, 0.019, 0.022],
    noise: 0.05,
    seed: 611,
  });
  const apexGroove = tube(
    [
      [0.004, 1.29, 0.064],
      [-0.006, 1.26, 0.066],
      [-0.018, 1.232, 0.062],
    ],
    0.004,
    0.003
  );
  return mergeAll([ventricles, rightAtrium, leftAtrium, apexGroove]);
}

function lungLobe(center, radii, s, seed) {
  const g = blob({ center: [0, 0, 0], radii, noise: 0.035, noiseFreq: 9, seed, segs: [26, 20] });
  // Flatten the mediastinal surface so the lobe hugs the heart.
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    if (s > 0 ? x < -radii[0] * 0.45 : x > radii[0] * 0.45) {
      pos.setX(i, x * 0.55);
    }
  }
  g.computeVertexNormals();
  return xf(g, { p: center });
}

function trachealRings() {
  const parts = [];
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    const y = 1.532 - t * 0.128;
    const z = 0.05 - t * 0.02;
    parts.push(
      xf(new THREE.TorusGeometry(0.0115, 0.0022, 7, 18, Math.PI * 1.55), {
        p: [0, y, z],
        r: [Math.PI / 2, 0, -Math.PI * 0.28],
      })
    );
  }
  return mergeAll(parts);
}

/* -------------------------------------------------------------- abdomen */

function smallIntestine() {
  const pts = [];
  const N = 150;
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const a = t * Math.PI * 2 * 4.6;
    const r = 0.052 * (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, t * 1.05)));
    pts.push([Math.sin(a) * r, 1.046 - t * 0.092 + Math.sin(a * 2) * 0.004, 0.03 + Math.cos(a) * r * 0.46]);
  }
  return sweep(pts, {
    segments: 260,
    radial: 9,
    radius: (t) => 0.0125 - 0.0022 * t,
  });
}

function kidney(s) {
  const rings = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const y = 1.01 + t * 0.076;
    const taper = Math.sin(Math.PI * Math.min(0.999, Math.max(0.001, t))) ** 0.55;
    rings.push(
      section(y, {
        w: 0.019 * taper,
        front: 0.021 * taper,
        back: 0.021 * taper,
        cx: s * (0.061 + 0.008 * Math.sin(Math.PI * t)),
        cz: -0.03,
        n: 20,
        e: 1,
      })
    );
  }
  return loft(rings);
}

/* --------------------------------------------------------------- nerves */

function spinalCord() {
  const pts = [];
  for (let y = 1.6; y >= 1.02; y -= 0.02) pts.push([0, y, spineZ(y) - 0.006]);
  return sweep(pts, { segments: 44, radial: 9, radius: (t) => 0.0072 - 0.003 * t });
}

function spinalNerves() {
  const parts = [];
  VERTEBRAE.forEach((v, i) => {
    const z = spineZ(v.y) - 0.004;
    [1, -1].forEach((s) => {
      parts.push(
        tube(
          [
            [0, v.y, z],
            [s * 0.018, v.y - 0.006, z - 0.002],
            [s * 0.036, v.y - 0.014, z + 0.004],
          ],
          0.0022,
          0.0012,
          { radial: 6, segments: 8 }
        )
      );
    });
    void i;
  });
  // Cauda equina.
  for (let k = 0; k < 8; k += 1) {
    const dx = (k - 3.5) * 0.0035;
    parts.push(
      tube(
        [
          [dx * 0.3, 1.03, spineZ(1.03) - 0.006],
          [dx, 0.98, spineZ(0.98) - 0.004],
          [dx * 1.2, 0.93, spineZ(0.93) + 0.002],
        ],
        0.0013,
        0.0008,
        { radial: 6, segments: 10 }
      )
    );
  }
  return mergeAll(parts);
}

function peripheralNerves() {
  const parts = [];
  [1, -1].forEach((s) => {
    // Brachial plexus into the arm.
    parts.push(
      tube(
        [
          [s * 0.016, 1.47, -0.03],
          [s * 0.05, 1.446, -0.006],
          [s * 0.1, 1.42, 0.008],
          [s * 0.15, 1.39, 0.012],
        ],
        0.0042,
        0.0034,
        { radial: 8 }
      )
    );
    // Median, ulnar and radial nerves.
    parts.push(
      tube(
        [
          [s * 0.15, 1.39, 0.012],
          [s * 0.178, 1.28, 0.018],
          [s * 0.19, 1.16, 0.02],
          [s * 0.198, 1.09, 0.022],
          [s * 0.204, 0.96, 0.028],
          [s * 0.206, 0.86, 0.03],
        ],
        0.0028,
        0.0018,
        { radial: 7, segments: 24 }
      )
    );
    parts.push(
      tube(
        [
          [s * 0.15, 1.386, 0.004],
          [s * 0.17, 1.28, 0.002],
          [s * 0.184, 1.12, 0.004],
          [s * 0.19, 1.0, 0.014],
          [s * 0.192, 0.86, 0.022],
        ],
        0.0026,
        0.0016,
        { radial: 7, segments: 22 }
      )
    );
    parts.push(
      tube(
        [
          [s * 0.152, 1.386, -0.008],
          [s * 0.186, 1.28, -0.026],
          [s * 0.206, 1.14, -0.012],
          [s * 0.216, 1.02, 0.006],
          [s * 0.22, 0.88, 0.016],
        ],
        0.0026,
        0.0015,
        { radial: 7, segments: 22 }
      )
    );
    // Sciatic nerve with tibial and common peroneal continuation.
    parts.push(
      tube(
        [
          [s * 0.03, 0.952, -0.048],
          [s * 0.058, 0.9, -0.042],
          [s * 0.07, 0.8, -0.04],
          [s * 0.074, 0.66, -0.038],
          [s * 0.074, 0.54, -0.03],
        ],
        0.0055,
        0.0038,
        { radial: 9, segments: 24 }
      )
    );
    parts.push(
      tube(
        [
          [s * 0.074, 0.54, -0.03],
          [s * 0.07, 0.42, -0.026],
          [s * 0.066, 0.26, -0.018],
          [s * 0.062, 0.1, -0.008],
        ],
        0.0032,
        0.0018,
        { radial: 7, segments: 20 }
      )
    );
    parts.push(
      tube(
        [
          [s * 0.076, 0.52, -0.026],
          [s * 0.092, 0.46, -0.014],
          [s * 0.09, 0.36, 0.008],
          [s * 0.08, 0.2, 0.014],
        ],
        0.0026,
        0.0014,
        { radial: 7, segments: 18 }
      )
    );
    // Femoral nerve.
    parts.push(
      tube(
        [
          [s * 0.038, 1.04, -0.02],
          [s * 0.06, 0.96, 0.012],
          [s * 0.072, 0.9, 0.03],
          [s * 0.08, 0.8, 0.036],
        ],
        0.0034,
        0.002,
        { radial: 7, segments: 18 }
      )
    );
    // Vagus nerve.
    parts.push(
      tube(
        [
          [s * 0.036, 1.64, 0.014],
          [s * 0.036, 1.55, 0.03],
          [s * 0.03, 1.44, 0.022],
          [s * 0.016, 1.3, 0.0],
          [s * 0.008, 1.18, 0.008],
        ],
        0.0022,
        0.0014,
        { radial: 6, segments: 24 }
      )
    );
    // Phrenic nerve.
    parts.push(
      tube(
        [
          [s * 0.03, 1.5, 0.026],
          [s * 0.034, 1.4, 0.02],
          [s * 0.04, 1.28, 0.014],
          [s * 0.044, 1.17, 0.012],
        ],
        0.0016,
        0.001,
        { radial: 6, segments: 16 }
      )
    );
    // Intercostal nerves.
    for (let i = 2; i < 10; i += 1) {
      const y = THORACIC_Y[i];
      parts.push(
        tube(
          [
            [s * 0.03, y - 0.016, spineZ(y) + 0.002],
            [s * 0.08, y - 0.026, spineZ(y) - 0.006],
            [s * 0.11, y - 0.036, 0.024],
          ],
          0.0013,
          0.0008,
          { radial: 6, segments: 10 }
        )
      );
    }
  });
  return mergeAll(parts);
}

/* ------------------------------------------------------------ lymphatic */

function lymphNodes() {
  const parts = [];
  const cluster = (center, n, spread, r, seed) => {
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + seed;
      parts.push(
        blob({
          center: [
            center[0] + Math.cos(a) * spread,
            center[1] + Math.sin(a * 1.7) * spread * 0.9,
            center[2] + Math.sin(a) * spread * 0.6,
          ],
          radii: [r, r * 1.3, r],
          noise: 0.08,
          seed: seed + i,
          segs: [10, 8],
        })
      );
    }
  };
  [1, -1].forEach((s) => {
    cluster([s * 0.048, 1.53, 0.026], 5, 0.024, 0.0042, 700 + s * 3);
    cluster([s * 0.14, 1.4, 0.014], 5, 0.022, 0.0048, 720 + s * 3);
    cluster([s * 0.07, 0.918, 0.038], 4, 0.02, 0.0045, 740 + s * 3);
    cluster([s * 0.076, 0.49, 0.0], 3, 0.016, 0.0035, 760 + s * 3);
  });
  cluster([0, 1.1, -0.01], 6, 0.03, 0.004, 780);
  return mergeAll(parts);
}

/* ------------------------------------------------------------- assembly */

export function buildOrgans() {
  const O = [];
  const add = (name, geo, color, systems, opts = {}) => O.push({ name, geo, color, systems, ...opts });

  /* nervous */
  add("Cerebrum", brain(), PALETTE.brain, ["nervous"]);
  add("Cerebellum", cerebellum(), 0xc79a97, ["nervous"]);
  add(
    "Brainstem",
    tube(
      [
        [0, 1.672, -0.012],
        [0, 1.64, -0.014],
        [0, 1.604, -0.012],
      ],
      0.011,
      0.009
    ),
    0xe0bdb6,
    ["nervous"]
  );
  add("Spinal cord", spinalCord(), PALETTE.cord, ["nervous"]);
  add("Spinal nerves", spinalNerves(), PALETTE.nerve, ["nervous"]);
  add("Peripheral nerves", peripheralNerves(), PALETTE.nerve, ["nervous"]);
  [1, -1].forEach((s) => {
    const sn = s > 0 ? "right" : "left";
    add(
      `Eye (${sn})`,
      mergeAll([
        blob({ center: [s * 0.031, 1.706, 0.072], radii: [0.0125, 0.0125, 0.0125], noise: 0.01, seed: 800 + s, segs: [18, 14] }),
      ]),
      PALETTE.eye,
      ["nervous"],
      { roughness: 0.12, clearcoat: 1 }
    );
    add(
      `Iris (${sn})`,
      lathe([[0.0035, 0], [0.006, 0.0006], [0.006, 0.001]], { segments: 18, pos: [s * 0.031, 1.706, 0.0835], rot: [Math.PI / 2, 0, 0] }),
      0x4a6c7a,
      ["nervous"],
      { roughness: 0.2 }
    );
    add(
      `Optic nerve (${sn})`,
      tube(
        [
          [s * 0.031, 1.704, 0.06],
          [s * 0.02, 1.698, 0.038],
          [s * 0.006, 1.69, 0.024],
        ],
        0.0035,
        0.003,
        { radial: 7 }
      ),
      PALETTE.nerve,
      ["nervous"]
    );
  });

  /* endocrine */
  add("Pituitary gland", blob({ center: [0, 1.664, 0.028], radii: [0.007, 0.006, 0.007], noise: 0.05, seed: 810 }), PALETTE.pituitary, ["endocrine", "nervous"]);
  add("Hypothalamus", blob({ center: [0, 1.676, 0.018], radii: [0.009, 0.007, 0.009], noise: 0.05, seed: 811 }), 0xdba3b4, ["endocrine", "nervous"]);
  add("Pineal gland", blob({ center: [0, 1.688, -0.016], radii: [0.005, 0.005, 0.005], noise: 0.05, seed: 812 }), 0xc98ba4, ["endocrine", "nervous"]);
  add(
    "Thyroid gland",
    mergeAll([
      blob({ center: [0.019, 1.512, 0.048], radii: [0.011, 0.019, 0.013], noise: 0.06, seed: 813 }),
      blob({ center: [-0.019, 1.512, 0.048], radii: [0.011, 0.019, 0.013], noise: 0.06, seed: 814 }),
      tube(
        [
          [0.012, 1.505, 0.052],
          [-0.012, 1.505, 0.052],
        ],
        0.007,
        0.007,
        { radial: 8, segments: 6 }
      ),
    ]),
    PALETTE.thyroid,
    ["endocrine"]
  );
  add(
    "Parathyroid glands",
    mergeAll(
      [1, -1].flatMap((s) =>
        [1.524, 1.5].map((y, i) =>
          blob({ center: [s * 0.022, y, 0.04], radii: [0.0032, 0.0034, 0.0032], noise: 0.05, seed: 820 + s + i })
        )
      )
    ),
    0xd8a24a,
    ["endocrine"]
  );
  add(
    "Thymus",
    mergeAll(
      [1, -1].map((s) =>
        blob({ center: [s * 0.013, 1.386, 0.056], radii: [0.014, 0.028, 0.012], noise: 0.07, seed: 830 + s })
      )
    ),
    PALETTE.thymus,
    ["endocrine", "lymphatic"]
  );
  [1, -1].forEach((s) => {
    add(
      `Adrenal gland (${s > 0 ? "right" : "left"})`,
      blob({ center: [s * 0.056, 1.088, -0.028], radii: [0.016, 0.008, 0.013], noise: 0.09, seed: 840 + s }),
      PALETTE.adrenal,
      ["endocrine"]
    );
    add(
      `Gonad (${s > 0 ? "right" : "left"})`,
      blob({ center: [s * 0.03, 0.874, 0.034], radii: [0.011, 0.013, 0.011], noise: 0.05, seed: 845 + s }),
      PALETTE.gonad,
      ["endocrine", "reproductive"]
    );
  });

  /* cardiovascular */
  add("Heart", heart(), PALETTE.heart, ["cardiovascular"], { roughness: 0.3, clearcoat: 0.8 });

  /* respiratory */
  add(
    "Nasal cavity",
    mergeAll([
      blob({ center: [0, 1.668, 0.086], radii: [0.013, 0.02, 0.018], noise: 0.06, seed: 850 }),
    ]),
    0xc98d8d,
    ["respiratory"]
  );
  add(
    "Larynx",
    mergeAll([
      lathe(
        [
          [0.012, 0],
          [0.016, 0.008],
          [0.017, 0.018],
          [0.013, 0.03],
          [0.012, 0.036],
        ],
        { segments: 20, pos: [0, 1.524, 0.05] }
      ),
      blob({ center: [0, 1.546, 0.064], radii: [0.011, 0.012, 0.009], noise: 0.04, seed: 851 }),
    ]),
    PALETTE.trachea,
    ["respiratory"]
  );
  add(
    "Trachea",
    mergeAll([
      tube(
        [
          [0, 1.534, 0.05],
          [0, 1.48, 0.044],
          [0, 1.43, 0.036],
          [0, 1.404, 0.03],
        ],
        0.0115,
        0.011,
        { radial: 14, segments: 20 }
      ),
      trachealRings(),
    ]),
    PALETTE.trachea,
    ["respiratory"]
  );
  add(
    "Bronchi",
    mergeAll([
      tube(
        [
          [0, 1.404, 0.03],
          [0.028, 1.378, 0.022],
          [0.056, 1.352, 0.012],
        ],
        0.0085,
        0.005
      ),
      tube(
        [
          [0, 1.404, 0.03],
          [-0.026, 1.376, 0.022],
          [-0.052, 1.348, 0.012],
        ],
        0.008,
        0.0048
      ),
      ...[1, -1].flatMap((s) =>
        [0.02, -0.02, -0.05].map((dy, i) =>
          tube(
            [
              [s * 0.054, 1.35, 0.012],
              [s * 0.068, 1.34 + dy, 0.006 + i * 0.008],
              [s * 0.082, 1.33 + dy * 1.4, 0.0 + i * 0.012],
            ],
            0.0034,
            0.0016,
            { radial: 7 }
          )
        )
      ),
    ]),
    PALETTE.trachea,
    ["respiratory"]
  );
  add("Superior lobe, right lung", lungLobe([0.074, 1.362, 0.004], [0.044, 0.05, 0.05], 1, 860), PALETTE.lung, ["respiratory"], { opacity: 0.94, roughness: 0.45 });
  add("Middle lobe, right lung", lungLobe([0.08, 1.286, 0.032], [0.034, 0.03, 0.038], 1, 861), PALETTE.lung, ["respiratory"], { opacity: 0.94, roughness: 0.45 });
  add("Inferior lobe, right lung", lungLobe([0.076, 1.244, -0.012], [0.046, 0.054, 0.05], 1, 862), PALETTE.lung, ["respiratory"], { opacity: 0.94, roughness: 0.45 });
  add("Superior lobe, left lung", lungLobe([-0.074, 1.352, 0.008], [0.042, 0.056, 0.05], -1, 863), PALETTE.lung, ["respiratory"], { opacity: 0.94, roughness: 0.45 });
  add("Inferior lobe, left lung", lungLobe([-0.076, 1.248, -0.006], [0.044, 0.056, 0.05], -1, 864), PALETTE.lung, ["respiratory"], { opacity: 0.94, roughness: 0.45 });

  /* digestive */
  add("Tongue", blob({ center: [0, 1.592, 0.062], radii: [0.018, 0.011, 0.03], noise: 0.05, seed: 870 }), 0xc0625f, ["digestive"]);
  add(
    "Esophagus",
    tube(
      [
        [0, 1.522, 0.042],
        [0, 1.44, 0.026],
        [0.004, 1.32, 0.0],
        [0.0, 1.22, 0.004],
        [-0.016, 1.166, 0.018],
      ],
      0.0085,
      0.0095,
      { segments: 26, radial: 10 }
    ),
    0xd2a894,
    ["digestive"]
  );
  add(
    "Stomach",
    sweep(
      [
        [-0.016, 1.164, 0.018],
        [-0.042, 1.146, 0.03],
        [-0.058, 1.112, 0.042],
        [-0.042, 1.082, 0.05],
        [-0.012, 1.078, 0.046],
        [0.006, 1.094, 0.036],
      ],
      {
        segments: 40,
        radial: 16,
        radius: (t) => 0.011 + 0.026 * Math.sin(Math.PI * Math.min(1, t * 1.06)) ** 0.7,
      }
    ),
    PALETTE.stomach,
    ["digestive"]
  );
  add(
    "Liver",
    mergeAll([
      (() => {
        const g = blob({ center: [0.05, 1.138, 0.026], radii: [0.072, 0.046, 0.056], noise: 0.04, seed: 880, segs: [26, 18] });
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i += 1) {
          if (pos.getY(i) > 1.168) pos.setY(i, 1.168 + (pos.getY(i) - 1.168) * 0.45);
        }
        g.computeVertexNormals();
        return g;
      })(),
      blob({ center: [-0.03, 1.144, 0.042], radii: [0.042, 0.028, 0.04], noise: 0.04, seed: 881, segs: [20, 14] }),
    ]),
    PALETTE.liver,
    ["digestive"]
  );
  add("Gallbladder", blob({ center: [0.036, 1.104, 0.056], radii: [0.011, 0.018, 0.012], noise: 0.05, seed: 884 }), PALETTE.gall, ["digestive"]);
  add(
    "Pancreas",
    sweep(
      [
        [0.026, 1.098, 0.016],
        [0.0, 1.104, 0.008],
        [-0.036, 1.11, 0.0],
        [-0.07, 1.118, -0.006],
      ],
      { segments: 22, radial: 10, flatten: 0.6, radius: (t) => 0.014 - 0.007 * t }
    ),
    PALETTE.pancreas,
    ["digestive", "endocrine"]
  );
  add("Spleen", blob({ center: [-0.084, 1.132, -0.014], radii: [0.024, 0.032, 0.022], noise: 0.05, seed: 886 }), PALETTE.spleen, ["lymphatic"]);
  add(
    "Duodenum",
    tube(
      [
        [0.006, 1.092, 0.036],
        [0.026, 1.078, 0.024],
        [0.024, 1.05, 0.014],
        [0.0, 1.044, 0.02],
        [-0.02, 1.052, 0.026],
      ],
      0.011,
      0.011,
      { segments: 24 }
    ),
    0xcf9a74,
    ["digestive"]
  );
  add("Jejunum and ileum", smallIntestine(), PALETTE.intestine, ["digestive"]);
  add("Cecum", blob({ center: [0.072, 0.966, 0.034], radii: [0.021, 0.023, 0.019], noise: 0.06, seed: 890 }), PALETTE.colon, ["digestive"]);
  add(
    "Appendix",
    tube(
      [
        [0.07, 0.948, 0.04],
        [0.064, 0.934, 0.046],
        [0.058, 0.924, 0.048],
      ],
      0.005,
      0.0035,
      { radial: 8 }
    ),
    0xbd7f61,
    ["digestive"]
  );
  add(
    "Ascending colon",
    tube(
      [
        [0.076, 0.972, 0.028],
        [0.082, 1.03, 0.024],
        [0.08, 1.086, 0.02],
      ],
      0.017,
      0.016,
      { segments: 18, radial: 12 }
    ),
    PALETTE.colon,
    ["digestive"]
  );
  add(
    "Transverse colon",
    tube(
      [
        [0.08, 1.088, 0.02],
        [0.04, 1.072, 0.05],
        [-0.004, 1.066, 0.056],
        [-0.046, 1.074, 0.048],
        [-0.08, 1.09, 0.018],
      ],
      0.016,
      0.016,
      { segments: 28, radial: 12 }
    ),
    PALETTE.colon,
    ["digestive"]
  );
  add(
    "Descending colon",
    tube(
      [
        [-0.08, 1.088, 0.016],
        [-0.084, 1.03, 0.014],
        [-0.08, 0.976, 0.016],
      ],
      0.015,
      0.014,
      { segments: 18, radial: 12 }
    ),
    PALETTE.colon,
    ["digestive"]
  );
  add(
    "Sigmoid colon",
    tube(
      [
        [-0.08, 0.972, 0.016],
        [-0.05, 0.944, 0.034],
        [-0.014, 0.938, 0.026],
        [0.0, 0.932, 0.008],
      ],
      0.014,
      0.013,
      { segments: 20, radial: 11 }
    ),
    PALETTE.colon,
    ["digestive"]
  );
  add(
    "Rectum",
    tube(
      [
        [0.0, 0.934, 0.008],
        [0.0, 0.9, -0.004],
        [0.0, 0.872, -0.002],
      ],
      0.014,
      0.011,
      { segments: 14, radial: 11 }
    ),
    0xb87a63,
    ["digestive"]
  );

  /* urinary */
  [1, -1].forEach((s) => {
    const sn = s > 0 ? "right" : "left";
    add(`Kidney (${sn})`, kidney(s), PALETTE.kidney, ["urinary"]);
    add(
      `Ureter (${sn})`,
      tube(
        [
          [s * 0.058, 1.014, -0.026],
          [s * 0.05, 0.96, -0.008],
          [s * 0.03, 0.912, 0.018],
          [s * 0.014, 0.898, 0.03],
        ],
        0.0038,
        0.0032,
        { radial: 7, segments: 18 }
      ),
      0xd9c48e,
      ["urinary"]
    );
  });
  add("Urinary bladder", blob({ center: [0, 0.896, 0.034], radii: [0.028, 0.024, 0.026], noise: 0.04, seed: 900 }), PALETTE.bladder, ["urinary"]);
  add(
    "Urethra",
    tube(
      [
        [0, 0.874, 0.036],
        [0, 0.862, 0.042],
      ],
      0.0035,
      0.003,
      { radial: 7, segments: 6 }
    ),
    0xd6c489,
    ["urinary"]
  );

  /* lymphatic */
  add("Lymph nodes", lymphNodes(), 0xd9cf9a, ["lymphatic"]);
  add(
    "Thoracic duct",
    tube(
      [
        [0.008, 1.06, -0.03],
        [0.006, 1.2, -0.036],
        [0.008, 1.34, -0.026],
        [0.02, 1.412, 0.014],
      ],
      0.0022,
      0.0028,
      { radial: 6, segments: 22 }
    ),
    0xe6e0b2,
    ["lymphatic"]
  );
  add(
    "Tonsils",
    mergeAll(
      [1, -1].map((s) => blob({ center: [s * 0.016, 1.598, 0.036], radii: [0.006, 0.008, 0.006], noise: 0.06, seed: 910 + s }))
    ),
    0xc46b6b,
    ["lymphatic"]
  );

  return O;
}

export { v3 };
