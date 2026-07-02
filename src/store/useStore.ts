import { create } from 'zustand';

export type Mode = 'MAP' | 'HOLOGRAM';

interface State {
  mode: Mode;
  /** SCAN AREA has been fired — all footprints revealed. */
  scanActive: boolean;
  /** epoch ms of the last SCAN press, drives the sweep animation. */
  scanFiredAt: number | null;
  /** TOGGLE MAP DETAIL — vector roads/labels/3D buildings over the satellite. */
  mapDetail: boolean;
  /** TOGGLE HUD — chrome visibility (a minimal restore control always stays). */
  hudVisible: boolean;
  hoveredId: string | null;
  /** Selected on the map (card or outline focus) — not yet opened. */
  selectedId: string | null;
  /** Listing currently open in the hologram stage. */
  openId: string | null;
  isPlaying: boolean;
  playhead: number;
  /** Increments to request a camera/timeline reset (RESET VIEW). */
  resetSignal: number;

  toggleScan: () => void;
  toggleMapDetail: () => void;
  toggleHud: () => void;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  openHologram: (id: string) => void;
  closeHologram: () => void;
  setPlaying: (b: boolean) => void;
  setPlayhead: (n: number) => void;
  requestReset: () => void;
}

export const useStore = create<State>((set) => ({
  mode: 'MAP',
  scanActive: false,
  scanFiredAt: null,
  mapDetail: true,
  hudVisible: true,
  hoveredId: null,
  selectedId: null,
  openId: null,
  isPlaying: false,
  playhead: 0,
  resetSignal: 0,

  toggleScan: () =>
    set((s) => ({
      scanActive: !s.scanActive,
      scanFiredAt: !s.scanActive ? Date.now() : null,
    })),
  toggleMapDetail: () => set((s) => ({ mapDetail: !s.mapDetail })),
  toggleHud: () => set((s) => ({ hudVisible: !s.hudVisible })),
  setHovered: (hoveredId) => set({ hoveredId }),
  setSelected: (selectedId) => set({ selectedId }),
  openHologram: (id) =>
    set({ openId: id, selectedId: id, mode: 'HOLOGRAM', isPlaying: false, playhead: 0 }),
  closeHologram: () => set({ openId: null, mode: 'MAP', isPlaying: false, playhead: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPlayhead: (playhead) => set({ playhead }),
  requestReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),
}));
