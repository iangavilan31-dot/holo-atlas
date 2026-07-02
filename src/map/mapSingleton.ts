import type { Map as MLMap } from 'maplibre-gl';

/** One shared MapLibre instance; layers/controllers subscribe for readiness. */
let map: MLMap | null = null;
const waiters: ((m: MLMap) => void)[] = [];

export function setMapInstance(m: MLMap | null) {
  map = m;
  if (m) {
    for (const w of waiters.splice(0)) w(m);
  }
}

export function getMapInstance() {
  return map;
}

/** Runs cb now if the map exists, otherwise when it arrives. Returns unsubscribe. */
export function onMapReady(cb: (m: MLMap) => void): () => void {
  if (map) {
    cb(map);
    return () => {};
  }
  waiters.push(cb);
  return () => {
    const i = waiters.indexOf(cb);
    if (i >= 0) waiters.splice(i, 1);
  };
}
