import { useMemo } from "react";
import * as THREE from "three";
import type { TrackSplinePoint } from "./PhysicsEngine";

export const TRACK_WIDTH = 14;

export function generateTrackPoints(numPoints: number = 200): TrackSplinePoint[] {
  const controlPoints = [
    { x: 0, z: -80 },
    { x: 40, z: -90 },
    { x: 80, z: -70 },
    { x: 100, z: -30 },
    { x: 90, z: 20 },
    { x: 60, z: 50 },
    { x: 30, z: 70 },
    { x: -10, z: 80 },
    { x: -50, z: 65 },
    { x: -80, z: 35 },
    { x: -95, z: -10 },
    { x: -85, z: -50 },
    { x: -55, z: -75 },
    { x: -25, z: -85 },
  ];

  const curve = new THREE.CatmullRomCurve3(
    controlPoints.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    true,
    "catmullrom",
    0.5
  );

  const points: TrackSplinePoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const pt = curve.getPointAt(t);
    points.push({ x: pt.x, z: pt.z });
  }
  return points;
}

function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#222" : "#151515";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  ctx.fillStyle = "#0ff";
  ctx.fillRect(0, 0, 12, 512);
  ctx.fillStyle = "#f0f";
  ctx.fillRect(500, 0, 12, 512);

  ctx.fillStyle = "#444";
  for (let i = 0; i < 512; i += 40) {
    ctx.fillRect(254, i, 4, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 30);
  return texture;
}

export function Track({ trackPoints }: { trackPoints: TrackSplinePoint[] }) {
  const geometry = useMemo(() => {
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < trackPoints.length; i++) {
      const curr = trackPoints[i];
      const next = trackPoints[(i + 1) % trackPoints.length];

      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len === 0) continue;

      const nx = -dz / len;
      const nz = dx / len;

      const halfW = TRACK_WIDTH / 2;
      vertices.push(curr.x + nx * halfW, 0.01, curr.z + nz * halfW);
      vertices.push(curr.x - nx * halfW, 0.01, curr.z - nz * halfW);

      const t = i / trackPoints.length;
      uvs.push(0, t * 30);
      uvs.push(1, t * 30);
    }

    for (let i = 0; i < trackPoints.length; i++) {
      const next = (i + 1) % trackPoints.length;
      const a = i * 2;
      const b = i * 2 + 1;
      const c = next * 2;
      const d = next * 2 + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [trackPoints]);

  const texture = useMemo(() => createRoadTexture(), []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
    </mesh>
  );
}

export function StartFinishLine({ trackPoints }: { trackPoints: TrackSplinePoint[] }) {
  const startPos = trackPoints[0];
  const nextPos = trackPoints[1];
  const dx = nextPos.x - startPos.x;
  const dz = nextPos.z - startPos.z;
  const angle = Math.atan2(dx, dz);

  return (
    <group position={[startPos.x, 0.02, startPos.z]} rotation={[0, angle, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TRACK_WIDTH, 2]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) =>
        Array.from({ length: 2 }).map((_, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[
              -TRACK_WIDTH / 2 + (i + 0.5) * (TRACK_WIDTH / 7),
              0.025,
              -1 + j * 1,
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[TRACK_WIDTH / 7, 1]} />
            <meshStandardMaterial
              color={(i + j) % 2 === 0 ? "#111" : "#eee"}
            />
          </mesh>
        ))
      )}
    </group>
  );
}

export function TrackBarriers({ trackPoints }: { trackPoints: TrackSplinePoint[] }) {
  const barriers = useMemo(() => {
    const items: { x: number; z: number; angle: number; side: number }[] = [];
    const step = 4;
    for (let i = 0; i < trackPoints.length; i += step) {
      const curr = trackPoints[i];
      const next = trackPoints[(i + 1) % trackPoints.length];
      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len === 0) continue;
      const nx = -dz / len;
      const nz = dx / len;
      const angle = Math.atan2(dx, dz);
      const offset = TRACK_WIDTH / 2 + 0.8;
      items.push({ x: curr.x + nx * offset, z: curr.z + nz * offset, angle, side: 1 });
      items.push({ x: curr.x - nx * offset, z: curr.z - nz * offset, angle, side: -1 });
    }
    return items;
  }, [trackPoints]);

  return (
    <group>
      {barriers.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, 0.4, b.z]}
          rotation={[0, b.angle, 0]}
          castShadow
        >
          <boxGeometry args={[0.3, 0.8, 3]} />
          <meshStandardMaterial
            color={b.side > 0 ? "#ff0044" : "#0088ff"}
            emissive={b.side > 0 ? "#330011" : "#001133"}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}
