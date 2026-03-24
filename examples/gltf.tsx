import React from 'react';
import { render } from 'ink';
import { ThreeAscii, loadGLTFAnimated } from '../src/index.js';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npx tsx examples/gltf.tsx <model.glb>');
  process.exit(1);
}

// loadGLTFAnimated supports the full glTF animation system.
// The AnimationMixer is driven automatically by <ThreeAscii> every frame4
//
// If the model has no animations it renders as a static mesh, identical to
// using loadGLTF().
const animatedScene = await loadGLTFAnimated(filePath);

if (animatedScene.clipNames.length > 0) {
  console.log(`Loaded ${animatedScene.clipNames.length} animation clip(s): ${animatedScene.clipNames.join(', ')}`);
  // Play the first clip.  Pass a clip name to play a specific one:
  //   animatedScene.play('Walk');
  animatedScene.play();
} else {
  console.log('No animations found in this model. Rendering static mesh.');
}

render(<ThreeAscii animatedGLTF={animatedScene} />);