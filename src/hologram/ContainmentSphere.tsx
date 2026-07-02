import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const fresnelVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const fresnelFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
    gl_FragColor = vec4(uColor, fr * uIntensity);
  }
`;

/**
 * The containment field: fresnel-rim energy shell + slow-rotating lat/long
 * cage + floor ring. Radius wraps the reconstructed house.
 */
export default function ContainmentSphere({ radius }: { radius: number }) {
  const cageRef = useRef<THREE.Mesh>(null!);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fresnelVert,
        fragmentShader: fresnelFrag,
        uniforms: {
          uColor: { value: new THREE.Color('#35E4FF') },
          uPower: { value: 3.0 },
          uIntensity: { value: 0.55 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (cageRef.current) cageRef.current.rotation.y += dt * 0.04;
  });

  const y = radius * 0.62; // sphere centre floats so the floor ring stays near grade

  return (
    <group>
      {/* energy shell */}
      <mesh position={[0, y, 0]} material={mat}>
        <sphereGeometry args={[radius, 64, 48]} />
      </mesh>
      {/* rotating wire cage */}
      <mesh ref={cageRef} position={[0, y, 0]}>
        <sphereGeometry args={[radius * 1.002, 36, 18]} />
        <meshBasicMaterial
          color="#0AB6D6"
          wireframe
          transparent
          opacity={0.035}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* floor containment ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[radius * 0.94, radius * 0.965, 96]} />
        <meshBasicMaterial
          color="#35E4FF"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[radius * 0.99, radius * 1.0, 96]} />
        <meshBasicMaterial
          color="#0AB6D6"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
