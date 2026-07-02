import { useStore } from '../store/useStore';
import { CONFIG } from '../config';
import HButton from './HButton';

/**
 * Bottom control deck — every core action is an obvious labeled button.
 * MAP mode:      SCAN AREA · OPEN HOLOGRAM · RESET VIEW
 * HOLOGRAM mode: PLAY TOUR · PAUSE · RESET VIEW · CLOSE
 */
export default function ControlDock() {
  const mode = useStore((s) => s.mode);
  const scanActive = useStore((s) => s.scanActive);
  const selectedId = useStore((s) => s.selectedId);
  const isPlaying = useStore((s) => s.isPlaying);
  const toggleScan = useStore((s) => s.toggleScan);
  const openHologram = useStore((s) => s.openHologram);
  const closeHologram = useStore((s) => s.closeHologram);
  const setPlaying = useStore((s) => s.setPlaying);
  const requestReset = useStore((s) => s.requestReset);

  return (
    <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-40 flex gap-3 items-center flex-wrap justify-center max-w-[92vw]">
      {mode === 'MAP' ? (
        <>
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
          <HButton onClick={requestReset}>RESET VIEW</HButton>
        </>
      ) : (
        <>
          <HButton primary on={isPlaying} dot onClick={() => setPlaying(true)} disabled={isPlaying}>
            PLAY TOUR
          </HButton>
          <HButton onClick={() => setPlaying(false)} disabled={!isPlaying}>
            PAUSE
          </HButton>
          <HButton onClick={requestReset}>RESET VIEW</HButton>
          <HButton danger onClick={closeHologram}>
            CLOSE
          </HButton>
        </>
      )}
    </div>
  );
}
