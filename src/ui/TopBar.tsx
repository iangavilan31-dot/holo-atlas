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
        <div
          className="text-[19px] font-bold tracking-[0.28em] text-[#EAFCFF] leading-none"
          style={{ textShadow: '0 0 18px rgba(53,228,255,0.45)' }}
        >
          SPYGLASS <span className="text-[color:var(--cyan)]">·</span> HOLO-ATLAS
        </div>
        <div
          className="mt-1.5 text-[11px] tracking-[0.22em] uppercase"
          style={{ fontFamily: 'var(--font-hud)', color: 'rgba(143,244,255,0.6)' }}
        >
          {mode === 'MAP' ? `SECTOR // ${CONFIG.demoAddress}` : 'RECONSTRUCTION BAY // ACTIVE'}
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
