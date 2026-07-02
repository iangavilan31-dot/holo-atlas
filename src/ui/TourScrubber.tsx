import { useStore } from '../store/useStore';
import { scrubTour } from '../hologram/TourController';

/** Timeline scrubber for the tour — sits just above the hologram dock. */
export default function TourScrubber() {
  const playhead = useStore((s) => s.playhead);
  const isPlaying = useStore((s) => s.isPlaying);

  // only present while a tour is running or mid-scrub
  if (!isPlaying && playhead < 0.001) return null;

  return (
    <div className="scrub-wrap">
      <span
        className="text-[11px] font-extrabold tracking-[0.1em] uppercase"
        style={{ fontFamily: 'var(--font-display)', color: 'rgba(255,255,255,0.7)' }}
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
        className="text-[11px] font-extrabold w-[42px]"
        style={{
          fontFamily: 'var(--font-display)',
          color: isPlaying ? 'var(--sky)' : 'rgba(255,255,255,0.7)',
        }}
      >
        {(playhead * 100).toFixed(0).padStart(2, '0')}%
      </span>
    </div>
  );
}
