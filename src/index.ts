import './shims.js';


export { ThreeAscii } from './ThreeAscii.js';
export type { ThreeAsciiProps, SceneObject } from './ThreeAscii.js';
export { default } from './ThreeAscii.js';
export { loadGLTF, loadGLTFAnimated } from './loader.js';
export type { AnimatedGLTFScene } from './loader.js';
export { extractTriangles, normalizeGeometry } from './geometry.js';
export { renderFrame, defaultTransform } from './rasterizer.js';
export { DEFAULT_LIGHTS, ambientLight, directionalLight, pointLight } from './lights.js';
export type { Light, AmbientLight, DirectionalLight, PointLight } from './lights.js';