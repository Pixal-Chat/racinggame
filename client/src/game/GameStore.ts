import { create } from 'zustand';

// Physics Settings State
interface CarSettings {
  horsepower: number;
  torque: number;
  tractionControl: number; // 0-1
  esp: number; // 0-1
  brakeBias: number; // 0 (front) - 1 (rear), 0.5 balanced
  driveMode: 'eco' | 'sport' | 'race' | 'drift';
  drs: boolean;
  ers: boolean;
}

// Telemetry State (updated every frame/tick)
interface Telemetry {
  speed: number;
  gear: number;
  rpm: number;
  steering: number;
  lapTime: number;
  lastLapTime: number;
  bestLapTime: number;
}

interface GameState {
  settings: CarSettings;
  telemetry: Telemetry;
  
  // Actions
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
    esp: 0.5,
    brakeBias: 0.6,
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
      // Apply presets based on mode
      let preset: Partial<CarSettings> = {};
      switch(mode) {
        case 'eco': preset = { horsepower: 300, tractionControl: 1.0, esp: 1.0 }; break;
        case 'sport': preset = { horsepower: 600, tractionControl: 0.5, esp: 0.5 }; break;
        case 'race': preset = { horsepower: 800, tractionControl: 0.2, esp: 0.2 }; break;
        case 'drift': preset = { horsepower: 700, tractionControl: 0.0, esp: 0.0, brakeBias: 0.8 }; break;
      }
      return { settings: { ...state.settings, driveMode: mode, ...preset } };
    }),
}));
