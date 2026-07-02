import { CONFIG } from '../config';
import { useStore } from '../store/useStore';
import HButton from './HButton';

export default function TopBar() {
  const mode = useStore((s) => s.mode);
  const mapDetail = useStore((s) => s.mapDetail);
  const hudVisible = useStore((s) => s.hudVisible);
  const toggleMapDetail = useStore((s) => s.toggleMapDetail);
  const toggleHud = useStore((s) => s.toggleHud);

  return (
    <header
      className="absolute top-0 left-0 right-0 z-40 flex items-start justify-between px-7 pt-6 pointer-events-none"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="pointer-events-auto">
        <div className="text-[24px] font-black leading-none text-white">
          SPYGLASS<span style={{ color: 'var(--sky)' }}> ATLAS</span>
        </div>
        <div
          className="mt-1.5 text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {mode === 'MAP' ? `Sector — ${CONFIG.demoAddress}` : 'Reconstruction bay — active'}
        </div>
      </div>

      <div className="pointer-events-auto flex gap-3">
        {hudVisible && mode === 'MAP' && (
          <HButton on={mapDetail} onClick={toggleMapDetail} title="Vector detail overlay">
            MAP DETAIL {mapDetail ? 'ON' : 'OFF'}
          </HButton>
        )}
        <HButton on={hudVisible} onClick={toggleHud} title="Show / hide HUD chrome">
          HUD {hudVisible ? 'ON' : 'OFF'}
        </HButton>
      </div>
    </header>
  );
}
