import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { buildHouseFromFootprint, makeHoloMaterials } from './buildHouseFromFootprint';
import { generateInterior, furnitureFor } from './proceduralInterior';
import ContainmentSphere from './ContainmentSphere';
import DustField from './DustField';
import { tourRig, clearTourRig } from './tourRig';
import { useStore } from '../store/useStore';
import { CONFIG } from '../config';
import type { Listing, FootprintResult } from '../data/types';

interface Dims {
  width: number;
  depth: number;
  height: number;
  floors: number;
}

function ScanSweepPlane({ height, span }: { height: number; span: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.35) % 1;
    ref.current.position.y = t * height;
    (ref.current.material as THREE.Material).opacity = 0.16 * (1 - Math.abs(t - 0.5) * 2);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[span, span]} />
      <meshBasicMaterial
        color={0xeaf7fd}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

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

/** Blender-authored model, normalised to the footprint envelope + holo-treated. */
function GLBBody({
  url,
  dims,
  glass,
  wire,
}: {
  url: string;
  dims: Dims;
  glass: THREE.MeshStandardMaterial;
  wire: THREE.LineBasicMaterial;
}) {
  const { scene } = useGLTF(url);
  const { root, createdEdges } = useMemo(() => {
    const root = scene.clone(true);
    const createdEdges: THREE.EdgesGeometry[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        mesh.material = glass;
        const eg = new THREE.EdgesGeometry(mesh.geometry, 22);
        createdEdges.push(eg);
        mesh.add(new THREE.LineSegments(eg, wire));
      }
    });
    // normalise: match footprint envelope, centre, seat on the grid
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = Math.max(dims.width, dims.depth) / Math.max(size.x, size.z, 0.001);
    root.scale.setScalar(scale);
    box.setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(root.position.x - c.x, root.position.y - box.min.y, root.position.z - c.z);
    return { root, createdEdges };
  }, [scene, dims, glass, wire]);

  useEffect(
    () => () => {
      for (const eg of createdEdges) eg.dispose();
    },
    [createdEdges],
  );

  // dispose={null}: the GLB geometries live in drei's loader cache — R3F must
  // not destroy them on close or the next open would get dead buffers
  return <primitive object={root} dispose={null} />;
}

/** Extruded real-footprint shell + procedural rooms/furniture. */
function ProceduralBody({
  footprint,
  listing,
  dims,
  glass,
  wire,
}: {
  footprint: FootprintResult;
  listing: Listing;
  dims: Dims;
  glass: THREE.MeshStandardMaterial;
  wire: THREE.LineBasicMaterial;
}) {
  const { geometry, edges } = useMemo(
    () => buildHouseFromFootprint(footprint.ring, listing.floors),
    [footprint, listing.floors],
  );
  const rooms = useMemo(() => generateInterior(dims, listing), [dims, listing]);
  const roomEdges = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeo = new THREE.EdgesGeometry(box);
    box.dispose();
    return edgesGeo;
  }, []);
  const roomMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: 0xbfe6f5, transparent: true, opacity: 0.3 }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      edges.dispose();
      roomEdges.dispose();
      roomMat.dispose();
    },
    [geometry, edges, roomEdges, roomMat],
  );

  return (
    <>
      <mesh geometry={geometry} material={glass} />
      <lineSegments geometry={edges} material={wire} />
      {rooms.map((r, i) => (
        <group key={i}>
          <lineSegments geometry={roomEdges} material={roomMat} position={r.pos} scale={r.size} />
          {furnitureFor(r).map((f, j) => (
            <mesh key={j} position={f.pos}>
              <boxGeometry args={f.size} />
              <meshStandardMaterial
                color={0xcfecff}
                emissive={0x6fb4cc}
                emissiveIntensity={0.4}
                transparent
                opacity={0.45}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}

function House({
  footprint,
  listing,
  dims,
  modelUrl,
  onGlbFailed,
}: {
  footprint: FootprintResult;
  listing: Listing;
  dims: Dims;
  modelUrl: string | null;
  onGlbFailed: () => void;
}) {
  const grp = useRef<THREE.Group>(null!);
  const { glass, wire } = useMemo(() => makeHoloMaterials(), []);
  const lightRefs = useRef<THREE.PointLight[]>([]);

  useEffect(() => {
    tourRig.houseGroup = grp.current;
    tourRig.dims = dims;
    tourRig.roomLights = lightRefs.current.filter(Boolean);
    return () => {
      clearTourRig();
      glass.dispose();
      wire.dispose();
    };
  }, [glass, wire, dims]);

  // bloom-in: the reconstruction materialises
  useEffect(() => {
    const g = grp.current;
    if (!g) return;
    const tl = gsap.timeline();
    tl.fromTo(
      g.scale,
      { x: 0.001, y: 0.001, z: 0.001 },
      { x: 1, y: 1, z: 1, duration: 0.9, ease: 'power3.out', delay: 0.15 },
    ).fromTo(
      glass,
      { emissiveIntensity: 2.4 },
      { emissiveIntensity: 0.45, duration: 1.4, ease: 'power2.out' },
      0.2,
    );
    return () => {
      tl.kill();
    };
  }, [glass]);

  // idle rotation — parked while the tour runs
  useFrame((_, dt) => {
    if (!useStore.getState().isPlaying && grp.current) {
      grp.current.rotation.y += dt * 0.1;
    }
  });

  const floorLights = useMemo(() => {
    const fh = dims.height / dims.floors;
    return Array.from({ length: dims.floors }, (_, f) => ({
      pos: [0, fh * f + fh * 0.55, 0] as [number, number, number],
    }));
  }, [dims]);

  const procedural = (
    <ProceduralBody footprint={footprint} listing={listing} dims={dims} glass={glass} wire={wire} />
  );

  return (
    <group ref={grp}>
      {modelUrl ? (
        <HoloBoundary fallback={procedural} onError={onGlbFailed}>
          <Suspense fallback={null}>
            <GLBBody url={modelUrl} dims={dims} glass={glass} wire={wire} />
          </Suspense>
        </HoloBoundary>
      ) : (
        procedural
      )}
      {floorLights.map((l, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            if (el) lightRefs.current[i] = el;
          }}
          position={l.pos}
          intensity={0}
          distance={Math.max(dims.width, dims.depth) * 1.4}
          color="#FFD98A"
        />
      ))}
      <ScanSweepPlane height={dims.height} span={Math.max(dims.width, dims.depth) * 1.12} />
    </group>
  );
}

function Rig({ dims, camPos }: { dims: Dims; camPos: [number, number, number] }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const resetSignal = useStore((s) => s.resetSignal);
  const fit = Math.max(dims.width, dims.depth, dims.height);

  useEffect(() => {
    tourRig.camera = camera;
    tourRig.controls = controlsRef.current;
    controlsRef.current?.saveState();
  }, [camera]);

  // RESET VIEW — recover the default orbit
  useEffect(() => {
    if (resetSignal === 0) return;
    const c = controlsRef.current;
    if (!c) return;
    useStore.getState().setPlaying(false);
    gsap.to(camera.position, {
      x: camPos[0],
      y: camPos[1],
      z: camPos[2],
      duration: 1.1,
      ease: 'power3.inOut',
      onUpdate: () => c.update(),
    });
    gsap.to(c.target, {
      x: 0,
      y: dims.height * 0.42,
      z: 0,
      duration: 1.1,
      ease: 'power3.inOut',
      onUpdate: () => c.update(),
    });
  }, [resetSignal, camera, dims.height, fit, camPos]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      minDistance={fit * 0.35}
      maxDistance={fit * 3.4}
      maxPolarAngle={Math.PI / 2.02}
      target={[0, dims.height * 0.42, 0]}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

export default function HouseHologram({
  footprint,
  listing,
  modelUrl,
}: {
  footprint: FootprintResult;
  listing: Listing;
  modelUrl: string | null;
}) {
  // a broken GLB flips this so the mesh label stays honest
  const [glbFailed, setGlbFailed] = useState(false);
  // envelope straight from the ring — no throwaway geometry
  const dims = useMemo<Dims>(() => {
    const xs = footprint.ring.map((p) => p[0]);
    const zs = footprint.ring.map((p) => p[1]);
    return {
      width: Math.max(...xs) - Math.min(...xs),
      depth: Math.max(...zs) - Math.min(...zs),
      height: Math.max(1, listing.floors) * 3.1,
      floors: Math.max(1, listing.floors),
    };
  }, [footprint, listing.floors]);
  const fit = Math.max(dims.width, dims.depth, dims.height);
  // tightest field that still contains the house with margin
  const sphereR = Math.max((Math.hypot(dims.width, dims.depth) / 2) * 1.12, dims.height * 1.15);
  const camPos: [number, number, number] = [sphereR * 1.75, sphereR * 1.15, sphereR * 1.75];

  return (
    <Canvas
      camera={{ position: camPos, fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0A141D']} />
      <ambientLight intensity={0.38} />
      {/* gold emitter overhead — the one warm note in the room */}
      <pointLight position={[0, sphereR * 2.1, 0]} intensity={1.0} color="#FFD98A" />
      <pointLight position={[-fit * 2, fit, -fit * 2]} intensity={0.3} color="#A5D8E8" />

      <Grid
        args={[sphereR * 6, sphereR * 6]}
        cellSize={1.5}
        sectionSize={7.5}
        cellColor="#274757"
        sectionColor="#5F9FB8"
        fadeDistance={sphereR * 5}
        fadeStrength={2.2}
        infiniteGrid
        position={[0, 0, 0]}
      />

      <House
        footprint={footprint}
        listing={listing}
        dims={dims}
        modelUrl={modelUrl}
        onGlbFailed={() => setGlbFailed(true)}
      />
      <ContainmentSphere radius={sphereR} />
      <DustField radius={sphereR} />

      {/* floating HUD panels — control-room screens angled at the operator */}
      <Html
        position={[dims.width / 2 + 3.4, dims.height * 0.85, dims.depth * 0.2]}
        transform
        occlude={false}
        distanceFactor={fit * 0.42}
        rotation={[0, -Math.PI / 8, 0]}
      >
        <div className="holo-panel" style={{ minWidth: 250 }}>
          <div className="holo-panel__title">{listing.address.split(',')[0]}</div>
          <div>PRICE ${listing.price.toLocaleString()}</div>
          <div>
            {listing.beds} BD · {listing.baths} BA · {listing.sqft.toLocaleString()} FT²
          </div>
          <div>
            BUILT {listing.yearBuilt} · {listing.floors} FL · {listing.style.toUpperCase()}
          </div>
          <div className="holo-panel__ok">
            MESH {modelUrl && !glbFailed ? 'BLENDER GLB' : footprint.source.toUpperCase()} · STABLE
          </div>
        </div>
      </Html>
      <Html
        position={[-dims.width / 2 - 3.4, dims.height * 0.55, dims.depth * 0.2]}
        transform
        occlude={false}
        distanceFactor={fit * 0.42}
        rotation={[0, Math.PI / 8, 0]}
      >
        <div className="holo-panel" style={{ minWidth: 230 }}>
          <div className="holo-panel__title">TELEMETRY</div>
          <div>
            ENVELOPE {dims.width.toFixed(1)} × {dims.depth.toFixed(1)} × {dims.height.toFixed(1)} M
          </div>
          <div>
            FLOORS {dims.floors} · ROOMS {listing.beds + listing.baths + 1}
          </div>
          <div>CONTAINMENT ACTIVE · FIELD {Math.round(sphereR * 10) / 10} M</div>
          <div className="holo-panel__ok">INTEGRITY 99.7% · DRIFT 0.002</div>
        </div>
      </Html>

      <Rig dims={dims} camPos={camPos} />

      <EffectComposer>
        <Bloom
          intensity={CONFIG.bloom.intensity}
          luminanceThreshold={CONFIG.bloom.threshold}
          luminanceSmoothing={0.7}
          mipmapBlur
        />
        <Noise opacity={0.025} />
        <Vignette eskil={false} offset={0.24} darkness={0.82} />
      </EffectComposer>
    </Canvas>
  );
}
