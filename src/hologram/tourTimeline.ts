import gsap from 'gsap';
import { tourRig } from './tourRig';
import { useStore } from '../store/useStore';
import { cameraShots } from './cameraPresets';

let tl: gsap.core.Timeline | null = null;

export function getTourTimeline() {
  return tl;
}
export function killTourTimeline() {
  tl?.kill();
  tl = null;
}

/**
 * A single cinematic pass: settle to the hero, sweep to a low detail corner,
 * open the section (x-ray), read the exposed floors from a raised angle,
 * close the section, and return to the hero. Plays once, ends where it began.
 */
export function buildTourTimeline(): gsap.core.Timeline | null {
  const { camera, controls, dims } = tourRig;
  if (!camera || !controls || !dims) return null;
  killTourTimeline();

  const shots = cameraShots(dims);
  const fit = Math.max(dims.width, dims.depth, dims.height);
  const upd = () => controls.update();
  const setXray = (v: boolean) => useStore.getState().setXray(v);

  const t = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
    onUpdate: () => useStore.getState().setPlayhead(t.progress()),
    onComplete: () => {
      useStore.getState().setPlaying(false);
      useStore.getState().setPlayhead(1);
    },
  });
  tl = t;

  const move = (
    pos: [number, number, number],
    tgt: [number, number, number],
    dur: number,
  ) => {
    t.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: dur, onUpdate: upd });
    t.to(controls.target, { x: tgt[0], y: tgt[1], z: tgt[2], duration: dur, onUpdate: upd }, '<');
  };

  t.call(() => setXray(false));
  move(shots.hero.pos, shots.hero.target, 1.2); // settle
  move(shots.detail.pos, shots.detail.target, 3.0); // sweep to a low corner
  t.call(() => setXray(true)); // open the section
  move(shots.elevation.pos, shots.elevation.target, 3.0); // read the elevation
  move([fit * 0.85, fit * 2.3, fit * 0.85], shots.plan.target, 2.8); // raised plan look
  t.call(() => setXray(false)); // close the section
  move(shots.hero.pos, shots.hero.target, 3.0); // return home
  t.to({}, { duration: 0.6 });
  return t;
}
