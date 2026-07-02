import { useStore } from '../store/useStore';
import type { CameraPreset } from '../store/useStore';

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'elevation', label: 'Elev' },
  { id: 'plan', label: 'Plan' },
  { id: 'detail', label: 'Detail' },
];

/** Segmented camera-preset control for the reconstruction bay. */
export default function ViewControls() {
  const preset = useStore((s) => s.cameraPreset);
  const setCameraPreset = useStore((s) => s.setCameraPreset);
  return (
    <div className="seg" role="group" aria-label="Camera view">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`seg__btn${preset === p.id ? ' seg__btn--active' : ''}`}
          aria-pressed={preset === p.id}
          onClick={() => setCameraPreset(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
