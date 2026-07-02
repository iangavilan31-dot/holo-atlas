import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { tourRig } from './tourRig';
import { buildTourTimeline, getTourTimeline, killTourTimeline } from './tourTimeline';

/** Binds PLAY TOUR / PAUSE / RESET to the cinematic tour timeline. */
export default function TourController() {
  useEffect(() => {
    const unsubPlay = useStore.subscribe((s, prev) => {
      if (s.isPlaying === prev.isPlaying) return;
      if (s.isPlaying) {
        // fresh pass each time so it always starts from the current framing
        const existing = getTourTimeline();
        const tl = existing && existing.progress() > 0 && existing.progress() < 1 ? existing : buildTourTimeline();
        if (!tl) {
          useStore.getState().setPlaying(false);
          return;
        }
        if (tourRig.controls) tourRig.controls.enabled = false;
        tl.play();
      } else {
        getTourTimeline()?.pause();
        if (tourRig.controls) tourRig.controls.enabled = true;
      }
    });

    const unsubReset = useStore.subscribe((s, prev) => {
      if (s.resetSignal === prev.resetSignal) return;
      killTourTimeline();
      useStore.getState().setPlayhead(0);
      if (tourRig.controls) tourRig.controls.enabled = true;
    });

    return () => {
      unsubPlay();
      unsubReset();
      killTourTimeline();
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
