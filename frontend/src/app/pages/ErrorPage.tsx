import { useEffect, useState } from 'react';
import { Home, ArrowLeft, RefreshCw, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../contexts/PageTitleContext';

// ── 500 — Overheating rack ─────────────────────────────────────────────────

const OverheatRack = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);

  const leds = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const redAt = Math.min(Math.floor(tick / 1.5), leds.length);
  const blink = tick > 14 && tick % 2 === 0;

  return (
    <div className="relative flex h-52 w-32 items-end justify-center">
      <div className="absolute bottom-0 left-1/2 h-0.5 w-48 -translate-x-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
      <svg viewBox="0 0 60 110" width="56" height="104">
        <rect
          x="4"
          y="2"
          width="52"
          height="106"
          rx="3"
          fill="#374151"
          stroke="#4B5563"
          strokeWidth="1"
        />
        <rect x="8" y="6" width="44" height="98" rx="1" fill="#1F2937" />
        {leds.map((i) => {
          const isRed = i < redAt;
          const color = isRed ? (blink ? '#ef4444' : '#dc2626') : '#6B7280';
          return (
            <g key={i}>
              <rect
                x="10"
                y={10 + i * 10}
                width="40"
                height="8"
                rx="1"
                fill="#374151"
                stroke="#4B5563"
                strokeWidth="0.5"
              />
              <circle
                cx="45"
                cy={14 + i * 10}
                r="2.5"
                fill={color}
                style={isRed ? { filter: 'drop-shadow(0 0 3px #ef4444)' } : undefined}
              />
              <rect x="12" y={11 + i * 10} width="20" height="6" rx="0.5" fill="#111827" />
            </g>
          );
        })}
        <rect x="4" y="2" width="4" height="106" rx="1" fill="#4B5563" />
        <rect x="52" y="2" width="4" height="106" rx="1" fill="#4B5563" />
      </svg>
      {/* Heat shimmer */}
      {redAt >= 6 && (
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2">
          <style>{`
            @keyframes rs-heat {
              0%,100% { transform: scaleX(1) translateY(0); opacity: 0.3; }
              50% { transform: scaleX(1.3) translateY(-6px); opacity: 0.15; }
            }
          `}</style>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute rounded-full bg-red-500/20 blur-lg"
              style={{
                width: 28 + i * 8,
                height: 28 + i * 8,
                left: `${(i - 1) * 10}px`,
                animation: `rs-heat ${0.8 + i * 0.2}s ease-in-out ${i * 150}ms infinite`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── 503 — Disconnected cable ──────────────────────────────────────────────

const DisconnectedCable = () => {
  const [phase, setPhase] = useState<'connected' | 'pulling' | 'out' | 'dangling'>('connected');

  useEffect(() => {
    const seq = () => {
      setPhase('connected');
      setTimeout(() => setPhase('pulling'), 800);
      setTimeout(() => setPhase('out'), 1600);
      setTimeout(() => setPhase('dangling'), 2000);
      setTimeout(seq, 4200);
    };
    seq();
  }, []);

  return (
    <div className="relative flex h-52 w-40 items-center justify-center">
      {/* Switch body */}
      <svg viewBox="0 0 120 70" width="140" height="80">
        {/* Main switch */}
        <rect
          x="8"
          y="16"
          width="90"
          height="38"
          rx="4"
          fill="#374151"
          stroke="#4B5563"
          strokeWidth="1"
        />
        <rect x="12" y="20" width="82" height="30" rx="2" fill="#1F2937" />
        {/* Ports */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <rect
              x={16 + i * 13}
              y="24"
              width="9"
              height="7"
              rx="1"
              fill={i === 2 ? '#111827' : '#374151'}
              stroke="#4B5563"
              strokeWidth="0.5"
            />
            <circle
              cx={20 + i * 13}
              cy="36"
              r="2"
              fill={i === 2 ? '#6B7280' : '#10b981'}
              style={i !== 2 ? { filter: 'drop-shadow(0 0 2px #10b981)' } : undefined}
            />
          </g>
        ))}
        {/* Labels */}
        <rect x="12" y="40" width="82" height="6" rx="1" fill="#111827" />
        {/* Cable plug — port 2 */}
        <g
          style={{
            transform:
              phase === 'connected'
                ? 'translateX(0)'
                : phase === 'pulling'
                  ? 'translateX(6px)'
                  : 'translateX(30px)',
            transition:
              phase === 'pulling'
                ? 'transform 0.8s ease-in'
                : phase === 'out'
                  ? 'transform 0.4s ease-out'
                  : 'none',
          }}
        >
          <rect x="100" y="25" width="14" height="5" rx="1" fill="#6B7280" />
          <rect x="112" y="26" width="3" height="3" rx="0.5" fill="#4B5563" />
        </g>
      </svg>
      {/* Dangling cable */}
      {(phase === 'out' || phase === 'dangling') && (
        <div className="absolute top-1/2 right-0 -translate-y-1/2">
          <style>{`
            @keyframes rs-dangle { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
          `}</style>
          <div
            style={{
              animation: phase === 'dangling' ? 'rs-dangle 1.2s ease-in-out infinite' : 'none',
            }}
          >
            <svg viewBox="0 0 12 32" width="12" height="32">
              <path
                d="M6 0 C6 8 2 12 6 20 C8 26 6 32 6 32"
                stroke="#6B7280"
                strokeWidth="2"
                fill="none"
              />
              <rect x="2" y="28" width="8" height="4" rx="1" fill="#4B5563" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 403 / 401 — Padlock slamming shut ─────────────────────────────────────

const PadlockSlam = () => {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLocked(true), 600);
    const t2 = setTimeout(() => setLocked(false), 3000);
    const t3 = setTimeout(() => {
      setLocked(false);
    }, 3400);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!locked) {
      const t = setTimeout(() => setLocked(true), 600);
      return () => clearTimeout(t);
    }
  }, [locked]);

  return (
    <div className="relative flex h-52 w-32 items-center justify-center">
      <svg viewBox="0 0 60 80" width="72" height="96">
        {/* Shackle */}
        <g
          style={{
            transform: locked ? 'translateY(0)' : 'translateY(-14px)',
            transition: 'transform 0.3s cubic-bezier(0.25, 0, 0, 1.5)',
          }}
        >
          <path
            d="M 18 35 Q 18 10 30 10 Q 42 10 42 35"
            fill="none"
            stroke={locked ? '#ef4444' : '#6B7280'}
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
        {/* Body */}
        <rect
          x="8"
          y="35"
          width="44"
          height="36"
          rx="6"
          fill={locked ? '#374151' : '#1F2937'}
          stroke={locked ? '#ef4444' : '#4B5563'}
          strokeWidth="1.5"
        />
        {/* Keyhole */}
        <circle cx="30" cy="50" r="6" fill={locked ? '#1F2937' : '#374151'} />
        <rect x="27" y="52" width="6" height="10" rx="1" fill={locked ? '#1F2937' : '#374151'} />
        {/* Glow when locked */}
        {locked && (
          <rect
            x="8"
            y="35"
            width="44"
            height="36"
            rx="6"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1"
            style={{ filter: 'drop-shadow(0 0 4px #ef4444)', opacity: 0.5 }}
          />
        )}
      </svg>
    </div>
  );
};

// ── Error config ───────────────────────────────────────────────────────────

type ErrorCode = 500 | 503 | 403 | 401;

const ERROR_CONFIG: Record<
  ErrorCode,
  {
    title: string;
    subtitle: string;
    description: string;
    scene: React.ComponentType;
    cta?: {
      label: string;
      icon: React.ElementType;
      href?: string;
      action?: 'back' | 'reload' | 'login';
    };
  }
> = {
  500: {
    title: '500',
    subtitle: 'Internal server error',
    description:
      'Something caught fire in the datacenter. The team has been paged — try again in a moment.',
    scene: OverheatRack,
    cta: { label: 'Reload', icon: RefreshCw, action: 'reload' },
  },
  503: {
    title: '503',
    subtitle: 'Service unavailable',
    description:
      'The backend is unreachable. Check that `make up` is running or wait for the stack to come back.',
    scene: DisconnectedCable,
    cta: { label: 'Reload', icon: RefreshCw, action: 'reload' },
  },
  403: {
    title: '403',
    subtitle: 'Access denied',
    description: "You don't have permission to access this resource. Contact your administrator.",
    scene: PadlockSlam,
    cta: { label: 'Go Back', icon: ArrowLeft, action: 'back' },
  },
  401: {
    title: '401',
    subtitle: 'Authentication required',
    description: 'You need to sign in to access this page.',
    scene: PadlockSlam,
    cta: { label: 'Sign In', icon: LogIn, action: 'login' },
  },
};

// ── Page ───────────────────────────────────────────────────────────────────

export const ErrorPage = ({ code }: { code?: ErrorCode }) => {
  const navigate = useNavigate();
  const errorCode = code ?? 500;
  const cfg = ERROR_CONFIG[errorCode] ?? ERROR_CONFIG[500];
  const Scene = cfg.scene;

  usePageTitle(`${cfg.title} — ${cfg.subtitle}`);

  const handleCta = () => {
    if (!cfg.cta) return;
    if (cfg.cta.action === 'back') window.history.back();
    else if (cfg.cta.action === 'reload') window.location.reload();
    else if (cfg.cta.action === 'login') navigate('/auth/signin');
    else if (cfg.cta.href) navigate(cfg.cta.href);
  };

  const CfgIcon = cfg.cta?.icon;

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center px-6 text-center">
      <Scene />

      <p className="text-brand-100 dark:text-brand-500/20 mt-2 text-8xl font-black">{cfg.title}</p>
      <h1 className="-mt-4 text-2xl font-bold text-gray-900 capitalize dark:text-white">
        {cfg.subtitle}
      </h1>
      <p className="mt-3 max-w-sm text-sm text-gray-500 dark:text-gray-400">{cfg.description}</p>

      <div className="mt-8 flex gap-3">
        <a
          href="/"
          className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </a>
        {cfg.cta && CfgIcon && (
          <button
            onClick={handleCta}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <CfgIcon className="h-4 w-4" />
            {cfg.cta.label}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Convenience exports ────────────────────────────────────────────────────

export const Error500Page = () => <ErrorPage code={500} />;
export const Error503Page = () => <ErrorPage code={503} />;
export const Error403Page = () => <ErrorPage code={403} />;
export const Error401Page = () => <ErrorPage code={401} />;
