import { Vector3 } from "three";

export interface AmbientLight {
  type: 'ambient';
  intensity?: number; // (0–1, default: 0.2)
}

export interface DirectionalLight {
    type: 'directional';
    direction: [number, number, number]; // [x, y, z] direction vector)
    intensity?: number; // (0–1, default: 1.0)
}

export interface PointLight {
    type: 'point';
    position: [number, number, number]; // [x, y, z] position in world space
    intensity?: number; // (0–1, default: 1.0)
    decay?: number; // Quadratic decay coefficient 
}

export type Light = AmbientLight | DirectionalLight | PointLight;

export const DEFAULT_LIGHTS: Light[] = [
  { type: 'directional', direction: [1, 1, 1], intensity: 1.0 },
];

export function ambientLight(intensity = 0.2): AmbientLight {
  return { type: 'ambient', intensity };
}

export function directionalLight(
  direction: [number, number, number],
  intensity = 1.0,
): DirectionalLight {
  return { type: 'directional', direction, intensity };
}

export function pointLight(
  position: [number, number, number],
  intensity = 1.0,
  decay = 1.0,
): PointLight {
  return { type: 'point', position, intensity, decay };
}

export function computeLighting(
  normal: Vector3,
  centroid: Vector3,
  lights: Light[],
): number {
  let total = 0;

  for (const light of lights) {
    if (light.type === 'ambient') {
      total += light.intensity ?? 0.2;
    } else if (light.type === 'directional') {
      const dir = new Vector3(...light.direction).normalize();
      total += Math.max(0, normal.dot(dir)) * (light.intensity ?? 1.0);
    } else if (light.type === 'point') {
      const toLight = new Vector3(...light.position).sub(centroid);
      const dist = toLight.length();
      const dir = toLight.clone().divideScalar(Math.max(dist, 1e-6));
      const diff = Math.max(0, normal.dot(dir));
      const decay = light.decay ?? 1.0;
      const atten = 1 / (1 + decay * dist * dist);
      total += diff * (light.intensity ?? 1.0) * atten;
    }
  }

  return Math.min(1, total);
}