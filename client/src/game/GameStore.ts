import { create } from 'zustand';

export interface CarSettings {
  horsepower: number;
  torque: number;
  tractionControl: number;
  abs: number;
  esp: number;
  brakeBias: number;
  steeringSensitivity: number;
  suspension: number;
  weight: number;
  downforce: number;
  driveMode: 'eco' | 'sport' | 'race' | 'drift';
  drs: boolean;
  ers: boolean;
}

export interface Telemetry {
  speed: number;
  gear: number;
  rpm: number;
  steering: number;
  lapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  throttle: number;
  brake: number;
  absActive: boolean;
  tcsActive: boolean;
  espActive: boolean;
  onGrass: boolean;
  driftAngle: number;
  currentLap: number;
}

interface GameState {
  settings: CarSettings;
  telemetry: Telemetry;
  updateSettings: (settings: Partial<CarSettings>) => void;
  updateTelemetry: (telemetry: Partial<Telemetry>) => void;
  toggleDRS: () => void;
  toggleERS: () => void;
  setDriveMode: (mode: CarSettings['driveMode']) => void;
}

export const useGameStore = create<GameState>((set) => ({
  settings: {
    horsepower: 600,
    torque: 400,
    tractionControl: 0.5,
    abs: 0.7,
    esp: 0.5,
    brakeBias: 0.6,
    steeringSensitivity: 0.5,
    suspension: 0.5,
    weight: 1400,
    downforce: 0.5,
    driveMode: 'sport',
    drs: false,
    ers: false,
  },
  telemetry: {
    speed: 0,
    gear: 1,
    rpm: 0,
    steering: 0,
    lapTime: 0,
    lastLapTime: 0,
    bestLapTime: 0,
    throttle: 0,
    brake: 0,
    absActive: false,
    tcsActive: false,
    espActive: false,
    onGrass: false,
    driftAngle: 0,
    currentLap: 0,
  },

  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),

  updateTelemetry: (newTelemetry) =>
    set((state) => ({ telemetry: { ...state.telemetry, ...newTelemetry } })),

  toggleDRS: () =>
    set((state) => ({ settings: { ...state.settings, drs: !state.settings.drs } })),

  toggleERS: () =>
    set((state) => ({ settings: { ...state.settings, ers: !state.settings.ers } })),

  setDriveMode: (mode) =>
    set((state) => {
      let preset: Partial<CarSettings> = {};
      switch (mode) {
        case 'eco':
          preset = { horsepower: 300, tractionControl: 1.0, abs: 1.0, esp: 1.0, steeringSensitivity: 0.3, downforce: 0.3 };
          break;
        case 'sport':
          preset = { horsepower: 600, tractionControl: 0.5, abs: 0.7, esp: 0.5, steeringSensitivity: 0.5, downforce: 0.5 };
          break;
        case 'race':
          preset = { horsepower: 800, tractionControl: 0.2, abs: 0.4, esp: 0.2, steeringSensitivity: 0.7, downforce: 0.8 };
          break;
        case 'drift':
          preset = { horsepower: 700, tractionControl: 0.0, abs: 0.3, esp: 0.0, brakeBias: 0.8, steeringSensitivity: 0.9, downforce: 0.2 };
          break;
      }
      return { settings: { ...state.settings, driveMode: mode, ...preset } };
    }),
}));
