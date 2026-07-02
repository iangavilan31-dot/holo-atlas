/**
 * Builds a sample house GLB (stand-in for a Blender export) so the manifest
 * loader path is provable without opening Blender. Geometry-only, no textures.
 *
 * Usage: node scripts/make-sample-glb.mjs
 */
// Node shim: GLTFExporter concatenates chunks through FileReader+Blob
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.({ target: this });
    });
  }
};

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT_DIR = fileURLToPath(new URL('../public/models/', import.meta.url));
mkdirSync(OUT_DIR, { recursive: true });

const scene = new THREE.Scene();
const mat = new THREE.MeshStandardMaterial({ color: 0x8899aa });

const add = (geo, x, y, z, name, ry = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.name = name;
  scene.add(m);
  return m;
};

// L-shaped contemporary: main volume + wing + flat/gable mix + chimney + porch
add(new THREE.BoxGeometry(9, 5.6, 7), 0, 2.8, 0, 'main-volume');
add(new THREE.BoxGeometry(5, 3.1, 6), 6.4, 1.55, 0.5, 'wing');

// gable roof over the main volume (triangular prism via Shape extrude)
const roofShape = new THREE.Shape();
roofShape.moveTo(-4.9, 0);
roofShape.lineTo(0, 2.6);
roofShape.lineTo(4.9, 0);
roofShape.closePath();
const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 7.6, bevelEnabled: false });
roofGeo.translate(0, 0, -3.8);
add(roofGeo, 0, 5.6, 0, 'gable-roof');

// flat parapet roof slab on the wing
add(new THREE.BoxGeometry(5.3, 0.25, 6.3), 6.4, 3.25, 0.5, 'wing-roof');
// chimney
add(new THREE.BoxGeometry(0.9, 3.2, 0.9), -2.6, 6.6, -1.6, 'chimney');
// entry porch slab + posts
add(new THREE.BoxGeometry(2.6, 0.18, 1.8), 1.2, 2.42, 4.35, 'porch-roof');
add(new THREE.BoxGeometry(0.16, 2.4, 0.16), 0.25, 1.2, 4.95, 'porch-post-a');
add(new THREE.BoxGeometry(0.16, 2.4, 0.16), 2.15, 1.2, 4.95, 'porch-post-b');
// door slab
add(new THREE.BoxGeometry(1.1, 2.2, 0.12), 1.2, 1.1, 3.56, 'door');

const exporter = new GLTFExporter();
exporter.parse(
  scene,
  (result) => {
    const buf = Buffer.from(result);
    writeFileSync(`${OUT_DIR}jv-39.glb`, buf);
    console.log(`wrote public/models/jv-39.glb (${buf.length} bytes)`);
  },
  (err) => {
    console.error('EXPORT FAILED:', err);
    process.exit(1);
  },
  { binary: true },
);
