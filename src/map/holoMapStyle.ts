import type { Map as MLMap, StyleSpecification } from 'maplibre-gl';
import { CONFIG } from '../config';

/**
 * Satellite base graded into the hologram look:
 * - Esri World Imagery raster, heavily desaturated + darkened (CSS layers finish the cyan cast)
 * - OpenFreeMap vector overlay: water, cyan hairline roads, 3D building extrusions, sparse labels
 * The `detail-*` layers form the TOGGLE MAP DETAIL group.
 */
export function buildHoloStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: CONFIG.glyphsUrl,
    sources: {
      sat: {
        type: 'raster',
        tiles: [CONFIG.satelliteTiles],
        tileSize: 256,
        maxzoom: 19,
        attribution: CONFIG.satelliteAttribution,
      },
      omt: { type: 'vector', url: CONFIG.vectorTilesUrl },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#03060E' } },
      {
        id: 'sat',
        type: 'raster',
        source: 'sat',
        paint: {
          'raster-saturation': -0.92,
          'raster-contrast': 0.22,
          'raster-brightness-min': 0.0,
          'raster-brightness-max': 0.7,
          'raster-fade-duration': 300,
        },
      },
      {
        id: 'detail-water',
        type: 'fill',
        source: 'omt',
        'source-layer': 'water',
        paint: { 'fill-color': '#041220', 'fill-opacity': 0.62 },
      },
      {
        id: 'detail-roads-minor',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['!in', 'class', 'motorway', 'trunk', 'primary'],
        paint: {
          'line-color': '#0AB6D6',
          'line-opacity': 0.3,
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 16, 1.1, 19, 2.4],
        },
      },
      {
        id: 'detail-roads-major',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 10,
        filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
        paint: {
          'line-color': '#17CFEA',
          'line-opacity': 0.45,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 16, 2.2, 19, 4.5],
        },
      },
      {
        id: 'detail-buildings-3d',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#35E4FF',
          'fill-extrusion-opacity': 0.3,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        },
      },
      {
        id: 'detail-street-labels',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 15,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-letter-spacing': 0.18,
          'text-transform': 'uppercase',
        },
        paint: {
          'text-color': '#8FF4FF',
          'text-opacity': 0.65,
          'text-halo-color': 'rgba(3,6,14,0.9)',
          'text-halo-width': 1.1,
        },
      },
      {
        id: 'detail-place-labels',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        maxzoom: 15,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-letter-spacing': 0.24,
          'text-transform': 'uppercase',
        },
        paint: {
          'text-color': '#8FF4FF',
          'text-opacity': 0.7,
          'text-halo-color': 'rgba(3,6,14,0.9)',
          'text-halo-width': 1.2,
        },
      },
    ],
  };
}

const DETAIL_PREFIX = 'detail-';

/** TOGGLE MAP DETAIL — show/hide the vector overlay group. */
export function setDetailVisible(map: MLMap, visible: boolean) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.id.startsWith(DETAIL_PREFIX)) {
      map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
    }
  }
}
