import { useEffect, useState } from 'react';
import { Home, ArrowLeft } from 'lucide-react';

// ── Animated falling rack ─────────────────────────────────────────────────────

const FallingRack = () => {
  const [phase, setPhase] = useState<'idle' | 'falling' | 'impact' | 'debris'>('idle');

  useEffect(() => {
    const run = () => {
      setPhase('idle');
      const t1 = setTimeout(() => setPhase('falling'), 300);
      const t2 = setTimeout(() => setPhase('impact'), 1700);
      const t3 = setTimeout(() => setPhase('debris'), 1850);
      // Loop after 5s
      const t4 = setTimeout(run, 5000);
      return [t1, t2, t3, t4];
    };
    const timers = run();
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative flex h-60 w-32 items-end justify-center overflow-visible">
      {/* Ground line */}
      <div className="absolute bottom-0 left-1/2 h-0.5 w-48 -translate-x-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />

      {/* Rack SVG */}
      {(phase === 'idle' || phase === 'falling') && (
        <div
          style={{
            transition: phase === 'falling' ? 'transform 1.4s cubic-bezier(0.36,0,1,1)' : 'none',
            transform:
              phase === 'falling'
                ? 'translateY(180px) rotate(14deg)'
                : 'translateY(-20px) rotate(0deg)',
            opacity: phase === 'idle' ? 0 : 1,
          }}
        >
          <svg viewBox="0 0 60 120" width="56" height="112">
            <rect
              x="4"
              y="2"
              width="52"
              height="116"
              rx="3"
              fill="#374151"
              stroke="#4B5563"
              strokeWidth="1"
            />
            <rect x="8" y="6" width="44" height="108" rx="1" fill="#1F2937" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <g key={i}>
                <rect
                  x="10"
                  y={10 + i * 11}
                  width="40"
                  height="9"
                  rx="1"
                  fill="#374151"
                  stroke="#4B5563"
                  strokeWidth="0.5"
                />
                <circle
                  cx="45"
                  cy={14.5 + i * 11}
                  r="2"
                  fill={i % 3 === 0 ? '#10b981' : '#6B7280'}
                />
                <rect x="12" y={12 + i * 11} width="22" height="5" rx="0.5" fill="#111827" />
              </g>
            ))}
            <rect x="4" y="2" width="4" height="116" rx="1" fill="#4B5563" />
            <rect x="52" y="2" width="4" height="116" rx="1" fill="#4B5563" />
          </svg>
        </div>
      )}

      {/* Impact flash */}
      {phase === 'impact' && (
        <div className="absolute bottom-0 h-10 w-40 rounded-full bg-amber-400/30 blur-xl" />
      )}

      {/* Debris + smoke */}
      {phase === 'debris' && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <style>{`
            @keyframes rs-debris { from { transform: translateY(-16px) rotate(0deg); } to { transform: translateY(0) rotate(var(--r)); } }
            @keyframes rs-smoke  { from { transform: translateY(0) scale(0.5); opacity: 0.5; } to { transform: translateY(-50px) scale(2); opacity: 0; } }
          `}</style>
          {[
            { w: 32, h: 10, r: '-20deg', left: '-40px' },
            { w: 44, h: 44, r: '50deg', left: '-8px' },
            { w: 24, h: 10, r: '28deg', left: '18px' },
            { w: 20, h: 8, r: '-35deg', left: '32px' },
          ].map((d, i) => (
            <div
              key={i}
              className="absolute rounded-sm bg-gray-600 dark:bg-gray-500"
              style={{
                width: d.w,
                height: d.h,
                bottom: 0,
                left: d.left,
                ['--r' as string]: d.r,
                animation: `rs-debris 0.25s ease-out ${i * 20}ms both`,
              }}
            />
          ))}
          {[0, 1, 2].map((i) => (
            <div
              key={`s${i}`}
              className="absolute rounded-full bg-gray-400/20 blur-md"
              style={{
                width: 24 + i * 16,
                height: 24 + i * 16,
                bottom: 0,
                left: `${(i - 1) * 22}px`,
                animation: `rs-smoke 0.9s ease-out ${i * 100}ms both`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── 404 Page ──────────────────────────────────────────────────────────────────

export const NotFoundPage = () => (
  <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
    <FallingRack />

    <p className="text-brand-100 dark:text-brand-500/20 mt-2 text-8xl font-black">404</p>
    <h1 className="-mt-4 text-2xl font-bold text-gray-900 dark:text-white">Rack not found</h1>
    <p className="mt-3 max-w-sm text-sm text-gray-500 dark:text-gray-400">
      Sorry, the page you're looking for doesn't exist — or it fell off the rack.
    </p>
    <div className="mt-8 flex gap-3">
      <a
        href="/"
        className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
      >
        <Home className="h-4 w-4" /> Go to Dashboard
      </a>
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4" /> Go Back
      </button>
    </div>
  </div>
);
