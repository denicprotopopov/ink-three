import {Matrix4, Vector3} from "three";
import {Triangle} from "./geometry.js";
import type {Light} from "./lights.js";
import { DEFAULT_LIGHTS, computeLighting  } from "./lights.js";

const DEFAULT_CHARS = ' .,:;+=*#%@';
const CHAR_ASPECT = 0.5;
const FOV = 1.2;

type Proj = { sx: number; sy: number; dz: number };

/**
 * Renders a single ASCII frame from the given triangle list.
 *
 * @param triangles - The mesh triangles to render.
 * @param time      - Elapsed time in seconds (drives rotation).
 * @param cols      - Terminal column count.
 * @param rows      - Terminal row count.
 * @param eyeZ      - Camera Z distance (zoom level).
 * @param chars     - ASCII character ramp, dark to light.
 * @param lights    - List of lights (default: single directional light).
 * @returns A multi-line string representing the ASCII frame.
 */

export function renderFrame(
  triangles: Triangle[],
  time: number,
  cols: number,
  rows: number,
  eyeZ: number,
  chars: string = DEFAULT_CHARS,
  lights: Light[] = DEFAULT_LIGHTS,
): string {
  const vpW = cols * CHAR_ASPECT;
  const vpH = rows;
  const uniformScale = Math.min(vpW, vpH);

  const rotX = new Matrix4().makeRotationX(time * 0.7);
  const rotY = new Matrix4().makeRotationY(time);
  const rot = new Matrix4().multiplyMatrices(rotX, rotY);

  // Reused projection outputs to reduce GC churn
  const pa: Proj = { sx: 0, sy: 0, dz: 0 };
  const pb: Proj = { sx: 0, sy: 0, dz: 0 };
  const pc: Proj = { sx: 0, sy: 0, dz: 0 };

  const projectInto = (v: Vector3, out: Proj): boolean => {
    const dz = eyeZ - v.z;
    if (dz <= 0.1) return false;

    const pScale = (uniformScale / 2) / (dz * FOV);
    out.sx = (v.x * pScale) / CHAR_ASPECT + cols / 2;
    out.sy = -(v.y * pScale) + rows / 2;
    out.dz = dz;
    return true;
  };

  const total = cols * rows;

  // Store inverse depth so larger value means closer pixel
  const depthBuf = new Float32Array(total).fill(-Infinity);

  const charBuf = new Uint16Array(total).fill(0);

  // Reused temp vectors to reduce GC churn
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  const normal = new Vector3();

  for (const tri of triangles) {
    a.copy(tri.a).applyMatrix4(rot);
    b.copy(tri.b).applyMatrix4(rot);
    c.copy(tri.c).applyMatrix4(rot);

    ab.subVectors(b, a);
    ac.subVectors(c, a);
    normal.crossVectors(ab, ac).normalize();

    if (normal.z < 0) continue;

    const centroid = new Vector3().addVectors(a, b).add(c).divideScalar(3);
    const shade = computeLighting(normal, centroid, lights);
    const charIdx = Math.min(
      chars.length - 1,
      Math.floor(shade * (chars.length - 1)),
    );

    if (!projectInto(a, pa) || !projectInto(b, pb) || !projectInto(c, pc)) {
      continue;
    }

    const minX = Math.max(0, Math.floor(Math.min(pa.sx, pb.sx, pc.sx)));
    const maxX = Math.min(cols - 1, Math.ceil(Math.max(pa.sx, pb.sx, pc.sx)));
    const minY = Math.max(0, Math.floor(Math.min(pa.sy, pb.sy, pc.sy)));
    const maxY = Math.min(rows - 1, Math.ceil(Math.max(pa.sy, pb.sy, pc.sy)));

    const denom =
      (pb.sy - pc.sy) * (pa.sx - pc.sx) + (pc.sx - pb.sx) * (pa.sy - pc.sy);
    if (Math.abs(denom) < 1e-6) continue;
    const invDenom = 1 / denom;

    // Perspective-friendly depth interpolation
    const invDzA = 1 / pa.dz;
    const invDzB = 1 / pb.dz;
    const invDzC = 1 / pc.dz;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const w0 =
          ((pb.sy - pc.sy) * (px - pc.sx) + (pc.sx - pb.sx) * (py - pc.sy)) *
          invDenom;
        const w1 =
          ((pc.sy - pa.sy) * (px - pc.sx) + (pa.sx - pc.sx) * (py - pc.sy)) *
          invDenom;
        const w2 = 1 - w0 - w1;

        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        const pixelInvDz = w0 * invDzA + w1 * invDzB + w2 * invDzC;

        const idx = py * cols + px;
        if (pixelInvDz > depthBuf[idx]!) {
          depthBuf[idx] = pixelInvDz;
          charBuf[idx] = charIdx;
        }
      }
    }
  }

  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = '';
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      line += depthBuf[idx] === -Infinity ? ' ' : chars[charBuf[idx]!] ?? ' ';
    }
    lines.push(line);
  }

  return lines.join('\n');
}