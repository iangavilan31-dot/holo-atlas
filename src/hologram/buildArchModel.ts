import * as THREE from 'three';
import type { LocalRing } from '../data/types';
import { buildRoofFromFootprint } from './buildHouseFromFootprint';

const FLOOR_H = 3.1;

export interface ArchDims {
  width: number;
  depth: number;
  height: number;
  floors: number;
  floorH: number;
}

export interface ArchModel {
  /** Hollow exterior wall shell (vertical quads per edge, DoubleSide). */
  wall: THREE.BufferGeometry;
  wallEdges: THREE.EdgesGeometry;
  /** Thin footprint slab per floor level (interior floor plates). */
  slab: THREE.BufferGeometry;
  slabYs: number[];
  /** Interior partition walls per floor (revealed in x-ray). */
  partition: THREE.BufferGeometry;
  partitionYs: number[];
  /** Recessed dark glazing band per floor (specular hierarchy). */
  glazing: THREE.BufferGeometry;
  /** Hip roof. */
  roof: THREE.BufferGeometry;
  roofEdges: THREE.EdgesGeometry;
  roofY: number;
  dims: ArchDims;
}

function signedArea(r: number[][]) {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, z1] = r[i];
    const [x2, z2] = r[(i + 1) % r.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
}

/** Bbox-center a ring (matches the wall-shell / roof centering). */
function centered(ring: LocalRing) {
  const pts = signedArea(ring) < 0 ? [...ring].reverse() : ring;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const bx = (minX + maxX) / 2;
  const bz = (minZ + maxZ) / 2;
  return {
    local: pts.map(([x, z]) => [x - bx, z - bz] as [number, number]),
    width: maxX - minX,
    depth: maxZ - minZ,
  };
}

/** Vertical wall shell — one quad per footprint edge from y0 to y1. */
function wallShell(local: [number, number][], y0: number, y1: number) {
  const n = local.length;
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = local[i];
    const [bx, bz] = local[(i + 1) % n];
    // two triangles per edge quad
    pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz);
    pos.push(ax, y0, az, bx, y1, bz, ax, y1, az);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Flat cap (triangulated footprint) at height y — floor slab surface. */
function slabAt(local: [number, number][], y: number, thickness: number) {
  const contour = local.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const pos: number[] = [];
  const top = y + thickness;
  const bot = y;
  // top + bottom faces
  for (const [a, b, c] of tris) {
    const A = local[a], B = local[b], C = local[c];
    pos.push(A[0], top, A[1], B[0], top, B[1], C[0], top, C[1]);
    pos.push(A[0], bot, A[1], C[0], bot, C[1], B[0], bot, B[1]);
  }
  // thin rim
  const n = local.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = local[i];
    const [bx, bz] = local[(i + 1) % n];
    pos.push(ax, bot, az, bx, bot, bz, bx, top, bz);
    pos.push(ax, bot, az, bx, top, bz, ax, top, az);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Build the full architectural massing model from a footprint. */
export function buildArchModel(ring: LocalRing, floors = 1): ArchModel {
  const { local, width, depth } = centered(ring);
  const nFloors = Math.max(1, floors);
  const totalH = nFloors * FLOOR_H;

  // ---- exterior wall shell (full height) ----
  const wall = wallShell(local, 0, totalH);
  const wallEdges = new THREE.EdgesGeometry(wall, 1);

  // ---- floor slabs (one per level, thin) ----
  const slabYs: number[] = [];
  const slabGeoms: THREE.BufferGeometry[] = [];
  for (let f = 0; f < nFloors; f++) {
    const y = f * FLOOR_H;
    slabYs.push(y);
    slabGeoms.push(slabAt(local, y, 0.18));
  }
  const slab = mergeAtOrigin(slabGeoms);
  slabGeoms.forEach((g) => g.dispose());

  // ---- interior partitions (thin cross walls per floor) ----
  const partitionYs: number[] = [];
  const partGeoms: THREE.BufferGeometry[] = [];
  const cx = local.reduce((s, p) => s + p[0], 0) / local.length;
  const cz = local.reduce((s, p) => s + p[1], 0) / local.length;
  const partH = FLOOR_H * 0.9;
  for (let f = 0; f < nFloors; f++) {
    const y = f * FLOOR_H + 0.18;
    partitionYs.push(y);
    // a divider along each axis, sized to ~65% so it reads as rooms not a full wall
    const along = new THREE.BoxGeometry(width * 0.66, partH, 0.16);
    along.translate(cx * 0.2, y + partH / 2, cz - depth * 0.12);
    const across = new THREE.BoxGeometry(0.16, partH, depth * 0.5);
    across.translate(cx + width * 0.14, y + partH / 2, cz * 0.2);
    partGeoms.push(along, across);
  }
  const partition = mergeAtOrigin(partGeoms);
  partGeoms.forEach((g) => g.dispose());

  // ---- glazing bands (ribbon windows, just proud of the wall) ----
  const glazeGeoms: THREE.BufferGeometry[] = [];
  const cxg = local.reduce((s, p) => s + p[0], 0) / local.length;
  const czg = local.reduce((s, p) => s + p[1], 0) / local.length;
  const outset = local.map(
    ([x, z]) => [cxg + (x - cxg) * 1.004, czg + (z - czg) * 1.004] as [number, number],
  );
  for (let f = 0; f < nFloors; f++) {
    const y = f * FLOOR_H + FLOOR_H * 0.54;
    glazeGeoms.push(wallShell(outset, y - FLOOR_H * 0.15, y + FLOOR_H * 0.15));
  }
  const glazing = mergeAtOrigin(glazeGeoms);
  glazeGeoms.forEach((g) => g.dispose());

  // ---- roof ----
  const roofBuild = buildRoofFromFootprint(ring, floors);

  return {
    wall,
    wallEdges,
    slab,
    slabYs,
    partition,
    partitionYs,
    glazing,
    roof: roofBuild.geometry,
    roofEdges: roofBuild.edges,
    roofY: totalH,
    dims: { width, depth, height: totalH, floors: nFloors, floorH: FLOOR_H },
  };
}

/** Concatenate position buffers (all already in model space). */
function mergeAtOrigin(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const arrays: number[] = [];
  for (const g of geoms) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count * 3; i++) arrays.push(p.array[i] as number);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arrays, 3));
  g.computeVertexNormals();
  return g;
}

export function disposeArchModel(m: ArchModel) {
  m.wall.dispose();
  m.wallEdges.dispose();
  m.slab.dispose();
  m.partition.dispose();
  m.glazing.dispose();
  m.roof.dispose();
  m.roofEdges.dispose();
}
