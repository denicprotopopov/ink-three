import React from 'react';
import { render } from 'ink';
import { ThreeAscii } from '../src/index.js';
import { TorusKnotGeometry } from 'three';

// ---- Pick your geometry here! ----
// Swap this one line to change the shape:
//   new BoxGeometry(1.8, 1.8, 1.8, 4, 4, 4)
//   new SphereGeometry(1.2, 32, 32)
//   new CylinderGeometry(0.8, 0.8, 2, 32, 4)
//   new IcosahedronGeometry(1.4, 3)
//   new TorusKnotGeometry(1, 0.35, 128, 32)
const geometry = new TorusKnotGeometry(1, 0.35, 128, 32);

render(<ThreeAscii geometry={geometry} />);