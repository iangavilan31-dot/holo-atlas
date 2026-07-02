import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { tourRig } from './tourRig';
import {
  buildTourTimeline,
  getTourTimeline,
  glideToAnchor,
  killTourTimeline,
} from './tourTimeline';

/**
 * Binds PLAY TOUR / PAUSE / RESET VIEW to the GSAP tour timeline.
 * Lives beside the Canvas — it only touches the rig registry and the store.
 */
export default function TourController() {
  useEffect(() => {
    const unsubPlay = useStore.subscribe((s, prev) => {
      if (s.isPlaying === prev.isPlaying) return;
      if (s.isPlaying) {
        let tl = getTourTimeline() ?? buildTourTimeline();
        if (!tl) {
          // rig not ready yet — nothing to drive
          useStore.getState().setPlaying(false);
          return;
        }
        if (tourRig.controls) tourRig.controls.enabled = false;
        if (tl.progress() === 0) {
          glideToAnchor(() => {
            // rebuild at the anchor so every loop starts from known state
            tl = buildTourTimeline();
            tl?.play();
          });
        } else {
          tl.play();
        }
      } else {
        getTourTimeline()?.pause();
        if (tourRig.controls) tourRig.controls.enabled = true;
      }
    });

    const unsubReset = useStore.subscribe((s, prev) => {
      if (s.resetSignal === prev.resetSignal) return;
      const tl = getTourTimeline();
      if (tl) {
        tl.pause();
        tl.progress(0);
      }
      useStore.getState().setPlayhead(0);
      if (tourRig.controls) tourRig.controls.enabled = true;
    });

    return () => {
      unsubPlay();
      unsubReset();
      killTourTimeline();
      useStore.getState().setPlaying(false);
      useStore.getState().setPlayhead(0);
    };
  }, []);

  return null;
}

/** Scrub the tour from the UI: pauses and seeks. */
export function scrubTour(progress: number) {
  const tl = getTourTimeline() ?? buildTourTimeline();
  if (!tl) return;
  useStore.getState().setPlaying(false);
  tl.pause();
  tl.progress(progress);
  useStore.getState().setPlayhead(progress);
}
