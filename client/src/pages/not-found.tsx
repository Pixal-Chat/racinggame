import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-neon-pink p-4">
      <div className="text-center space-y-6 crt-overlay">
        <h1 className="text-6xl font-arcade glitch" data-text="404">404</h1>
        <p className="font-mono text-xl text-white/80">TRACK NOT FOUND</p>
        <Link href="/" className="inline-block mt-8 px-8 py-3 bg-primary text-black font-arcade hover:bg-white hover:scale-105 transition-all">
          RETURN TO PIT
        </Link>
      </div>
      
      <style>{`
        .glitch {
          position: relative;
        }
        .glitch::before,
        .glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .glitch::before {
          left: 2px;
          text-shadow: -1px 0 #00ffff;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-anim 5s infinite linear alternate-reverse;
        }
        .glitch::after {
          left: -2px;
          text-shadow: -1px 0 #ff00ff;
          clip: rect(44px, 450px, 56px, 0);
          animation: glitch-anim2 5s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim {
          0% { clip: rect(11px, 9999px, 81px, 0); }
          100% { clip: rect(89px, 9999px, 13px, 0); }
        }
        @keyframes glitch-anim2 {
          0% { clip: rect(65px, 9999px, 100px, 0); }
          100% { clip: rect(2px, 9999px, 11px, 0); }
        }
      `}</style>
    </div>
  );
}
