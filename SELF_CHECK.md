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
