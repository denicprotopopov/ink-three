import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { BufferGeometry, Euler, Matrix4, TorusKnotGeometry } from 'three';
import { extractTriangles, normalizeGeometry } from './geometry.js';
import type { Triangle } from './geometry.js';
import { renderFrame, defaultTransform } from './rasterizer.js';
import type { Light } from './lights.js';
import { DEFAULT_LIGHTS } from './lights.js';
import type { AnimatedGLTFScene } from './loader.js';

/**
 * A single renderable object in a multi-object scene.
 * Each object can carry its own per-frame transform so objects can move
 * independently
 *
 * @example
 * // Planet spins slowly; moon orbits faster
 * const objects: SceneObject[] = [
 *   { triangles: planetTris, getTransform: (t) => new Matrix4().makeRotationY(t * 0.4) },
 *   { triangles: moonTris,   getTransform: (t) => new Matrix4().makeRotationY(t * 1.5) },
 * ];
 * <ThreeAscii objects={objects} />
 */
export interface SceneObject {
  /** Triangles that make this object up. */
  triangles: Triangle[];
  /**
   * Per-object transform function called every frame with elapsed time (seconds).
   * When omitted, the object stays at its original position (no transform).
   *
   * @example
   * // Disable rotation for this object
   * getTransform: () => new Matrix4()
   */
  getTransform?: (time: number) => Matrix4;
}

export interface ThreeAsciiProps {
  /** A Three.js BufferGeometry to render (e.g. new TorusKnotGeometry(...)) */
  geometry?: BufferGeometry;
  /** Pre-extracted triangles (e.g. from loadGLTF) — takes priority over geometry */
  triangles?: Triangle[];
  /**
   * Multiple scene objects, each with its own optional per-frame transform.
   * Takes priority over both `triangles` and `geometry`.
   */
  objects?: SceneObject[];
  /**
   * An animated GLTF/GLB scene created with {@link loadGLTFAnimated}.
   *
   * When set this takes priority over `objects`, `triangles`, and `geometry`.
   * The `AnimationMixer` is driven automatically every frame (no manual
   * `update()` calls needed). 
   *
   * The default auto-rotation (`defaultTransform`) is **not** applied so
   * the model's own animations are the primary motion. You can still layer
   * a whole-scene rotation with `getTransform`:
   *
   * @example
   * const scene = await loadGLTFAnimated('robot.glb');
   * scene.play();
   * render(
   *   <ThreeAscii
   *     animatedGLTF={scene}
   *     getTransform={(t) => new Matrix4().makeRotationY(t * 0.2)}
   *   />
   * );
   */
  animatedGLTF?: AnimatedGLTFScene;
  /** Frames per second (default: 20) */
  fps?: number;
  /** ASCII character ramp from dark to light (default: ' .,:;+=*#%@') */
  chars?: string;
  /** Initial camera distance / zoom level (default: 4.0) */
  initialZoom?: number;
  /** Show the HUD with controls and zoom level (default: true) */
  showHud?: boolean;
  /** Override column count (default: process.stdout.columns) */
  cols?: number;
  /** Override row count (default: process.stdout.rows - 3) */
  rows?: number;
  /** Lights in the scene (default: single directional light) */
  lights?: Light[];
  /**
   * Static Euler rotation applied to the whole scene as a fixed orientation
   * (`[x, y, z]` angles in radians) equivalent to
   * `mesh.rotation.set(x, y, z)` in Three.js.
   *
   * Setting `rotation` suppresses the default auto-spin so the model holds
   * its given orientation. When combined with `getTransform`, the static
   * rotation is applied first and the animated transform is layered on top.
   * 
   *
   * @example
   * // Show the model tilted 45° around Y, no spin
   * <ThreeAscii triangles={tris} rotation={[0, Math.PI / 4, 0]} />
   *
   * @example
   * // Fixed tilt + animated spin on top
   * <ThreeAscii
   *   triangles={tris}
   *   rotation={[Math.PI / 6, 0, 0]}
   *   getTransform={(t) => new Matrix4().makeRotationY(t * 0.5)}
   * />
   */
  rotation?: [number, number, number];
  /**
   * Custom transform function called every frame with elapsed time (seconds).
   * Should return a `Matrix4` that is applied to all triangles before projection.
   * When omitted, the default auto-rotation (`defaultTransform`) is used.
   *
   * @example
   * // Slow Y-only spin
   * getTransform={(t) => new Matrix4().makeRotationY(t * 0.3)}
   *
   * @example
   * // Build on the default animation
   * getTransform={(t) => defaultTransform(t).multiply(new Matrix4().makeRotationZ(t * 0.2))}
   */
  getTransform?: (time: number) => Matrix4;
}

const DEFAULT_FPS = 20;
const DEFAULT_ZOOM = 4.0;
const ZOOM_MIN = 1.5;
const ZOOM_MAX = 12;
const ZOOM_STEP = 0.3;

export function ThreeAscii({
  geometry,
  triangles: trianglesProp,
  objects: objectsProp,
  animatedGLTF: animatedGLTFProp,
  rotation,
  fps = DEFAULT_FPS,
  chars,
  initialZoom = DEFAULT_ZOOM,
  showHud = true,
  cols: colsProp,
  rows: rowsProp,
  lights = DEFAULT_LIGHTS,
  getTransform,
}: ThreeAsciiProps): React.ReactElement {
  const [zoom, setZoom] = useState(initialZoom);
  const [frame, setFrame] = useState('');

  const getTransformRef = React.useRef(getTransform);
  const objectsRef = React.useRef(objectsProp);
  const animatedGLTFRef = React.useRef(animatedGLTFProp);

  const prevTimeRef = React.useRef(0);

  const rx = rotation?.[0];
  const ry = rotation?.[1];
  const rz = rotation?.[2];
  const rotationMatrix = React.useMemo<Matrix4 | null>(() => {
    if (rx === undefined || ry === undefined || rz === undefined) return null;
    return new Matrix4().makeRotationFromEuler(new Euler(rx, ry, rz));
  }, [rx, ry, rz]);

  const rotationMatrixRef = React.useRef(rotationMatrix);

  React.useEffect(() => {
    getTransformRef.current = getTransform;
    objectsRef.current = objectsProp;
    animatedGLTFRef.current = animatedGLTFProp;
    rotationMatrixRef.current = rotationMatrix;
  });

  // Resolve triangles once (or when inputs change)
  const resolvedTriangles: Triangle[] = React.useMemo(() => {
    if (trianglesProp) return trianglesProp;
    const geo = geometry
      ? geometry.clone()
      : new TorusKnotGeometry(1, 0.35, 128, 32);
    normalizeGeometry(geo);
    return extractTriangles(geo);
  }, [trianglesProp, geometry]);

  // Keyboard controls
  useInput((input) => {
    if (input === 'q') {
      process.exit(0);
    } else if (input === '+' || input === '=') {
      setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
    } else if (input === '-' || input === '_') {
      setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
    }
  });

  // Animation loop
  useEffect(() => {
    const start = Date.now();
    const identity = new Matrix4();

    /**
     * Resolve the final frame transform.
     *
     * Priority (highest to lowest):
     *   1. getTransform(time)         — animated, user-supplied
     *   2. rotation (static matrix)   — fixed orientation, suppresses auto-spin
     *   3. defaultTransform(time)     — library default (only in single-object mode)
     *   4. identity                   — no motion (objects / animatedGLTF modes)
     *
     * When both getTransform and rotation are set they are composed:
     *   frameTransform = getTransform(time) × rotationMatrix
     * so the model is first rotated into its resting pose, then animated.
     */
    function resolveFrameTransform(time: number, useDefault: boolean): Matrix4 {
      const gt = getTransformRef.current;
      const rot = rotationMatrixRef.current;
      if (gt) {
        const m = gt(time);
        return rot ? m.clone().multiply(rot) : m;
      }
      if (rot) return rot;
      return useDefault ? defaultTransform(time) : identity;
    }

    const interval = setInterval(() => {
      const time = (Date.now() - start) / 1000;
      const cols = colsProp ?? (process.stdout.columns || 80);
      const rows = rowsProp ?? Math.max(1, (process.stdout.rows || 24) - 3);

      let trianglesForFrame: Triangle[];
      let frameTransform: Matrix4;

      if (animatedGLTFRef.current) {

        const dt = prevTimeRef.current === 0 ? 0 : time - prevTimeRef.current;
        trianglesForFrame = animatedGLTFRef.current.update(dt);

        frameTransform = resolveFrameTransform(time, false);
      } else if (objectsRef.current) {
        // Per-object mode: apply each object's own transform and merge.
        trianglesForFrame = [];
        for (const obj of objectsRef.current) {
          const m = obj.getTransform ? obj.getTransform(time) : identity;
          for (const tri of obj.triangles) {
            trianglesForFrame.push({
              a: tri.a.clone().applyMatrix4(m),
              b: tri.b.clone().applyMatrix4(m),
              c: tri.c.clone().applyMatrix4(m),
            });
          }
        }
        frameTransform = resolveFrameTransform(time, false);
      } else {
        // Single-object (or flat triangles) mode: one global transform.
        trianglesForFrame = resolvedTriangles;
        frameTransform = resolveFrameTransform(time, true);
      }

      setFrame(renderFrame(trianglesForFrame, time, cols, rows, zoom, chars, lights, frameTransform));
      prevTimeRef.current = time;
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [resolvedTriangles, zoom, fps, chars, colsProp, rowsProp, lights]);

  return (
    <Box flexDirection="column">
      <Text>{frame}</Text>
      {showHud && (
        <Text dimColor>
          {`zoom: ${zoom.toFixed(1)}  [+/-] zoom  [q] quit`}
        </Text>
      )}
    </Box>
  );
}

export default ThreeAscii;