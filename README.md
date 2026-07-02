# SPYGLASS · HOLO-ATLAS

A luxury sci-fi map table. A graded satellite city, a **SCAN AREA** button that outlines
every available house with pulsing cyan footprints, and a click that blooms any of them
into a full 3D holographic reconstruction — containment sphere, HUD panels, and a
cinematic **PLAY TOUR** that flies inside, ramps the room lights, and swings the door open.

Vite · React 19 · TypeScript · MapLibre GL · React Three Fiber · drei · postprocessing · GSAP · Tailwind · Zustand · idb.

## Run

```bash
npm install
npm run dev        # http://localhost:5110  (port is pinned with --strictPort)
```

If port 5110 is busy, the app is already running — reuse that tab (workspace rule).

## Controls — everything is a labeled button

| Button | Where | Does |
|---|---|---|
| **SCAN AREA** | map dock | sweeps the sector, outlines every structure, opens the targets rail |
| **OPEN HOLOGRAM** | map dock | opens the selected structure (or the featured one) |
| **RESET VIEW** | both docks | map: glide home · hologram: reset camera + rewind tour |
| **TOGGLE MAP DETAIL** | top bar | vector roads / labels / 3D buildings over the satellite |
| **TOGGLE HUD** | top bar | hides chrome (the HUD button itself always stays) |
| **PLAY TOUR / PAUSE** | hologram dock | cinematic loop: approach → door → interior → lights → hero pull-out |
| **CLOSE** | hologram dock | collapse back to the map (Esc works too) |
| listing cards / outlines | rail / map | click to reconstruct that house |

## Blender GLB workflow

Holograms are procedural by default (extruded real footprint + generated rooms).
To show a real model for a listing:

1. Model the house in Blender. **Name the door node `door`** (any node whose name
   contains `door`, except `porch*`) — PLAY TOUR swings it open.
2. `File → Export → glTF 2.0 (.glb)` — geometry only is fine; materials are replaced
   by the holographic treatment at load.
3. Drop it in `public/models/`, e.g. `public/models/jv-45.glb`.
4. Register it in `public/models/manifest.json`:
   ```json
   { "jv-45": "/models/jv-45.glb" }
   ```
5. Reopen the listing. The model is auto-scaled to the real footprint envelope,
   centered, floor-seated, and rendered as holo glass + wireframe. The HUD reads
   `MESH BLENDER GLB`.

Anything wrong (missing file, bad GLB, no manifest) automatically falls back to the
procedural reconstruction — the app never blanks. `scripts/make-sample-glb.mjs`
generates the bundled example (`jv-39.glb`) without opening Blender.

## What is real vs simulated

**Real**
- Satellite imagery: Esri World Imagery tiles (free, keyless, attributed on-map).
- Vector detail: OpenFreeMap / OpenMapTiles roads, labels, 3D building extrusions.
- **Building footprints: live OpenStreetMap** via one batched Overpass query,
  matched to the nearest building per listing, cached in IndexedDB (revisits are
  instant and offline-tolerant).
- The hologram geometry: the actual footprint polygon, extruded.
- Telemetry panel numbers: computed from the real envelope.
- 60 fps and the flat 10-cycle memory profile (see `SELF_CHECK.md`).

**Simulated**
- The listings themselves (12 mock properties; "Gooley Cliffs" is fictional —
  the coordinates are a real New Jersey neighborhood).
- Interiors: procedural rooms/furniture derived from beds/baths/floors —
  deliberately stylized holo blocks, not floor plans.
- The build queue / "PERFECTING YOUR AREA…" ticker: theater over real footprint
  counts. No client-only app can run daily background rebuilds; the OSM cache is
  the honest part.
- Integrity/drift readouts: set dressing.

## Verification harness

```bash
node scripts/shots.mjs map scan hologram hologram2 tour   # real-click screenshots → shots/
```

Every phase of the build was verified with real clicks in hardware-GL Chromium —
scores and evidence live in [SELF_CHECK.md](SELF_CHECK.md).
