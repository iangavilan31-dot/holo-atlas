import { useStore } from '../store/useStore';
import { scrubTour } from '../hologram/TourController';

/** Timeline scrubber for the tour — sits just above the hologram dock. */
export default function TourScrubber() {
  const playhead = useStore((s) => s.playhead);
  const isPlaying = useStore((s) => s.isPlaying);

  return (
    <div className="absolute bottom-[74px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
      <span
        className="text-[9px] tracking-[0.28em] uppercase"
        style={{ fontFamily: 'var(--font-hud)', color: 'rgba(143,244,255,0.55)' }}
      >
        TOUR
      </span>
      <input
        type="range"
        className="tour-scrub"
        min={0}
        max={1000}
        value={Math.round(playhead * 1000)}
        onChange={(e) => scrubTour(Number(e.target.value) / 1000)}
        aria-label="Tour timeline"
      />
      <span
        className="text-[9px] tracking-[0.2em] w-[42px]"
        style={{ fontFamily: 'var(--font-hud)', color: isPlaying ? 'var(--cyan)' : 'rgba(143,244,255,0.55)' }}
      >
        {(playhead * 100).toFixed(0).padStart(2, '0')}%
      </span>
    </div>
  );
}
