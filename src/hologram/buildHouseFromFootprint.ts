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

export interface RoofBuild {
  geometry: THREE.BufferGeometry;
  edges: THREE.EdgesGeometry;
  roofHeight: number;
}

/**
 * Hip roof over the real footprint: eave ring at wall height lofted up to a
 * homothetically-shrunk ridge ring. Homothety (uniform scale toward a point)
 * can't self-intersect, so this is valid for any footprint — rectangles get a
 * clean hip, L/T shapes follow their own outline. Coordinates match the
 * recentered wall shell from buildHouseFromFootprint.
 */
export function buildRoofFromFootprint(ring: LocalRing, floors = 1): RoofBuild {
  const pts = signedArea(ring) < 0 ? [...ring].reverse() : ring;
  const n = pts.length;
  // recenter exactly like the wall shell (bbox center)
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const bx = (minX + maxX) / 2;
  const bz = (minZ + maxZ) / 2;
  const local = pts.map(([x, z]) => [x - bx, z - bz] as [number, number]);
  const w = maxX - minX;
  const d = maxZ - minZ;

  const wallHeight = Math.max(1, floors) * FLOOR_H;
  const roofHeight = Math.min(Math.max(Math.min(w, d) * 0.42, 1.8), 3.8);
  const cx = local.reduce((s, p) => s + p[0], 0) / n;
  const cz = local.reduce((s, p) => s + p[1], 0) / n;
  const ridgeScale = 0.34;

  const eave = local.map(([x, z]) => new THREE.Vector3(x, wallHeight, z));
  const ridge = local.map(
    ([x, z]) =>
      new THREE.Vector3(
        cx + (x - cx) * ridgeScale,
        wallHeight + roofHeight,
        cz + (z - cz) * ridgeScale,
      ),
  );

  const pos: number[] = [];
  const push = (v: THREE.Vector3) => pos.push(v.x, v.y, v.z);
  // sloped side faces (eave edge → ridge edge)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    push(eave[i]); push(eave[j]); push(ridge[j]);
    push(eave[i]); push(ridge[j]); push(ridge[i]);
  }
  // ridge cap (triangulated — handles concave L/T tops)
  const contour = local.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const [a, b, c] of tris) {
    push(ridge[a]); push(ridge[b]); push(ridge[c]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geometry.computeVertexNormals();
  const edges = new THREE.EdgesGeometry(geometry, 18);
  return { geometry, edges, roofHeight };
}

export function makeHoloMaterials() {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fd3ea,
    transparent: true,
    opacity: 0.11,
    emissive: 0x5fa8c6,
    emissiveIntensity: 0.4,
    metalness: 0.1,
    roughness: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wire = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  return { glass, wire };
}
