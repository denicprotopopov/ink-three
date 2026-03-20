import React from 'react';
import { render } from 'ink';
import { ThreeAscii, loadGLTF } from '../src/index.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx examples/gltf.tsx <model.glb>');
  process.exit(1);
}

const triangles = await loadGLTF(filePath);
console.log(`Loaded ${triangles.length} triangles. Rendering...`);
render(<ThreeAscii triangles={triangles} />);