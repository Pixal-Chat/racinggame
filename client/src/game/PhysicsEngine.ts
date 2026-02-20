import type { CarSettings } from './GameStore';

export interface PhysicsState {
  posX: number;
  posZ: number;
  heading: number;
  speed: number;
  lateralSpeed: number;
  driftAngle: number;
  wheelSpeed: number;
  yaw: number;
  absActive: boolean;
  tcsActive: boolean;
  espActive: boolean;
  onGrass: boolean;
  trackProgress: number;
  currentLap: number;
  lapStartTime: number;
  smoothHeading: number;
}

export interface TrackSplinePoint {
  x: number;
  z: number;
}

export function createInitialPhysicsState(startX: number, startZ: number, heading: number): PhysicsState {
  return {
    posX: startX,
    posZ: startZ,
    heading,
    speed: 0,
    lateralSpeed: 0,
    driftAngle: 0,
    wheelSpeed: 0,
    yaw: 0,
    absActive: false,
    tcsActive: false,
    espActive: false,
    onGrass: false,
    trackProgress: 0,
    currentLap: 0,
    lapStartTime: Date.now(),
    smoothHeading: heading,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function distanceToTrack(
  px: number,
  pz: number,
  trackPoints: TrackSplinePoint[]
): { dist: number; closestX: number; closestZ: number; segIdx: number } {
  let minDist = Infinity;
  let bestX = px;
  let bestZ = pz;
  let bestIdx = 0;
  for (let i = 0; i < trackPoints.length; i++) {
    const next = (i + 1) % trackPoints.length;
    const ax = trackPoints[i].x;
    const az = trackPoints[i].z;
    const bx = trackPoints[next].x;
    const bz = trackPoints[next].z;

    const abx = bx - ax;
    const abz = bz - az;
    const apx = px - ax;
    const apz = pz - az;
    const abLenSq = abx * abx + abz * abz;
    if (abLenSq === 0) continue;
    const t = clamp((apx * abx + apz * abz) / abLenSq, 0, 1);
    const closestX = ax + t * abx;
    const closestZ = az + t * abz;
    const dx = px - closestX;
    const dz = pz - closestZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) {
      minDist = dist;
      bestX = closestX;
      bestZ = closestZ;
      bestIdx = i;
    }
  }
  return { dist: minDist, closestX: bestX, closestZ: bestZ, segIdx: bestIdx };
}

export function isOnTrack(
  px: number,
  pz: number,
  trackPoints: TrackSplinePoint[],
  trackWidth: number
): boolean {
  return distanceToTrack(px, pz, trackPoints).dist < trackWidth / 2;
}

export function findClosestTrackIndex(
  px: number,
  pz: number,
  trackPoints: TrackSplinePoint[]
): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < trackPoints.length; i++) {
    const dx = px - trackPoints[i].x;
    const dz = pz - trackPoints[i].z;
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      minIdx = i;
    }
  }
  return minIdx;
}

export function updatePhysics(
  state: PhysicsState,
  dt: number,
  throttleInput: number,
  brakeInput: number,
  steerInput: number,
  settings: CarSettings,
  trackPoints: TrackSplinePoint[],
  trackWidth: number
): PhysicsState {
  const s = { ...state };
  const cappedDt = Math.min(dt, 0.033);

  const trackInfo = distanceToTrack(s.posX, s.posZ, trackPoints);
  const onTrack = trackInfo.dist < trackWidth / 2;
  s.onGrass = !onTrack;

  const surfaceGrip = onTrack ? 1.0 : 0.5;
  const surfaceDrag = onTrack ? 1.0 : 2.0;
  const surfaceRolling = onTrack ? 1.0 : 2.5;

  const massKg = settings.weight;
  const massMultiplier = 1400 / massKg;

  const drsMultiplier = settings.drs ? 1.25 : 1.0;
  const ersBoost = settings.ers ? 1.4 : 1.0;
  const maxSpeed = settings.horsepower * 0.55 * drsMultiplier + (settings.ers ? 40 : 0);

  const engineForce = (settings.horsepower / 15) * throttleInput * ersBoost * massMultiplier;

  let tcsActive = false;
  let effectiveEngineForce = engineForce;
  if (throttleInput > 0 && settings.tractionControl > 0) {
    const maxTractionForce = surfaceGrip * massKg * 9.81 * 0.01;
    const tcsLimit = lerp(engineForce, maxTractionForce, settings.tractionControl);
    if (engineForce > tcsLimit * 1.1) {
      effectiveEngineForce = tcsLimit;
      tcsActive = true;
    }
  }
  s.tcsActive = tcsActive;

  const rawBrakeForce = 150 * brakeInput * massMultiplier;
  let absActive = false;
  let effectiveBrakeForce = rawBrakeForce;
  if (brakeInput > 0 && settings.abs > 0 && s.speed > 5) {
    const absOscillation = 0.7 + 0.3 * Math.sin(Date.now() * 0.03);
    const absReduction = lerp(1.0, absOscillation, settings.abs);
    effectiveBrakeForce = rawBrakeForce * absReduction;
    if (settings.abs > 0.1) absActive = true;
  }
  s.absActive = absActive;

  const dragCoeff = 0.015 * surfaceDrag * (settings.drs ? 0.6 : 1.0);
  const rollingResist = 4 * surfaceRolling;
  const airDrag = s.speed * s.speed * dragCoeff * 0.001;

  if (throttleInput > 0) {
    s.speed += effectiveEngineForce * cappedDt;
  }
  if (brakeInput > 0) {
    s.speed -= effectiveBrakeForce * cappedDt;
  }
  s.speed -= (airDrag + rollingResist) * cappedDt;
  s.speed = clamp(s.speed, 0, maxSpeed);

  const downforceGrip = 1.0 + settings.downforce * (s.speed / maxSpeed) * 0.4;
  const gripLevel = surfaceGrip * downforceGrip;
  const steerSens = settings.steeringSensitivity * 2.2;
  const speedSteerReduction = 1.0 / (1.0 + s.speed * 0.005);
  const targetTurnRate = steerInput * steerSens * speedSteerReduction * cappedDt;

  if (s.speed > 2) {
    s.heading += targetTurnRate * gripLevel;
  }

  s.smoothHeading = lerp(s.smoothHeading, s.heading, 0.15);

  const isDriftMode = settings.driveMode === 'drift';
  const driftGrip = isDriftMode ? 0.90 : 0.995;
  const driftTriggerSpeed = isDriftMode ? 30 : 120;

  if (Math.abs(steerInput) > 0.3 && s.speed > driftTriggerSpeed) {
    const driftForce = steerInput * (1 - driftGrip) * (s.speed / 150) * cappedDt * 1.5;
    s.driftAngle += driftForce;
  }
  s.driftAngle *= isDriftMode ? 0.95 : 0.80;
  if (Math.abs(s.driftAngle) < 0.005) s.driftAngle = 0;
  s.driftAngle = clamp(s.driftAngle, -0.6, 0.6);

  let espActive = false;
  if (settings.esp > 0 && Math.abs(s.driftAngle) > 0.1) {
    const correction = s.driftAngle * settings.esp * 0.15 * cappedDt;
    s.driftAngle -= correction;
    s.speed *= (1 - settings.esp * 0.001);
    espActive = true;
  }
  s.espActive = espActive;

  const suspensionDamping = lerp(0.92, 0.99, settings.suspension);

  const forwardX = Math.sin(s.heading);
  const forwardZ = Math.cos(s.heading);
  const speedMs = s.speed / 3.6;
  s.posX += forwardX * speedMs * cappedDt * suspensionDamping;
  s.posZ += forwardZ * speedMs * cappedDt * suspensionDamping;

  if (Math.abs(s.driftAngle) > 0.01) {
    const lateralX = Math.sin(s.heading + Math.PI / 2);
    const lateralZ = Math.cos(s.heading + Math.PI / 2);
    const lateralSlide = s.driftAngle * speedMs * cappedDt * 0.08;
    s.posX += lateralX * lateralSlide;
    s.posZ += lateralZ * lateralSlide;
  }

  const barrierLimit = trackWidth / 2 + 0.5;
  const postMoveTrack = distanceToTrack(s.posX, s.posZ, trackPoints);
  if (postMoveTrack.dist > barrierLimit) {
    const pushDx = s.posX - postMoveTrack.closestX;
    const pushDz = s.posZ - postMoveTrack.closestZ;
    const pushLen = Math.sqrt(pushDx * pushDx + pushDz * pushDz);
    if (pushLen > 0) {
      const nx = pushDx / pushLen;
      const nz = pushDz / pushLen;
      s.posX = postMoveTrack.closestX + nx * barrierLimit;
      s.posZ = postMoveTrack.closestZ + nz * barrierLimit;
      s.speed *= 0.6;
      s.driftAngle *= 0.3;
    }
  }

  const closestIdx = findClosestTrackIndex(s.posX, s.posZ, trackPoints);
  const newProgress = closestIdx / trackPoints.length;

  if (s.trackProgress > 0.9 && newProgress < 0.1 && s.speed > 5) {
    s.currentLap++;
    s.lapStartTime = Date.now();
  }
  s.trackProgress = newProgress;

  return s;
}
