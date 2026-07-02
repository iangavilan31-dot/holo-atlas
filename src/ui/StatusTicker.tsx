import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const DEFAULT_LINES = [
  'PERFECTING YOUR AREA…',
  'RECONSTRUCTING 37 JOHNSON AVE…',
  'FOOTPRINT LOCKED · MESH STABLE',
  'SMOOTHING GEOMETRY…',
  'QUEUED: 3 NEW BUILDS',
];

/** External systems (build queue) can push live lines into the ticker. */
let externalLine: string | null = null;
export function pushTickerLine(line: string) {
  externalLine = line;
}

/**
 * Bottom-left persistent readout. Cycles flavor lines with a progress bar
 * that intentionally never completes — the atlas is always "perfecting".
 */
export default function StatusTicker() {
  const [line, setLine] = useState(DEFAULT_LINES[0]);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let i = 0;
    let alive = true;

    const cycle = () => {
      if (!alive) return;
      const next = externalLine ?? DEFAULT_LINES[i % DEFAULT_LINES.length];
      if (externalLine) externalLine = null;
      else i += 1;

      const label = labelRef.current;
      const fill = fillRef.current;
      if (!label || !fill) return;

      gsap.to(label, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          if (!alive) return;
          setLine(next);
          gsap.to(label, { opacity: 1, duration: 0.35, ease: 'power2.out' });
        },
      });
      // progress creeps toward a random ceiling, never 100%
      gsap.fromTo(
        fill,
        { right: '100%' },
        { right: `${100 - (62 + Math.random() * 31)}%`, duration: 3.4, ease: 'power3.out' },
      );
    };

    cycle();
    const id = window.setInterval(cycle, 4200);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="ticker" role="status">
      <div className="ticker__bar">
        <div ref={fillRef} className="ticker__fill" />
      </div>
      <div ref={labelRef} className="ticker__label">
        {line}
      </div>
    </div>
  );
}
