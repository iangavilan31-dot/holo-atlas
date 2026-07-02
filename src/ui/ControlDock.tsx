import { useStore } from '../store/useStore';
import { CONFIG } from '../config';
import HButton from './HButton';
import ViewControls from './ViewControls';

/**
 * Command bar — one structured control cluster per mode.
 * MAP:      SCAN AREA · OPEN HOLOGRAM · RESET VIEW
 * HOLOGRAM: [view presets] · REVEAL · PLAY TOUR / PAUSE · RESET · CLOSE
 */
export default function ControlDock() {
  const mode = useStore((s) => s.mode);
  const scanActive = useStore((s) => s.scanActive);
  const selectedId = useStore((s) => s.selectedId);
  const isPlaying = useStore((s) => s.isPlaying);
  const xray = useStore((s) => s.xray);
  const toggleScan = useStore((s) => s.toggleScan);
  const openHologram = useStore((s) => s.openHologram);
  const closeHologram = useStore((s) => s.closeHologram);
  const setPlaying = useStore((s) => s.setPlaying);
  const toggleXray = useStore((s) => s.toggleXray);
  const requestReset = useStore((s) => s.requestReset);

  if (mode === 'MAP') {
    return (
      <div className="cmdbar">
        <HButton primary on={scanActive} dot onClick={toggleScan}>
          SCAN AREA
        </HButton>
        <HButton
          disabled={!scanActive}
          onClick={() => openHologram(selectedId ?? CONFIG.demoListingId)}
          title={
            !scanActive
              ? 'Run SCAN AREA first'
              : selectedId
                ? 'Open the selected structure'
                : `Open the featured structure — ${CONFIG.demoAddress}`
          }
        >
          OPEN HOLOGRAM
        </HButton>
        <div className="cmdbar__div" />
        <HButton onClick={requestReset}>RESET VIEW</HButton>
      </div>
    );
  }

  return (
    <div className="cmdbar">
      <ViewControls />
      <div className="cmdbar__div" />
      <HButton on={xray} dot onClick={toggleXray} title="Section / x-ray reveal">
        REVEAL
      </HButton>
      {isPlaying ? (
        <HButton onClick={() => setPlaying(false)}>PAUSE</HButton>
      ) : (
        <HButton primary dot onClick={() => setPlaying(true)}>
          PLAY TOUR
        </HButton>
      )}
      <HButton onClick={requestReset}>RESET</HButton>
      <div className="cmdbar__div" />
      <HButton danger onClick={closeHologram}>
        CLOSE
      </HButton>
    </div>
  );
}
