import * as THREE from 'three';

/** Distinct material identities — matte plaster, slate, concrete, glass, line. */
export interface ArchMaterials {
  wall: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  slab: THREE.MeshStandardMaterial;
  partition: THREE.MeshStandardMaterial;
  glazing: THREE.MeshStandardMaterial;
  plinth: THREE.MeshStandardMaterial;
  wallLine: THREE.LineBasicMaterial;
  roofLine: THREE.LineBasicMaterial;
  dispose(): void;
}

export const ARCH = {
  wallWarm: new THREE.Color('#e9e4da'),
  wallXray: new THREE.Color('#9fcfe0'),
  lineDark: new THREE.Color('#31373f'),
  lineXray: new THREE.Color('#bfe6f4'),
};

export function makeArchMaterials(): ArchMaterials {
  const wall = new THREE.MeshStandardMaterial({
    color: ARCH.wallWarm.clone(),
    roughness: 0.94,
    metalness: 0.0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    envMapIntensity: 0.45,
  });
  const roof = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#464d56'),
    roughness: 0.5,
    metalness: 0.18,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1.1,
  });
  const slab = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#aeb4bb'),
    roughness: 0.97,
    metalness: 0.0,
  });
  const partition = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#dadfe4'),
    roughness: 0.95,
    metalness: 0.0,
  });
  const glazing = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0c1621'),
    roughness: 0.14,
    metalness: 0.0,
    envMapIntensity: 1.5,
  });
  const plinth = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0d1219'),
    roughness: 0.72,
    metalness: 0.16,
    envMapIntensity: 0.4,
  });
  const wallLine = new THREE.LineBasicMaterial({
    color: ARCH.lineDark.clone(),
    transparent: true,
    opacity: 0.5,
  });
  const roofLine = new THREE.LineBasicMaterial({
    color: ARCH.lineDark.clone(),
    transparent: true,
    opacity: 0.55,
  });
  return {
    wall,
    roof,
    slab,
    partition,
    glazing,
    plinth,
    wallLine,
    roofLine,
    dispose() {
      [wall, roof, slab, partition, glazing, plinth, wallLine, roofLine].forEach((m) =>
        m.dispose(),
      );
    },
  };
}
