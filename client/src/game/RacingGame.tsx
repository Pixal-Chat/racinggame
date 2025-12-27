import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "./GameStore";
import { useCreateLap } from "@/hooks/use-laps";

// --- Constants & Config ---
const TRACK_RADIUS = 80;
const TRACK_WIDTH = 12;
const CAR_LENGTH = 3;
const CAR_WIDTH = 1.6;

// --- Helper: Procedural Texture for Road ---
function createRoadTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Asphalt base
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, 512, 512);

  // Noise
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#222" : "#111";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // Neon Side Lines
  ctx.fillStyle = "#0ff"; // Cyan neon
  ctx.fillRect(0, 0, 10, 512); // Left line
  ctx.fillStyle = "#f0f"; // Magenta neon
  ctx.fillRect(502, 0, 10, 512); // Right line
  
  // Center dashed line
  ctx.fillStyle = "#444";
  for(let i=0; i<512; i+=40) {
    ctx.fillRect(254, i, 4, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 20); // Repeat along track length
  return texture;
}

// --- Components ---

function Track() {
  const textureRef = useRef<THREE.CanvasTexture>(null);
  
  if (!textureRef.current) {
    // @ts-ignore
    textureRef.current = createRoadTexture();
  }

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {/* Simple Ring Track */}
      <ringGeometry args={[TRACK_RADIUS - TRACK_WIDTH/2, TRACK_RADIUS + TRACK_WIDTH/2, 128]} />
      <meshStandardMaterial 
        map={textureRef.current} 
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}

function GridFloor() {
  return (
    <gridHelper 
      args={[400, 40, 0xff00ff, 0x222222]} 
      position={[0, -0.1, 0]} 
    />
  );
}

function Car({ carRef }: { carRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={carRef} position={[TRACK_RADIUS, 0.5, 0]}>
      {/* Chassis */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[CAR_WIDTH, 0.6, CAR_LENGTH]} />
        <meshStandardMaterial color="#ff0044" roughness={0.2} metalness={0.8} />
      </mesh>
      
      {/* Cabin */}
      <mesh position={[0, 0.8, -0.2]} castShadow>
        <boxGeometry args={[CAR_WIDTH - 0.2, 0.5, CAR_LENGTH - 1.2]} />
        <meshStandardMaterial color="#111" roughness={0.0} metalness={1.0} />
      </mesh>
      
      {/* Headlights */}
      <mesh position={[0.5, 0.3, CAR_LENGTH/2]} rotation={[0,0,0]}>
         <boxGeometry args={[0.3, 0.1, 0.1]} />
         <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      <mesh position={[-0.5, 0.3, CAR_LENGTH/2]}>
         <boxGeometry args={[0.3, 0.1, 0.1]} />
         <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={5} />
      </mesh>
      
      {/* Taillights */}
      <mesh position={[0.5, 0.4, -CAR_LENGTH/2]}>
         <boxGeometry args={[0.3, 0.1, 0.1]} />
         <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={3} />
      </mesh>
      <mesh position={[-0.5, 0.4, -CAR_LENGTH/2]}>
         <boxGeometry args={[0.3, 0.1, 0.1]} />
         <meshStandardMaterial color="#f00" emissive="#f00" emissiveIntensity={3} />
      </mesh>
      
      {/* Spotlight for headlights */}
      <spotLight 
        position={[0, 1, 1]} 
        angle={0.5} 
        penumbra={0.5} 
        intensity={20} 
        distance={50} 
        castShadow 
        target-position={[0, 0, 10]}
      />
    </group>
  );
}

// --- Game Logic Manager ---
function GameController() {
  const { camera } = useThree();
  const carRef = useRef<THREE.Group>(null);
  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Physics State
  const physics = useRef({
    speed: 0,
    angle: 0, // Position on the ring track (radians)
    driftAngle: 0,
    lateralOffset: 0, // Distance from center of track (- width/2 to + width/2)
    lapStartTime: Date.now(),
    currentLap: 0,
    hasStarted: false,
  });

  // Store access
  const updateTelemetry = useGameStore(s => s.updateTelemetry);
  const settings = useGameStore(s => s.settings);
  const { mutate: saveLap } = useCreateLap();

  // Input Listeners
  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current[e.code] = true;
    const up = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Physics Loop
  useFrame((_, delta) => {
    if (!carRef.current) return;
    
    const p = physics.current;
    const dt = Math.min(delta, 0.1); // Cap delta to prevent glitches
    
    // --- 1. Input Handling ---
    const throttle = (keys.current['KeyW'] || keys.current['ArrowUp']) ? 1 : 0;
    const brake = (keys.current['KeyS'] || keys.current['ArrowDown']) ? 1 : 0;
    const steer = (keys.current['KeyA'] || keys.current['ArrowLeft']) ? 1 : 
                  (keys.current['KeyD'] || keys.current['ArrowRight']) ? -1 : 0;

    // --- 2. Physics Model ---
    
    // Power & Drag
    // HP converted to acceleration force roughly
    const maxSpeed = settings.horsepower * 0.6 * (settings.drs ? 1.2 : 1.0) + (settings.ers ? 50 : 0);
    const accelForce = (settings.horsepower / 20) * throttle * (settings.ers ? 1.5 : 1.0);
    const brakeForce = settings.driveMode === 'drift' ? 80 : 120; // Drift mode has weaker brakes for initiation
    const drag = p.speed * 0.02 * (settings.drs ? 0.5 : 1.0);
    const rollingResist = 5;

    // Apply forces
    if (throttle > 0) {
      // Traction Control limiting
      const maxAccel = 100 * (0.2 + 0.8 * settings.tractionControl);
      const effectiveAccel = Math.min(accelForce, maxAccel);
      p.speed += effectiveAccel * dt;
    }
    
    if (brake > 0) {
      p.speed -= brakeForce * dt;
    }
    
    // Natural deceleration
    p.speed -= (drag + rollingResist) * dt;
    
    // Clamp speed (no reverse for simplicity in this arcade version, just 0)
    if (p.speed < 0) p.speed = 0;
    if (p.speed > maxSpeed) p.speed = maxSpeed;

    // Steering & Drifting
    const steerSens = 1.5;
    const grip = settings.driveMode === 'drift' ? 0.95 : 0.99; // Lower grip threshold for drift
    const speedFactor = p.speed / 100;
    
    // Base turning
    let turnRate = steer * steerSens * dt;
    
    // Drift mechanics
    const driftThreshold = 0.6 * settings.esp; // ESP fights drift
    if (Math.abs(turnRate) > 0.02 && p.speed > 50 && Math.random() > grip) {
        // We are drifting!
        p.driftAngle += turnRate * 2; 
    } else {
        // Recovery
        p.driftAngle *= 0.95; // Return to center
    }
    
    // Clamp drift
    p.driftAngle = Math.max(Math.min(p.driftAngle, 0.5), -0.5);
    
    // Update car heading
    // Visual car rotation vs actual movement vector
    // For a ring track, "forward" changes constantly.
    // We calculate position in polar coordinates.
    
    // Angular velocity (radians per second) = linear velocity / radius
    const angularVelocity = (p.speed / 3.6) / TRACK_RADIUS; // km/h -> m/s
    p.angle += angularVelocity * dt;
    
    // Lateral movement (steering moves you in/out from center)
    p.lateralOffset += steer * (p.speed / 50) * dt * 5;
    // Clamp to track width
    p.lateralOffset = Math.max(Math.min(p.lateralOffset, TRACK_WIDTH/2 - 1), -(TRACK_WIDTH/2 - 1));

    // --- 3. Position Update ---
    
    // Polar to Cartesian
    // X = (R + offset) * cos(angle)
    // Z = (R + offset) * sin(angle)
    const r = TRACK_RADIUS + p.lateralOffset;
    const x = r * Math.cos(p.angle);
    const z = r * Math.sin(p.angle);
    
    carRef.current.position.set(x, 0.5, z);
    
    // Rotation: Car must face tangent to circle + drift angle
    // Tangent angle is p.angle + PI/2 (counter-clockwise)
    const tangent = p.angle + Math.PI / 2;
    carRef.current.rotation.y = -tangent + p.driftAngle; // ThreeJS Y is up
    
    // --- 4. Camera Follow ---
    // Ideal camera position: behind car, slightly up
    // Behind means -tangent direction
    const camDist = 12 + (p.speed / 20); // Dynamic camera distance based on speed
    const camHeight = 4 + (p.speed / 50);
    
    const cx = x - Math.cos(tangent) * -camDist; // Wait, -tangent points forward? 
    // Tangent points along track. We want opposite.
    // x position is r*cos(angle). Tangent vector is (-sin, cos).
    // Let's just use trigonometry relative to car position.
    
    // Simpler: Camera is at larger radius, same angle? No, that looks static.
    // It needs to trail.
    
    const trailAngle = p.angle - 0.15; // Lags behind in angle
    const camX = (TRACK_RADIUS + p.lateralOffset * 0.5) * Math.cos(trailAngle); // dampened lateral follow
    const camZ = (TRACK_RADIUS + p.lateralOffset * 0.5) * Math.sin(trailAngle);
    
    // Lerp camera
    camera.position.x += (camX - camera.position.x) * 0.1;
    camera.position.z += (camZ - camera.position.z) * 0.1;
    camera.position.y += (camHeight - camera.position.y) * 0.1;
    camera.lookAt(x, 0, z);

    // --- 5. Lap Timing & Telemetry ---
    const now = Date.now();
    const currentLapTime = now - p.lapStartTime;
    
    // Check lap completion (angle crosses 2PI)
    if (p.angle >= Math.PI * 2 * (p.currentLap + 1)) {
        p.currentLap++;
        
        // Save Lap
        const lapTimeMs = currentLapTime;
        saveLap({ 
          lapTimeMs, 
          displayTime: new Date(lapTimeMs).toISOString().slice(14, 23)
        });
        
        // Reset timer
        p.lapStartTime = now;
        
        // Update best
        const currentBest = useGameStore.getState().telemetry.bestLapTime;
        if (currentBest === 0 || lapTimeMs < currentBest) {
           updateTelemetry({ bestLapTime: lapTimeMs });
        }
    }

    // Update UI Store (throttled slightly naturally by frame rate, but okay for this)
    updateTelemetry({
      speed: Math.abs(p.speed),
      gear: Math.min(6, Math.max(1, Math.floor(Math.abs(p.speed) / 40) + 1)),
      rpm: (Math.abs(p.speed) % 40) * 200 + 1000,
      lapTime: currentLapTime,
    });
  });

  return (
    <>
      <Car carRef={carRef} />
      <Track />
    </>
  );
}


export default function RacingGame() {
  return (
    <div className="w-full h-full relative bg-black crt-overlay">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
        {/* Lights */}
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 50, 0]} intensity={1} color="#4400ff" />
        
        {/* Fog for distance hiding */}
        <fog attach="fog" args={['#0a0a0a', 10, 100]} />
        
        {/* Game Content */}
        <GameController />
        <GridFloor />
      </Canvas>
      
      {/* Overlay Instructions */}
      <div className="absolute top-4 left-4 font-arcade text-white/50 text-xs z-10 pointer-events-none">
        <p>WASD / ARROWS to Drive</p>
      </div>
    </div>
  );
}
