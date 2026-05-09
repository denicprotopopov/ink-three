import type { Triangle } from './geometry.js';

/**
 * Pull-based animated geometry source consumed by <ThreeAscii /> each frame.
 *
 * Implementations should keep internal buffers stable and mutate in place so
 * callers avoid pushing large triangle arrays through React props/state.
 */
export interface AnimatedGeometrySource {
  update(dt: number): void;
  getTriangles(): Triangle[];
}
