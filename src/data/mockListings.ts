import type { Listing, ListingProvider, LocalRing } from './types';

const rect = (w: number, d: number): LocalRing => [
  [-w / 2, -d / 2],
  [w / 2, -d / 2],
  [w / 2, d / 2],
  [-w / 2, d / 2],
];
const L_SHAPE: LocalRing = [[-7, -6], [7, -6], [7, 2], [0, 2], [0, 6], [-7, 6]];
const T_SHAPE: LocalRing = [[-8, -5], [8, -5], [8, 0], [3, 0], [3, 7], [-3, 7], [-3, 0], [-8, 0]];

export const MOCK_LISTINGS: Listing[] = [
  { id: 'jv-37', address: '37 Johnson Avenue, Gooley Cliffs', lat: 40.8901, lng: -73.9701, price: 1_285_000, beds: 4, baths: 3, sqft: 2840, floors: 2, yearBuilt: 1998, style: 'colonial', footprint: rect(10, 13) },
  { id: 'jv-35', address: '35 Johnson Avenue, Gooley Cliffs', lat: 40.8903, lng: -73.9705, price: 940_000, beds: 3, baths: 2, sqft: 1720, floors: 1, yearBuilt: 1962, style: 'ranch', footprint: rect(18, 8) },
  { id: 'jv-39', address: '39 Johnson Avenue, Gooley Cliffs', lat: 40.8899, lng: -73.9697, price: 1_640_000, beds: 5, baths: 4, sqft: 3610, floors: 2, yearBuilt: 2015, style: 'contemporary', footprint: L_SHAPE },
  { id: 'jv-41', address: '41 Johnson Avenue, Gooley Cliffs', lat: 40.8897, lng: -73.9693, price: 815_000, beds: 3, baths: 2, sqft: 1480, floors: 1, yearBuilt: 1955, style: 'cape', footprint: rect(9, 9) },
  { id: 'jv-33', address: '33 Johnson Avenue, Gooley Cliffs', lat: 40.8905, lng: -73.9709, price: 1_120_000, beds: 4, baths: 3, sqft: 2510, floors: 2, yearBuilt: 1988, style: 'split-level', footprint: T_SHAPE },
  { id: 'jv-45', address: '45 Johnson Avenue, Gooley Cliffs', lat: 40.8894, lng: -73.9688, price: 2_050_000, beds: 6, baths: 5, sqft: 4720, floors: 3, yearBuilt: 2021, style: 'contemporary', footprint: rect(16, 12) },
  { id: 'jv-30', address: '30 Johnson Avenue, Gooley Cliffs', lat: 40.8908, lng: -73.9704, price: 725_000, beds: 2, baths: 1, sqft: 1120, floors: 1, yearBuilt: 1949, style: 'ranch', footprint: rect(12, 7) },
  { id: 'jv-32', address: '32 Johnson Avenue, Gooley Cliffs', lat: 40.8907, lng: -73.97, price: 1_390_000, beds: 4, baths: 3, sqft: 2960, floors: 2, yearBuilt: 2004, style: 'colonial', footprint: rect(14, 10) },
  { id: 'md-12', address: '12 Maple Drive, Gooley Cliffs', lat: 40.8912, lng: -73.9696, price: 1_010_000, beds: 3, baths: 3, sqft: 2180, floors: 2, yearBuilt: 1979, style: 'tudor', footprint: L_SHAPE },
  { id: 'md-16', address: '16 Maple Drive, Gooley Cliffs', lat: 40.8914, lng: -73.9691, price: 880_000, beds: 3, baths: 2, sqft: 1650, floors: 1, yearBuilt: 1968, style: 'ranch', footprint: rect(15, 8) },
  { id: 'ct-4', address: '4 Cliffside Terrace, Gooley Cliffs', lat: 40.8896, lng: -73.9711, price: 1_775_000, beds: 5, baths: 4, sqft: 3980, floors: 2, yearBuilt: 2018, style: 'contemporary', footprint: T_SHAPE },
  { id: 'ct-8', address: '8 Cliffside Terrace, Gooley Cliffs', lat: 40.8892, lng: -73.9714, price: 995_000, beds: 4, baths: 2, sqft: 2240, floors: 2, yearBuilt: 1991, style: 'colonial', footprint: rect(11, 11) },
];

export class MockListingProvider implements ListingProvider {
  async getListingsInBounds(b: { north: number; south: number; east: number; west: number }) {
    return MOCK_LISTINGS.filter(
      (l) => l.lat <= b.north && l.lat >= b.south && l.lng <= b.east && l.lng >= b.west,
    );
  }
  async getListing(id: string) {
    return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
  }
}
