import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { CONFIG } from '../config';

/** Screen-space scan beam that sweeps the viewport when SCAN AREA fires. */
export default function ScanSweep() {
  const beamRef = useRef<HTMLDivElement>(null);
  const scanFiredAt = useStore((s) => s.scanFiredAt);

  useEffect(() => {
    const beam = beamRef.current;
    if (!beam || !scanFiredAt) return;
    const tl = gsap.timeline();
    tl.set(beam, { opacity: 1, left: '-12%' }).to(beam, {
      left: '112%',
      duration: CONFIG.scan.sweepMs / 1000,
      ease: 'power2.inOut',
    }).to(beam, { opacity: 0, duration: 0.3, ease: 'power2.out' }, '>-0.1');
    return () => {
      tl.kill();
    };
  }, [scanFiredAt]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden" aria-hidden>
      <div ref={beamRef} className="scan-beam" style={{ opacity: 0 }} />
    </div>
  );
}
