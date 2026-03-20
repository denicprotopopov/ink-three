import React from 'react';
import { render } from 'ink';
import { SphereGeometry, TorusGeometry } from 'three';
import {
  ThreeAscii,
  extractTriangles,
  ambientLight,
  directionalLight,
  pointLight,
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

render(
  <ThreeAscii
    triangles={triangles}
    lights={lights}
    initialZoom={4}
    showHud
  />,
);