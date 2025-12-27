import { useGameStore } from "@/game/GameStore";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLaps } from "@/hooks/use-laps";
import { formatTime } from "@/lib/utils"; // We'll need to define this or just helper here

const formatMs = (ms: number) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const mills = Math.floor((ms % 1000));
  return `${mins}:${secs.toString().padStart(2, '0')}.${mills.toString().padStart(3, '0')}`;
};

export function Dashboard() {
  const { settings, telemetry, updateSettings, setDriveMode, toggleDRS, toggleERS } = useGameStore();
  const { data: laps } = useLaps();
  
  // Find backend best lap if available (telemetry stores session best)
  const sessionBest = telemetry.bestLapTime;
  
  return (
    <div className="h-full bg-card/95 border-l border-border flex flex-col overflow-y-auto p-6 font-mono relative z-20 shadow-2xl shadow-black">
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-2xl font-arcade text-neon-pink tracking-widest uppercase">SYSTEMS</h2>
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {/* Main Stats Display */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-black/40 p-4 rounded-lg border border-primary/30 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <Label className="text-xs text-muted-foreground mb-1 block">SPEED</Label>
          <div className="text-5xl font-arcade text-primary leading-none tracking-tighter">
            {Math.round(telemetry.speed)}
          </div>
          <div className="text-xs text-primary/80 mt-1">KM/H</div>
        </div>

        <div className="bg-black/40 p-4 rounded-lg border border-secondary/30 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-secondary/5 group-hover:bg-secondary/10 transition-colors" />
          <Label className="text-xs text-muted-foreground mb-1 block">GEAR</Label>
          <div className="text-5xl font-arcade text-secondary leading-none">
            {telemetry.gear === 0 ? "N" : telemetry.gear === -1 ? "R" : telemetry.gear}
          </div>
          <div className="text-xs text-secondary/80 mt-1">MANUAL</div>
        </div>
      </div>

      {/* Lap Times */}
      <div className="space-y-4 mb-8 bg-black/20 p-4 rounded-lg border border-border">
        <div className="flex justify-between items-end border-b border-border pb-2">
          <Label className="text-muted-foreground">CURRENT LAP</Label>
          <span className="text-xl font-mono text-white">{formatMs(telemetry.lapTime)}</span>
        </div>
        <div className="flex justify-between items-end border-b border-border pb-2">
          <Label className="text-muted-foreground">BEST SESSION</Label>
          <span className="text-xl font-mono text-neon-blue">
            {sessionBest > 0 ? formatMs(sessionBest) : "--:--.---"}
          </span>
        </div>
      </div>

      <Separator className="my-6 bg-border/50" />

      {/* Controls */}
      <div className="space-y-8 flex-1">
        {/* Drive Mode */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-primary">DRIVE MODE</Label>
          <Select value={settings.driveMode} onValueChange={(v: any) => setDriveMode(v)}>
            <SelectTrigger className="w-full bg-black/40 border-primary/30 font-mono focus:ring-primary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border font-mono">
              <SelectItem value="eco">ECO (Safe)</SelectItem>
              <SelectItem value="sport">SPORT (Balanced)</SelectItem>
              <SelectItem value="race">RACE (Aggressive)</SelectItem>
              <SelectItem value="drift">DRIFT (Low Grip)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          <ControlSlider 
            label="ENGINE POWER (HP)" 
            value={[settings.horsepower]} 
            min={100} max={1200} step={10}
            onChange={([v]) => updateSettings({ horsepower: v })}
            suffix=" HP"
          />
          
          <ControlSlider 
            label="TRACTION CONTROL (TCS)" 
            value={[settings.tractionControl * 100]} 
            min={0} max={100} step={1}
            onChange={([v]) => updateSettings({ tractionControl: v / 100 })}
            suffix="%"
            colorClass="bg-secondary"
          />
          
          <ControlSlider 
            label="STABILITY (ESP)" 
            value={[settings.esp * 100]} 
            min={0} max={100} step={1}
            onChange={([v]) => updateSettings({ esp: v / 100 })}
            suffix="%"
            colorClass="bg-secondary"
          />
          
          <ControlSlider 
            label="BRAKE BIAS (F-R)" 
            value={[settings.brakeBias * 100]} 
            min={0} max={100} step={1}
            onChange={([v]) => updateSettings({ brakeBias: v / 100 })}
            suffix="%"
          />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <ToggleBtn 
            label="DRS" 
            active={settings.drs} 
            onClick={toggleDRS} 
            color="text-neon-blue border-neon-blue"
          />
          <ToggleBtn 
            label="ERS" 
            active={settings.ers} 
            onClick={toggleERS} 
            color="text-neon-pink border-neon-pink"
          />
        </div>
      </div>
    </div>
  );
}

function ControlSlider({ label, value, min, max, step, onChange, suffix, colorClass = "bg-primary" }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-semibold tracking-wider">{label}</span>
        <span className="font-mono text-white">{value}{suffix}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onChange}
        className={cn("[&>.relative>.absolute]:bg-primary", colorClass.replace("bg-", "[&>.relative>.absolute]:bg-"))}
      />
    </div>
  );
}

function ToggleBtn({ label, active, onClick, color }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-14 rounded border-2 font-arcade text-xl transition-all duration-200 active:scale-95 shadow-lg",
        active 
          ? `bg-black ${color} shadow-[0_0_15px_rgba(var(--color-glow))]` 
          : "bg-muted/10 border-muted text-muted-foreground hover:border-white/20"
      )}
      style={active ? { textShadow: "0 0 10px currentColor", boxShadow: "inset 0 0 20px currentColor" } : {}}
    >
      {label}
    </button>
  );
}
