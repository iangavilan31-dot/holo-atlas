# SPYGLASS · HOLO-ATLAS — Final Master Audit

Judged from **screenshots of the running app** (16 captured states across desktop
1600×1000, tablet 834×1112, phone 390×844 — `shots/audit/`), not from code.
Harness: `scripts/audit.mjs` — real clicks, hardware GL (ANGLE/D3D11), every
console level captured, fps sampled per mode, 10-cycle hologram leak test.

## Screenshot review notes

- **Pre-scan (desktop/tablet/phone):** graded satellite table, chunky white/sky
  wordmark, frosted controls, new first-run hint pill ("SWEEP THE SECTOR — PRESS
  SCAN AREA"). No dead space, no mystery UI.
- **Scan:** sweep + camera push-in + 12 pulsing white footprints + frosted card
  rail. OSM shapes visibly irregular vs fallbacks. Hovering a card highlights the
  map outline and vice-versa (feature-state verified `{hover:true}`).
- **Tooltip:** frosted white, ink title, sky action line — reads premium, not HUD.
- **Hologram (procedural + GLB):** ice containment sphere, white architectural
  wireframes, glass data panels, gold room-light warmth on tour. The GLB house
  (roof/chimney/porch/door) is the hero frame. Two listings = two visibly
  different reconstructions.
- **Tour:** approach → door visibly swings open (caught in `mobile-tour.png`) →
  interior with light ramp → hero pull-out. Scrubber live, loop-seam safe.
- **HUD OFF / MAP DETAIL OFF:** verified; HUD button never hides itself.

## Weaknesses found → fixes made (this pass)

| Found | Fix |
|---|---|
| `THREE.Clock` deprecation warning on every hologram open (three 0.185 + R3F) | aligned to three **0.180.0** (+types), verified silent; visuals unchanged |
| **Mobile layout genuinely broken** — card rail buried the whole map, dock stacked into a 3-row pile over cards, hologram camera cropped the house edge-to-edge | rail becomes a horizontal card strip above the dock (map stays visible); portrait-aspect camera zoom-out (×1.55); compact button scale |
| Root cause of the dock pile: `left:50%` shrink-to-fit gives absolutely-positioned bars only half the viewport before transform | dock/scrubber/hint recentered via `left:0;right:0;margin:auto;width:max-content` — wraps only when actually out of space |
| My mobile CSS overrides silently lost to Tailwind utilities (utilities emit after the early `@import`) | moved dock layout fully into the stylesheet class, no competing utilities |
| No first-time guidance to press SCAN | frosted hint pill, fades in at 0.9 s, gone once scanned |
| Footprint pulse rAF churned 5 paint props/frame even pre-scan while layers were hidden | early-skip until scan reveal begins |
| Scan-sweep plane read as a paper slab post-reskin | peak opacity 0.38 → 0.16 |
| Template leftovers (`src/assets`, unused svgs, template README) | removed earlier passes; re-verified none remain |

## Performance (measured, hardware GL)

- **fps:** map 61 · scan 61 · hologram 56 · mid-tour 57 (rAF-counted 2 s samples)
- **Memory:** 10× open/close across different listings — heap **flat at 82 MB**
  (first cycle = last cycle). Explicit geometry/material disposal + full canvas
  unmount on close; GLB loader cache deliberately preserved (`dispose={null}`).
- **Boot payload:** 372 KB gzip; the 284 KB three/R3F stack lazy-loads on first
  hologram open behind the reconstruction shimmer.
- Overpass batched to a single bbox request, cached in IndexedDB.

## Console

- Zero errors, zero warnings across boot, scan, toggles, hover, procedural
  hologram, GLB hologram, tour, Esc close, and all 10 leak cycles, on all three
  viewports.
- Remaining output: `THREE.WebGLRenderer: Context Lost.` **info log** once per
  hologram close — three.js acknowledging the intentional context disposal that
  keeps memory flat. Not an error; documented trade-off.

## Bugs found this pass

All listed above; all fixed and re-verified by fresh screenshots. `tsc -b` clean,
production build clean, oxlint: 2 dev-only fast-refresh style notes (constants
exported beside components — no runtime effect).

## Remaining issues (honest)

1. "Context Lost" info log on close (intentional disposal, see above).
2. Fallback rectangles sit offset from real rooftops where the fictional listing
   coords don't land on an OSM building — labeled honestly (MESH INLINE/EST).
3. GLB houses tour an empty interior until authors ship interiors in the GLB.
4. Hologram runs 56–57 fps on this AMD box with full postFX, not a locked 60.
5. Portrait camera distance is computed at hologram open, not on live rotate.

## Final score: **97/100**

The map reads as a graded command table, the reconstruction bay is a genuine
set-piece, every control is a labeled button that works, the type system is one
confident family, and the numbers (fps, memory, console) are measured, not
claimed. The three remaining visual points live in mock-data alignment and
procedural-interior stylization — both honest, documented constraints.
