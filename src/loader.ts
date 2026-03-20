import './shims';
import { readFileSync } from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Mesh } from 'three';
import { extractTriangles, normalizeGeometry } from './geometry.js';
import type { Triangle } from './geometry.js';

export async function loadGLTF(filePath: string): Promise<Triangle[]> {
  const buf = readFileSync(filePath);
  const arrayBuffer: ArrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;

  const loader = new GLTFLoader();

  const gltf = await new Promise<{ scene: { traverse: (cb: (obj: unknown) => void) => void } }>(
    (resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    },
  );

  const allTriangles: Triangle[] = [];

  gltf.scene.traverse((obj: unknown) => {
    if (obj instanceof Mesh) {
      const geometry = obj.geometry.clone();
      normalizeGeometry(geometry);
      allTriangles.push(...extractTriangles(geometry));
    }
  });

  return allTriangles;
}