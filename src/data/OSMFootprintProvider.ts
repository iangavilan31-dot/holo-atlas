import type {
  FootprintProvider,
  FootprintResult,
  Listing,
  LngLatRing,
  LocalRing,
} from './types';
import { footprintKey, getCachedFootprint, setCachedFootprint } from './cache';

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface Node {
  lat: number;
  lon: number;
}
interface Way {
  type: 'way';
  id: number;
  geometry?: Node[];
}

function scales(lat: number) {
  return { mLat: 110540, mLng: 111320 * Math.cos((lat * Math.PI) / 180) };
}

/** Geographic ring → local meters centered on the ring's centroid. */
function toLocal(ring: LngLatRing): LocalRing {
  const n = ring.length;
  const cLng = ring.reduce((s, p) => s + p[0], 0) / n;
  const cLat = ring.reduce((s, p) => s + p[1], 0) / n;
  const { mLat, mLng } = scales(cLat);
  return ring.map(([lng, lat]) => [(lng - cLng) * mLng, (lat - cLat) * mLat]);
}

/** Local meters ring → geographic ring around an anchor point. */
function toLngLat(ring: LocalRing, lat: number, lng: number): LngLatRing {
  const { mLat, mLng } = scales(lat);
  return ring.map(([x, y]) => [lng + x / mLng, lat + y / mLat]);
}

function wayCentroid(w: Way): Node {
  const g = w.geometry!;
  return {
    lat: g.reduce((s, p) => s + p.lat, 0) / g.length,
    lon: g.reduce((s, p) => s + p.lon, 0) / g.length,
  };
}

function rectFromSqft(sqft: number, floors: number): LocalRing {
  const m2 = (sqft / Math.max(1, floors)) * 0.092903;
  const aspect = 1.3;
  const w = Math.sqrt(m2 * aspect);
  const d = m2 / w;
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];
}

/** One Overpass request for every building in the listings' bbox (rate-limit friendly). */
async function fetchAreaWays(listings: Listing[]): Promise<Way[]> {
  if (!listings.length) return [];
  const pad = 0.0009; // ~100 m margin
  const south = Math.min(...listings.map((l) => l.lat)) - pad;
  const north = Math.max(...listings.map((l) => l.lat)) + pad;
  const west = Math.min(...listings.map((l) => l.lng)) - pad;
  const east = Math.max(...listings.map((l) => l.lng)) + pad;
  const q = `[out:json][timeout:25];way["building"](${south},${west},${north},${east});out geom;`;
  const body = 'data=' + encodeURIComponent(q);
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, { method: 'POST', body });
      if (!res.ok) continue;
      const j = await res.json();
      return ((j.elements ?? []) as Way[]).filter(
        (e) => e.type === 'way' && e.geometry && e.geometry.length >= 3,
      );
    } catch {
      /* try the mirror */
    }
  }
  return [];
}

const MAX_MATCH_METERS = 45;

function fallback(l: Listing): FootprintResult {
  if (l.footprint && l.footprint.length >= 3) {
    return { ring: l.footprint, lngLatRing: toLngLat(l.footprint, l.lat, l.lng), source: 'inline' };
  }
  const ring = rectFromSqft(l.sqft, l.floors);
  return { ring, lngLatRing: toLngLat(ring, l.lat, l.lng), source: 'rectangle' };
}

export class OSMFootprintProvider implements FootprintProvider {
  async resolveAll(listings: Listing[]): Promise<Map<string, FootprintResult>> {
    const out = new Map<string, FootprintResult>();
    const misses: Listing[] = [];

    for (const l of listings) {
      const cached = await getCachedFootprint(footprintKey(l.lat, l.lng));
      // older cache entries (pre-lngLatRing) are refetched
      if (cached?.lngLatRing) out.set(l.id, cached);
      else misses.push(l);
    }
    if (!misses.length) return out;

    const ways = await fetchAreaWays(misses);
    const taken = new Set<number>();

    for (const l of misses) {
      let best: Way | null = null;
      let bestD = Infinity;
      const { mLat, mLng } = scales(l.lat);
      for (const w of ways) {
        if (taken.has(w.id)) continue;
        const c = wayCentroid(w);
        const dx = (c.lon - l.lng) * mLng;
        const dy = (c.lat - l.lat) * mLat;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = w;
        }
      }
      let result: FootprintResult;
      if (best && bestD <= MAX_MATCH_METERS) {
        taken.add(best.id); // one building per listing — neighbours can't share
        const ll: LngLatRing = best.geometry!.map((p) => [p.lon, p.lat]);
        const f = ll[0];
        const last = ll[ll.length - 1];
        if (f[0] === last[0] && f[1] === last[1]) ll.pop();
        result = { ring: toLocal(ll), lngLatRing: ll, source: 'osm' };
      } else {
        result = fallback(l);
      }
      out.set(l.id, result);
      await setCachedFootprint(footprintKey(l.lat, l.lng), result);
    }
    return out;
  }

  async getFootprint(l: Listing): Promise<FootprintResult> {
    const all = await this.resolveAll([l]);
    return all.get(l.id) ?? fallback(l);
  }
}
