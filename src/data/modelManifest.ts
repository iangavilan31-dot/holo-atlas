import { CONFIG } from '../config';

/**
 * Blender GLB manifest: maps listing id → model URL under public/models/.
 * Missing manifest, missing entry, or a broken file all fall back to the
 * procedural footprint reconstruction automatically.
 */
let manifest: Promise<Record<string, string>> | null = null;

export function loadModelManifest(): Promise<Record<string, string>> {
  return (manifest ??= fetch(CONFIG.modelManifestUrl)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
    .catch(() => ({})));
}

export async function getModelUrl(listingId: string): Promise<string | null> {
  const m = await loadModelManifest();
  return m[listingId] ?? null;
}
