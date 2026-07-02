import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import HouseHologram from './HouseHologram';
import { getListing, getFootprint, loadAtlas } from '../data/atlasData';
import { useStore } from '../store/useStore';
import type { Listing, FootprintResult } from '../data/types';

interface Payload {
  listing: Listing;
  footprint: FootprintResult;
}

/**
 * Full-screen reconstruction bay. Mounts when a structure opens, resolves its
 * footprint (shimmer while pending), fades the stage in over the blurred map,
 * and plays a collapse before unmounting the Canvas on CLOSE.
 */
export default function HologramOverlay() {
  const openId = useStore((s) => s.openId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // open: retain id locally, resolve data, fade in
  useEffect(() => {
    if (!openId) return;
    setActiveId(openId);
    let alive = true;
    (async () => {
      await loadAtlas();
      if (!alive) return;
      const listing = getListing(openId);
      const footprint = getFootprint(openId);
      if (listing && footprint) setPayload({ listing, footprint });
    })();
    return () => {
      alive = false;
    };
  }, [openId]);

  // entrance / exit choreography
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (openId) {
      const tl = gsap.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: 0.55, ease: 'power2.out', delay: 0.25 },
      );
      return () => {
        tl.kill();
      };
    }
    if (activeId) {
      const tl = gsap.to(el, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => {
          setActiveId(null);
          setPayload(null); // unmounts the Canvas → full GL disposal
        },
      });
      return () => {
        tl.kill();
      };
    }
  }, [openId, activeId]);

  if (!activeId) return null;

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 z-30"
      style={{ background: '#04070F', opacity: 0 }}
    >
      {payload ? (
        <HouseHologram listing={payload.listing} footprint={payload.footprint} />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center gap-4">
          <div
            className="text-[13px] tracking-[0.3em] uppercase"
            style={{ fontFamily: 'var(--font-hud)', color: 'var(--wire)' }}
          >
            RECONSTRUCTING {getListing(activeId)?.address ?? 'STRUCTURE'}
          </div>
          <div className="ticker__bar" style={{ width: 220 }}>
            <div className="ticker__fill holo-loading__fill" />
          </div>
        </div>
      )}
    </div>
  );
}
