import * as THREE from 'three';
import type { LocalRing } from '../data/types';

const FLOOR_H = 3.1;

export interface HouseBuild {
  geometry: THREE.ExtrudeGeometry;
  edges: THREE.EdgesGeometry;
  dims: { width: number; depth: number; height: number; floors: number };
}

function signedArea(r: LocalRing) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

/** Extrude the real footprint into a centered, floor-seated holographic shell. */
export function buildHouseFromFootprint(ring: LocalRing, floors = 1): HouseBuild {
  if (!ring || ring.length < 3) throw new Error('ring needs >=3 points');
  const pts = signedArea(ring) < 0 ? [...ring].reverse() : ring;
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();

  const height = Math.max(1, floors) * FLOOR_H;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const cx = (bb.max.x + bb.min.x) / 2;
  const cz = (bb.max.z + bb.min.z) / 2;
  geometry.translate(-cx, -bb.min.y, -cz);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox!.getSize(size);
  const edges = new THREE.EdgesGeometry(geometry, 15);
  return {
    geometry,
    edges,
    dims: { width: size.x, depth: size.z, height: size.y, floors: Math.max(1, floors) },
  };
}

export function makeHoloMaterials() {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x35e4ff,
    transparent: true,
    opacity: 0.07,
    emissive: 0x0ab6d6,
    emissiveIntensity: 0.45,
    metalness: 0.1,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wire = new THREE.LineBasicMaterial({ color: 0x8ff4ff, transparent: true, opacity: 0.9 });
  return { glass, wire };
}
