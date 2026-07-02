/**
 * FAKED build queue — simulates a background service that keeps "perfecting
 * your area". What's real: it reads the actually-resolved footprint data
 * (sources, counts) and the OSM results are cached to IndexedDB so revisits
 * are instant. What's faked: there is no daily background rebuild — client-
 * only apps can't do that; the ticker narrative sells the fantasy honestly.
 */
import { atlas, loadAtlas } from '../data/atlasData';
import { pushTickerLine } from '../ui/StatusTicker';

let started = false;

export function startBuildQueue() {
  if (started) return;
  started = true;
  void (async () => {
    await loadAtlas();
    const osm = [...atlas.footprints.values()].filter((f) => f.source === 'osm').length;
    const lines = [
      `FOOTPRINTS RESOLVED · ${atlas.footprints.size} STRUCTURES`,
      `OSM MESH LOCKS · ${osm} LIVE`,
      ...atlas.listings
        .slice(0, 5)
        .map((l) => `RECONSTRUCTING ${l.address.split(',')[0].toUpperCase()}…`),
      'SMOOTHING GEOMETRY…',
      `QUEUED: ${Math.max(1, atlas.footprints.size - osm)} NEW BUILDS`,
      'FOOTPRINT LOCKED · MESH STABLE',
    ];
    let i = 0;
    // interleave with the ticker's own flavor lines
    window.setInterval(() => pushTickerLine(lines[i++ % lines.length]), 8400);
  })();
}
