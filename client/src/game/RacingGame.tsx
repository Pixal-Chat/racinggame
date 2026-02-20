import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "./GameStore";
import { useCreateLap } from "@/hooks/use-laps";
import { Button } from "@/components/ui/button";
import {
  createInitialPhysicsState,
  updatePhysics,
  type PhysicsState,
} from "./PhysicsEngine";
import {
  generateTrackPoints,
  Track,
  StartFinishLine,
  TrackBarriers,
  TRACK_WIDTH,
} from "./TrackBuilder";
import { GroundTerrain, SandTraps, GrassPatches } from "./TerrainSystem";
import { TrackSideObjects } from "./TrackObjects";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const CAR_LENGTH = 3;
const CAR_WIDTH = 1.6;

function Car({ carRef }: { carRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={carRef} position={[0, 0.5, -80]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[CAR_WIDTH, 0.6, CAR_LENGTH]} />
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#330033"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[0, 0.75, -0.2]} castShadow>
        <boxGeometry args={[CAR_WIDTH - 0.2, 0.45, CAR_LENGTH - 1.2]} />
        <meshStandardMaterial color="#111" roughness={0.0} metalness={1.0} />
      </mesh>
      <mesh position={[0.5, 0.3, CAR_LENGTH / 2]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      <mesh position={[-0.5, 0.3, CAR_LENGTH / 2]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      <mesh position={[0.5, 0.4, -CAR_LENGTH / 2]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-0.5, 0.4, -CAR_LENGTH / 2]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={3} />
      </mesh>
      {[-0.65, 0.65].map((xOff) =>
        [-0.9, 0.9].map((zOff) => (
          <mesh key={`${xOff}-${zOff}`} position={[xOff, 0.15, zOff]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.15, 12]} />
            <meshStandardMaterial color="#222" roughness={0.9} metalness={0.2} />
          </mesh>
        ))
      )}
      <pointLight position={[0, 2, 0]} intensity={2} color="#ffffff" distance={10} />
    </group>
  );
}

function GameController() {
  const { camera } = useThree();
  const carRef = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});

  const trackPoints = useMemo(() => generateTrackPoints(200), []);

  const startPoint = trackPoints[0];
  const nextPoint = trackPoints[1];
  const startHeading = Math.atan2(
    nextPoint.x - startPoint.x,
    nextPoint.z - startPoint.z
  );

  const physicsRef = useRef<PhysicsState>(
    createInitialPhysicsState(startPoint.x, startPoint.z, startHeading)
  );

  const updateTelemetry = useGameStore((s) => s.updateTelemetry);
  const settings = useGameStore((s) => s.settings);
  const { mutate: saveLap } = useCreateLap();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const prevLapRef = useRef(0);

  useFrame((_, delta) => {
    if (!carRef.current) return;

    const throttle =
      keys.current["KeyW"] || keys.current["ArrowUp"] ? 1 : 0;
    const brake =
      keys.current["KeyS"] || keys.current["ArrowDown"] ? 1 : 0;
    const steer =
      (keys.current["KeyA"] || keys.current["ArrowLeft"] ? -1 : 0) +
      (keys.current["KeyD"] || keys.current["ArrowRight"] ? 1 : 0);

    const newState = updatePhysics(
      physicsRef.current,
      delta,
      throttle,
      brake,
      steer,
      settings,
      trackPoints,
      TRACK_WIDTH
    );
    physicsRef.current = newState;

    carRef.current.position.lerp(
      new THREE.Vector3(newState.posX, 0.5, newState.posZ),
      0.4
    );
    const targetCarRot = -newState.smoothHeading + newState.driftAngle * 0.3;
    carRef.current.rotation.y = lerp(
      carRef.current.rotation.y,
      targetCarRot,
      0.2
    );

    const camDist = 12;
    const camHeight = 5;
    const camHeading = newState.smoothHeading;
    const behindX = newState.posX - Math.sin(camHeading) * camDist;
    const behindZ = newState.posZ - Math.cos(camHeading) * camDist;
    camera.position.lerp(new THREE.Vector3(behindX, camHeight, behindZ), 0.06);

    const lookAhead = 10;
    const aheadX = newState.posX + Math.sin(camHeading) * lookAhead;
    const aheadZ = newState.posZ + Math.cos(camHeading) * lookAhead;
    const lookTarget = new THREE.Vector3(aheadX, 1, aheadZ);
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);
    camera.lookAt(lookTarget);

    const now = Date.now();
    const currentLapTime = now - newState.lapStartTime;

    if (newState.currentLap > prevLapRef.current) {
      prevLapRef.current = newState.currentLap;
      const lapTimeMs = currentLapTime;
      saveLap({
        lapTimeMs,
        displayTime: new Date(lapTimeMs).toISOString().slice(14, 23),
      });
      const currentBest = useGameStore.getState().telemetry.bestLapTime;
      if (currentBest === 0 || lapTimeMs < currentBest) {
        updateTelemetry({ bestLapTime: lapTimeMs });
      }
    }

    updateTelemetry({
      speed: Math.abs(newState.speed),
      gear: Math.min(6, Math.max(1, Math.floor(Math.abs(newState.speed) / 40) + 1)),
      rpm: (Math.abs(newState.speed) % 40) * 200 + 1000,
      lapTime: currentLapTime,
      throttle,
      brake,
      absActive: newState.absActive,
      tcsActive: newState.tcsActive,
      espActive: newState.espActive,
      onGrass: newState.onGrass,
      driftAngle: newState.driftAngle,
      currentLap: newState.currentLap,
    });
  });

  const sandTrapPositions = useMemo(() => {
    const positions: { x: number; z: number; scaleX: number; scaleZ: number; rotation: number }[] = [];
    const indices = [30, 80, 130, 170];
    for (const idx of indices) {
      if (idx >= trackPoints.length) continue;
      const pt = trackPoints[idx];
      const next = trackPoints[(idx + 1) % trackPoints.length];
      const dx = next.x - pt.x;
      const dz = next.z - pt.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len === 0) continue;
      const nx = -dz / len;
      const nz = dx / len;
      const offset = TRACK_WIDTH / 2 + 6;
      positions.push({
        x: pt.x + nx * offset,
        z: pt.z + nz * offset,
        scaleX: 10 + Math.random() * 5,
        scaleZ: 6 + Math.random() * 4,
        rotation: Math.atan2(dx, dz),
      });
    }
    return positions;
  }, [trackPoints]);

  return (
    <>
      <Car carRef={carRef} />
      <Track trackPoints={trackPoints} />
      <StartFinishLine trackPoints={trackPoints} />
      <TrackBarriers trackPoints={trackPoints} />
      <GroundTerrain />
      <SandTraps positions={sandTrapPositions} />
      <GrassPatches />
      <TrackSideObjects trackPoints={trackPoints} />
    </>
  );
}

export default function RacingGame() {
  const [gameState, setGameState] = useState<"landing" | "playing">("landing");

  if (gameState === "landing") {
    return (
      <div className="landing-screen crt-overlay">
        <h1 className="landing-title">RACING SIM</h1>

        <div className="landing-attribution">by Manish Sai Yella</div>

        <Button
          onClick={() => setGameState("playing")}
          className="landing-next-btn font-arcade no-default-hover-elevate"
        >
          NEXT ▶
        </Button>

        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-purple-500/5 to-transparent bg-[length:100%_20px]" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black crt-overlay">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={{ position: [0, 5, 10], fov: 55 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[50, 100, -30]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <hemisphereLight args={["#87ceeb", "#2a5a2a", 0.4]} />

        <fog attach="fog" args={["#1a2a1a", 80, 300]} />

        <GameController />
      </Canvas>

      <div className="absolute top-4 left-4 font-arcade text-white/50 text-xs z-10 pointer-events-none space-y-1">
        <p>W/S or ↑/↓ - Accelerate/Brake</p>
        <p>A/D or ←/→ - Steer</p>
      </div>

      <HudOverlay />
    </div>
  );
}

function HudOverlay() {
  const telemetry = useGameStore((s) => s.telemetry);

  return (
    <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex gap-3">
      {telemetry.absActive && (
        <div className="bg-yellow-500/80 text-black font-arcade text-xs px-3 py-1 rounded animate-pulse">
          ABS
        </div>
      )}
      {telemetry.tcsActive && (
        <div className="bg-orange-500/80 text-black font-arcade text-xs px-3 py-1 rounded animate-pulse">
          TCS
        </div>
      )}
      {telemetry.espActive && (
        <div className="bg-blue-500/80 text-white font-arcade text-xs px-3 py-1 rounded animate-pulse">
          ESP
        </div>
      )}
      {telemetry.onGrass && (
        <div className="bg-green-600/80 text-white font-arcade text-xs px-3 py-1 rounded">
          OFF TRACK
        </div>
      )}
    </div>
  );
}

