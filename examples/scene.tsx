import React from 'react';
import { render } from 'ink';
import { Matrix4, SphereGeometry, TorusGeometry } from 'three';
import {
  ThreeAscii,
  extractTriangles,
  ambientLight,
  directionalLight,
  pointLight,
} from '../src/index.js';
import type { SceneObject } from '../src/index.js';

// ── Planet ────────────────────────────────────────────────────────────────────
const planet = new SphereGeometry(0.7, 32, 20);

// ── Rings (tilted ~27° like Saturn's rings) ───────────────────────────────────
const rings = new TorusGeometry(1.2, 0.07, 8, 80);
rings.rotateX(Math.PI * 0.15);

// ── Moon (offset from the planet's origin) ────────────────────────────────────
const moon = new SphereGeometry(0.18, 16, 12);
moon.translate(1.9, 0.25, 0);

// ── Lighting ──────────────────────────────────────────────────────────────────
const lights = [
  ambientLight(0.1),                          
  directionalLight([1, 0.6, 1], 1.0),         
  pointLight([0, 3, 2], 3.0, 0.4),           
];

// ── Per-object animation ──────────────────────────────────────────────────────
// Each SceneObject has its own getTransform so objects can move independently.
// All objects are still depth-sorted together (correct occlusion).
//
// To disable rotation entirely for an object, use:
//   getTransform: () => new Matrix4()

// To add a whole-scene animation on top of the per-object transforms, pass a
// getTransform prop directly on <ThreeAscii>.  The scene transform is composed
// with each object's own transform so everything moves as a unit while objects
// still animate relative to each other. Example:
//
//   import { defaultTransform } from '../src/index.js';
//
//   <ThreeAscii
//     objects={objects}
//     lights={lights}
//     getTransform={(t) => new Matrix4().makeRotationX(Math.sin(t * 0.3) * 0.4)}
//   />
//
// or, to build on top of the library's built-in spin:
//
//   <ThreeAscii
//     objects={objects}
//     lights={lights}
//     getTransform={(t) => defaultTransform(t).multiply(new Matrix4().makeRotationZ(t * 0.1))}
//   />
function bodyTransform(t: number): Matrix4 {
  const tiltX = new Matrix4().makeRotationX(t * 0.18);
  const spinY = new Matrix4().makeRotationY(t * 0.35);
  return new Matrix4().multiplyMatrices(tiltX, spinY);
}

const objects: SceneObject[] = [
  {
    triangles: extractTriangles(planet),
    getTransform: bodyTransform,
  },
  {
    triangles: extractTriangles(rings),
    getTransform: bodyTransform,
  },
  {
    triangles: extractTriangles(moon),
    getTransform: () => new Matrix4(),
  },
];

render(
  <ThreeAscii
    objects={objects}
    lights={lights}
    initialZoom={4}
    showHud
  />,
);