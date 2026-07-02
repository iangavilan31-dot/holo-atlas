import { useEffect, useRef } from 'react';
import maplibregl, { type Map as MLMapHandle } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CONFIG } from '../config';
import { buildHoloStyle, setDetailVisible } from './holoMapStyle';
import { setMapInstance } from './mapSingleton';
import { useStore } from '../store/useStore';

/** Satellite hologram table: graded raster base + vector detail + CSS finishing grade. */
export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: buildHoloStyle(),
      center: [CONFIG.center.lng, CONFIG.center.lat],
      zoom: CONFIG.center.zoom,
      pitch: CONFIG.center.pitch,
      bearing: CONFIG.center.bearing,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: { compact: true },
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    map.on('load', () => {
      setDetailVisible(map, useStore.getState().mapDetail);
      setMapInstance(map);
    });
    map.on('error', (e) => console.error('[map]', e.error?.message ?? e));
    if (import.meta.env.DEV) {
      (window as unknown as { __map?: MLMapHandle }).__map = map;
    }

    // TOGGLE MAP DETAIL
    const unsubDetail = useStore.subscribe((s, prev) => {
      if (s.mapDetail !== prev.mapDetail && map.isStyleLoaded()) {
        setDetailVisible(map, s.mapDetail);
      }
    });

    // RESET VIEW (map mode): glide home
    const unsubReset = useStore.subscribe((s, prev) => {
      if (s.resetSignal !== prev.resetSignal && s.mode === 'MAP') {
        map.flyTo({
          center: [CONFIG.center.lng, CONFIG.center.lat],
          zoom: CONFIG.center.zoom,
          pitch: CONFIG.center.pitch,
          bearing: CONFIG.center.bearing,
          duration: 1600,
          essential: true,
        });
      }
    });

    return () => {
      unsubDetail();
      unsubReset();
      setMapInstance(null);
      map.remove();
    };
  }, []);

  return (
    <div className="absolute inset-0">
      {/* inline position: maplibre-gl.css sets .maplibregl-map{position:relative} which
          loads after Tailwind and would collapse the container to 0 height */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {/* cinematic grade: cyan-steel cast over the desaturated imagery */}
      <div className="map-grade" aria-hidden />
      {/* vignette pulls the table into darkness at the edges */}
      <div className="map-vignette" aria-hidden />
      {/* faint instrument dot-grid */}
      <div className="map-dots" aria-hidden />
    </div>
  );
}
