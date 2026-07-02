import type * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

/**
 * Live handles the PLAY TOUR timeline drives. Registered by the scene on
 * mount, cleared on unmount — the GSAP timeline (P7) reads from here.
 */
export interface TourRig {
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControlsImpl | null;
  houseGroup: THREE.Group | null;
  roomLights: THREE.PointLight[];
  dims: { width: number; depth: number; height: number; floors: number } | null;
}

export const tourRig: TourRig = {
  camera: null,
  controls: null,
  houseGroup: null,
  roomLights: [],
  dims: null,
};

export function clearTourRig() {
  tourRig.camera = null;
  tourRig.controls = null;
  tourRig.houseGroup = null;
  tourRig.roomLights = [];
  tourRig.dims = null;
}
