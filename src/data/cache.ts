import { openDB, type IDBPDatabase } from 'idb';
import type { FootprintResult } from './types';

const DB = 'holo-atlas';
const STORE = 'footprints';
let _db: Promise<IDBPDatabase> | null = null;
const db = () =>
  (_db ??= openDB(DB, 2, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    },
  }));

export const footprintKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

export async function getCachedFootprint(k: string) {
  try {
    return (await (await db()).get(STORE, k)) as FootprintResult | undefined;
  } catch {
    return undefined;
  }
}

export async function setCachedFootprint(k: string, v: FootprintResult) {
  try {
    await (await db()).put(STORE, v, k);
  } catch {
    /* cache is best-effort */
  }
}
