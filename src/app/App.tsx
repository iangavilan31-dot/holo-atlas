import MapView from '../map/MapView';
import TopBar from '../ui/TopBar';
import ControlDock from '../ui/ControlDock';
import StatusTicker from '../ui/StatusTicker';
import Reticle from '../ui/Reticle';
import { useStore } from '../store/useStore';

export default function App() {
  const hudVisible = useStore((s) => s.hudVisible);
  const mode = useStore((s) => s.mode);

  return (
    <div className="scanlines grain relative h-full w-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <MapView />

      {hudVisible && mode === 'MAP' && <Reticle />}
      <TopBar />
      {hudVisible && <ControlDock />}
      {hudVisible && (
        <div className="absolute bottom-7 left-7 z-40">
          <StatusTicker />
        </div>
      )}
    </div>
  );
}
