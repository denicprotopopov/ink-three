import React from 'react';
import { render } from 'ink';
import { Matrix4, SphereGeometry, TorusGeometry } from 'three';
import {
  ThreeAscii,
  extractTriangles,
  ambientLight,
  directionalLight,
  pointLight,
  defaultTransform,
} from '../src/index.js';

// ── Planet ────────────────────────────────────────────────────────────────────
const planet = new SphereGeometry(0.7, 32, 20);

// ── Rings (tilted ~27° like Saturn's rings) ───────────────────────────────────
const rings = new TorusGeometry(1.2, 0.07, 8, 80);
rings.rotateX(Math.PI * 0.15);

// ── Moon (offset from the planet's origin) ────────────────────────────────────
const moon = new SphereGeometry(0.18, 16, 12);
moon.translate(1.9, 0.25, 0);

// Merge all objects into one triangle list for the renderer
const triangles = [
  ...extractTriangles(planet),
  ...extractTriangles(rings),
  ...extractTriangles(moon),
];

// ── Lighting ──────────────────────────────────────────────────────────────────
const lights = [
  ambientLight(0.1),                          
  directionalLight([1, 0.6, 1], 1.0),         
  pointLight([0, 3, 2], 3.0, 0.4),           
];

// ── Custom rotation ───────────────────────────────────────────────────────────
// Slow Y-only spin so the rings stay visible. Compose with defaultTransform to
// keep the gentle X-tilt, then override the Y speed.
function sceneTransform(t: number): Matrix4 {
  // Tilt gently on X (1/4 of the default speed), spin slowly on Y
  const tiltX = new Matrix4().makeRotationX(t * 0.18);
  const spinY = new Matrix4().makeRotationY(t * 0.35);
  return new Matrix4().multiplyMatrices(tiltX, spinY);
}

render(
  <ThreeAscii
    triangles={triangles}
    lights={lights}
    getTransform={sceneTransform}
    initialZoom={4}
    showHud
  />,
);