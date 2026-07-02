import type { Listing } from '../data/types';

export interface RoomBox {
  pos: [number, number, number];
  size: [number, number, number];
  kind: 'bed' | 'bath' | 'common';
}

/** Grid-partition the house bbox into rooms per floor from beds/baths. */
export function generateInterior(
  bbox: { width: number; depth: number; height: number; floors: number },
  l: Listing,
): RoomBox[] {
  const rooms: RoomBox[] = [];
  const perFloor = Math.max(1, Math.ceil((l.beds + l.baths + 1) / bbox.floors));
  const cols = Math.ceil(Math.sqrt(perFloor));
  const rowsN = Math.ceil(perFloor / cols);
  const fh = bbox.height / bbox.floors;
  const rw = bbox.width / cols;
  const rd = bbox.depth / rowsN;
  const pad = 0.4;
  let bed = l.beds;
  let bath = l.baths;
  for (let f = 0; f < bbox.floors; f++) {
    for (let r = 0; r < rowsN; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -bbox.width / 2 + rw * (c + 0.5);
        const z = -bbox.depth / 2 + rd * (r + 0.5);
        const y = fh * f + fh / 2;
        let kind: RoomBox['kind'] = 'common';
        if (bed > 0) {
          kind = 'bed';
          bed--;
        } else if (bath > 0) {
          kind = 'bath';
          bath--;
        }
        rooms.push({ pos: [x, y, z], size: [rw - pad, fh - pad, rd - pad], kind });
      }
    }
  }
  return rooms;
}

/** Low-poly holographic furniture as glowing blocks, keyed to room kind. */
export function furnitureFor(
  room: RoomBox,
): { pos: [number, number, number]; size: [number, number, number] }[] {
  const [x, y, z] = room.pos;
  const floorY = y - room.size[1] / 2;
  if (room.kind === 'bed') return [{ pos: [x, floorY + 0.4, z], size: [2, 0.8, 1.4] }];
  if (room.kind === 'bath') return [{ pos: [x, floorY + 0.4, z], size: [0.8, 0.8, 0.8] }];
  return [{ pos: [x, floorY + 0.35, z], size: [1.6, 0.7, 0.9] }]; // sofa/table
}
