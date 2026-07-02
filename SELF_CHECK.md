# SPYGLASS · HOLO-ATLAS — Self-Check Log

Strict per-phase review. A phase does not pass below **95/100**.

---

## P0 — Scaffold + dependencies

**Built:** Vite + React 19 + TS scaffold at `creative\holo-atlas`, pinned to port **5110 `--strictPort`** (workspace registry). Deps: maplibre-gl 5, three 0.185, R3F 9, drei 10, @react-three/postprocessing 3, GSAP 3.15, zustand 5, idb 8, Tailwind 3.4 (v3 pinned so `init -p` works). Folder structure per spec (`app/ map/ hologram/ data/ worker/ ui/ store/ styles/`).

**Tested:** `npm run dev` boots clean on 5110; dependency tree installs with 0 vulnerabilities.

**Weak:** Template boilerplate (App.css, assets) shipped by Vite.

**Improved:** Boilerplate removed; port pinned before first run so it can never squat another project's port.

**Remaining:** none.

**Score: 97/100** — pass.

---

## P1 — Tokens, fonts, Tailwind, overlays, scanlines, grain

**Built:** `tokens.css` (CSS vars mirrored into Tailwind theme), `overlays.css` (scanline + SVG-turbulence grain layers, `.holo-panel` glass, `.hbtn` instrument buttons with hover/active/on/disabled/focus states, reticle frame, ticker), fonts = **Rajdhani** (display/buttons) + **Space Grotesk** (body) + **Share Tech Mono** (data) — deliberately no Orbitron body text, no generic AI-font look. Dark shell App with TopBar (wordmark + sector readout + MAP DETAIL / HUD toggles), ControlDock (SCAN AREA / OPEN HOLOGRAM / RESET VIEW), StatusTicker (GSAP-faded lines, progress bar that never completes), Reticle. Zustand store with full button-state model (mode, scan, detail, HUD, selection, open, play, reset signal).

**Tested:** Preview boot — accessibility snapshot shows every control present and labeled; console has zero errors/warnings (only Vite debug + React devtools info line). Ticker cycles with GSAP fades.

**Weak:** Buttons untested against real map interactions yet (no map). Screenshot tool timed out once (tooling, not app — DOM snapshot + console used instead; will re-verify visually in P2).

**Improved:** Button system unified into one `HButton` with `on/primary/danger` variants so every later control is consistent; HUD OFF keeps the HUD toggle itself visible so users can't strand themselves.

**Remaining:** visual screenshot pass rides along with P2 (same server).

**Score: 95/100** — pass.

---

## P2 — Satellite map with holographic tint

**Built:** MapLibre with a hand-built style: Esri World Imagery raster (free, keyless, attributed) desaturated −0.92 and darkened, finished by CSS layers — `mix-blend-mode: color` cyan-steel grade, radial vignette, faint instrument dot-grid. OpenFreeMap vector overlay as the `detail-*` group: water fills, cyan hairline minor/major roads, 3D building extrusions (minzoom 14), uppercase tracked street + place labels (Noto Sans via OpenFreeMap glyphs). `setDetailVisible()` drives TOGGLE MAP DETAIL. Pitch 55 / bearing −20 opening camera; RESET VIEW glides home via `flyTo` (1.6s). Map instance shared through `mapSingleton` for later layers. Playwright screenshot harness (`scripts/shots.mjs`) with real-click scenarios.

**Tested:** Headless Chromium (hardware ANGLE/D3D11): 32 satellite + 6 vector tile requests, zero failures, `map.loaded() && areTilesLoaded()` true, zero console errors. Shots verified: `map.png` (full grade + labels), `detail-off.png` (vector overlay gone, button state flips), `hud-off.png`.

**Weak / found broken:** Two real bugs caught by pixel-level verification: (1) `@import './overlays.css'` placed after `@tailwind` directives is illegal CSS and was silently dropped — all button/glass styling missing; (2) `maplibre-gl.css` loads after Tailwind and its `.maplibregl-map{position:relative}` beat the `absolute` utility → container collapsed to 0 height, black canvas. First grade pass was too monochrome-navy.

**Improved:** Both bugs fixed (imports hoisted to top; inline position on the map container). Grade pushed toward teal (#136076 head), brightness-max 0.62→0.7, road/extrusion opacities raised — imagery now reads unmistakably as a cyan hologram table, not a flat dark map. `preserveDrawingBuffer` enabled so every future phase can be pixel-verified.

**Remaining:** grade may get one more pass in P8 alongside bloom-heavy scenes.

**Score: 96/100** — pass.

---

## P3 — Data layer + house scan/reveal

**Built:** 12 mock listings (`MockListingProvider`), `OSMFootprintProvider` reworked from per-listing queries into **one batched Overpass bbox query** (rate-limit friendly, mirror fallback, nearest-building match ≤45 m with per-building exclusivity), idb cache (v2 schema — old entries without geographic rings refetch), fallback chain OSM → inline shape → rectangle-from-sqft; every footprint carries both a local-meters ring (hologram) and a lng/lat ring (map). `FootprintLayer`: GeoJSON fill + glow line + crisp line + roof-marker circle layers, feature-state hover/selected, rAF breathing pulse, GSAP reveal gate, hover glass tooltip (address/price/specs/mesh source), click → `openHologram`. `ScanSweep`: screen-space light blade synced to SCAN. SCAN also `fitBounds` push-in (max zoom 17.4) so the reveal cluster reads.

**Tested:** Real-click Playwright run: source + 5 layers live, line-opacity ~0.94 at pulse peak, **14 footprint features rendered**, zero console errors/warnings. `tsc -b` clean. Shot verified: full cluster of outlines + markers, OSM shapes visibly irregular vs fallback rectangles.

**Weak:** First shot appeared empty — Overpass (uncached) resolved after the 2.6 s capture; harness wait raised. Some fallback rectangles sit offset from rooftops (listing coords are fictional). Without the push-in the reveal was too small to read.

**Improved:** Batched Overpass (12→1 requests), scan camera push-in, tooltip declares mesh source honestly (OSM/INLINE/EST).

**Remaining:** hover flow gets full real-click coverage with the P4 card rail.

**Score: 95/100** — pass.

---

## P4 — Button-based UI controls

**Built:** Full obvious-buttons contract: **SCAN AREA** (primary, pulsing when armed) · **OPEN HOLOGRAM** (enabled after scan; opens selection or the featured 37 Johnson Ave) · **RESET VIEW** (map glide-home; hologram camera+timeline reset in P7) · **CLOSE** (danger accent) · **PLAY TOUR / PAUSE** (hologram dock) · **TOGGLE MAP DETAIL** / **TOGGLE HUD** (top-right, stateful ON/OFF labels; HUD toggle never hides itself). `ListingRail`: post-scan targets rail, glass cards (Rajdhani address, cyan price, mono specs, mesh-source chip), GSAP staggered entrance, hover syncs with map outlines through the shared store, click opens the hologram. No hidden gestures anywhere — every action in the main experience is a labeled button or a labeled card.

**Tested:** `tsc -b` clean; real-click scan run console-clean; shot shows rail + enabled OPEN HOLOGRAM + armed SCAN AREA states.

**Weak:** Only some listings resolve to OSM meshes (fictional demo coords) — honest per-card MESH INLINE/OSM/EST labels. Card-hover→outline-brighten verified by code path (shared store + feature-state), full interactive verification deferred to P9.

**Improved:** OPEN HOLOGRAM never dead after scan — falls back to the featured structure with an explanatory tooltip.

**Score: 95/100** — pass.

---

## P5 — Hologram stage

**Built:** Full R3F reconstruction bay. `buildHouseFromFootprint` extrudes the real footprint ring (winding-corrected, floor-seated, centered) into holo glass + edge wireframe; `proceduralInterior` partitions rooms per floor from beds/baths with clean shared-unit-box **edge** outlines (not `wireframe:true` — no triangle diagonals) + glowing furniture blocks. `ContainmentSphere`: GLSL fresnel energy shell + slow-rotating wire cage + double floor ring. `DustField` particulate. Per-floor warm room lights mounted dark (tour ramps them in P7). Rising scan-sweep plane. Two angled in-scene HUD panels (drei Html): listing spec + live telemetry computed from the actual envelope. Gold emitter key light + cyan fill. PostFX: Bloom (mipmap) + chromatic aberration + noise + vignette. `HologramOverlay`: map blurs/dims (CSS filter transition), shimmer while footprint resolves, GSAP fade-in, house bloom-in (scale 0.001→1 + emissive flare 2.4→0.45), CLOSE plays fade-out then unmounts the Canvas (full GL disposal + explicit geometry/material `.dispose()`), collapse back to map. `tourRig` registry exposes camera/controls/house/lights to the P7 timeline. RESET VIEW glides the orbit camera home (GSAP, kills tour).

**Tested:** `tsc -b` clean. Real-click flow (SCAN → card click) console-clean. Shots: `hologram.png` (37 Johnson, rectangular, 2 floors) vs `hologram2.png` (39 Johnson, **L-shaped notch clearly visible**, different price/specs/envelope) — two visibly distinct, footprint-true reconstructions matching the containment-sphere reference.

**Weak / fixed en route:** First composition had the camera swallowed by an oversized sphere and a panel clipped off-frame (sphere now sized from the house half-diagonal, camera pulled in, panels moved inside the field); room `wireframe:true` drew triangle diagonals (replaced with EdgesGeometry); glass was over-hot (opacity 0.12→0.07); sweep plane read as a grey slab (span tightened); outer component leaked a throwaway ExtrudeGeometry built only for dims (now computed from the ring).

**Remaining:** PLAY TOUR wiring (P7); bloom-in judged from stills — motion feel checked live in P8/P9.

**Score: 95/100** — pass.

---

## P6 — Blender GLB manifest + automatic fallback

**Built:** `public/models/manifest.json` (listing id → GLB URL), `modelManifest.ts` loader (missing manifest/entry/file all degrade safely), `GLBBody` — drei `useGLTF`, deep clone, normalised to the real footprint envelope (scaled, centred, floor-seated), every mesh holo-treated (glass material + EdgesGeometry wireframe overlay), `dispose={null}` so drei's loader cache survives close/reopen, my created edge geometries explicitly disposed. `HoloBoundary` error boundary → procedural reconstruction on any load/parse failure, with `onError` feeding the HUD so the mesh label stays honest (BLENDER GLB vs OSM/INLINE/EST). Proved the whole path without Blender: `scripts/make-sample-glb.mjs` builds a gabled house (wing, chimney, porch, door) via three's GLTFExporter in Node (FileReader shim) → `jv-39.glb` (16 KB).

**Tested:** `tsc -b` clean. Shot `hologram2.png`: jv-39 renders the **GLB house** (roof/chimney/porch clearly legible) holo-treated in the sphere, panel reads MESH BLENDER GLB. Shot `hologram.png`: jv-37 procedural unchanged. Break test: manifest pointed at a nonexistent file → boundary caught it, procedural fallback rendered, HUD panels alive, no blank screen (screenshot `fallback.png`), label bug found and fixed (was still claiming BLENDER GLB).

**Weak:** A broken manifest entry logs one console error before recovering (React dev boundary behavior) — documented; normal flows keep console clean since the manifest ships only real files.

**Improved:** Honest mesh labeling on fallback; loader-cache-safe disposal strategy.

**Score: 96/100** — pass.

---

## P7 — PLAY TOUR cinematic timeline

**Built:** `tourTimeline.ts` — a ~13 s looping GSAP master timeline driven through the rig registry: settle the idle spin → low approach to the entry face → **door swing** (any GLB node named `door*`) → cross the threshold → warm room lights ramp on room-by-room → slow interior arc drift → rise to the next floor (multi-floor houses) → pull out to the hero anchor → lights breathe down. Loop-seam safe: PLAY first glides the camera to the anchor, then rebuilds the timeline from known state so `repeat: -1` never cuts. `TourController` binds store → timeline (PLAY resumes, PAUSE freezes, RESET VIEW pauses + rewinds + re-enables orbit; OrbitControls disabled while touring). `TourScrubber`: styled range input above the dock, live % readout, scrubbing pauses and seeks. Idle house rotation parks while playing.

**Tested:** `tsc -b` clean after fixing two null-narrowing errors. Real-click run (jv-39 GLB house): playhead advanced 13.2%→41.4% while playing, froze at 45.1% across a 1.2 s PAUSE window, RESET VIEW returned it to 0 — zero console errors. Mid-tour shot confirms the camera is **inside** the house with the warm room-light ramp visible and the scrubber at 42%.

**Weak:** GLB houses tour an empty interior (sample GLB has no rooms — by design; Blender authors supply interiors). Loop seam judged by construction + live scrub, not a full 13 s watch in CI.

**Improved:** PLAY TOUR button disabled while playing / PAUSE disabled while paused — states always truthful.

**Score: 95/100** — pass.

---

## P8 — Polish pass

**Built:** Faked-but-honest `buildQueue` (marked FAKED in code): reads the *real* resolved footprint data (structure count, live OSM lock count) and feeds reconstruction chatter into the StatusTicker on an interval, interleaved with its flavor lines. Escape closes the hologram (convenience only — CLOSE stays the primary labeled path). Responsive pass ≤920 px: rail narrows, buttons/scrubber compact, dock wraps, ticker collapses to icon+bar so it can't collide with the dock. Removed all template leftovers (src/assets, unused svgs). **Code-split**: the entire three/R3F/drei/postprocessing stack now lazy-loads with the first hologram open (boot chunk 655→372 KB gzip; hologram chunk 284 KB on demand) with the reconstruction shimmer as Suspense fallback; runtime `three` stripped from the timeline module so the scrubber path stays light.

**Tested:** `tsc -b` clean; production `npm run build` clean. Full-flow probe (hardware GL): **60 fps map · 60 fps scan · 59 fps hologram · 57 fps mid-tour**, zero console errors, CLOSE returns to the intact map. **10× open/close cycles across different listings: JS heap flat at 69 MB every cycle** — leak-free. Tablet (820 px) shot verified; found and fixed the ticker/dock overlap.

**Weak:** Phone-portrait (<480 px) is functional but dense — this is a desktop-first command-table experience by design.

**Improved:** Boot payload nearly halved via lazy hologram stack.

**Score: 96/100** — pass.

---

## P9 — Final acceptance

Interactive probe (real mouse, hardware GL):
- Card hover → map outline feature-state `{hover:true}` — the rail and the map are one system. ✓
- Map hover over a footprint → glass tooltip with specs + mesh source. ✓
- HUD OFF → all chrome gone, HUD button persists; HUD ON restores everything. ✓
- RESET VIEW → camera returns exactly home (zoom 16, center −73.9701/40.8901). ✓

### Acceptance checklist
| Check | Result |
|---|---|
| No console errors | ✓ zero across every probe (boot, scan, hologram, GLB, tour, 10-cycle) |
| No TypeScript errors | ✓ `tsc -b` clean |
| No broken imports | ✓ production build clean |
| No blank screen | ✓ verified incl. broken-GLB break test |
| Buttons obvious + functional | ✓ all 8 core buttons real-click verified |
| SCAN AREA reveals all houses | ✓ 12/12 outlined + swept + camera push-in |
| Click house → hologram | ✓ card + outline paths both verified |
| Bloom / wireframe / containment sphere / HUD panels | ✓ shots `hologram.png`, `hologram2.png` |
| Procedural fallback when GLB missing | ✓ break-tested, honest labeling |
| Animations smooth | ✓ 60/60/59/57 fps (map/scan/hologram/tour) |
| UI not AI-generic; premium fonts | ✓ Rajdhani + Space Grotesk + Share Tech Mono, instrument-grade chrome, no purple gradients, no emoji, no template look |
| README: setup + Blender workflow + real-vs-simulated | ✓ |
| Memory stable across 10 open/close cycles | ✓ flat 69 MB |

**Final score: 96/100** — pass. The remaining 4: phone-portrait density, GLB houses tour an empty interior (by design until authors ship interiors), and one dev-console error if a manifest entry points at a missing file (recovers visually).

---

## R1 — Identity reskin (Ian's direction: kill the cyan-HUD "AI slop")

**Changed:** Full UI pivot to the poster identity — **Outfit 800/900 chunky white lettering, light-blue (#A5D8E8) accents, ink (#0E3A50) text on frosted white translucent glass**. Removed wholesale: scanline + grain overlays, dotted reticle, ◈ glyphs, mono-HUD microtype, neon borders/glow shadows, chromatic aberration. Buttons are now chunky poster controls (primary = solid white with ink type, engaged = sky fill); cards and data panels are frosted white glass with ink type; wordmark is SPYGLASS (white 900) ATLAS (sky). Map grade cooled from neon teal to steel; footprint outlines white/ice; the 3D scene re-tinted (white wireframes, ice fresnel sphere, softer bloom 1.4→0.85, threshold 0.28); scan-sweep plane tamed (read as a paper slab in white). Fonts consolidated to a single family — no sci-fi font pairing.

**Tested:** `tsc` + production build clean; real-click flow probe: 61 fps map, 56 fps hologram, CLOSE intact, zero console errors. Shots re-verified: scan (white outlines + frosted rail), hologram (white wireframe house in ice sphere, ink-type panels), mid-tour.

**Score: 96/100** — pass.
