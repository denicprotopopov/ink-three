import './shims.js';
import { readFileSync } from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AnimationMixer, Mesh, Vector3 } from 'three';
import type { AnimationClip, Group } from 'three';
import { extractTriangles, normalizeGeometry } from './geometry.js';
import type { Triangle } from './geometry.js';

/**
 * Loads a .gltf or .glb file, extracts and normalises all mesh
 * triangles, and returns the merged triangle list.
 *
 * This is the static loader whichcaptures the rest pose only and ignores
 * any animations. For models with animations use
 * {@link loadGLTFAnimated} instead.
 */
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
      const geo = obj.geometry.clone();
      normalizeGeometry(geo);
      allTriangles.push(...extractTriangles(geo));
    }
  });

  return allTriangles;
}

/**
 * An animated GLTF/GLB scene returned by {@link loadGLTFAnimated}.
 *
 * @example
 * const scene = await loadGLTFAnimated('robot.glb');
 * scene.play();                          // start the first clip
 * // or: scene.play('Walk');             // start a specific clip by name
 * render(<ThreeAscii animatedGLTF={scene} />);
 */
export interface AnimatedGLTFScene {
  update(dt: number): Triangle[];
  readonly clipNames: readonly string[];

  /**
   * Start playing a clip.
   *
   * - When `clipName` is omitted, the first available clip plays.
   * - When `clipName` is provided, the matching clip plays (falls back to
   *   the first clip if the name is not found).
   * - No-op when the model has no animations.
   */
  play(clipName?: string): void;
}

/**
 * Loads a .gltf or .glb file with animation support.
 *
 * Unlike {@link loadGLTF}, this function preserves the full Three.js scene
 * graph, wires up an `AnimationMixer`, and re-extracts CPU-skinned /
 * morph-target geometry every frame via `Mesh.getVertexPosition`. This
 * means skeletal animations, morph-target animations, and object-level
 * keyframe animations all play correctly in the ASCII renderer.
 *
 * @example
 * const scene = await loadGLTFAnimated('character.glb');
 * console.log('clips:', scene.clipNames);
 * scene.play();   // play the first clip
 * render(<ThreeAscii animatedGLTF={scene} />);
 */
export async function loadGLTFAnimated(filePath: string): Promise<AnimatedGLTFScene> {
  const buf = readFileSync(filePath);
  const arrayBuffer: ArrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;

  const loader = new GLTFLoader();

  const gltf = await new Promise<{ scene: Group; animations: AnimationClip[] }>(
    (resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve as (value: unknown) => void, reject);
    },
  );

  const scene = gltf.scene;
  const clips: AnimationClip[] = gltf.animations ?? [];
  const mixer = new AnimationMixer(scene);

  // Normalise to rest pose
  scene.updateMatrixWorld(true);

  let minX = Infinity,  minY = Infinity,  minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const _tmp = new Vector3();
  scene.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const posAttr = obj.geometry.attributes['position'];
    if (!posAttr) return;
    for (let i = 0; i < posAttr.count; i++) {
      obj.getVertexPosition(i, _tmp);
      _tmp.applyMatrix4(obj.matrixWorld);
      if (_tmp.x < minX) minX = _tmp.x;
      if (_tmp.x > maxX) maxX = _tmp.x;
      if (_tmp.y < minY) minY = _tmp.y;
      if (_tmp.y > maxY) maxY = _tmp.y;
      if (_tmp.z < minZ) minZ = _tmp.z;
      if (_tmp.z > maxZ) maxZ = _tmp.z;
    }
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const normScale = isFinite(maxDim) && maxDim > 0 ? 2 / maxDim : 1;

  // Per-frame triangle extraction
  const _va = new Vector3();
  const _vb = new Vector3();
  const _vc = new Vector3();

  function applyNorm(v: Vector3): Vector3 {
    v.x = (v.x - cx) * normScale;
    v.y = (v.y - cy) * normScale;
    v.z = (v.z - cz) * normScale;
    return v;
  }

  function extractCurrentTriangles(): Triangle[] {
    const all: Triangle[] = [];

    scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const geo = obj.geometry;
      const posAttr = geo.attributes['position'];
      if (!posAttr) return;

      // getVertexPosition returns the position in object/bind space
      // applyMatrix4(matrixWorld) converts to world space.
      const getVert = (i: number, target: Vector3): Vector3 => {
        obj.getVertexPosition(i, target);
        target.applyMatrix4(obj.matrixWorld);
        return applyNorm(target);
      };

      if (geo.index) {
        const idx = geo.index;
        for (let i = 0; i < idx.count; i += 3) {
          all.push({
            a: getVert(idx.getX(i),     _va).clone(),
            b: getVert(idx.getX(i + 1), _vb).clone(),
            c: getVert(idx.getX(i + 2), _vc).clone(),
          });
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          all.push({
            a: getVert(i,     _va).clone(),
            b: getVert(i + 1, _vb).clone(),
            c: getVert(i + 2, _vc).clone(),
          });
        }
      }
    });

    return all;
  }

  return {
    clipNames: clips.map((c) => c.name),

    play(clipName?: string): void {
      if (clips.length === 0) return;
      const clip = clipName
        ? (clips.find((c) => c.name === clipName) ?? clips[0]!)
        : clips[0]!;
      mixer.stopAllAction();
      mixer.clipAction(clip).play();
    },

    update(dt: number): Triangle[] {
      mixer.update(dt);
      scene.updateMatrixWorld(true);
      return extractCurrentTriangles();
    },
  };
}