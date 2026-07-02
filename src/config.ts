export const CONFIG = {
  demoAddress: '37 Johnson Avenue, Gooley Cliffs',
  demoListingId: 'jv-37',
  center: { lng: -73.9701, lat: 40.8901, zoom: 16, pitch: 55, bearing: -20 },
  scan: { activationZoom: 15, sweepMs: 1400 },
  bloom: { intensity: 0.85, threshold: 0.28, radius: 0.7 },
  // Free, keyless satellite imagery (Esri World Imagery, attribution required).
  satelliteTiles:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  satelliteAttribution:
    'Imagery © Esri, Maxar, Earthstar Geographics | Map data © OpenStreetMap contributors',
  // Free, keyless vector tiles for the detail overlay (roads / labels / 3D buildings).
  vectorTilesUrl: 'https://tiles.openfreemap.org/planet',
  glyphsUrl: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  modelManifestUrl: '/models/manifest.json',
};
