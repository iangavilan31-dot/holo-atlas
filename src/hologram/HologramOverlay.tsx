import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import TourController from './TourController';
import HologramHud from '../ui/HologramHud';

// the whole three/R3F stack loads only when a hologram actually opens
const HouseHologram = lazy(() => import('./HouseHologram'));
import { getListing, getFootprint, loadAtlas } from '../data/atlasData';
import { getModelUrl } from '../data/modelManifest';
import { useStore } from '../store/useStore';
import type { Listing, FootprintResult } from '../data/types';

interface Payload {
  listing: Listing;
  footprint: FootprintResult;
  modelUrl: string | null;
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

  // Escape = CLOSE (convenience only — the labeled button is the primary path)
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().closeHologram();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  // open: retain id locally, resolve data, fade in
  useEffect(() => {
    if (!openId) return;
    setActiveId(openId);
    let alive = true;
    (async () => {
      const [, modelUrl] = await Promise.all([loadAtlas(), getModelUrl(openId)]);
      if (!alive) return;
      const listing = getListing(openId);
      const footprint = getFootprint(openId);
      if (listing && footprint) setPayload({ listing, footprint, modelUrl });
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

  const shimmer = (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4">
      <div
        className="text-[15px] font-extrabold uppercase tracking-[0.06em] text-white"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Reconstructing {getListing(activeId)?.address ?? 'structure'}
      </div>
      <div className="ticker__bar" style={{ width: 220 }}>
        <div className="ticker__fill holo-loading__fill" />
      </div>
    </div>
  );

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 z-30"
      style={{ background: '#0A141D', opacity: 0 }}
    >
      {payload ? (
        <Suspense fallback={shimmer}>
          <HouseHologram
            listing={payload.listing}
            footprint={payload.footprint}
            modelUrl={payload.modelUrl}
          />
          <TourController />
          <ReconHud payload={payload} />
        </Suspense>
      ) : (
        shimmer
      )}
    </div>
  );
}

function ReconHud({ payload }: { payload: Payload }) {
  const dims = useMemo(() => {
    const xs = payload.footprint.ring.map((p) => p[0]);
    const zs = payload.footprint.ring.map((p) => p[1]);
    return {
      width: Math.max(...xs) - Math.min(...xs),
      depth: Math.max(...zs) - Math.min(...zs),
      height: Math.max(1, payload.listing.floors) * 3.1,
    };
  }, [payload]);
  return (
    <HologramHud
      listing={payload.listing}
      footprint={payload.footprint}
      dims={dims}
      modelUrl={payload.modelUrl}
    />
  );
}
