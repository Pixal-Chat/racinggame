import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "./GameStore";
import { useCreateLap } from "@/hooks/use-laps";
import { Button } from "@/components/ui/button";

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
  ctx.fillStyle = "#222222"; // Slightly lighter than background
  ctx.fillRect(0, 0, 512, 512);

  // Noise
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#2a2a2a" : "#1a1a1a";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // Neon Side Lines
  ctx.fillStyle = "#0ff"; // Cyan neon
  ctx.fillRect(0, 0, 15, 512); // Left line
  ctx.fillStyle = "#f0f"; // Magenta neon
  ctx.fillRect(497, 0, 15, 512); // Right line
  
  // Center dashed line
  ctx.fillStyle = "#555";
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
      args={[1000, 100, 0xff00ff, 0x111111]} 
      position={[0, -0.1, 0]} 
    />
  );
}

function Car({ carRef }: { carRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={carRef} position={[TRACK_RADIUS, 0.5, 0]}>
      {/* Chassis - Red/Neon Magenta */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[CAR_WIDTH, 0.6, CAR_LENGTH]} />
        <meshStandardMaterial 
          color="#ff00ff" 
          emissive="#330033" 
          roughness={0.2} 
          metalness={0.8} 
        />
      </mesh>
      
      {/* Cabin/Roof - clearly visible top */}
      <mesh position={[0, 0.75, -0.2]} castShadow>
        <boxGeometry args={[CAR_WIDTH - 0.2, 0.45, CAR_LENGTH - 1.2]} />
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
      
      {/* Car specific lighting to ensure visibility */}
      <pointLight position={[0, 2, 0]} intensity={2} color="#ffffff" distance={10} />
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
    const maxSpeed = settings.horsepower * 0.6 * (settings.drs ? 1.2 : 1.0) + (settings.ers ? 50 : 0);
    const accelForce = (settings.horsepower / 20) * throttle * (settings.ers ? 1.5 : 1.0);
    const brakeForce = settings.driveMode === 'drift' ? 80 : 120;
    const drag = p.speed * 0.02 * (settings.drs ? 0.5 : 1.0);
    const rollingResist = 5;

    // Apply forces
    if (throttle > 0) {
      const maxAccel = 100 * (0.2 + 0.8 * settings.tractionControl);
      const effectiveAccel = Math.min(accelForce, maxAccel);
      p.speed += effectiveAccel * dt;
    }
    
    if (brake > 0) {
      p.speed -= brakeForce * dt;
    }
    
    p.speed -= (drag + rollingResist) * dt;
    if (p.speed < 0) p.speed = 0;
    if (p.speed > maxSpeed) p.speed = maxSpeed;

    // Steering & Drifting
    const steerSens = 1.5;
    const grip = settings.driveMode === 'drift' ? 0.95 : 0.99;
    
    let turnRate = steer * steerSens * dt;
    const driftThreshold = 0.6 * settings.esp;
    if (Math.abs(turnRate) > 0.02 && p.speed > 50 && Math.random() > grip) {
        p.driftAngle += turnRate * 2; 
    } else {
        p.driftAngle *= 0.95; 
    }
    p.driftAngle = Math.max(Math.min(p.driftAngle, 0.5), -0.5);
    
    const angularVelocity = (p.speed / 3.6) / TRACK_RADIUS;
    p.angle += angularVelocity * dt;
    
    p.lateralOffset += steer * (p.speed / 50) * dt * 5;
    p.lateralOffset = Math.max(Math.min(p.lateralOffset, TRACK_WIDTH/2 - 1.5), -(TRACK_WIDTH/2 - 1.5));

    // --- 3. Position Update ---
    const r = TRACK_RADIUS + p.lateralOffset;
    const x = r * Math.cos(p.angle);
    const z = r * Math.sin(p.angle);
    carRef.current.position.set(x, 0.5, z);
    
    const tangent = p.angle + Math.PI / 2;
    carRef.current.rotation.y = -tangent + p.driftAngle;
    
    // --- 4. Camera Follow (Rear Chase View) ---
    // Fix: distance behind (-7 to -9), height (+3 to +4)
    const camDistBehind = 8;
    const camHeightAbove = 3.5;
    
    // Position behind the car relative to its tangent
    const targetCamX = x - Math.cos(tangent) * camDistBehind;
    const targetCamZ = z - Math.sin(tangent) * camDistBehind;
    const targetCamY = camHeightAbove;
    
    // Smooth follow
    camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
    
    // Look slightly ahead of the car
    const lookAheadDist = 5;
    const lookAtX = x + Math.cos(tangent) * lookAheadDist;
    const lookAtZ = z + Math.sin(tangent) * lookAheadDist;
    camera.lookAt(lookAtX, 1, lookAtZ);

    // --- 5. Lap Timing & Telemetry ---
    const now = Date.now();
    const currentLapTime = now - p.lapStartTime;
    
    if (p.angle >= Math.PI * 2 * (p.currentLap + 1)) {
        p.currentLap++;
        const lapTimeMs = currentLapTime;
        saveLap({ 
          lapTimeMs, 
          displayTime: new Date(lapTimeMs).toISOString().slice(14, 23)
        });
        p.lapStartTime = now;
        const currentBest = useGameStore.getState().telemetry.bestLapTime;
        if (currentBest === 0 || lapTimeMs < currentBest) {
           updateTelemetry({ bestLapTime: lapTimeMs });
        }
    }

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
  const [gameState, setGameState] = useState<"landing" | "playing">("landing");

  if (gameState === "landing") {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center font-arcade relative overflow-hidden crt-overlay">
        <h1 className="text-6xl md:text-8xl text-neon-pink text-neon-pink mb-8 animate-pulse">RACING SIM</h1>
        
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-sm text-neon-blue uppercase tracking-widest">
          by Manish Sai Yella
        </div>

        <Button 
          onClick={() => setGameState("playing")}
          className="absolute bottom-10 right-10 bg-transparent border-2 border-neon-blue text-neon-blue hover:bg-neon-blue/20 px-8 py-6 text-2xl h-auto no-default-hover-elevate"
        >
          NEXT ▶
        </Button>

        {/* Retro scanline bg effect */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-purple-500/5 to-transparent bg-[length:100%_20px]" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black crt-overlay">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
        {/* Environment Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[0, 10, -5]} intensity={1.5} castShadow />
        <pointLight position={[0, 50, 0]} intensity={1} color="#4400ff" />
        
        {/* Fog for distance hiding */}
        <fog attach="fog" args={['#0a0a0a', 20, 150]} />
        
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

