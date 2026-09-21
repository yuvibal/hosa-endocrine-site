import * as THREE from "three";
import { sweep, mergeAll, tint, mulberry32, v3 } from "../core/shapes.js";
import { THORACIC_Y, spineZ } from "./landmarks.js";

const tube = (pts, r0, r1 = null, o = {}) =>
  sweep(pts, {
    segments: o.segments ?? Math.max(10, Math.round(pts.length * 5)),
    radial: o.radial ?? 8,
    radius: (t) => r0 + ((r1 ?? r0) - r0) * t,
  });

const mirror = (pts) => pts.map((p) => [-p[0], p[1], p[2]]);

/** Grows a self-similar branching tuft; used for the smaller vessels. */
function growTree(origin, dir, radius, len, depth, rnd, out, spread = 0.7) {
  if (depth <= 0 || radius < 0.0007) return;
  const d = v3(dir).normalize();
  const end = v3(origin).addScaledVector(d, len);
  const mid = v3(origin)
    .addScaledVector(d, len * 0.5)
    .add(new THREE.Vector3((rnd() - 0.5) * len * 0.35, (rnd() - 0.5) * len * 0.35, (rnd() - 0.5) * len * 0.35));
  out.push(
    sweep([v3(origin).toArray(), mid.toArray(), end.toArray()], {
      segments: 8,
      radial: 6,
      radius: (t) => radius * (1 - 0.32 * t),
    })
  );
  const kids = rnd() > 0.25 ? 2 : 1;
  for (let i = 0; i < kids; i += 1) {
    const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const nd = d.clone().applyAxisAngle(axis, (rnd() * 0.5 + 0.25) * spread * (i === 0 ? 1 : -1));
    growTree(end.toArray(), nd.toArray(), radius * 0.68, len * 0.72, depth - 1, rnd, out, spread);
  }
}

function tufts(seeds, { seed = 1, radius = 0.0028, len = 0.035, depth = 4 } = {}) {
  const rnd = mulberry32(seed);
  const out = [];
  seeds.forEach(([p, dir]) => growTree(p, dir, radius, len, depth, rnd, out));
  return out;
}

/* --------------------------------------------------------------- arteries */

function arteries() {
  const parts = [];
  const named = [];
  const add = (name, geo) => {
    parts.push(geo);
    named.push(name);
  };

  add(
    "Ascending aorta and aortic arch",
    tube(
      [
        [0.01, 1.272, 0.042],
        [0.014, 1.332, 0.036],
        [0.006, 1.386, 0.016],
        [-0.014, 1.378, -0.012],
        [-0.012, 1.33, -0.028],
      ],
      0.013,
      0.011,
      { segments: 26, radial: 10 }
    )
  );
  add(
    "Descending thoracic and abdominal aorta",
    tube(
      [
        [-0.012, 1.33, -0.028],
        [-0.008, 1.24, -0.04],
        [-0.006, 1.14, -0.038],
        [-0.005, 1.06, -0.026],
        [-0.004, 1.01, -0.02],
      ],
      0.011,
      0.008,
      { segments: 24, radial: 9 }
    )
  );
  add(
    "Pulmonary trunk and arteries",
    mergeAll([
      tube(
        [
          [0.0, 1.3, 0.046],
          [-0.006, 1.348, 0.032],
          [-0.014, 1.356, 0.012],
        ],
        0.011,
        0.009
      ),
      tube(
        [
          [-0.014, 1.356, 0.012],
          [-0.05, 1.348, 0.004],
          [-0.076, 1.332, -0.004],
        ],
        0.008,
        0.005
      ),
      tube(
        [
          [-0.014, 1.356, 0.012],
          [0.04, 1.35, 0.008],
          [0.072, 1.334, 0.0],
        ],
        0.008,
        0.005
      ),
    ])
  );
  add(
    "Coronary arteries",
    mergeAll([
      tube(
        [
          [0.014, 1.29, 0.056],
          [0.03, 1.272, 0.05],
          [0.036, 1.244, 0.038],
          [0.03, 1.218, 0.03],
        ],
        0.0035,
        0.0018
      ),
      tube(
        [
          [-0.004, 1.292, 0.054],
          [-0.02, 1.27, 0.05],
          [-0.028, 1.24, 0.042],
        ],
        0.0032,
        0.0016
      ),
      tube(
        [
          [0.004, 1.286, 0.058],
          [0.006, 1.25, 0.062],
          [0.002, 1.216, 0.052],
        ],
        0.0026,
        0.0014
      ),
    ])
  );

  [1, -1].forEach((s) => {
    const sn = s > 0 ? "right" : "left";
    if (s > 0) {
      add(
        "Brachiocephalic trunk",
        tube(
          [
            [-0.004, 1.382, 0.006],
            [0.012, 1.4, 0.008],
            [0.022, 1.414, 0.008],
          ],
          0.008,
          0.007
        )
      );
    }
    add(
      `Common carotid artery (${sn})`,
      tube(
        [
          [s * 0.02, 1.412, 0.01],
          [s * 0.026, 1.47, 0.03],
          [s * 0.03, 1.53, 0.04],
          [s * 0.032, 1.586, 0.038],
        ],
        0.0058,
        0.0048,
        { segments: 20 }
      )
    );
    add(
      `Internal carotid artery (${sn})`,
      tube(
        [
          [s * 0.032, 1.586, 0.038],
          [s * 0.03, 1.62, 0.03],
          [s * 0.024, 1.654, 0.024],
          [s * 0.016, 1.676, 0.026],
        ],
        0.0042,
        0.0028,
        { segments: 16 }
      )
    );
    add(
      `External carotid artery (${sn})`,
      mergeAll([
        tube(
          [
            [s * 0.032, 1.586, 0.038],
            [s * 0.042, 1.616, 0.044],
            [s * 0.05, 1.646, 0.036],
          ],
          0.0038,
          0.0024
        ),
        tube(
          [
            [s * 0.05, 1.646, 0.036],
            [s * 0.058, 1.676, 0.022],
            [s * 0.056, 1.714, 0.008],
            [s * 0.046, 1.744, 0.0],
          ],
          0.0022,
          0.0012
        ),
        tube(
          [
            [s * 0.05, 1.646, 0.036],
            [s * 0.042, 1.63, 0.062],
            [s * 0.026, 1.612, 0.08],
          ],
          0.0018,
          0.001
        ),
      ])
    );
    add(
      `Subclavian and axillary artery (${sn})`,
      tube(
        [
          [s * 0.022, 1.41, 0.012],
          [s * 0.07, 1.428, 0.026],
          [s * 0.124, 1.412, 0.026],
          [s * 0.162, 1.382, 0.018],
        ],
        0.0062,
        0.005,
        { segments: 20 }
      )
    );
    add(
      `Brachial artery (${sn})`,
      tube(
        [
          [s * 0.162, 1.382, 0.018],
          [s * 0.178, 1.29, 0.024],
          [s * 0.19, 1.19, 0.024],
          [s * 0.198, 1.106, 0.018],
        ],
        0.0048,
        0.0038,
        { segments: 20 }
      )
    );
    add(
      `Radial artery (${sn})`,
      tube(
        [
          [s * 0.198, 1.1, 0.018],
          [s * 0.212, 1.01, 0.028],
          [s * 0.218, 0.92, 0.032],
          [s * 0.218, 0.862, 0.034],
        ],
        0.0032,
        0.0022,
        { segments: 18 }
      )
    );
    add(
      `Ulnar artery (${sn})`,
      tube(
        [
          [s * 0.198, 1.1, 0.014],
          [s * 0.192, 1.01, 0.024],
          [s * 0.194, 0.92, 0.03],
          [s * 0.196, 0.862, 0.032],
        ],
        0.0032,
        0.0022,
        { segments: 18 }
      )
    );
    add(
      `Palmar arches and digital arteries (${sn})`,
      mergeAll([
        tube(
          [
            [s * 0.218, 0.856, 0.036],
            [s * 0.206, 0.82, 0.04],
            [s * 0.19, 0.816, 0.036],
          ],
          0.0022,
          0.0018
        ),
        ...[0.03, 0.014, -0.002, -0.018, -0.032].map((dx, i) =>
          tube(
            [
              [s * (0.206 + dx * 0.6), 0.812, 0.038],
              [s * (0.206 + dx), 0.76, 0.04],
              [s * (0.206 + dx), 0.69 + i * 0.006, 0.042],
            ],
            0.0014,
            0.0007
          )
        ),
      ])
    );

    add(
      `Renal artery (${sn})`,
      tube(
        [
          [-0.005, 1.058, -0.024],
          [s * 0.036, 1.054, -0.03],
          [s * 0.062, 1.05, -0.032],
        ],
        0.0042,
        0.0028
      )
    );
    add(
      `Common and external iliac artery (${sn})`,
      tube(
        [
          [-0.004, 1.008, -0.02],
          [s * 0.03, 0.976, -0.014],
          [s * 0.054, 0.94, 0.012],
          [s * 0.062, 0.906, 0.034],
        ],
        0.0068,
        0.005,
        { segments: 18 }
      )
    );
    add(
      `Femoral artery (${sn})`,
      tube(
        [
          [s * 0.062, 0.902, 0.034],
          [s * 0.07, 0.8, 0.026],
          [s * 0.074, 0.68, 0.008],
          [s * 0.072, 0.56, -0.008],
        ],
        0.005,
        0.0038,
        { segments: 22 }
      )
    );
    add(
      `Popliteal artery (${sn})`,
      tube(
        [
          [s * 0.072, 0.56, -0.008],
          [s * 0.074, 0.5, -0.018],
          [s * 0.074, 0.45, -0.018],
        ],
        0.0038,
        0.0032
      )
    );
    add(
      `Anterior tibial artery (${sn})`,
      tube(
        [
          [s * 0.074, 0.45, -0.014],
          [s * 0.078, 0.34, 0.012],
          [s * 0.074, 0.2, 0.014],
          [s * 0.07, 0.1, 0.012],
        ],
        0.0028,
        0.0018,
        { segments: 20 }
      )
    );
    add(
      `Posterior tibial artery (${sn})`,
      tube(
        [
          [s * 0.074, 0.45, -0.022],
          [s * 0.07, 0.34, -0.018],
          [s * 0.066, 0.2, -0.012],
          [s * 0.064, 0.1, -0.008],
        ],
        0.0028,
        0.0018,
        { segments: 20 }
      )
    );
    add(
      `Dorsalis pedis and digital arteries (${sn})`,
      mergeAll([
        tube(
          [
            [s * 0.07, 0.096, 0.016],
            [s * 0.072, 0.066, 0.06],
            [s * 0.072, 0.048, 0.1],
          ],
          0.0018,
          0.0012
        ),
        ...[-0.018, -0.004, 0.01, 0.022, 0.032].map((dx, i) =>
          tube(
            [
              [s * (0.072 + dx * 0.5), 0.046, 0.104],
              [s * (0.072 + dx), 0.034, 0.14 - i * 0.004],
              [s * (0.072 + dx), 0.028, 0.166 - i * 0.008],
            ],
            0.001,
            0.0006
          )
        ),
      ])
    );
  });

  add(
    "Celiac trunk, splenic and hepatic arteries",
    mergeAll([
      tube(
        [
          [-0.008, 1.128, -0.032],
          [-0.004, 1.13, -0.014],
          [0.0, 1.128, 0.002],
        ],
        0.005,
        0.004
      ),
      tube(
        [
          [0.0, 1.128, 0.002],
          [-0.036, 1.126, 0.0],
          [-0.072, 1.118, -0.01],
        ],
        0.0032,
        0.002
      ),
      tube(
        [
          [0.0, 1.128, 0.002],
          [0.03, 1.13, 0.012],
          [0.058, 1.126, 0.018],
        ],
        0.003,
        0.0018
      ),
      tube(
        [
          [0.0, 1.13, 0.002],
          [-0.006, 1.15, 0.016],
          [-0.014, 1.16, 0.03],
        ],
        0.0022,
        0.0014
      ),
    ])
  );
  add(
    "Superior mesenteric artery",
    mergeAll([
      tube(
        [
          [-0.006, 1.11, -0.03],
          [-0.002, 1.09, -0.006],
          [0.0, 1.06, 0.018],
        ],
        0.0042,
        0.0026
      ),
      ...[-0.03, -0.01, 0.014, 0.034].map((dx, i) =>
        tube(
          [
            [0.0, 1.07, 0.012],
            [dx * 0.7, 1.04 - i * 0.008, 0.03],
            [dx, 1.02 - i * 0.012, 0.042],
          ],
          0.0018,
          0.001
        )
      ),
    ])
  );
  add(
    "Inferior mesenteric artery",
    tube(
      [
        [-0.005, 1.03, -0.022],
        [-0.014, 1.0, -0.002],
        [-0.03, 0.972, 0.014],
      ],
      0.0032,
      0.0018
    )
  );

  const intercostal = [];
  for (let i = 1; i < 11; i += 1) {
    const y = THORACIC_Y[i];
    [1, -1].forEach((s) =>
      intercostal.push(
        tube(
          [
            [-0.008, y, spineZ(y) + 0.002],
            [s * 0.05, y - 0.008, spineZ(y) - 0.008],
            [s * 0.1, y - 0.018, 0.012],
          ],
          0.0016,
          0.0009
        )
      )
    );
  }
  add("Intercostal arteries", mergeAll(intercostal));

  // Small vessels feeding the muscle beds.
  const seeds = [];
  [1, -1].forEach((s) => {
    seeds.push([[s * 0.19, 1.24, 0.03], [s * 0.4, -1, 0.5]]);
    seeds.push([[s * 0.2, 1.0, 0.026], [s * 0.4, -1, 0.6]]);
    seeds.push([[s * 0.072, 0.78, 0.02], [s * 0.5, -1, 0.7]]);
    seeds.push([[s * 0.074, 0.42, -0.014], [s * 0.4, -1, 0.5]]);
    seeds.push([[s * 0.09, 1.31, 0.05], [s * 0.7, 0.2, 0.7]]);
    seeds.push([[s * 0.06, 1.16, 0.06], [s * 0.6, -0.5, 0.8]]);
    seeds.push([[s * 0.03, 1.56, 0.04], [s * 0.6, 0.6, 0.5]]);
  });
  add("Arterioles", mergeAll(tufts(seeds, { seed: 4242, radius: 0.0022, len: 0.03, depth: 4 })));

  return { geometry: mergeAll(parts), names: named };
}

/* ------------------------------------------------------------------ veins */

function veins() {
  const parts = [];
  const named = [];
  const add = (name, geo) => {
    parts.push(geo);
    named.push(name);
  };

  add(
    "Superior vena cava",
    tube(
      [
        [0.024, 1.398, 0.018],
        [0.024, 1.36, 0.026],
        [0.02, 1.318, 0.032],
      ],
      0.011,
      0.012
    )
  );
  add(
    "Inferior vena cava",
    tube(
      [
        [0.016, 1.29, 0.026],
        [0.018, 1.2, 0.0],
        [0.018, 1.12, -0.022],
        [0.016, 1.04, -0.024],
        [0.012, 1.0, -0.02],
      ],
      0.012,
      0.009,
      { segments: 24, radial: 10 }
    )
  );
  add(
    "Hepatic and portal veins",
    mergeAll([
      tube(
        [
          [0.016, 1.2, -0.002],
          [0.03, 1.176, 0.012],
          [0.05, 1.166, 0.022],
        ],
        0.0058,
        0.0035
      ),
      tube(
        [
          [0.016, 1.196, -0.004],
          [-0.014, 1.172, 0.008],
          [-0.03, 1.164, 0.018],
        ],
        0.005,
        0.003
      ),
      tube(
        [
          [0.004, 1.1, 0.018],
          [0.004, 1.13, 0.014],
          [0.008, 1.152, 0.012],
        ],
        0.005,
        0.0035
      ),
      tube(
        [
          [-0.062, 1.116, -0.008],
          [-0.03, 1.108, 0.004],
          [0.004, 1.102, 0.016],
        ],
        0.0035,
        0.0045
      ),
    ])
  );
  add(
    "Azygos vein",
    tube(
      [
        [0.014, 1.38, 0.008],
        [0.016, 1.3, -0.026],
        [0.014, 1.2, -0.036],
        [0.012, 1.12, -0.03],
      ],
      0.004,
      0.003,
      { segments: 20 }
    )
  );

  [1, -1].forEach((s) => {
    const sn = s > 0 ? "right" : "left";
    add(
      `Brachiocephalic vein (${sn})`,
      tube(
        [
          [s * 0.058, 1.424, 0.022],
          [s * 0.036, 1.414, 0.024],
          [0.022, 1.4, 0.02],
        ],
        0.0072,
        0.009
      )
    );
    add(
      `Internal jugular vein (${sn})`,
      tube(
        [
          [s * 0.042, 1.592, 0.036],
          [s * 0.04, 1.53, 0.036],
          [s * 0.042, 1.47, 0.03],
          [s * 0.05, 1.428, 0.024],
        ],
        0.0058,
        0.0068,
        { segments: 18 }
      )
    );
    add(
      `External jugular vein (${sn})`,
      tube(
        [
          [s * 0.056, 1.62, 0.018],
          [s * 0.06, 1.56, 0.028],
          [s * 0.058, 1.49, 0.026],
          [s * 0.056, 1.44, 0.018],
        ],
        0.0032,
        0.004,
        { segments: 18 }
      )
    );
    add(
      `Subclavian and axillary vein (${sn})`,
      tube(
        [
          [s * 0.166, 1.376, 0.024],
          [s * 0.118, 1.404, 0.03],
          [s * 0.068, 1.42, 0.028],
        ],
        0.0058,
        0.0072
      )
    );
    add(
      `Brachial vein (${sn})`,
      tube(
        [
          [s * 0.196, 1.104, 0.022],
          [s * 0.186, 1.19, 0.028],
          [s * 0.174, 1.29, 0.028],
          [s * 0.166, 1.376, 0.024],
        ],
        0.0038,
        0.0052,
        { segments: 20 }
      )
    );
    add(
      `Cephalic vein (${sn})`,
      tube(
        [
          [s * 0.224, 0.842, 0.03],
          [s * 0.232, 0.94, 0.03],
          [s * 0.226, 1.04, 0.028],
          [s * 0.206, 1.108, 0.03],
          [s * 0.19, 1.2, 0.036],
          [s * 0.166, 1.33, 0.042],
          [s * 0.13, 1.41, 0.036],
        ],
        0.0028,
        0.0042,
        { segments: 28 }
      )
    );
    add(
      `Basilic vein (${sn})`,
      tube(
        [
          [s * 0.19, 0.844, 0.03],
          [s * 0.182, 0.94, 0.032],
          [s * 0.184, 1.04, 0.03],
          [s * 0.19, 1.104, 0.028],
          [s * 0.182, 1.2, 0.024],
          [s * 0.17, 1.3, 0.024],
        ],
        0.0026,
        0.0042,
        { segments: 24 }
      )
    );
    add(
      `Median cubital vein (${sn})`,
      tube(
        [
          [s * 0.206, 1.088, 0.032],
          [s * 0.198, 1.104, 0.034],
          [s * 0.19, 1.118, 0.03],
        ],
        0.0022,
        0.0022
      )
    );
    add(
      `Dorsal venous network of the hand (${sn})`,
      mergeAll([
        tube(
          [
            [s * 0.226, 0.84, 0.026],
            [s * 0.21, 0.812, 0.022],
            [s * 0.19, 0.816, 0.02],
          ],
          0.0018,
          0.0016
        ),
        ...[0.028, 0.012, -0.004, -0.02, -0.034].map((dx) =>
          tube(
            [
              [s * (0.206 + dx), 0.766, 0.024],
              [s * (0.206 + dx * 0.8), 0.79, 0.022],
              [s * (0.206 + dx * 0.4), 0.814, 0.022],
            ],
            0.0009,
            0.0016
          )
        ),
      ])
    );
    add(
      `Common and external iliac vein (${sn})`,
      tube(
        [
          [s * 0.058, 0.906, 0.026],
          [s * 0.05, 0.94, 0.004],
          [s * 0.026, 0.974, -0.018],
          [0.012, 1.0, -0.02],
        ],
        0.0055,
        0.0075,
        { segments: 18 }
      )
    );
    add(
      `Femoral vein (${sn})`,
      tube(
        [
          [s * 0.066, 0.56, -0.012],
          [s * 0.066, 0.68, 0.0],
          [s * 0.062, 0.8, 0.02],
          [s * 0.058, 0.9, 0.026],
        ],
        0.0042,
        0.0055,
        { segments: 22 }
      )
    );
    add(
      `Great saphenous vein (${sn})`,
      tube(
        [
          [s * 0.058, 0.09, 0.006],
          [s * 0.05, 0.2, 0.0],
          [s * 0.044, 0.34, -0.004],
          [s * 0.046, 0.46, -0.002],
          [s * 0.042, 0.6, 0.012],
          [s * 0.046, 0.76, 0.03],
          [s * 0.056, 0.892, 0.032],
        ],
        0.0026,
        0.0044,
        { segments: 32 }
      )
    );
    add(
      `Small saphenous vein (${sn})`,
      tube(
        [
          [s * 0.082, 0.078, -0.028],
          [s * 0.08, 0.18, -0.042],
          [s * 0.078, 0.32, -0.056],
          [s * 0.076, 0.44, -0.038],
        ],
        0.002,
        0.003,
        { segments: 22 }
      )
    );
    add(
      `Popliteal and tibial veins (${sn})`,
      mergeAll([
        tube(
          [
            [s * 0.07, 0.44, -0.022],
            [s * 0.068, 0.5, -0.02],
            [s * 0.066, 0.56, -0.014],
          ],
          0.003,
          0.0038
        ),
        tube(
          [
            [s * 0.066, 0.1, 0.008],
            [s * 0.07, 0.24, 0.008],
            [s * 0.07, 0.4, -0.016],
          ],
          0.002,
          0.0028
        ),
        tube(
          [
            [s * 0.062, 0.1, -0.012],
            [s * 0.064, 0.24, -0.014],
            [s * 0.068, 0.4, -0.024],
          ],
          0.002,
          0.0028
        ),
      ])
    );
    add(
      `Dorsal venous network of the foot (${sn})`,
      mergeAll([
        tube(
          [
            [s * 0.056, 0.086, 0.01],
            [s * 0.06, 0.056, 0.058],
            [s * 0.064, 0.042, 0.096],
          ],
          0.0016,
          0.0011
        ),
        ...[-0.014, 0.0, 0.014, 0.026].map((dx) =>
          tube(
            [
              [s * (0.072 + dx), 0.034, 0.14],
              [s * (0.072 + dx * 0.6), 0.042, 0.108],
              [s * (0.072 + dx * 0.2), 0.05, 0.078],
            ],
            0.0008,
            0.0014
          )
        ),
      ])
    );
    add(
      `Renal vein (${sn})`,
      tube(
        [
          [0.016, 1.052, -0.02],
          [s * 0.036, 1.05, -0.026],
          [s * 0.062, 1.048, -0.028],
        ],
        0.004,
        0.0028
      )
    );
  });

  const seeds = [];
  [1, -1].forEach((s) => {
    seeds.push([[s * 0.226, 1.0, 0.03], [s * 0.4, 1, 0.5]]);
    seeds.push([[s * 0.184, 1.0, 0.03], [s * -0.3, 1, 0.6]]);
    seeds.push([[s * 0.046, 0.52, 0.0], [s * 0.6, 1, 0.5]]);
    seeds.push([[s * 0.078, 0.3, -0.05], [s * 0.5, 1, -0.4]]);
    seeds.push([[s * 0.13, 1.41, 0.036], [s * 0.4, 0.4, 0.8]]);
    seeds.push([[s * 0.058, 1.5, 0.026], [s * 0.6, 0.7, 0.5]]);
    seeds.push([[s * 0.06, 1.2, 0.06], [s * 0.6, 0.6, 0.6]]);
  });
  add("Venules", mergeAll(tufts(seeds, { seed: 8181, radius: 0.0022, len: 0.032, depth: 4 })));

  return { geometry: mergeAll(parts), names: named };
}

export function buildVessels() {
  const a = arteries();
  const v = veins();
  return {
    arteries: tint(a.geometry, 1, 0.08, 13),
    veins: tint(v.geometry, 1, 0.08, 17),
    names: [...a.names, ...v.names],
    count: a.names.length + v.names.length,
  };
}

export { mirror };
