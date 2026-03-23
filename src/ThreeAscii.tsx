import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { BufferGeometry, Matrix4, TorusKnotGeometry } from 'three';
import { extractTriangles, normalizeGeometry } from './geometry.js';
import type { Triangle } from './geometry.js';
import { renderFrame, defaultTransform } from './rasterizer.js';
import type {Light} from "./lights.js";
import { DEFAULT_LIGHTS} from "./lights.js";

export interface SceneObject {
  /** Triangles that make up this object. */
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
  /** Frames per second (default: 20) */
  objects?: SceneObject[];
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
  objects: objectProp,
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
  const objectsRef = React.useRef(objectProp);
  React.useEffect(() => {
    getTransformRef.current = getTransform;
    objectsRef.current = objectProp;
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
    const interval = setInterval(() => {
      const time = (Date.now() - start) / 1000;
      const cols = colsProp ?? (process.stdout.columns || 80);
      const rows = rowsProp ?? Math.max(1, (process.stdout.rows || 24) - 3);


      let trianglesForFrame: Triangle[];
      let frameTransform: Matrix4;

      if (objectsRef.current) {
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
        frameTransform = getTransformRef.current
          ? getTransformRef.current(time)
          : identity;
      } else {
        // Single-object (or flat triangles) mode: one global transform.
        trianglesForFrame = resolvedTriangles;
        frameTransform = getTransformRef.current
          ? getTransformRef.current(time)
          : defaultTransform(time);
      }

      setFrame(renderFrame(trianglesForFrame, time, cols, rows, zoom, chars, lights, frameTransform));
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