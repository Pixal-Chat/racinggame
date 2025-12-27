import RacingGame from "@/game/RacingGame";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left: 3D Game View */}
      <div className="w-[65%] h-full relative border-r-4 border-primary/20">
        <RacingGame />
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-neon-blue/50 rounded-tl-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-neon-pink/50 rounded-br-3xl pointer-events-none" />
      </div>

      {/* Right: Dashboard */}
      <div className="w-[35%] h-full">
        <Dashboard />
      </div>
    </div>
  );
}
