import { useEffect, useState } from 'react';
import type { MapLayerMouseEvent, Map as MLMap } from 'maplibre-gl';
import type { Feature } from 'geojson';
import gsap from 'gsap';
import { onMapReady } from './mapSingleton';
import { atlas, loadAtlas } from '../data/atlasData';
import { useStore } from '../store/useStore';
import type { Listing } from '../data/types';

const SRC_FP = 'holo-footprints';
const SRC_PT = 'holo-roofpoints';
const LAYERS = ['fp-fill', 'fp-glow', 'fp-line', 'pt-glow', 'pt-core'] as const;

interface Tip {
  x: number;
  y: number;
  listing: Listing;
}

function buildGeoJSON() {
  const fp = {
    type: 'FeatureCollection' as const,
    features: atlas.listings
      .map((l) => {
        const f = atlas.footprints.get(l.id);
        if (!f) return null;
        const ring = [...f.lngLatRing, f.lngLatRing[0]];
        return {
          type: 'Feature' as const,
          properties: { id: l.id },
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
        };
      })
      .filter(Boolean) as Feature[],
  };
  const pt = {
    type: 'FeatureCollection' as const,
    features: atlas.listings.map((l) => ({
      type: 'Feature' as const,
      properties: { id: l.id },
      geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] },
    })),
  };
  return { fp, pt };
}

function addLayers(map: MLMap) {
  if (map.getSource(SRC_FP)) return;
  const { fp, pt } = buildGeoJSON();
  map.addSource(SRC_FP, { type: 'geojson', data: fp, promoteId: 'id' });
  map.addSource(SRC_PT, { type: 'geojson', data: pt, promoteId: 'id' });

  const hoverBool = ['boolean', ['feature-state', 'hover'], false];
  const selBool = ['boolean', ['feature-state', 'selected'], false];

  map.addLayer({
    id: 'fp-fill',
    type: 'fill',
    source: SRC_FP,
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#DFF3FA',
      'fill-opacity': ['case', hoverBool, 0.24, selBool, 0.15, 0.05] as never,
    },
  });
  map.addLayer({
    id: 'fp-glow',
    type: 'line',
    source: SRC_FP,
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#A5D8E8', 'line-width': 7, 'line-blur': 5, 'line-opacity': 0 },
  });
  map.addLayer({
    id: 'fp-line',
    type: 'line',
    source: SRC_FP,
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['case', hoverBool, '#FFFFFF', selBool, '#FFFFFF', '#E9F7FD'] as never,
      'line-width': ['case', hoverBool, 3.2, selBool, 2.6, 2] as never,
      'line-opacity': 0,
    },
  });
  map.addLayer({
    id: 'pt-glow',
    type: 'circle',
    source: SRC_PT,
    layout: { visibility: 'none' },
    paint: {
      'circle-color': '#A5D8E8',
      'circle-radius': 9,
      'circle-blur': 1,
      'circle-opacity': 0,
    },
  });
  map.addLayer({
    id: 'pt-core',
    type: 'circle',
    source: SRC_PT,
    layout: { visibility: 'none' },
    paint: {
      'circle-color': '#FFFFFF',
      'circle-radius': ['case', hoverBool, 4.5, 3] as never,
      'circle-stroke-color': '#A5D8E8',
      'circle-stroke-width': 1.2,
      'circle-opacity': 0,
      'circle-stroke-opacity': 0,
    },
  });
}

/**
 * Pulsing footprint outlines + roof markers for every listing.
 * Hidden until SCAN AREA fires; reveal syncs with the screen sweep, then
 * a rAF loop breathes the outline opacity. Hover = tooltip, click = hologram.
 */
export default function FootprintLayer() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let mapRef: MLMap | null = null;
    const reveal = { v: 0 };
    let tween: gsap.core.Tween | null = null;
    let hoveredFs: string | null = null;
    let selectedFs: string | null = null;
    const cleanupFns: (() => void)[] = [];

    const off = onMapReady(async (map) => {
      mapRef = map;
      await loadAtlas();
      if (disposed || !map.getStyle()) return;
      addLayers(map);

      // ------ pulse loop (opacity breathes; reveal gates everything) ------
      const t0 = performance.now();
      const pulse = () => {
        if (disposed || !map.getStyle()) return;
        // idle before any scan: layers hidden — skip the paint churn entirely
        if (reveal.v === 0 && !useStore.getState().scanActive) {
          raf = requestAnimationFrame(pulse);
          return;
        }
        const t = (performance.now() - t0) / 1000;
        const breathe = 0.62 + 0.34 * Math.sin(t * 2.6);
        const v = reveal.v;
        if (map.getLayer('fp-line')) {
          map.setPaintProperty('fp-line', 'line-opacity', v * Math.min(1, 0.35 + breathe));
          map.setPaintProperty('fp-glow', 'line-opacity', v * 0.38 * breathe);
          map.setPaintProperty('pt-glow', 'circle-opacity', v * 0.4 * breathe);
          map.setPaintProperty('pt-core', 'circle-opacity', v * 0.95);
          map.setPaintProperty('pt-core', 'circle-stroke-opacity', v * 0.7);
        }
        raf = requestAnimationFrame(pulse);
      };
      raf = requestAnimationFrame(pulse);

      // ------ scan reveal / conceal ------
      const setVisibility = (visible: boolean) => {
        if (!map.getStyle()) return;
        for (const id of LAYERS) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
          }
        }
      };
      const applyScan = (active: boolean) => {
        tween?.kill();
        if (active) {
          setVisibility(true);
          tween = gsap.to(reveal, { v: 1, duration: 1.5, ease: 'power2.inOut' });
          // push the camera into the revealed cluster so outlines read
          const lngs: number[] = [];
          const lats: number[] = [];
          for (const f of atlas.footprints.values()) {
            for (const [lng, lat] of f.lngLatRing) {
              lngs.push(lng);
              lats.push(lat);
            }
          }
          if (lngs.length) {
            map.fitBounds(
              [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ],
              {
                padding: 150,
                pitch: map.getPitch(),
                bearing: map.getBearing(),
                duration: 1700,
                maxZoom: 17.4,
                essential: true,
              },
            );
          }
        } else {
          tween = gsap.to(reveal, {
            v: 0,
            duration: 0.45,
            ease: 'power2.in',
            onComplete: () => setVisibility(false),
          });
        }
      };
      if (useStore.getState().scanActive) applyScan(true);
      const unsubScan = useStore.subscribe((s, prev) => {
        if (s.scanActive !== prev.scanActive) applyScan(s.scanActive);
      });

      // ------ hover / select feature-state sync ------
      const setFs = (id: string | null, key: 'hover' | 'selected', prevId: string | null) => {
        if (!map.getStyle()) return prevId;
        if (prevId && prevId !== id) {
          for (const source of [SRC_FP, SRC_PT]) {
            map.setFeatureState({ source, id: prevId }, { [key]: false });
          }
        }
        if (id) {
          for (const source of [SRC_FP, SRC_PT]) {
            map.setFeatureState({ source, id }, { [key]: true });
          }
        }
        return id;
      };
      const unsubHover = useStore.subscribe((s, prev) => {
        if (s.hoveredId !== prev.hoveredId) hoveredFs = setFs(s.hoveredId, 'hover', hoveredFs);
        if (s.selectedId !== prev.selectedId)
          selectedFs = setFs(s.selectedId, 'selected', selectedFs);
      });

      // ------ pointer interactions (real hit-testing on the layers) ------
      const pick = (e: MapLayerMouseEvent): Listing | null => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        return id ? (atlas.listings.find((l) => l.id === id) ?? null) : null;
      };
      const onMove = (e: MapLayerMouseEvent) => {
        if (!useStore.getState().scanActive) return;
        const listing = pick(e);
        map.getCanvas().style.cursor = listing ? 'pointer' : '';
        useStore.getState().setHovered(listing?.id ?? null);
        setTip(listing ? { x: e.point.x, y: e.point.y, listing } : null);
      };
      const onLeave = () => {
        map.getCanvas().style.cursor = '';
        useStore.getState().setHovered(null);
        setTip(null);
      };
      const onClick = (e: MapLayerMouseEvent) => {
        if (!useStore.getState().scanActive) return;
        const listing = pick(e);
        if (listing) {
          setTip(null);
          useStore.getState().openHologram(listing.id);
        }
      };
      for (const layer of ['fp-fill', 'pt-core']) {
        map.on('mousemove', layer, onMove);
        map.on('mouseleave', layer, onLeave);
        map.on('click', layer, onClick);
      }

      cleanupFns.push(() => {
        unsubScan();
        unsubHover();
        for (const layer of ['fp-fill', 'pt-core']) {
          map.off('mousemove', layer, onMove);
          map.off('mouseleave', layer, onLeave);
          map.off('click', layer, onClick);
        }
      });
    });

    return () => {
      disposed = true;
      off();
      cancelAnimationFrame(raf);
      tween?.kill();
      for (const fn of cleanupFns) fn();
      // layers/sources die with the map instance (map.remove in MapView)
      void mapRef;
    };
  }, []);

  return tip ? (
    <div
      className="holo-panel absolute z-30 pointer-events-none"
      style={{ left: tip.x + 18, top: tip.y - 12, minWidth: 240 }}
    >
      <div className="holo-panel__title">{tip.listing.address}</div>
      <div>PRICE ${tip.listing.price.toLocaleString()}</div>
      <div>
        {tip.listing.beds} BD · {tip.listing.baths} BA · {tip.listing.sqft.toLocaleString()} FT²
      </div>
      <div className="holo-panel__ok">
        MESH {atlas.footprints.get(tip.listing.id)?.source.toUpperCase() ?? '—'} · CLICK TO
        RECONSTRUCT
      </div>
    </div>
  ) : null;
}
