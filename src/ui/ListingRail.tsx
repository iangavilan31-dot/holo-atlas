import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { atlas, loadAtlas } from '../data/atlasData';
import { useStore } from '../store/useStore';

/** Right-side targets rail — appears once SCAN AREA has swept the sector. */
export default function ListingRail() {
  const scanActive = useStore((s) => s.scanActive);
  const hoveredId = useStore((s) => s.hoveredId);
  const setHovered = useStore((s) => s.setHovered);
  const openHologram = useStore((s) => s.openHologram);
  const [meshReady, setMeshReady] = useState(atlas.ready);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadAtlas().then(() => {
      if (alive) setMeshReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!scanActive || !railRef.current) return;
    const cards = railRef.current.querySelectorAll('.listing-card');
    gsap.fromTo(
      cards,
      { x: 46, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: 'power3.out', delay: 0.5 },
    );
  }, [scanActive]);

  if (!scanActive) return null;

  return (
    <div
      ref={railRef}
      className="absolute right-5 top-24 bottom-24 z-40 w-[268px] max-[920px]:w-[212px] overflow-y-auto pr-1 flex flex-col gap-2"
    >
      <div
        className="text-[10px] tracking-[0.3em] uppercase mb-1 pl-1"
        style={{ fontFamily: 'var(--font-hud)', color: 'rgba(143,244,255,0.55)' }}
      >
        STRUCTURES // {atlas.listings.length} LOCKED
      </div>
      {atlas.listings.map((l) => {
        const src = atlas.footprints.get(l.id)?.source;
        const hovered = hoveredId === l.id;
        return (
          <button
            key={l.id}
            type="button"
            className={`listing-card${hovered ? ' listing-card--hot' : ''}`}
            onMouseEnter={() => setHovered(l.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => openHologram(l.id)}
            title="Open holographic reconstruction"
          >
            <div className="listing-card__addr">{l.address.split(',')[0].toUpperCase()}</div>
            <div className="listing-card__price">${l.price.toLocaleString()}</div>
            <div className="listing-card__spec">
              {l.beds} BD · {l.baths} BA · {l.sqft.toLocaleString()} FT² · {l.yearBuilt}
            </div>
            <div className="listing-card__mesh">
              <span className="hbtn__dot" />
              MESH {meshReady && src ? src.toUpperCase() : 'RESOLVING…'} · {l.style.toUpperCase()}
            </div>
          </button>
        );
      })}
    </div>
  );
}
