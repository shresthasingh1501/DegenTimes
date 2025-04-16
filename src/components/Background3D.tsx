import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Group, Sprite } from 'three';

// --- Dynamic Loading using Vite's import.meta.glob ---
// This finds all .png files in the specified directory relative to this file.
// `eager: true` imports them immediately, providing the URL string directly.
const imageModules = import.meta.glob('../assets/icons/*.png', { eager: true });

// Extract the URLs from the imported modules
// The actual URL might be in module.default or directly as the module value
const logoUrls = Object.values(imageModules).map((module: any) => module.default || module);
// --- End Dynamic Loading ---


// --- Configuration ---
const PARTICLE_COUNT = 1000;
const PARTICLE_SPREAD = 80; // <<< Increased significantly
const PARTICLE_SIZE = 0.001; // <<< Reduced drastically
const WAVE_SPEED = 0.1;     // <<< Increased speed
const WAVE_FREQ_X = 0.1;    // Adjusted frequency for wider spread
const WAVE_FREQ_Z = 0.08;   // Adjusted frequency for wider spread
const WAVE_BASE_AMPLITUDE = 20;
const CURSOR_INTERACTION_RADIUS = 6; // <<< Increased radius
const CURSOR_AMPLITUDE_BOOST = 1.2; // <<< Increased boost effect
// --- End Configuration ---


function ParticleField() {
  const groupRef = useRef<Group>(null!);

  // Load all textures found dynamically
  // Add a check in case logoUrls is empty
  const textures = useLoader(THREE.TextureLoader, logoUrls.length > 0 ? logoUrls : []);

  // Precompute particle data
  const particles = useMemo(() => {
    // Prevent errors if no textures were loaded
    if (textures.length === 0) return [];

    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * PARTICLE_SPREAD;
      const y = (Math.random() - 0.5) * PARTICLE_SPREAD;
      const z = (Math.random() - 0.5) * PARTICLE_SPREAD;
      // Select a random texture index from the loaded textures
      const textureIndex = Math.floor(Math.random() * textures.length);
      const initialPosition = new THREE.Vector3(x, y, z);
      temp.push({ initialPosition, textureIndex });
    }
    return temp;
    // Depend on the number of textures loaded
  }, [textures.length]);

  const { viewport } = useThree();
  const mousePosition = useRef(new THREE.Vector2(0, 0));

  useFrame((state) => {
    // Prevent errors if textures haven't loaded or particles aren't ready
    if (!groupRef.current || textures.length === 0 || particles.length === 0) return;

    const time = state.clock.getElapsedTime();
    mousePosition.current.copy(state.mouse);

    const vec = new THREE.Vector3(mousePosition.current.x, mousePosition.current.y, 0.5);
    vec.unproject(state.camera);
    const dir = vec.sub(state.camera.position).normalize();
    const distance = -state.camera.position.z / dir.z;
    const mouseWorldPos = state.camera.position.clone().add(dir.multiplyScalar(distance));

    groupRef.current.children.forEach((sprite, i) => {
      // Extra check to ensure sprite and particle data align
      if (sprite instanceof Sprite && particles[i]) {
        const particleData = particles[i];
        const initialPos = particleData.initialPosition;

        const waveFactorX = initialPos.x * WAVE_FREQ_X;
        const waveFactorZ = initialPos.z * WAVE_FREQ_Z;
        const waveSin = Math.sin(time * WAVE_SPEED + waveFactorX + waveFactorZ);

        const dx = sprite.position.x - mouseWorldPos.x;
        const dy = sprite.position.y - mouseWorldPos.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = CURSOR_INTERACTION_RADIUS * CURSOR_INTERACTION_RADIUS;

        let cursorInfluence = 0;
        if (distSq < radiusSq) {
           cursorInfluence = 1 - (distSq / radiusSq);
        }
        cursorInfluence = Math.max(0, cursorInfluence);

        const finalAmplitude = WAVE_BASE_AMPLITUDE + cursorInfluence * CURSOR_AMPLITUDE_BOOST;
        const targetY = initialPos.y + waveSin * finalAmplitude;

        sprite.position.y = targetY;
        sprite.position.x = initialPos.x + Math.cos(time * 0.15 + waveFactorZ) * 0.15;
        sprite.position.z = initialPos.z + Math.sin(time * 0.15 + waveFactorX) * 0.15;
      }
    });
  });

  // Don't render the group if no textures were loaded
  if (textures.length === 0) {
    console.warn("No PNG textures found in src/assets/icons/");
    return null;
  }

  return (
    <group ref={groupRef}>
      {particles.map((data, i) => (
        <sprite key={i} position={data.initialPosition.clone()} >
          <spriteMaterial
            attach="material"
            map={textures[data.textureIndex]} // Assign texture dynamically
            size={PARTICLE_SIZE}
            sizeAttenuation={true}
            transparent={true}
            opacity={1.0}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}

export function Background3D() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 2, 3]} intensity={0.4} />
        <ParticleField />
      </Canvas>
    </div>
  );
}
