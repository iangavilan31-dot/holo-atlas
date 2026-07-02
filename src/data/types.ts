export type LngLatRing = [number, number][]; // [lng, lat]
export type LocalRing = [number, number][]; // [x, z] meters, centered on 0,0

export interface Listing {
  id: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  floors: number;
  yearBuilt: number;
  style: 'ranch' | 'colonial' | 'cape' | 'contemporary' | 'split-level' | 'tudor';
  footprint?: LocalRing; // inline fallback so shapes vary even without OSM
}

export interface FootprintResult {
  /** Local meters, centered — feeds the hologram extrusion. */
  ring: LocalRing;
  /** Geographic ring — feeds the map outline layers. */
  lngLatRing: LngLatRing;
  source: 'osm' | 'inline' | 'rectangle';
}

export interface ListingProvider {
  getListingsInBounds(b: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
}

export interface FootprintProvider {
  /** Resolve every listing's footprint (batched where possible). */
  resolveAll(listings: Listing[]): Promise<Map<string, FootprintResult>>;
  getFootprint(l: Listing): Promise<FootprintResult>;
}
