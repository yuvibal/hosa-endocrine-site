import * as THREE from "three";
import { sweep, sheet, spherePatch, blob, xf, mergeAll, tint, mir, mirPath } from "../core/shapes.js";
import { THORACIC_Y, spineZ, ribWidth } from "./landmarks.js";

const SKULL = { c: [0, 1.694, 0.004], r: [0.0716, 0.0928, 0.0894] };

/** Spindle-shaped muscle belly with tendinous ends. */
function fusiform(path, o = {}) {
  const { belly = 0.02, tendon = null, bias = 1, power = 0.8, flatten = 1, radial = 10, segments = 22 } = o;
  const thin = tendon ?? belly * 0.3;
  return sweep(path, {
    segments,
    radial,
    flatten,
    radius: (t) => {
      const s = Math.pow(Math.min(1, Math.max(0, t)), bias);
      return thin + (belly - thin) * Math.pow(Math.sin(Math.PI * s), power);
    },
  });
}

/** Thin muscular sheet lying on the cranium. */
function scalpSheet(opts) {
  return spherePatch({
    center: SKULL.c,
    radii: SKULL.r.map((v) => v * 1.035),
    segs: [20, 12],
    noise: 0.008,
    ...opts,
  });
}

function ring(center, radii, tube, rot = [0, 0, 0]) {
  const geo = new THREE.TorusGeometry(1, tube, 8, 22);
  return xf(geo, { p: center, r: rot, s: [radii[0], radii[1], 1] });
}

const side = (s, p) => [s * p[0], p[1], p[2]];
const path = (s, pts) => pts.map((p) => side(s, p));

/* ------------------------------------------------------------------ head */

function headNeck(s) {
  const out = [];
  const P = (pts) => path(s, pts);

  out.push({
    name: `Temporalis (${s > 0 ? "right" : "left"})`,
    geo: scalpSheet({
      phi: s > 0 ? [1.12, 2.02] : [-2.02, -1.12],
      theta: [0.5, 1.12],
      seed: 400 + s,
    }),
  });
  out.push({
    name: `Occipitofrontalis, frontal belly (${s > 0 ? "right" : "left"})`,
    geo: scalpSheet({ phi: s > 0 ? [0.02, 0.92] : [-0.92, -0.02], theta: [0.42, 1.16], seed: 402 + s }),
  });
  out.push({
    name: `Occipitofrontalis, occipital belly (${s > 0 ? "right" : "left"})`,
    geo: scalpSheet({ phi: s > 0 ? [2.3, 3.1] : [3.18, 3.98], theta: [0.72, 1.2], seed: 404 + s }),
  });
  out.push({
    name: `Masseter (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.058, 1.674, 0.028], [0.062, 1.65, 0.012], [0.058, 1.62, -0.008]]), {
      belly: 0.016,
      tendon: 0.011,
      flatten: 0.6,
      segments: 14,
    }),
  });
  out.push({
    name: `Orbicularis oculi (${s > 0 ? "right" : "left"})`,
    geo: ring(side(s, [0.032, 1.706, 0.079]), [0.023, 0.019], 0.004),
  });
  out.push({
    name: `Zygomaticus major (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.05, 1.676, 0.052], [0.036, 1.638, 0.076], [0.019, 1.606, 0.09]]), {
      belly: 0.005,
      segments: 12,
      radial: 7,
    }),
  });
  out.push({
    name: `Buccinator (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.048, 1.632, 0.026], [0.038, 1.616, 0.058], [0.02, 1.605, 0.084]]), {
      belly: 0.008,
      flatten: 0.4,
      segments: 12,
      radial: 8,
    }),
  });
  out.push({
    name: `Sternocleidomastoid (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.052, 1.632, -0.018], [0.045, 1.58, 0.014], [0.03, 1.5, 0.05], [0.021, 1.446, 0.068]]), {
      belly: 0.018,
      tendon: 0.008,
      segments: 24,
    }),
  });
  out.push({
    name: `Sternohyoid (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.013, 1.442, 0.066], [0.014, 1.5, 0.058], [0.014, 1.548, 0.05]]), {
      belly: 0.0055,
      segments: 12,
      radial: 7,
    }),
  });
  out.push({
    name: `Omohyoid (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.022, 1.548, 0.046], [0.06, 1.492, 0.026], [0.11, 1.456, -0.008]]), {
      belly: 0.005,
      segments: 16,
      radial: 7,
    }),
  });
  out.push({
    name: `Digastric (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.05, 1.63, -0.014], [0.036, 1.578, 0.03], [0.014, 1.556, 0.052]]), {
      belly: 0.006,
      segments: 14,
      radial: 7,
    }),
  });
  ["anterior", "middle", "posterior"].forEach((n, i) => {
    out.push({
      name: `Scalenus ${n} (${s > 0 ? "right" : "left"})`,
      geo: fusiform(
        P([
          [0.026 + i * 0.004, 1.532, 0.012 - i * 0.02],
          [0.036 + i * 0.006, 1.49, 0.006 - i * 0.022],
          [0.05 + i * 0.008, 1.442, -0.002 - i * 0.02],
        ]),
        { belly: 0.007, segments: 14, radial: 7 }
      ),
    });
  });
  out.push({
    name: `Splenius capitis (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.038, 1.628, -0.062], [0.024, 1.552, -0.078], [0.006, 1.46, -0.098]]), {
      belly: 0.011,
      flatten: 0.55,
      segments: 16,
    }),
  });
  out.push({
    name: `Levator scapulae (${s > 0 ? "right" : "left"})`,
    geo: fusiform(P([[0.028, 1.556, -0.066], [0.05, 1.5, -0.072], [0.076, 1.436, -0.07]]), {
      belly: 0.008,
      segments: 16,
      radial: 8,
    }),
  });
  out.push({
    name: `Platysma (${s > 0 ? "right" : "left"})`,
    geo: sheet(
      P([[0.01, 1.57, 0.062], [0.014, 1.5, 0.062], [0.02, 1.45, 0.062]]),
      P([[0.05, 1.586, 0.02], [0.056, 1.5, 0.024], [0.07, 1.452, 0.024]]),
      { thickness: 0.0035, bulge: 0.001, samples: 10, across: 4 }
    ),
  });
  return out;
}

/* ----------------------------------------------------------------- trunk */

function trunk(s) {
  const out = [];
  const P = (pts) => path(s, pts);
  const sname = s > 0 ? "right" : "left";

  out.push({
    name: `Trapezius (${sname})`,
    geo: sheet(
      [
        [0, 1.632, -0.068],
        [0, 1.55, -0.086],
        [0, 1.452, -0.101],
        [0, 1.3, -0.12],
        [0, 1.14, -0.116],
      ],
      P([
        [0.032, 1.626, -0.074],
        [0.14, 1.5, -0.052],
        [0.182, 1.452, -0.006],
        [0.1, 1.432, -0.064],
        [0.052, 1.42, -0.08],
      ]),
      { thickness: 0.009, bulge: 0.006, samples: 18, across: 6 }
    ),
  });
  out.push({
    name: `Latissimus dorsi (${sname})`,
    geo: sheet(
      [
        [0, 1.25, -0.118],
        [0, 1.14, -0.116],
        [0, 1.04, -0.104],
        [0.03 * s, 1.02, -0.086],
        [0.07 * s, 1.032, -0.05],
      ],
      P([
        [0.15, 1.36, -0.03],
        [0.166, 1.372, -0.018],
        [0.174, 1.382, -0.012],
        [0.178, 1.386, -0.008],
        [0.18, 1.39, -0.004],
      ]),
      { thickness: 0.009, bulge: 0.007, samples: 18, across: 7 }
    ),
  });
  out.push({
    name: `Rhomboid major (${sname})`,
    geo: sheet(
      [
        [0, 1.36, -0.118],
        [0, 1.3, -0.12],
        [0, 1.25, -0.118],
      ],
      P([
        [0.072, 1.37, -0.082],
        [0.082, 1.32, -0.08],
        [0.09, 1.284, -0.076],
      ]),
      { thickness: 0.007, bulge: 0.003, samples: 10, across: 4 }
    ),
  });
  out.push({
    name: `Rhomboid minor (${sname})`,
    geo: sheet(
      [
        [0, 1.43, -0.104],
        [0, 1.395, -0.112],
      ],
      P([
        [0.066, 1.42, -0.084],
        [0.072, 1.396, -0.084],
      ]),
      { thickness: 0.006, bulge: 0.002, samples: 8, across: 4 }
    ),
  });
  out.push({
    name: `Erector spinae (${sname})`,
    geo: fusiform(
      P([
        [0.026, 0.98, -0.062],
        [0.03, 1.08, -0.072],
        [0.032, 1.2, -0.096],
        [0.03, 1.32, -0.099],
        [0.026, 1.43, -0.085],
      ]),
      { belly: 0.023, tendon: 0.014, flatten: 0.85, segments: 26 }
    ),
  });
  out.push({
    name: `Serratus posterior (${sname})`,
    geo: sheet(
      [
        [0, 1.19, -0.115],
        [0, 1.14, -0.114],
      ],
      P([
        [0.098, 1.17, -0.06],
        [0.104, 1.12, -0.05],
      ]),
      { thickness: 0.005, bulge: 0.002, samples: 8, across: 4 }
    ),
  });
  out.push({
    name: `Quadratus lumborum (${sname})`,
    geo: fusiform(P([[0.038, 1.038, -0.05], [0.036, 1.08, -0.06], [0.03, 1.13, -0.068]]), {
      belly: 0.016,
      flatten: 0.7,
      segments: 14,
    }),
  });

  out.push({
    name: `Pectoralis major (${sname})`,
    geo: sheet(
      [
        [0.016 * s, 1.44, 0.064],
        [0.09 * s, 1.448, 0.042],
        [0.13 * s, 1.44, 0.028],
      ],
      P([
        [0.026, 1.28, 0.086],
        [0.14, 1.34, 0.076],
        [0.168, 1.372, 0.026],
      ]),
      { thickness: 0.016, bulge: 0.012, samples: 16, across: 6 }
    ),
  });
  out.push({
    name: `Pectoralis minor (${sname})`,
    geo: sheet(
      P([
        [0.056, 1.29, 0.076],
        [0.062, 1.256, 0.072],
        [0.066, 1.226, 0.066],
      ]),
      P([
        [0.112, 1.42, 0.024],
        [0.114, 1.418, 0.022],
        [0.116, 1.416, 0.02],
      ]),
      { thickness: 0.007, bulge: 0.003, samples: 10, across: 4 }
    ),
  });

  const serrations = [];
  for (let i = 2; i < 9; i += 1) {
    const y = THORACIC_Y[i];
    const w = ribWidth(i);
    serrations.push(
      fusiform(
        P([
          [w * 0.86, y - 0.016, 0.03],
          [w * 0.94, y + 0.01, -0.008],
          [0.094, y + 0.03, -0.054],
        ]),
        { belly: 0.007, flatten: 0.5, segments: 12, radial: 7 }
      )
    );
  }
  out.push({ name: `Serratus anterior (${sname})`, geo: mergeAll(serrations) });

  out.push({
    name: `External oblique (${sname})`,
    geo: sheet(
      P([
        [0.104, 1.28, 0.02],
        [0.128, 1.19, 0.014],
        [0.13, 1.1, 0.014],
        [0.116, 1.04, 0.026],
      ]),
      P([
        [0.048, 1.24, 0.088],
        [0.052, 1.17, 0.094],
        [0.05, 1.1, 0.094],
        [0.03, 1.026, 0.076],
      ]),
      { thickness: 0.011, bulge: 0.006, samples: 16, across: 6 }
    ),
  });
  out.push({
    name: `Internal oblique (${sname})`,
    geo: sheet(
      P([
        [0.096, 1.25, 0.012],
        [0.116, 1.17, 0.008],
        [0.114, 1.09, 0.012],
      ]),
      P([
        [0.042, 1.2, 0.082],
        [0.046, 1.13, 0.086],
        [0.04, 1.06, 0.08],
      ]),
      { thickness: 0.007, bulge: 0.003, samples: 12, across: 5 }
    ),
  });
  out.push({
    name: `Transversus abdominis (${sname})`,
    geo: sheet(
      P([
        [0.088, 1.23, 0.008],
        [0.104, 1.15, 0.004],
        [0.1, 1.07, 0.008],
      ]),
      P([
        [0.03, 1.19, 0.072],
        [0.034, 1.12, 0.076],
        [0.03, 1.05, 0.07],
      ]),
      { thickness: 0.006, bulge: 0.002, samples: 12, across: 5 }
    ),
  });
  out.push({
    name: `Rectus abdominis (${sname})`,
    geo: mergeAll([
      fusiform(
        P([
          [0.026, 1.216, 0.086],
          [0.028, 1.15, 0.096],
          [0.028, 1.07, 0.094],
          [0.024, 0.95, 0.07],
        ]),
        { belly: 0.024, tendon: 0.014, flatten: 0.55, segments: 24 }
      ),
      ...[1.19, 1.14, 1.09, 1.04].map((y) =>
        fusiform(P([[0.004, y, 0.094], [0.05, y, 0.088]]), { belly: 0.004, segments: 6, radial: 6 })
      ),
    ]),
  });
  out.push({
    name: `Psoas major (${sname})`,
    geo: fusiform(P([[0.03, 1.1, -0.036], [0.042, 1.02, 0.008], [0.062, 0.95, 0.018], [0.082, 0.908, -0.008]]), {
      belly: 0.016,
      tendon: 0.007,
      segments: 20,
    }),
  });
  out.push({
    name: `Iliacus (${sname})`,
    geo: fusiform(P([[0.086, 1.0, 0.02], [0.084, 0.96, 0.022], [0.086, 0.912, -0.004]]), {
      belly: 0.013,
      flatten: 0.7,
      segments: 14,
    }),
  });

  const ic = [];
  for (let i = 0; i < 11; i += 1) {
    const y0 = THORACIC_Y[i];
    const y1 = THORACIC_Y[i + 1];
    const w = ribWidth(i) * 0.9;
    ic.push(
      sheet(
        P([
          [0.03, y0 - 0.004, spineZ(y0) + 0.004],
          [w * 0.7, y0 - 0.012, spineZ(y0) - 0.008],
          [w, y0 - 0.022, 0.02],
          [w * 0.7, y0 - 0.03, 0.058],
        ]),
        P([
          [0.03, y1 + 0.002, spineZ(y1) + 0.004],
          [w * 0.7, y1 - 0.006, spineZ(y1) - 0.008],
          [w, y1 - 0.016, 0.02],
          [w * 0.7, y1 - 0.024, 0.058],
        ]),
        { thickness: 0.0045, bulge: 0.0015, samples: 12, across: 3 }
      )
    );
  }
  out.push({ name: `Intercostal muscles (${sname})`, geo: mergeAll(ic) });

  return out;
}

/* ------------------------------------------------------------ upper limb */

function upperLimbMuscles(s) {
  const out = [];
  const P = (pts) => path(s, pts);
  const sname = s > 0 ? "right" : "left";
  const add = (name, pts, o) => out.push({ name: `${name} (${sname})`, geo: fusiform(P(pts), o) });

  ["anterior", "lateral", "posterior"].forEach((n, i) => {
    const dz = [0.036, 0.0, -0.038][i];
    out.push({
      name: `Deltoid, ${n} part (${sname})`,
      geo: sheet(
        P([
          [0.06 + i * 0.02, 1.45, dz * 1.2 + 0.012],
          [0.13, 1.454, dz * 1.1],
          [0.176, 1.45, dz * 0.7],
        ]),
        P([
          [0.196, 1.31, dz * 0.35 + 0.004],
          [0.198, 1.305, dz * 0.3],
          [0.2, 1.3, dz * 0.25],
        ]),
        { thickness: 0.016, bulge: 0.012, samples: 14, across: 5 }
      ),
    });
  });
  add("Supraspinatus", [[0.09, 1.44, -0.05], [0.13, 1.438, -0.03], [0.166, 1.428, 0.0]], {
    belly: 0.011,
    segments: 14,
  });
  add("Infraspinatus", [[0.084, 1.36, -0.072], [0.13, 1.386, -0.052], [0.166, 1.41, -0.014]], {
    belly: 0.013,
    flatten: 0.6,
    segments: 16,
  });
  add("Subscapularis", [[0.086, 1.37, -0.05], [0.13, 1.39, -0.032], [0.164, 1.408, 0.002]], {
    belly: 0.012,
    flatten: 0.6,
    segments: 14,
  });
  add("Teres minor", [[0.094, 1.33, -0.07], [0.14, 1.36, -0.042], [0.172, 1.382, -0.014]], {
    belly: 0.008,
    segments: 12,
  });
  add("Teres major", [[0.094, 1.298, -0.068], [0.14, 1.33, -0.04], [0.176, 1.362, -0.014]], {
    belly: 0.011,
    segments: 14,
  });
  add("Coracobrachialis", [[0.112, 1.418, 0.022], [0.15, 1.33, 0.024], [0.18, 1.26, 0.012]], {
    belly: 0.01,
    segments: 16,
  });
  add("Biceps brachii, long head", [[0.158, 1.42, 0.014], [0.182, 1.33, 0.038], [0.196, 1.22, 0.04], [0.206, 1.11, 0.014]], {
    belly: 0.019,
    tendon: 0.007,
    segments: 22,
  });
  add("Biceps brachii, short head", [[0.13, 1.416, 0.026], [0.172, 1.33, 0.046], [0.19, 1.22, 0.046], [0.204, 1.112, 0.016]], {
    belly: 0.017,
    tendon: 0.006,
    segments: 22,
  });
  add("Brachialis", [[0.19, 1.3, 0.02], [0.198, 1.22, 0.026], [0.206, 1.13, 0.018]], {
    belly: 0.014,
    segments: 16,
  });
  add("Triceps brachii, long head", [[0.15, 1.412, -0.022], [0.176, 1.32, -0.04], [0.194, 1.21, -0.042], [0.204, 1.108, -0.028]], {
    belly: 0.019,
    tendon: 0.008,
    segments: 22,
  });
  add("Triceps brachii, lateral head", [[0.19, 1.36, -0.03], [0.208, 1.26, -0.04], [0.21, 1.14, -0.034]], {
    belly: 0.016,
    segments: 18,
  });
  add("Triceps brachii, medial head", [[0.176, 1.3, -0.03], [0.186, 1.22, -0.036], [0.198, 1.13, -0.03]], {
    belly: 0.013,
    segments: 16,
  });
  add("Anconeus", [[0.202, 1.12, -0.03], [0.212, 1.096, -0.022]], { belly: 0.007, segments: 8, radial: 7 });

  add("Brachioradialis", [[0.212, 1.14, 0.014], [0.226, 1.05, 0.026], [0.232, 0.95, 0.024]], {
    belly: 0.013,
    tendon: 0.005,
    segments: 18,
  });
  add("Extensor carpi radialis longus", [[0.214, 1.12, -0.004], [0.232, 1.03, 0.006], [0.234, 0.9, 0.012]], {
    belly: 0.01,
    tendon: 0.004,
    segments: 18,
  });
  add("Extensor carpi radialis brevis", [[0.212, 1.1, -0.012], [0.23, 1.02, -0.002], [0.232, 0.89, 0.008]], {
    belly: 0.009,
    tendon: 0.0035,
    segments: 18,
  });
  add("Extensor digitorum", [[0.206, 1.09, -0.026], [0.22, 1.0, -0.018], [0.222, 0.87, -0.002]], {
    belly: 0.011,
    tendon: 0.004,
    segments: 18,
  });
  add("Extensor carpi ulnaris", [[0.194, 1.09, -0.03], [0.2, 1.0, -0.024], [0.202, 0.87, -0.008]], {
    belly: 0.009,
    tendon: 0.0035,
    segments: 18,
  });
  add("Extensor pollicis longus", [[0.208, 1.02, -0.02], [0.222, 0.94, -0.006], [0.234, 0.85, 0.018]], {
    belly: 0.006,
    tendon: 0.003,
    segments: 16,
    radial: 8,
  });
  add("Abductor pollicis longus", [[0.212, 1.0, -0.014], [0.226, 0.92, 0.004], [0.238, 0.846, 0.026]], {
    belly: 0.006,
    tendon: 0.003,
    segments: 16,
    radial: 8,
  });
  add("Supinator", [[0.206, 1.09, 0.0], [0.218, 1.056, 0.008], [0.222, 1.02, 0.008]], {
    belly: 0.009,
    segments: 12,
  });
  add("Pronator teres", [[0.19, 1.088, 0.012], [0.204, 1.05, 0.024], [0.218, 1.016, 0.022]], {
    belly: 0.009,
    segments: 12,
  });
  add("Flexor carpi radialis", [[0.19, 1.086, 0.016], [0.208, 0.99, 0.032], [0.214, 0.868, 0.034]], {
    belly: 0.01,
    tendon: 0.0035,
    segments: 18,
  });
  add("Palmaris longus", [[0.188, 1.084, 0.012], [0.2, 0.99, 0.03], [0.206, 0.866, 0.034]], {
    belly: 0.006,
    tendon: 0.0025,
    segments: 16,
  });
  add("Flexor carpi ulnaris", [[0.184, 1.086, 0.004], [0.192, 0.99, 0.022], [0.196, 0.868, 0.028]], {
    belly: 0.01,
    tendon: 0.0035,
    segments: 18,
  });
  add("Flexor digitorum superficialis", [[0.192, 1.07, 0.012], [0.204, 0.98, 0.026], [0.208, 0.87, 0.03]], {
    belly: 0.012,
    tendon: 0.004,
    segments: 18,
  });
  add("Flexor digitorum profundus", [[0.196, 1.05, 0.004], [0.206, 0.96, 0.018], [0.21, 0.87, 0.024]], {
    belly: 0.01,
    tendon: 0.004,
    segments: 16,
  });

  out.push({
    name: `Thenar muscles (${sname})`,
    geo: fusiform(P([[0.226, 0.822, 0.034], [0.238, 0.798, 0.044], [0.246, 0.784, 0.05]]), {
      belly: 0.009,
      segments: 12,
      radial: 8,
    }),
  });
  out.push({
    name: `Hypothenar muscles (${sname})`,
    geo: fusiform(P([[0.184, 0.824, 0.028], [0.176, 0.796, 0.028], [0.172, 0.774, 0.026]]), {
      belly: 0.008,
      segments: 12,
      radial: 8,
    }),
  });
  const io = [];
  [0.016, 0.002, -0.012, -0.026].forEach((dx, i) => {
    io.push(
      fusiform(P([[0.206 + dx, 0.812, 0.026], [0.206 + dx - 0.004, 0.778, 0.03]]), {
        belly: 0.0042,
        segments: 8,
        radial: 6,
      })
    );
    void i;
  });
  out.push({ name: `Dorsal interossei of the hand (${sname})`, geo: mergeAll(io) });
  const lum = [];
  [0.014, 0.0, -0.014, -0.03].forEach((dx) => {
    lum.push(
      fusiform(P([[0.206 + dx, 0.802, 0.038], [0.206 + dx, 0.774, 0.038]]), {
        belly: 0.003,
        segments: 6,
        radial: 6,
      })
    );
  });
  out.push({ name: `Lumbricals of the hand (${sname})`, geo: mergeAll(lum) });

  return out;
}

/* ------------------------------------------------------------ lower limb */

function lowerLimbMuscles(s) {
  const out = [];
  const P = (pts) => path(s, pts);
  const sname = s > 0 ? "right" : "left";
  const add = (name, pts, o) => out.push({ name: `${name} (${sname})`, geo: fusiform(P(pts), o) });

  out.push({
    name: `Gluteus maximus (${sname})`,
    geo: sheet(
      P([
        [0.02, 1.0, -0.078],
        [0.05, 0.97, -0.082],
        [0.05, 0.9, -0.07],
      ]),
      P([
        [0.108, 0.968, -0.046],
        [0.116, 0.93, -0.044],
        [0.104, 0.878, -0.038],
      ]),
      { thickness: 0.034, bulge: 0.022, samples: 14, across: 6 }
    ),
  });
  add("Gluteus medius", [[0.07, 1.03, -0.03], [0.1, 1.0, -0.03], [0.108, 0.95, -0.018]], {
    belly: 0.019,
    flatten: 0.75,
    segments: 16,
  });
  add("Gluteus minimus", [[0.076, 1.008, -0.018], [0.098, 0.978, -0.014], [0.104, 0.946, -0.008]], {
    belly: 0.012,
    flatten: 0.7,
    segments: 12,
  });
  add("Tensor fasciae latae", [[0.104, 1.014, 0.05], [0.118, 0.94, 0.044], [0.124, 0.85, 0.03]], {
    belly: 0.013,
    tendon: 0.006,
    segments: 16,
  });
  add("Piriformis", [[0.034, 0.952, -0.062], [0.07, 0.946, -0.046], [0.104, 0.94, -0.022]], {
    belly: 0.009,
    segments: 12,
  });
  add("Sartorius", [[0.098, 1.01, 0.058], [0.09, 0.9, 0.07], [0.058, 0.7, 0.05], [0.048, 0.54, 0.014]], {
    belly: 0.011,
    tendon: 0.005,
    segments: 26,
  });
  add("Rectus femoris", [[0.096, 0.996, 0.056], [0.09, 0.88, 0.068], [0.084, 0.7, 0.068], [0.078, 0.55, 0.05]], {
    belly: 0.026,
    tendon: 0.009,
    segments: 26,
  });
  add("Vastus lateralis", [[0.112, 0.92, 0.014], [0.126, 0.82, 0.032], [0.122, 0.68, 0.044], [0.094, 0.54, 0.04]], {
    belly: 0.03,
    tendon: 0.01,
    segments: 26,
  });
  add("Vastus medialis", [[0.07, 0.88, 0.024], [0.056, 0.76, 0.04], [0.05, 0.64, 0.05], [0.062, 0.54, 0.044]], {
    belly: 0.026,
    tendon: 0.009,
    segments: 26,
  });
  add("Vastus intermedius", [[0.094, 0.9, 0.028], [0.09, 0.78, 0.042], [0.086, 0.64, 0.05]], {
    belly: 0.021,
    segments: 20,
  });
  add("Adductor magnus", [[0.03, 0.892, -0.006], [0.054, 0.8, -0.006], [0.07, 0.68, 0.0], [0.074, 0.58, 0.008]], {
    belly: 0.028,
    tendon: 0.012,
    segments: 24,
  });
  add("Adductor longus", [[0.022, 0.896, 0.036], [0.05, 0.82, 0.03], [0.07, 0.72, 0.018]], {
    belly: 0.018,
    tendon: 0.008,
    segments: 18,
  });
  add("Adductor brevis", [[0.022, 0.89, 0.022], [0.046, 0.84, 0.014], [0.062, 0.79, 0.006]], {
    belly: 0.013,
    segments: 14,
  });
  add("Pectineus", [[0.028, 0.9, 0.04], [0.05, 0.882, 0.024], [0.07, 0.876, 0.004]], {
    belly: 0.011,
    segments: 12,
  });
  add("Gracilis", [[0.014, 0.892, 0.014], [0.036, 0.78, 0.006], [0.046, 0.64, 0.004], [0.05, 0.53, 0.0]], {
    belly: 0.011,
    tendon: 0.005,
    segments: 24,
  });
  add("Biceps femoris", [[0.056, 0.884, -0.03], [0.078, 0.78, -0.046], [0.09, 0.66, -0.046], [0.096, 0.53, -0.03]], {
    belly: 0.024,
    tendon: 0.009,
    segments: 24,
  });
  add("Semitendinosus", [[0.046, 0.882, -0.032], [0.056, 0.78, -0.05], [0.058, 0.66, -0.05], [0.058, 0.53, -0.03]], {
    belly: 0.017,
    tendon: 0.007,
    segments: 24,
  });
  add("Semimembranosus", [[0.04, 0.878, -0.024], [0.05, 0.78, -0.04], [0.052, 0.66, -0.042], [0.054, 0.54, -0.026]], {
    belly: 0.019,
    tendon: 0.008,
    segments: 24,
  });
  add("Popliteus", [[0.058, 0.47, -0.02], [0.074, 0.45, -0.012], [0.09, 0.452, -0.004]], {
    belly: 0.009,
    segments: 12,
  });
  add("Gastrocnemius, medial head", [[0.062, 0.48, -0.024], [0.058, 0.4, -0.048], [0.062, 0.3, -0.042], [0.07, 0.16, -0.026]], {
    belly: 0.024,
    tendon: 0.008,
    segments: 24,
  });
  add("Gastrocnemius, lateral head", [[0.096, 0.48, -0.022], [0.098, 0.4, -0.044], [0.09, 0.3, -0.04], [0.074, 0.16, -0.026]], {
    belly: 0.021,
    tendon: 0.007,
    segments: 24,
  });
  add("Soleus", [[0.078, 0.43, -0.03], [0.078, 0.34, -0.038], [0.076, 0.22, -0.032], [0.072, 0.11, -0.03]], {
    belly: 0.024,
    tendon: 0.008,
    segments: 22,
  });
  add("Tibialis anterior", [[0.086, 0.44, 0.024], [0.084, 0.34, 0.03], [0.078, 0.22, 0.026], [0.07, 0.1, 0.016]], {
    belly: 0.015,
    tendon: 0.005,
    segments: 22,
  });
  add("Tibialis posterior", [[0.076, 0.4, -0.016], [0.072, 0.3, -0.018], [0.066, 0.18, -0.014], [0.062, 0.1, -0.006]], {
    belly: 0.011,
    tendon: 0.004,
    segments: 20,
  });
  add("Extensor digitorum longus", [[0.094, 0.42, 0.02], [0.092, 0.32, 0.026], [0.086, 0.2, 0.024], [0.078, 0.096, 0.024]], {
    belly: 0.01,
    tendon: 0.004,
    segments: 20,
  });
  add("Extensor hallucis longus", [[0.086, 0.34, 0.022], [0.078, 0.22, 0.024], [0.068, 0.1, 0.022]], {
    belly: 0.007,
    tendon: 0.003,
    segments: 16,
  });
  add("Flexor digitorum longus", [[0.07, 0.38, -0.014], [0.066, 0.28, -0.014], [0.062, 0.16, -0.01]], {
    belly: 0.009,
    tendon: 0.0035,
    segments: 18,
  });
  add("Peroneus longus", [[0.102, 0.44, 0.0], [0.104, 0.34, 0.002], [0.098, 0.2, 0.0], [0.09, 0.094, -0.002]], {
    belly: 0.012,
    tendon: 0.0045,
    segments: 22,
  });
  add("Peroneus brevis", [[0.1, 0.3, -0.004], [0.096, 0.2, -0.004], [0.09, 0.1, -0.004]], {
    belly: 0.009,
    tendon: 0.0035,
    segments: 16,
  });
  add("Plantaris", [[0.088, 0.47, -0.03], [0.082, 0.38, -0.044], [0.074, 0.2, -0.032]], {
    belly: 0.005,
    tendon: 0.0025,
    segments: 16,
  });
  add("Abductor hallucis", [[0.058, 0.044, -0.03], [0.05, 0.042, 0.03], [0.052, 0.036, 0.09]], {
    belly: 0.008,
    segments: 14,
    radial: 8,
  });
  add("Flexor digitorum brevis", [[0.072, 0.034, -0.03], [0.072, 0.03, 0.03], [0.076, 0.026, 0.096]], {
    belly: 0.008,
    segments: 14,
    radial: 8,
  });
  add("Extensor digitorum brevis", [[0.086, 0.058, 0.012], [0.084, 0.044, 0.056], [0.084, 0.032, 0.098]], {
    belly: 0.006,
    segments: 14,
    radial: 8,
  });
  return out;
}

function diaphragmMuscle() {
  const dome = spherePatch({
    center: [0, 1.11, 0.006],
    radii: [0.128, 0.076, 0.098],
    theta: [0, 1.36],
    segs: [28, 12],
    noise: 0.02,
    seed: 500,
  });
  const crus = mergeAll(
    [1, -1].map((s) =>
      fusiform(
        [
          [s * 0.018, 1.1, -0.03],
          [s * 0.022, 1.06, -0.04],
          [s * 0.024, 1.02, -0.042],
        ],
        { belly: 0.009, segments: 10, radial: 8 }
      )
    )
  );
  return mergeAll([dome, crus]);
}

export function buildMuscles() {
  const muscles = [];
  [1, -1].forEach((s) => {
    muscles.push(...headNeck(s), ...trunk(s), ...upperLimbMuscles(s), ...lowerLimbMuscles(s));
  });
  muscles.push({ name: "Diaphragm", geo: diaphragmMuscle(), systems: ["muscular", "respiratory"] });

  const main = muscles.filter((m) => !m.systems);
  const diaphragm = muscles.find((m) => m.systems);

  return {
    geometry: mergeAll(main.map((m) => tint(m.geo, 0.98, 0.1, 9))),
    diaphragm: tint(diaphragm.geo, 1.02, 0.06, 3),
    names: muscles.map((m) => m.name),
    count: muscles.length,
  };
}

export { mirPath, mir, blob };
