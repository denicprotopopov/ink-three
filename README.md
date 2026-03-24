# ink-three

Three.js ASCII renderer component for [Ink](https://github.com/vadimdemedes/ink). Render 3D geometries and GLTF/GLB models as animated ASCII art in your terminal.

## Install

```bash
npm install ink-three three react ink
```

## Quick start: built-in geometry

```tsx
import React from 'react';
import { render } from 'ink';
import { ThreeAscii } from 'ink-three';
import { TorusKnotGeometry } from 'three';

const geometry = new TorusKnotGeometry(1, 0.35, 128, 32);
render(<ThreeAscii geometry={geometry} />);
```

## GLTF / GLB model

```tsx
import React from 'react';
import { render } from 'ink';
import { ThreeAscii, loadGLTF } from 'ink-three';

const triangles = await loadGLTF('./model.glb');
render(<ThreeAscii triangles={triangles} />);
```

## Static rotation

Rotate a model at a fixed angle without writing an animation function just like `mesh.rotation.set(x, y, z)` in Three.js:

```tsx
import React from 'react';
import { render } from 'ink';
import { ThreeAscii } from 'ink-three';
import { IcosahedronGeometry } from 'three';

render(
  <ThreeAscii
    geometry={new IcosahedronGeometry(1.4, 3)}
    rotation={[0, Math.PI / 4, 0]}
  />
);
```

`rotation` is `[x, y, z]` in radians (Euler XYZ order). It disables the default auto-spin so the model holds its pose.

Combine with `getTransform` to add animation on top of a fixed base pose:

```tsx
<ThreeAscii
  geometry={geo}
  rotation={[Math.PI / 6, 0, 0]}           // tilt 30° around X
  getTransform={(t) => new Matrix4().makeRotationY(t * 0.5)}  // spin on top
/>
```

## Animated GLTF / GLB model

Use `loadGLTFAnimated` for models that have embedded animations (skeletal, morph-target, or object-level keyframes):

```tsx
import React from 'react';
import { render } from 'ink';
import { ThreeAscii, loadGLTFAnimated } from 'ink-three';

const scene = await loadGLTFAnimated('./character.glb');
console.log('clips:', scene.clipNames);   // ['Walk', 'Idle', ...]
scene.play();                              // or scene.play('Walk')

render(<ThreeAscii animatedGLTF={scene} />);
```

Add a whole-scene rotation on top of the model's own animation with `getTransform`:

```tsx
render(
  <ThreeAscii
    animatedGLTF={scene}
    getTransform={(t) => new Matrix4().makeRotationY(t * 0.2)}
  />
);
```

## Multi-object scenes

Render multiple objects together with per-object animation and correct depth-sorting:

```tsx
import React from 'react';
import { render } from 'ink';
import { Matrix4, SphereGeometry, TorusGeometry } from 'three';
import { ThreeAscii, extractTriangles } from 'ink-three';
import type { SceneObject } from 'ink-three';

const sphere = new SphereGeometry(0.7, 32, 20);
const ring   = new TorusGeometry(1.2, 0.07, 8, 80);
ring.rotateX(Math.PI * 0.15);

const objects: SceneObject[] = [
  {
    triangles: extractTriangles(sphere),
    getTransform: (t) => new Matrix4().makeRotationY(t * 0.4),
  },
  {
    triangles: extractTriangles(ring),
    getTransform: (t) => new Matrix4().makeRotationY(t * 0.4),
  },
];

render(<ThreeAscii objects={objects} />);
```

A `getTransform` prop on `<ThreeAscii>` itself acts as a whole-scene transform layered on top of all per-object transforms.

## Custom lighting

```tsx
import { ThreeAscii, ambientLight, directionalLight, pointLight } from 'ink-three';

const lights = [
  ambientLight(0.1),                      // soft fill
  directionalLight([1, 0.6, 1], 1.0),     // sunlight
  pointLight([0, 3, 2], 3.0, 0.4),        // overhead glow
];

render(<ThreeAscii geometry={geo} lights={lights} />);
```

## `<ThreeAscii />` props

| Prop | Type | Default | Description |
|---|---|---|---|
| `geometry` | `BufferGeometry` | `TorusKnotGeometry` | A Three.js BufferGeometry to render |
| `triangles` | `Triangle[]` | — | Pre-extracted triangles (takes priority over `geometry`) |
| `objects` | `SceneObject[]` | — | Multiple objects with independent per-frame transforms |
| `animatedGLTF` | `AnimatedGLTFScene` | — | Animated GLTF scene from `loadGLTFAnimated` |
| `rotation` | `[number, number, number]` | — | Static Euler XYZ rotation in radians |
| `getTransform` | `(time: number) => Matrix4` | auto-spin | Per-frame transform for the whole scene; when omitted the default auto-spin is used (single-object mode) |
| `lights` | `Light[]` | directional `[1,1,1]` | Scene lights. use `ambientLight`, `directionalLight`, `pointLight` helpers |
| `fps` | `number` | `20` | FPS |
| `chars` | `string` | `' .,:;+=*#%@'` | ASCII character ramp, dark → light |
| `initialZoom` | `number` | `4.0` | Initial camera distance |
| `showHud` | `boolean` | `true` | Show controls |
| `cols` | `number` | `process.stdout.columns` | Override column count |
| `rows` | `number` | `process.stdout.rows - 3` | Override row count |

## Keyboard controls

| Key | Action |
|---|---|
| `+` / `=` | Zoom in |
| `-` / `_` | Zoom out |
| `q` | Quit |

## Available built-in geometries

```ts
import {
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  TorusKnotGeometry,
} from 'three';

// Examples:
new BoxGeometry(1.8, 1.8, 1.8, 4, 4, 4)
new SphereGeometry(1.2, 32, 32)
new CylinderGeometry(0.8, 0.8, 2, 32, 4)
new IcosahedronGeometry(1.4, 3)
new TorusKnotGeometry(1, 0.35, 128, 32)
```

## Composing with other Ink components

`ThreeAscii` is a regular Ink component. Wrap it in `<Box>` alongside any other Ink UI. Use `cols` and `rows` to constrain the canvas to its column of the layout:

```tsx
import React from 'react';
import { render, Box, Text } from 'ink';
import { ThreeAscii } from 'ink-three';
import { SphereGeometry } from 'three';

render(
  <Box flexDirection="row">
    <Box borderStyle="round" padding={1}>
      <ThreeAscii geometry={new SphereGeometry(1.2, 32, 32)} showHud={false} cols={40} rows={20} />
    </Box>
    <Box flexDirection="column" padding={1}>
      <Text bold>My Dashboard</Text>
      <Text>Status: OK</Text>
    </Box>
  </Box>
);
```


## License

MIT