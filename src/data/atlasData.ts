import { MOCK_LISTINGS, MockListingProvider } from './mockListings';
import { OSMFootprintProvider } from './OSMFootprintProvider';
import type { FootprintResult, Listing } from './types';

export const listingProvider = new MockListingProvider();
export const footprintProvider = new OSMFootprintProvider();

interface Atlas {
  listings: Listing[];
  footprints: Map<string, FootprintResult>;
  ready: boolean;
}

export const atlas: Atlas = { listings: MOCK_LISTINGS, footprints: new Map(), ready: false };

let loading: Promise<Atlas> | null = null;

/** Resolve every listing's footprint once (Overpass batched, idb-cached). */
export function loadAtlas(): Promise<Atlas> {
  return (loading ??= (async () => {
    atlas.footprints = await footprintProvider.resolveAll(atlas.listings);
    atlas.ready = true;
    return atlas;
  })());
}

export function getListing(id: string): Listing | undefined {
  return atlas.listings.find((l) => l.id === id);
}

export function getFootprint(id: string): FootprintResult | undefined {
  return atlas.footprints.get(id);
}
