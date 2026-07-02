import type { FootprintResult, Listing } from './types';

export type Provenance = 'REAL' | 'DERIVED' | 'SCHEMATIC' | 'UNKNOWN';

export const PROV_META: Record<Provenance, { label: string; short: string; color: string }> = {
  REAL: { label: 'Measured', short: 'R', color: '#5fd39a' },
  DERIVED: { label: 'Derived', short: 'D', color: '#79c6e8' },
  SCHEMATIC: { label: 'Schematic', short: 'S', color: '#e8b667' },
  UNKNOWN: { label: 'Unknown', short: 'U', color: '#8b96a3' },
};

/** Where the 3D massing came from — honest about confidence. */
export function geometryProvenance(f: FootprintResult, hasGlb: boolean): Provenance {
  if (hasGlb) return 'REAL'; // author-supplied model
  if (f.source === 'osm') return 'REAL'; // measured OpenStreetMap outline
  if (f.source === 'inline') return 'SCHEMATIC'; // hand-authored demo shape
  return 'DERIVED'; // rectangle estimated from floor area
}

export interface DataField {
  label: string;
  value: string;
  prov: Provenance;
}

/** Structured spec sheet with per-value provenance. */
export function listingFields(
  l: Listing,
  f: FootprintResult,
  dims: { width: number; depth: number; height: number },
  hasGlb: boolean,
): DataField[] {
  const geo = geometryProvenance(f, hasGlb);
  return [
    { label: 'List price', value: `$${l.price.toLocaleString()}`, prov: 'REAL' },
    { label: 'Bedrooms', value: String(l.beds), prov: 'REAL' },
    { label: 'Bathrooms', value: String(l.baths), prov: 'REAL' },
    { label: 'Floor area', value: `${l.sqft.toLocaleString()} ft²`, prov: 'REAL' },
    { label: 'Year built', value: String(l.yearBuilt), prov: 'REAL' },
    { label: 'Storeys', value: String(l.floors), prov: 'DERIVED' },
    { label: 'Style', value: l.style.replace('-', ' '), prov: 'REAL' },
    {
      label: 'Footprint',
      value:
        f.source === 'osm' ? 'OSM outline' : f.source === 'inline' ? 'Demo shape' : 'Area estimate',
      prov: geo,
    },
    {
      label: 'Envelope',
      value: `${dims.width.toFixed(1)} × ${dims.depth.toFixed(1)} × ${dims.height.toFixed(1)} m`,
      prov: 'DERIVED',
    },
  ];
}
