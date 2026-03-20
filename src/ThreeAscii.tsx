import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { BufferGeometry, Vector3, TorusKnotGeometry } from 'three';
import { extractTriangles, normalizeGeometry } from './geometry.js';
import type { Triangle } from './geometry.js';
import { renderFrame } from './rasterizer.js';
import type {Light} from "./lights.js";
import { DEFAULT_LIGHTS} from "./lights.js";

export interface ThreeAsciiProps {
  /** A Three.js BufferGeometry to render (e.g. new TorusKnotGeometry(...)) */
  geometry?: BufferGeometry;
  /** Pre-extracted triangles (e.g. from loadGLTF) — takes priority over geometry */
  triangles?: Triangle[];
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
}

const DEFAULT_FPS = 20;
const DEFAULT_ZOOM = 4.0;
const ZOOM_MIN = 1.5;
const ZOOM_MAX = 12;
const ZOOM_STEP = 0.3;

export function ThreeAscii({
  geometry,
  triangles: trianglesProp,
  fps = DEFAULT_FPS,
  chars,
  initialZoom = DEFAULT_ZOOM,
  showHud = true,
  cols: colsProp,
  rows: rowsProp,
  lights = DEFAULT_LIGHTS,
}: ThreeAsciiProps): React.ReactElement {
  const [zoom, setZoom] = useState(initialZoom);
  const [frame, setFrame] = useState('');

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
    const interval = setInterval(() => {
      const time = (Date.now() - start) / 1000;
      const cols = colsProp ?? (process.stdout.columns || 80);
      const rows = rowsProp ?? Math.max(1, (process.stdout.rows || 24) - 3);
      setFrame(renderFrame(resolvedTriangles, time, cols, rows, zoom, chars, lights));
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