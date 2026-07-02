import MapView from '../map/MapView';
import FootprintLayer from '../map/FootprintLayer';
import ScanSweep from '../map/ScanSweep';
import HologramOverlay from '../hologram/HologramOverlay';
import TopBar from '../ui/TopBar';
import ControlDock from '../ui/ControlDock';
import ListingRail from '../ui/ListingRail';
import TourScrubber from '../ui/TourScrubber';
import StatusTicker from '../ui/StatusTicker';
import { useStore } from '../store/useStore';
import { startBuildQueue } from '../worker/buildQueue';
import { useEffect } from 'react';

export default function App() {
  const hudVisible = useStore((s) => s.hudVisible);
  const mode = useStore((s) => s.mode);
  const scanActive = useStore((s) => s.scanActive);

  useEffect(() => {
    startBuildQueue();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className={`map-stage${mode === 'HOLOGRAM' ? ' map-stage--dimmed' : ''}`}>
        <MapView />
        <FootprintLayer />
        <ScanSweep />
      </div>

      <HologramOverlay />

      {hudVisible && mode === 'MAP' && <ListingRail />}
      {hudVisible && mode === 'MAP' && !scanActive && (
        <div className="scan-hint" aria-hidden>
          <span className="scan-hint__dot" />
          SWEEP THE SECTOR — PRESS SCAN AREA
        </div>
      )}
      <TopBar />
      {hudVisible && <ControlDock />}
      {hudVisible && mode === 'HOLOGRAM' && <TourScrubber />}
      {hudVisible && (
        <div className="absolute bottom-7 left-7 z-40">
          <StatusTicker />
        </div>
      )}
    </div>
  );
}
