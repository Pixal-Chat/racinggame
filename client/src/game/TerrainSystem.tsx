import { useMemo } from "react";
import * as THREE from "three";

function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1e4a1e";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3000; i++) {
    const shade = Math.random();
    if (shade > 0.7) {
      ctx.fillStyle = "#255525";
    } else if (shade > 0.4) {
      ctx.fillStyle = "#1d4d1d";
    } else {
      ctx.fillStyle = "#1a421a";
    }
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(60, 60);
  return texture;
}

function createSandTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#8a7a5a";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#9a8a6a" : "#7a6a4a";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  return texture;
}

export function GroundTerrain() {
  const grassTexture = useMemo(() => createGrassTexture(), []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[600, 600]} />
      <meshStandardMaterial
        map={grassTexture}
        roughness={0.95}
        metalness={0.0}
        color="#2a5a2a"
      />
    </mesh>
  );
}

export function SandTraps({
  positions,
}: {
  positions: { x: number; z: number; scaleX: number; scaleZ: number; rotation: number }[];
}) {
  const sandTexture = useMemo(() => createSandTexture(), []);

  return (
    <group>
      {positions.map((p, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, p.rotation]}
          position={[p.x, -0.02, p.z]}
          receiveShadow
        >
          <planeGeometry args={[p.scaleX, p.scaleZ]} />
          <meshStandardMaterial
            map={sandTexture}
            roughness={1.0}
            metalness={0.0}
            color="#9a8a6a"
          />
        </mesh>
      ))}
    </group>
  );
}

export function GrassPatches() {
  const patches = useMemo(() => {
    const items: { x: number; z: number; scale: number; rot: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 150;
      items.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        scale: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
      });
    }
    return items;
  }, []);

  return (
    <group>
      {patches.map((p, i) => (
        <mesh key={i} position={[p.x, 0.01, p.z]} rotation={[-Math.PI / 2, 0, p.rot]}>
          <circleGeometry args={[p.scale, 12]} />
          <meshStandardMaterial color="#1a4a1a" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}
