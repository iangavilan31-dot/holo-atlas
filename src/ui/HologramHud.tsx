import { useMemo } from 'react';
import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { listingFields, PROV_META, type Provenance } from '../data/provenance';
import { useStore } from '../store/useStore';
import type { Listing, FootprintResult } from '../data/types';

const LEGEND: Provenance[] = ['REAL', 'DERIVED', 'SCHEMATIC'];

/** Left spec-sheet panel — structured rows, per-value provenance. */
export default function HologramHud({
  listing,
  footprint,
  dims,
  modelUrl,
}: {
  listing: Listing;
  footprint: FootprintResult;
  dims: { width: number; depth: number; height: number };
  modelUrl: string | null;
}) {
  const hudVisible = useStore((s) => s.hudVisible);
  const ref = useRef<HTMLDivElement>(null);
  const fields = useMemo(
    () => listingFields(listing, footprint, dims, !!modelUrl),
    [listing, footprint, dims, modelUrl],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rows = el.querySelectorAll('.drow');
    const t = gsap.fromTo(
      el,
      { x: -18, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.35 },
    );
    const t2 = gsap.fromTo(
      rows,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, stagger: 0.035, ease: 'power2.out', delay: 0.5 },
    );
    return () => {
      t.kill();
      t2.kill();
    };
  }, []);

  if (!hudVisible) return null;

  return (
    <div className="dpanel" ref={ref}>
      <div className="dpanel__head">
        <div className="dpanel__eyebrow">Reconstruction · {listing.id.toUpperCase()}</div>
        <div className="dpanel__title">{listing.address.split(',')[0]}</div>
        <div className="dpanel__sub">{listing.address.split(',').slice(1).join(',').trim()}</div>
      </div>
      <div className="dpanel__rows">
        {fields.map((f) => (
          <div className="drow" key={f.label}>
            <span className="drow__label">{f.label}</span>
            <span className="drow__value">{f.value}</span>
            <span
              className="prov"
              style={{ background: PROV_META[f.prov].color }}
              title={PROV_META[f.prov].label}
            >
              {PROV_META[f.prov].short}
            </span>
          </div>
        ))}
      </div>
      <div className="dpanel__legend">
        {LEGEND.map((p) => (
          <span className="dpanel__legend-item" key={p}>
            <span className="dpanel__legend-dot" style={{ background: PROV_META[p].color }} />
            {PROV_META[p].label}
          </span>
        ))}
      </div>
    </div>
  );
}
