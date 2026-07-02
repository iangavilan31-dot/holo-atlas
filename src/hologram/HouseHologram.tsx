import { Canvas, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  Html,
  useGLTF,
} from '@react-three/drei';
import { EffectComposer, SMAA, Vignette } from '@react-three/postprocessing';
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { buildArchModel, disposeArchModel, type ArchModel } from './buildArchModel';
import { makeArchMaterials, ARCH, type ArchMaterials } from './archMaterials';
import { cameraShots } from './cameraPresets';
import { tourRig, clearTourRig } from './tourRig';
import { useStore } from '../store/useStore';
import type { Listing, FootprintResult } from '../data/types';

/** GLB failed to load/parse → procedural reconstruction takes over. */
class HoloBoundary extends Component<
  { fallback: ReactNode; children: ReactNode; onError?: () => void },
  { err: boolean }
> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

/** Drives the shared x-ray progress across all model materials + roof lift. */
function useXrayRig(mats: ArchMaterials, model: ArchModel) {
  const roofGroup = useRef<THREE.Group>(null!);
  const prog = useRef(0);

  const apply = useMemo(() => {
    return (v: number) => {
      const on = v > 0.001;
      // exterior walls: opaque plaster → light-blue x-ray ghost
      mats.wall.transparent = on;
      mats.wall.depthWrite = v < 0.5;
      mats.wall.opacity = 1 - v * 0.86;
      mats.wall.color.copy(ARCH.wallWarm).lerp(ARCH.wallXray, v);
      // roof lifts and fades
      mats.roof.transparent = on;
      mats.roof.depthWrite = v < 0.5;
      mats.roof.opacity = 1 - v * 0.8;
      if (roofGroup.current) roofGroup.current.position.y = v * model.dims.height * 0.3;
      // glazing recedes with the walls
      mats.glazing.transparent = on;
      mats.glazing.opacity = 1 - v * 0.7;
      // structural edges brighten to accent
      mats.wallLine.color.copy(ARCH.lineDark).lerp(ARCH.lineXray, v);
      mats.wallLine.opacity = 0.5 + v * 0.4;
      mats.roofLine.color.copy(ARCH.lineDark).lerp(ARCH.lineXray, v);
    };
  }, [mats, model]);

  const xray = useStore((s) => s.xray);
  useEffect(() => {
    const target = xray ? 1 : 0;
    const t = gsap.to(prog, {
      current: target,
      duration: 0.9,
      ease: 'power3.inOut',
      onUpdate: () => apply(prog.current),
    });
    return () => {
      t.kill();
    };
  }, [xray, apply]);

  return roofGroup;
}

/** Solid architectural massing model + revealed interior. */
function ArchHouse({
  footprint,
  listing,
  mats,
}: {
  footprint: FootprintResult;
  listing: Listing;
  mats: ArchMaterials;
}) {
  const grp = useRef<THREE.Group>(null!);
  const model = useMemo(
    () => buildArchModel(footprint.ring, listing.floors),
    [footprint, listing.floors],
  );
  const roofGroup = useXrayRig(mats, model);
  const xray = useStore((s) => s.xray);

  useEffect(() => {
    tourRig.houseGroup = grp.current;
    tourRig.dims = model.dims;
    tourRig.roomLights = [];
    return () => {
      clearTourRig();
      disposeArchModel(model);
    };
  }, [model]);

  // quiet materialise on open — rise + settle, no sci-fi flash
  useEffect(() => {
    const g = grp.current;
    if (!g) return;
    const t1 = gsap.fromTo(
      g.position,
      { y: -1.4 },
      { y: 0, duration: 1.1, ease: 'power3.out', delay: 0.1 },
    );
    const t2 = gsap.fromTo(
      g.scale,
      { x: 0.92, y: 0.92, z: 0.92 },
      { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power3.out', delay: 0.1 },
    );
    return () => {
      t1.kill();
      t2.kill();
    };
  }, []);

  return (
    <group ref={grp}>
      {/* exterior shell */}
      <mesh geometry={model.wall} material={mats.wall} castShadow receiveShadow renderOrder={2} />
      <lineSegments geometry={model.wallEdges} material={mats.wallLine} renderOrder={3} />
      <mesh geometry={model.glazing} material={mats.glazing} renderOrder={1} />
      {/* interior (revealed in x-ray) */}
      <mesh geometry={model.slab} material={mats.slab} castShadow receiveShadow />
      <mesh geometry={model.partition} material={mats.partition} castShadow receiveShadow />
      {/* roof (lifts in x-ray) */}
      <group ref={roofGroup}>
        <mesh geometry={model.roof} material={mats.roof} castShadow receiveShadow renderOrder={2} />
        <lineSegments geometry={model.roofEdges} material={mats.roofLine} renderOrder={3} />
      </group>
      {/* floor tags — only while the section is open */}
      {xray &&
        model.slabYs.map((y, i) => (
          <Html
            key={i}
            position={[model.dims.width / 2 + 0.6, y + 0.4, model.dims.depth / 2 + 0.6]}
            center
            distanceFactor={Math.max(model.dims.width, model.dims.depth) * 0.9}
            style={{ pointerEvents: 'none' }}
          >
            <div className="floor-tag">L{i + 1}</div>
          </Html>
        ))}
    </group>
  );
}

/** Blender-authored model, matte-treated and shadow-casting. */
function GLBBody({ url, mats, dims }: { url: string; mats: ArchMaterials; dims: { width: number; depth: number } }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const r = scene.clone(true);
    r.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = mats.wall;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(r);
    const size = box.getSize(new THREE.Vector3());
    const scale = Math.max(dims.width, dims.depth) / Math.max(size.x, size.z, 0.001);
    r.scale.setScalar(scale);
    box.setFromObject(r);
    const c = box.getCenter(new THREE.Vector3());
    r.position.set(-c.x, -box.min.y, -c.z);
    return r;
  }, [scene, mats, dims]);
  return <primitive object={root} dispose={null} />;
}

/** Studio lighting, environment, plinth, grounded contact shadow. */
function Stage({ fit }: { fit: number }) {
  const keyRef = useRef<THREE.DirectionalLight>(null!);
  return (
    <>
      <color attach="background" args={['#0a0e13']} />
      <fog attach="fog" args={['#0a0e13', fit * 3.4, fit * 8]} />
      <hemisphereLight args={['#e6eef8', '#141a22', 0.55]} />
      <directionalLight
        ref={keyRef}
        castShadow
        position={[fit * 1.4, fit * 2.4, fit * 1.1]}
        intensity={2.4}
        color="#eef4ff"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-fit * 1.8, fit * 1.8, fit * 1.8, -fit * 1.8, 0.1, fit * 7]}
        />
      </directionalLight>
      {/* warm fill opposite the key so the shadow side never crushes to black */}
      <directionalLight position={[-fit * 1.8, fit * 1.1, -fit * 1.2]} intensity={0.8} color="#ffd9a8" />
      {/* cool front bounce for edge separation */}
      <directionalLight position={[0, fit * 0.4, fit * 2.2]} intensity={0.4} color="#cfe0f2" />

      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.2} position={[0, fit * 2, 0]} scale={[fit * 3, fit * 3, 1]} rotation={[Math.PI / 2, 0, 0]} color="#ffffff" />
        <Lightformer intensity={1.1} position={[-fit * 2, fit, fit * 1.5]} scale={[fit * 2, fit * 2, 1]} color="#dbeaff" />
        <Lightformer intensity={0.8} position={[fit * 2, fit * 0.6, -fit]} scale={[fit * 2, fit * 2, 1]} color="#ffe6c8" />
        <Lightformer intensity={1} position={[0, fit * 0.6, -fit * 2.4]} scale={[fit * 3, fit * 1.4, 1]} color="#ffffff" />
      </Environment>

      {/* plinth — the model sits on a dark scale-model base (top just below y=0) */}
      <mesh position={[0, -0.26, 0]} receiveShadow>
        <cylinderGeometry args={[fit * 1.28, fit * 1.34, 0.5, 120]} />
        <meshStandardMaterial color="#0d1219" roughness={0.72} metalness={0.16} envMapIntensity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, 0]}>
        <ringGeometry args={[fit * 1.22, fit * 1.28, 120]} />
        <meshStandardMaterial color="#20303c" roughness={0.5} metalness={0.35} envMapIntensity={0.9} />
      </mesh>
      <ContactShadows
        position={[0, -0.002, 0]}
        scale={fit * 3.2}
        blur={2.4}
        opacity={0.6}
        far={fit * 1.6}
        resolution={1024}
        color="#04070c"
      />
    </>
  );
}

function Rig({ dims }: { dims: { width: number; depth: number; height: number } }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControlsImpl>(null);
  const preset = useStore((s) => s.cameraPreset);
  const reset = useStore((s) => s.resetSignal);
  const playing = useStore((s) => s.isPlaying);
  const [transitioning, setTransitioning] = useState(false);
  const fit = Math.max(dims.width, dims.depth, dims.height);
  const shots = useMemo(() => cameraShots(dims), [dims]);

  useEffect(() => {
    tourRig.camera = camera;
    tourRig.controls = controls.current;
  }, [camera]);

  const moveTo = useMemo(
    () =>
      (shot: { pos: [number, number, number]; target: [number, number, number]; fov: number }, dur = 1.35) => {
        const c = controls.current;
        if (!c) return;
        setTransitioning(true);
        gsap.to(camera.position, {
          x: shot.pos[0],
          y: shot.pos[1],
          z: shot.pos[2],
          duration: dur,
          ease: 'power3.inOut',
          onUpdate: () => c.update(),
        });
        gsap.to(c.target, {
          x: shot.target[0],
          y: shot.target[1],
          z: shot.target[2],
          duration: dur,
          ease: 'power3.inOut',
          onUpdate: () => c.update(),
        });
        gsap.to(camera, {
          fov: shot.fov,
          duration: dur,
          ease: 'power3.inOut',
          onUpdate: () => camera.updateProjectionMatrix(),
          onComplete: () => setTransitioning(false),
        });
      },
    [camera],
  );

  // preset changes
  useEffect(() => {
    moveTo(shots[preset]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // RESET VIEW
  useEffect(() => {
    if (reset === 0) return;
    useStore.getState().setXray(false);
    useStore.getState().setPlaying(false);
    if (preset !== 'hero') useStore.getState().setCameraPreset('hero');
    else moveTo(shots.hero, 1.1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  const autoRotate = preset === 'hero' && !playing && !transitioning;
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      minDistance={fit * 0.45}
      maxDistance={fit * 4.2}
      maxPolarAngle={Math.PI / 2.04}
      autoRotate={autoRotate}
      autoRotateSpeed={0.32}
      target={[0, dims.height * 0.46, 0]}
    />
  );
}

/** Keeps auto-rotate from fighting a running tour; parks nothing else. */
export default function HouseHologram({
  footprint,
  listing,
  modelUrl,
}: {
  footprint: FootprintResult;
  listing: Listing;
  modelUrl: string | null;
}) {
  const [, setGlbFailed] = useState(false);
  const mats = useMemo(() => makeArchMaterials(), []);
  useEffect(() => () => mats.dispose(), [mats]);

  const dims = useMemo(() => {
    const xs = footprint.ring.map((p) => p[0]);
    const zs = footprint.ring.map((p) => p[1]);
    return {
      width: Math.max(...xs) - Math.min(...xs),
      depth: Math.max(...zs) - Math.min(...zs),
      height: Math.max(1, listing.floors) * 3.1,
    };
  }, [footprint, listing.floors]);
  const fit = Math.max(dims.width, dims.depth, dims.height);
  const hero = cameraShots({ ...dims }).hero;

  const procedural = <ArchHouse footprint={footprint} listing={listing} mats={mats} />;

  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.9]}
      camera={{ position: hero.pos, fov: hero.fov, near: 0.1, far: fit * 12 }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <Stage fit={fit} />

      {modelUrl ? (
        <HoloBoundary fallback={procedural} onError={() => setGlbFailed(true)}>
          <Suspense fallback={null}>
            <GLBBody url={modelUrl} mats={mats} dims={dims} />
          </Suspense>
        </HoloBoundary>
      ) : (
        procedural
      )}

      <Rig dims={dims} />

      <EffectComposer multisampling={0}>
        <SMAA />
        <Vignette eskil={false} offset={0.28} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}
