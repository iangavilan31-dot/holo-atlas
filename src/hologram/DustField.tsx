import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Slow-drifting particulate inside the containment field — sells the volume. */
export default function DustField({ radius }: { radius: number }) {
  const ref = useRef<THREE.Points>(null!);
  const { geometry, material } = useMemo(() => {
    const n = 320;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // uniform-ish inside a squashed sphere volume
      const r = radius * 0.9 * Math.cbrt(Math.random());
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.9 + 0.3;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const material = new THREE.PointsMaterial({
      color: 0x8ff4ff,
      size: 0.055,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geometry, material };
  }, [radius]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.016;
    ref.current.position.y = Math.sin(t * 0.35) * 0.18;
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}
