import type { CameraPreset } from '../store/useStore';

export interface CamShot {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface ModelExtent {
  width: number;
  depth: number;
  height: number;
}

/**
 * Composed cinematic angles chosen to flatter architecture — long-lens 3/4 hero,
 * orthographic-ish plan, straight elevation, intimate detail. Never a random orbit.
 */
export function cameraShots(m: ModelExtent): Record<CameraPreset, CamShot> {
  const fit = Math.max(m.width, m.depth, m.height);
  const midY = m.height * 0.46;
  return {
    hero: {
      pos: [fit * 1.55, m.height * 0.62 + fit * 0.12, fit * 1.95],
      target: [0, m.height * 0.36, 0],
      fov: 30,
    },
    plan: {
      pos: [0.0001, fit * 2.9, 0.0001],
      target: [0, 0, 0],
      fov: 30,
    },
    elevation: {
      pos: [0, midY, fit * 2.7],
      target: [0, midY, 0],
      fov: 26,
    },
    detail: {
      pos: [fit * 0.95, m.height * 0.62, fit * 1.15],
      target: [0, m.height * 0.4, 0],
      fov: 42,
    },
  };
}
