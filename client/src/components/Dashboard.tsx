import { useGameStore } from "@/game/GameStore";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLaps } from "@/hooks/use-laps";

const formatMs = (ms: number) => {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const mills = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${mills.toString().padStart(3, '0')}`;
};

export function Dashboard() {
  const { settings, telemetry, updateSettings, setDriveMode, toggleDRS, toggleERS } = useGameStore();
  const { data: laps } = useLaps();

  const sessionBest = telemetry.bestLapTime;

  return (
    <div className="h-full bg-card/95 border-l border-border flex flex-col overflow-y-auto p-5 font-mono relative z-20 shadow-2xl shadow-black">
      <div className="mb-6 text-center space-y-2">
        <h2 className="text-xl font-arcade text-neon-pink tracking-widest uppercase">SYSTEMS</h2>
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-black/40 p-3 rounded-lg border border-primary/30 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <Label className="text-xs text-muted-foreground mb-1 block">SPEED</Label>
          <div className="text-4xl font-arcade text-primary leading-none tracking-tighter">
            {Math.round(telemetry.speed)}
          </div>
          <div className="text-xs text-primary/80 mt-1">KM/H</div>
        </div>

        <div className="bg-black/40 p-3 rounded-lg border border-secondary/30 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-secondary/5 group-hover:bg-secondary/10 transition-colors" />
          <Label className="text-xs text-muted-foreground mb-1 block">GEAR</Label>
          <div className="text-4xl font-arcade text-secondary leading-none">
            {telemetry.gear === 0 ? "N" : telemetry.gear === -1 ? "R" : telemetry.gear}
          </div>
          <div className="text-xs text-secondary/80 mt-1">AUTO</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <RpmBar rpm={telemetry.rpm} />
        <div className="bg-black/30 p-2 rounded border border-border text-center">
          <Label className="text-[10px] text-muted-foreground block">LAP</Label>
          <div className="text-lg font-arcade text-white">{telemetry.currentLap}</div>
        </div>
        <div className="bg-black/30 p-2 rounded border border-border text-center">
          <Label className="text-[10px] text-muted-foreground block">DRIFT</Label>
          <div className="text-lg font-arcade text-white">
            {Math.abs(telemetry.driftAngle * 57.3).toFixed(0)}°
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6 bg-black/20 p-3 rounded-lg border border-border">
        <div className="flex justify-between items-end border-b border-border pb-2">
          <Label className="text-muted-foreground text-xs">CURRENT LAP</Label>
          <span className="text-lg font-mono text-white">{formatMs(telemetry.lapTime)}</span>
        </div>
        <div className="flex justify-between items-end">
          <Label className="text-muted-foreground text-xs">BEST SESSION</Label>
          <span className="text-lg font-mono text-neon-blue">
            {sessionBest > 0 ? formatMs(sessionBest) : "--:--.---"}
          </span>
        </div>
      </div>

      <Separator className="my-4 bg-border/50" />

      <div className="space-y-6 flex-1">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-primary">DRIVE MODE</Label>
          <Select value={settings.driveMode} onValueChange={(v: string) => setDriveMode(v as 'eco' | 'sport' | 'race' | 'drift')}>
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

        <div className="space-y-4">
          <ControlSlider
            label="ENGINE POWER"
            value={[settings.horsepower]}
            min={100} max={1200} step={10}
            onChange={([v]: number[]) => updateSettings({ horsepower: v })}
            suffix=" HP"
          />
          <ControlSlider
            label="TRACTION CTRL (TCS)"
            value={[settings.tractionControl * 100]}
            min={0} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ tractionControl: v / 100 })}
            suffix="%"
            colorClass="bg-secondary"
          />
          <ControlSlider
            label="ABS"
            value={[settings.abs * 100]}
            min={0} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ abs: v / 100 })}
            suffix="%"
            colorClass="bg-secondary"
          />
          <ControlSlider
            label="STABILITY (ESP)"
            value={[settings.esp * 100]}
            min={0} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ esp: v / 100 })}
            suffix="%"
            colorClass="bg-secondary"
          />
          <ControlSlider
            label="STEERING SENS"
            value={[settings.steeringSensitivity * 100]}
            min={10} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ steeringSensitivity: v / 100 })}
            suffix="%"
          />
          <ControlSlider
            label="BRAKE BIAS (F-R)"
            value={[settings.brakeBias * 100]}
            min={0} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ brakeBias: v / 100 })}
            suffix="%"
          />
          <ControlSlider
            label="SUSPENSION"
            value={[settings.suspension * 100]}
            min={0} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ suspension: v / 100 })}
            suffix="%"
          />
          <ControlSlider
            label="DOWNFORCE"
            value={[settings.downforce * 100]}
            min={0} max={100} step={1}
            onChange={([v]: number[]) => updateSettings({ downforce: v / 100 })}
            suffix="%"
          />
          <ControlSlider
            label="CAR WEIGHT"
            value={[settings.weight]}
            min={800} max={2000} step={10}
            onChange={([v]: number[]) => updateSettings({ weight: v })}
            suffix=" kg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
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

function RpmBar({ rpm }: { rpm: number }) {
  const maxRpm = 9000;
  const pct = Math.min(rpm / maxRpm, 1);
  const barColor = pct > 0.85 ? "bg-red-500" : pct > 0.6 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="bg-black/30 p-2 rounded border border-border text-center">
      <Label className="text-[10px] text-muted-foreground block">RPM</Label>
      <div className="text-sm font-arcade text-white">{Math.round(rpm)}</div>
      <div className="w-full h-1.5 bg-black/50 rounded mt-1 overflow-hidden">
        <div className={cn("h-full rounded transition-all", barColor)} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function ControlSlider({ label, value, min, max, step, onChange, suffix, colorClass = "bg-primary" }: {
  label: string;
  value: number[];
  min: number;
  max: number;
  step: number;
  onChange: (v: number[]) => void;
  suffix: string;
  colorClass?: string;
}) {
  return (
    <div className="space-y-2">
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

function ToggleBtn({ label, active, onClick, color }: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-12 rounded border-2 font-arcade text-lg transition-all duration-200 active:scale-95 shadow-lg",
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
