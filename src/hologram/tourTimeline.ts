import gsap from 'gsap';
import * as THREE from 'three';
import { tourRig } from './tourRig';
import { useStore } from '../store/useStore';

/**
 * The PLAY TOUR cinematic: settle → approach the entry → door swing (GLB) →
 * fly inside → lights ramp room-by-room → interior drift → rise a floor →
 * pull out to the hero angle → glide back to the anchor. Loops seamlessly
 * (every pass starts and ends at the hero anchor).
 */
let tl: gsap.core.Timeline | null = null;
let anchor: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;

export function getTourTimeline() {
  return tl;
}

export function killTourTimeline() {
  tl?.kill();
  tl = null;
  anchor = null;
}

function collectDoors(root: THREE.Object3D): THREE.Object3D[] {
  const doors: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name.toLowerCase().includes('door') && !o.name.toLowerCase().includes('porch')) {
      doors.push(o);
    }
  });
  return doors;
}

export function buildTourTimeline(): gsap.core.Timeline | null {
  const { camera, controls, houseGroup, roomLights, dims } = tourRig;
  if (!camera || !controls || !houseGroup || !dims) return null;
  killTourTimeline();

  const fit = Math.max(dims.width, dims.depth, dims.height);
  const fh = dims.height / dims.floors;
  const entryZ = dims.depth / 2;
  const doors = collectDoors(houseGroup);

  anchor = {
    pos: new THREE.Vector3(fit * 1.3, fit * 0.95, fit * 1.3),
    target: new THREE.Vector3(0, dims.height * 0.42, 0),
  };

  const upd = () => controls.update();
  const drift = { a: -Math.PI * 0.12 };

  const t = gsap.timeline({
    paused: true,
    repeat: -1,
    defaults: { ease: 'power2.inOut' },
    onUpdate: () => useStore.getState().setPlayhead(t.progress()),
  });
  tl = t;

  t
    // settle the idle spin so the entry faces us
    .to(houseGroup.rotation, { y: 0, duration: 1.0 }, 0)
    // approach: low + close toward the entry face
    .to(camera.position, { x: 0, y: dims.height * 0.38, z: entryZ + fit * 0.8, duration: 2.3, onUpdate: upd }, 0.15)
    .to(controls.target, { x: 0, y: dims.height * 0.3, z: entryZ * 0.4, duration: 2.3, onUpdate: upd }, 0.15);

  // door swing (GLB houses that name a door node)
  for (const d of doors) {
    t.to(d.rotation, { y: Math.PI / 2.15, duration: 0.9, ease: 'power2.out' }, 2.1);
  }

  t
    // cross the threshold
    .to(camera.position, { x: 0, y: dims.height * 0.3, z: dims.depth * 0.1, duration: 2.1, onUpdate: upd }, 2.7)
    .to(controls.target, { x: 0, y: dims.height * 0.28, z: -dims.depth * 0.32, duration: 2.1, onUpdate: upd }, 2.7);

  // lights come alive room-by-room (floor by floor)
  roomLights.forEach((l, i) => {
    t.to(l, { intensity: 2.4, duration: 0.7, ease: 'power2.out' }, 3.7 + i * 0.55);
  });

  // interior drift — slow arc around the core
  t.to(
    drift,
    {
      a: Math.PI * 0.85,
      duration: 3.4,
      ease: 'none',
      onUpdate: () => {
        camera.position.x = Math.sin(drift.a) * dims.width * 0.24;
        camera.position.z = Math.cos(drift.a) * dims.depth * 0.24;
        upd();
      },
    },
    5.0,
  );

  // rise to the next floor when there is one
  if (dims.floors > 1) {
    t.to(camera.position, { y: `+=${fh}`, duration: 1.6, onUpdate: upd }, 7.4).to(
      controls.target,
      { y: `+=${fh * 0.8}`, duration: 1.6, onUpdate: upd },
      7.4,
    );
  }

  t
    // pull out to the hero anchor
    .to(camera.position, { x: anchor.pos.x, y: anchor.pos.y, z: anchor.pos.z, duration: 2.8, onUpdate: upd }, 9.3)
    .to(controls.target, { x: anchor.target.x, y: anchor.target.y, z: anchor.target.z, duration: 2.8, onUpdate: upd }, 9.3);

  // lights breathe back down for the next pass
  roomLights.forEach((l, i) => {
    t.to(l, { intensity: 0, duration: 1.0, ease: 'power2.in' }, 11.4 + i * 0.12);
  });

  t.addLabel('end', 12.8);
  return t;
}

/** Glide the camera to the loop anchor, then run cb (avoids a loop-seam cut). */
export function glideToAnchor(cb: () => void) {
  const { camera, controls } = tourRig;
  if (!camera || !controls || !anchor) {
    cb();
    return;
  }
  const dur = 0.85;
  gsap.to(camera.position, {
    x: anchor.pos.x,
    y: anchor.pos.y,
    z: anchor.pos.z,
    duration: dur,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),
  });
  gsap.to(controls.target, {
    x: anchor.target.x,
    y: anchor.target.y,
    z: anchor.target.z,
    duration: dur,
    ease: 'power2.inOut',
    onUpdate: () => controls.update(),
    onComplete: cb,
  });
}
