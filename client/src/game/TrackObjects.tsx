import { useMemo } from "react";
import type { TrackSplinePoint } from "./PhysicsEngine";
import { TRACK_WIDTH } from "./TrackBuilder";

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1.8, 4, 8]} />
        <meshStandardMaterial color="#1a5a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 5, 0]} castShadow>
        <coneGeometry args={[1.4, 3, 8]} />
        <meshStandardMaterial color="#1d6d2d" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 1.6, 8]} />
        <meshStandardMaterial color="#4a3520" roughness={0.95} />
      </mesh>
    </group>
  );
}

function LightPole({ position, angle }: { position: [number, number, number]; angle: number }) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 8, 6]} />
        <meshStandardMaterial color="#555" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#888" emissive="#ffdd88" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 8, 0]} intensity={3} color="#ffdd88" distance={25} decay={2} />
    </group>
  );
}

function Grandstand({ position, angle }: { position: [number, number, number]; angle: number }) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[12, 3, 4]} />
        <meshStandardMaterial color="#333344" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, 3.5, -1]} castShadow>
        <boxGeometry args={[12, 2, 2]} />
        <meshStandardMaterial color="#444455" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, 5, -1.8]} castShadow>
        <boxGeometry args={[12, 1, 0.8]} />
        <meshStandardMaterial color="#555566" roughness={0.7} metalness={0.3} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-5 + i * 1.5, 3.2, 0.5]} castShadow>
          <boxGeometry args={[0.3, 0.5, 0.3]} />
          <meshStandardMaterial
            color={["#ff3333", "#3333ff", "#ffff33", "#33ff33"][i % 4]}
            emissive={["#330000", "#000033", "#333300", "#003300"][i % 4]}
          />
        </mesh>
      ))}
    </group>
  );
}

function TireStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 0.5, 1.0].map((y, i) => (
        <mesh key={i} position={[0, y + 0.25, 0]} castShadow>
          <torusGeometry args={[0.35, 0.2, 8, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

export function TrackSideObjects({ trackPoints }: { trackPoints: TrackSplinePoint[] }) {
  const objects = useMemo(() => {
    const trees: { x: number; z: number; scale: number }[] = [];
    const lights: { x: number; z: number; angle: number }[] = [];
    const tireStacks: { x: number; z: number }[] = [];
    const grandstands: { x: number; z: number; angle: number }[] = [];

    for (let i = 0; i < trackPoints.length; i += 8) {
      const curr = trackPoints[i];
      const next = trackPoints[(i + 1) % trackPoints.length];
      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len === 0) continue;
      const nx = -dz / len;
      const nz = dx / len;
      const angle = Math.atan2(dx, dz);

      const treeOffset = TRACK_WIDTH / 2 + 8 + Math.random() * 15;
      const side = i % 16 < 8 ? 1 : -1;
      trees.push({
        x: curr.x + nx * treeOffset * side,
        z: curr.z + nz * treeOffset * side,
        scale: 0.8 + Math.random() * 0.6,
      });

      if (i % 16 === 0) {
        const lightOffset = TRACK_WIDTH / 2 + 2;
        lights.push({
          x: curr.x + nx * lightOffset,
          z: curr.z + nz * lightOffset,
          angle,
        });
      }
    }

    const gsIndices = [
      Math.floor(trackPoints.length * 0.0),
      Math.floor(trackPoints.length * 0.25),
      Math.floor(trackPoints.length * 0.5),
    ];
    for (const idx of gsIndices) {
      const curr = trackPoints[idx];
      const next = trackPoints[(idx + 1) % trackPoints.length];
      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len === 0) continue;
      const nx = -dz / len;
      const nz = dx / len;
      const angle = Math.atan2(dx, dz);
      grandstands.push({
        x: curr.x - nx * (TRACK_WIDTH / 2 + 12),
        z: curr.z - nz * (TRACK_WIDTH / 2 + 12),
        angle,
      });
    }

    const tsIndices = [
      Math.floor(trackPoints.length * 0.15),
      Math.floor(trackPoints.length * 0.4),
      Math.floor(trackPoints.length * 0.65),
      Math.floor(trackPoints.length * 0.85),
    ];
    for (const idx of tsIndices) {
      const curr = trackPoints[idx];
      const next = trackPoints[(idx + 1) % trackPoints.length];
      const dx = next.x - curr.x;
      const dz = next.z - curr.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len === 0) continue;
      const nx = -dz / len;
      const nz = dx / len;
      tireStacks.push({
        x: curr.x + nx * (TRACK_WIDTH / 2 + 1.5),
        z: curr.z + nz * (TRACK_WIDTH / 2 + 1.5),
      });
      tireStacks.push({
        x: curr.x - nx * (TRACK_WIDTH / 2 + 1.5),
        z: curr.z - nz * (TRACK_WIDTH / 2 + 1.5),
      });
    }

    return { trees, lights, tireStacks, grandstands };
  }, [trackPoints]);

  return (
    <group>
      {objects.trees.map((t, i) => (
        <Tree key={`tree-${i}`} position={[t.x, 0, t.z]} scale={t.scale} />
      ))}
      {objects.lights.map((l, i) => (
        <LightPole key={`light-${i}`} position={[l.x, 0, l.z]} angle={l.angle} />
      ))}
      {objects.grandstands.map((g, i) => (
        <Grandstand key={`gs-${i}`} position={[g.x, 0, g.z]} angle={g.angle} />
      ))}
      {objects.tireStacks.map((ts, i) => (
        <TireStack key={`ts-${i}`} position={[ts.x, 0, ts.z]} />
      ))}
    </group>
  );
}
