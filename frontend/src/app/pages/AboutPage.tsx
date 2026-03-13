import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Github,
  BookOpen,
  ExternalLink,
  Code2,
  RefreshCw,
  X,
  Heart,
  Coffee,
  Bot,
} from 'lucide-react';
import { usePageTitle } from '../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from './templates/EmptyPage';
import { AppIcon, getIconContainerClass, getIconSize } from '../components/AppIcon';
import { useTheme } from '@src/context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Quote {
  text: string;
  character: string;
  source: string;
}

// ── "Why I built Rackscope" content ──────────────────────────────────────────

const STORY = {
  fr: {
    title: "Pourquoi j'ai développé Rackscope",
    paragraphs: [
      "Rackscope est né d'un besoin réel.",
      "Au départ, ce n'était qu'un simple script destiné à répondre à une problématique très concrète. Puis le script a grandi. Il est devenu une application. J'y ai ajouté une interface utilisateur pour la rendre exploitable au quotidien.",
      "Avec le temps, les fonctionnalités se sont accumulées, jusqu'à former un bloc monolithique difficile à maintenir et à faire évoluer. J'ai alors décidé de tout refactoriser, en adoptant des technologies modernes et une architecture plus modulaire, plus claire, et durable.",
      "Mais Rackscope est aussi né d'un double constat.",
      "Le premier : je n'ai trouvé aucun équivalent open source réellement satisfaisant. La majorité des solutions existantes sont payantes, fermées, ou imposent leur propre modèle de données. Or je crois profondément au logiciel libre et à l'indépendance technique.",
      "Le second constat est plus direct. Sur le terrain, les besoins sont clairs. Les utilisateurs savent ce qu'ils attendent. Les problèmes sont identifiés. Les demandes sont formulées.",
      "Il arrive parfois que l'innovation suive des chemins mystérieux, loin des réalités opérationnelles. Pendant que certains imaginent des solutions élégantes à des problèmes théoriques, d'autres attendent simplement un outil qui fonctionne.",
      'Rackscope est né de cette attente.',
    ],
  },
  en: {
    title: 'Why I Built Rackscope',
    paragraphs: [
      'Rackscope was born out of a real need.',
      'At first, it was just a simple script designed to address a very concrete problem. Then the script grew. It became an application. I added a user interface to make it usable on a daily basis.',
      'Over time, features accumulated until they formed a monolithic block that was difficult to maintain and evolve. I then decided to refactor everything, adopting modern technologies and a more modular, clear, and sustainable architecture.',
      'But Rackscope was also born from a double observation.',
      'The first: I could not find any truly satisfying open-source equivalent. The vast majority of existing solutions are either paid, closed-source, or impose their own data model. I believe deeply in free software and technical independence.',
      'The second observation is more direct. In the field, needs are clear. Users know what they expect. Problems are identified. Requests are made.',
      'It sometimes happens that innovation follows mysterious paths, far from operational realities. While some are designing elegant solutions to theoretical problems, others are simply waiting for a tool that works.',
      'Rackscope was born from that wait.',
    ],
  },
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

const AUTO_SHUFFLE_MS = 15_000;

const useRandomQuote = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [current, setCurrent] = useState<Quote | null>(null);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickNext = useCallback((prev: Quote | null, list: Quote[]) => {
    if (list.length < 2) return list[0] ?? null;
    let next: Quote;
    do {
      next = list[Math.floor(Math.random() * list.length)];
    } while (next.text === prev?.text);
    return next;
  }, []);

  const animatedSwitch = useCallback(
    (list: Quote[]) => {
      setFading(true);
      setTimeout(() => {
        setCurrent((prev) => pickNext(prev, list));
        setFading(false);
      }, 200);
    },
    [pickNext]
  );

  useEffect(() => {
    fetch('/data/quotes.json')
      .then((r) => r.json())
      .then((data: Quote[]) => {
        setQuotes(data);
        setCurrent(data[Math.floor(Math.random() * data.length)]);
      })
      .catch(() => {
        const fb: Quote = {
          text: 'Do. Or do not. There is no try.',
          character: 'Yoda',
          source: 'Star Wars: The Empire Strikes Back',
        };
        setQuotes([fb]);
        setCurrent(fb);
      });
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;
    timerRef.current = setInterval(() => animatedSwitch(quotes), AUTO_SHUFFLE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quotes, animatedSwitch]);

  const shuffle = useCallback(() => {
    if (quotes.length < 2) return;
    // Restart the interval so a manual shuffle doesn't cause an immediate auto-skip
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => animatedSwitch(quotes), AUTO_SHUFFLE_MS);
    }
    animatedSwitch(quotes);
  }, [quotes, animatedSwitch]);

  return { quote: current, shuffle, fading };
};

// ── Components ────────────────────────────────────────────────────────────────

const TECH_STACK = [
  { name: 'React 19', color: '#61dafb', desc: 'Frontend' },
  { name: 'TypeScript', color: '#3178c6', desc: 'Type safety' },
  { name: 'Tailwind v4', color: '#06b6d4', desc: 'Styling' },
  { name: 'FastAPI', color: '#009688', desc: 'Backend' },
  { name: 'Prometheus', color: '#e6522c', desc: 'Telemetry' },
  { name: 'Python 3.12', color: '#ffd43b', desc: 'Runtime' },
];

const ExtLink = ({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-700/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
  >
    {Icon && <Icon className="h-4 w-4 shrink-0" />}
    <span>{children}</span>
    <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-50" />
  </a>
);

// ── Quote block ───────────────────────────────────────────────────────────────

const QuoteBlock = ({
  quote,
  onShuffle,
  fading,
}: {
  quote: Quote | null;
  onShuffle: () => void;
  fading: boolean;
}) => (
  <div className="flex h-full flex-col justify-between rounded-xl border border-gray-100 bg-gray-50/60 p-5 dark:border-gray-700/50 dark:bg-gray-800/40">
    <div style={{ transition: 'opacity 0.2s ease', opacity: fading ? 0 : 1 }} className="flex-1">
      <div className="text-brand-200 dark:text-brand-900 mb-2 font-serif text-5xl leading-none select-none">
        &ldquo;
      </div>
      {quote ? (
        <>
          <p className="text-sm leading-relaxed text-gray-600 italic dark:text-gray-300">
            {quote.text}
          </p>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              — {quote.character}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{quote.source}</p>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      )}
    </div>
    <button
      onClick={onShuffle}
      className="mt-4 flex items-center gap-1.5 self-end rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      title="Another quote (auto-shuffles every 15s)"
    >
      <RefreshCw className={`h-3 w-3 ${fading ? 'animate-spin' : ''}`} />
      shuffle · 15s
    </button>
  </div>
);

// ── "Why I built" modal ───────────────────────────────────────────────────────

const StoryModal = ({ onClose }: { onClose: () => void }) => {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const story = STORY[lang];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">{story.title}</h2>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              {(['fr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 text-xs font-semibold uppercase transition-colors ${
                    lang === l
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {story.paragraphs.map((p, i) => (
              <p
                key={i}
                className={
                  i === 0 || i === 3 ? 'font-semibold text-gray-800 dark:text-white/90' : ''
                }
              >
                {p}
              </p>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800 dark:text-gray-600">
            <span>— Thomas Bourcey / SckyzO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Konami challenge modal (interactive OTP — green/red live feedback) ─────────

const KONAMI_SEQ = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];
const KONAMI_DISPLAY = ['↑', '↑', '↓', '↓', '←', '→', '←', '→', 'B', 'A'];

const useKonamiProgress = (onSuccess: () => void) => {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const progressRef = useRef(0);
  const onSuccessRef = useRef(onSuccess);
  // Ref update avoids adding onSuccess to the keydown effect's deps (which would re-register the listener on every render)
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    let errTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: KeyboardEvent) => {
      if (e.key === KONAMI_SEQ[progressRef.current]) {
        progressRef.current += 1;
        setProgress(progressRef.current);
        setError(false);
        if (progressRef.current === KONAMI_SEQ.length) {
          progressRef.current = 0;
          setProgress(0);
          onSuccessRef.current();
        }
      } else {
        setError(true);
        if (errTimer) clearTimeout(errTimer);
        errTimer = setTimeout(() => {
          progressRef.current = 0;
          setProgress(0);
          setError(false);
        }, 700);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (errTimer) clearTimeout(errTimer);
    };
  }, []);

  return { progress, error };
};

const KonamiChallengeModal = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { progress, error } = useKonamiProgress(() => {
    onSuccess();
    onClose();
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-end justify-center pb-10 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'konami-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <style>{`
          @keyframes konami-in { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        `}</style>

        <div className="text-center">
          <p className="text-base font-bold text-gray-900 dark:text-white">
            🎮 Enter the Konami Code
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Type the sequence to unlock the Easter eggs list
          </p>
        </div>

        <div
          className="mt-5 flex items-center justify-center gap-1.5"
          style={error ? { animation: 'shake 0.4s ease' } : undefined}
        >
          {KONAMI_DISPLAY.map((char, i) => {
            let cls =
              'border-gray-200 bg-gray-50 text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600';
            if (i < progress)
              cls =
                'border-green-400 bg-green-50 text-green-600 scale-105 dark:border-green-500/60 dark:bg-green-500/10 dark:text-green-400';
            if (error && i >= progress && i < progress + 1)
              cls =
                'border-red-400 bg-red-50 text-red-500 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-400';
            return (
              <div
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 font-mono text-sm font-bold transition-all duration-150 ${cls}`}
              >
                {i < progress ? char : '?'}
              </div>
            );
          })}
        </div>

        <div className="mt-3 min-h-[20px] text-center">
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">Wrong key — try again!</p>
          )}
          {progress > 0 && !error && (
            <p className="text-xs text-green-600 dark:text-green-400">
              {progress} / {KONAMI_SEQ.length} correct{progress > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-gray-600">
          Esc ou clic en dehors pour fermer
        </p>
      </div>
    </div>
  );
};

// ── Easter Eggs modal ─────────────────────────────────────────────────────────

const EGGS = [
  {
    combo: '↑ ↑ ↓ ↓ ← → ← → B A',
    where: 'About page',
    title: 'Easter Egg list',
    desc: 'You found it. This very modal.',
    icon: '🥚',
  },
  {
    combo: '×5 clicks on the logo',
    where: 'Sidebar (any page)',
    title: 'Matrix mode',
    desc: 'Green rain of characters fills the screen. Click or Escape to exit.',
    icon: '🟩',
  },
  {
    combo: 'Shift + click on the logo',
    where: 'Sidebar (any page)',
    title: 'ASCII boot sequence',
    desc: 'BIOS POST, memory check, Prometheus heartbeat... all systems nominal. o7',
    icon: '💾',
  },
  {
    combo: 'Navigate to an unknown URL',
    where: 'Anywhere',
    title: 'Rack falling',
    desc: 'A miniature rack plummets with gravity, hits the ground and explodes into debris.',
    icon: '🗄️',
  },
  {
    combo: 'Click on "SC" badge ×3',
    where: 'About page → Credits',
    title: 'Developer spotted',
    desc: 'The "SC" initials reveal the face behind the code.',
    icon: '👤',
  },
  {
    combo: 'Type  h e l p',
    where: 'Any page',
    title: 'Hidden terminal',
    desc: 'A retro datacenter terminal with very questionable commands.',
    icon: '💻',
  },
  {
    combo: 'Type  t o u l o u s e',
    where: 'Any page',
    title: 'Grand Sud Easter Egg',
    desc: '🔴⚫ Scientific proof that Stade Toulousain is the greatest club in the known universe. FR/EN toggle included.',
    icon: '🏉',
  },
];

const EasterEggsModal = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥚</span>
            <h2 className="font-bold text-gray-900 dark:text-white">Secret Easter Eggs</h2>
            <span className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {EGGS.length} found
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="divide-y divide-gray-100 px-2 py-2 dark:divide-gray-800">
          {EGGS.map((egg) => (
            <div key={egg.title} className="flex items-start gap-4 rounded-xl px-4 py-3">
              <span className="mt-0.5 text-2xl">{egg.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{egg.title}</p>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {egg.combo}
                  </code>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{egg.desc}</p>
                <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-600">
                  📍 {egg.where}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-600">
            Press{' '}
            <kbd className="rounded border border-gray-200 px-1 py-0.5 font-mono text-[10px] dark:border-gray-700">
              Esc
            </kbd>{' '}
            or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Developer card modal ──────────────────────────────────────────────────────

const DEV_QUOTES = [
  {
    text: "Roads? Where we're going, we don't need roads.",
    from: 'Doc Brown — Back to the Future',
  },
  { text: "I'll be back.", from: 'T-800 — The Terminator' },
  { text: 'Do. Or do not. There is no try.', from: 'Yoda — The Empire Strikes Back' },
  { text: 'There is no spoon.', from: 'Spoon Boy — The Matrix' },
  { text: 'Hack the planet!', from: 'Cereal Killer — Hackers' },
  { text: 'Hasta la vista, baby.', from: 'T-800 — Terminator 2' },
];

const DeveloperCardModal = ({ onClose }: { onClose: () => void }) => {
  const devQuote = DEV_QUOTES[Math.floor(Math.random() * DEV_QUOTES.length)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="border-brand-200 dark:border-brand-700/40 relative w-full max-w-sm overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'dev-card-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <style>{`
          @keyframes dev-card-in {
            from { transform: scale(0.7) translateY(40px); opacity: 0; }
            to   { transform: scale(1) translateY(0);     opacity: 1; }
          }
        `}</style>

        <div className="from-brand-500 to-brand-700 relative overflow-hidden bg-gradient-to-br px-6 py-8 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-10">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-white"
                style={{
                  width: `${60 + i * 50}px`,
                  height: `${60 + i * 50}px`,
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                }}
              />
            ))}
          </div>
          <div className="relative mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wider text-white uppercase">
            <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-green-300" />
            Developer Spotted
          </div>
          <div
            className="relative mx-auto mb-3 overflow-hidden rounded-2xl"
            style={{ width: 180, height: 180 }}
          >
            <img
              src="/assets/peepoodo_small.png"
              alt="peepoodo"
              className="h-full w-full object-cover"
            />
          </div>
          <p className="text-xl font-black text-white">Thomas Bourcey</p>
          <p className="text-brand-200 mt-0.5 text-sm">aka SckyzO — creator & maintainer</p>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm leading-relaxed text-gray-600 italic dark:text-gray-300">
              &ldquo;{devQuote.text}&rdquo;
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
              — {devQuote.from}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <a
              href="https://github.com/SckyzO"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 flex items-center gap-1.5 text-sm hover:underline"
            >
              <Github className="h-4 w-4" />
              github.com/SckyzO
            </a>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const AboutPage = () => {
  usePageTitle('About');
  const { iconId, iconBg } = useTheme();
  const { quote, shuffle, fading } = useRandomQuote();
  const [showStory, setShowStory] = useState(false);
  const [showEggs, setShowEggs] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [showKonami, setShowKonami] = useState(false);
  const [konamiBtn, setKonamiBtn] = useState(false);
  const [avatarClicks, setAvatarClicks] = useState(0);
  const avatarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownHint = useRef(false);

  // Trigger the Konami challenge modal on the first meaningful keypress on this page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (hasShownHint.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (
        [
          'Escape',
          'Tab',
          'Shift',
          'CapsLock',
          'F1',
          'F2',
          'F3',
          'F4',
          'F5',
          'F6',
          'F7',
          'F8',
          'F9',
          'F10',
          'F11',
          'F12',
        ].includes(e.key)
      )
        return;
      hasShownHint.current = true;
      setShowKonami(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleAvatarClick = useCallback(() => {
    if (avatarTimer.current) clearTimeout(avatarTimer.current);
    const next = avatarClicks + 1;
    setAvatarClicks(next);
    if (next >= 3) {
      setAvatarClicks(0);
      setShowDev(true);
    } else {
      avatarTimer.current = setTimeout(() => setAvatarClicks(0), 1500);
    }
  }, [avatarClicks]);

  return (
    <>
      {showStory && <StoryModal onClose={() => setShowStory(false)} />}
      {showEggs && <EasterEggsModal onClose={() => setShowEggs(false)} />}
      {showDev && <DeveloperCardModal onClose={() => setShowDev(false)} />}
      {showKonami && (
        <KonamiChallengeModal
          onClose={() => {
            setShowKonami(false);
            setKonamiBtn(true);
          }}
          onSuccess={() => {
            setShowKonami(false);
            setKonamiBtn(false);
            setShowEggs(true);
          }}
        />
      )}
      {/* Fixed button persists after the Konami modal closes — bottom-16 avoids
          the toast container at bottom-4 */}
      {konamiBtn && !showKonami && !showEggs && (
        <button
          onClick={() => {
            setShowKonami(true);
            setKonamiBtn(false);
          }}
          className="hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-700/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 fixed right-4 bottom-16 z-[9990] flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg transition-all dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          style={{ animation: 'konami-btn-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <style>{`@keyframes konami-btn-in { from{transform:translateX(50px);opacity:0} to{transform:translateX(0);opacity:1} }`}</style>
          🎮 Enter Konami Code
        </button>
      )}

      <div className="space-y-5">
        <PageHeader
          title="About"
          breadcrumb={<PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />}
        />

        {/* ── Hero card ───────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="relative overflow-hidden px-8 py-10">
            <div className="pointer-events-none absolute inset-0 opacity-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="border-brand-500 absolute rounded-full border-2"
                  style={{
                    width: `${80 + i * 60}px`,
                    height: `${80 + i * 60}px`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>

            {/* flexBasis percentages below create a 2/3 + 1/3 split that collapses
                to a single column on mobile — Tailwind alone can't express fractional flex-basis */}
            <div className="relative flex flex-col gap-8 md:flex-row md:items-stretch">
              <div
                className="flex min-w-0 flex-1 items-start gap-6 md:w-0"
                style={{ flexBasis: '66.666%' }}
              >
                <div className={`${getIconContainerClass(iconBg, 'hero')} shadow-lg`}>
                  <AppIcon id={iconId} className={getIconSize(iconBg, 'hero')} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                    Rackscope
                  </h1>
                  <p className="mt-1 text-base text-gray-500 dark:text-gray-400">
                    Prometheus-first physical infrastructure monitoring dashboard
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    A visualization layer for data centers and HPC environments —
                    <strong className="text-gray-700 dark:text-gray-300">
                      {' '}
                      Site → Room → Aisle → Rack → Device → Instance
                    </strong>
                    . Powered entirely by Prometheus : live PromQL queries, no internal time-series
                    database, no CMDB ownership, no vendor lock-in. Template-driven, file-based YAML
                    config, GitOps-friendly. Built for NOC operators, sysadmins, and HPC teams who
                    need a physical view of their infrastructure — not another Grafana plugin.
                  </p>
                  <button
                    onClick={() => setShowStory(true)}
                    className="group border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/15 mt-5 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all"
                    style={{ animation: 'story-pulse 3s ease-in-out infinite' }}
                  >
                    <style>{`@keyframes story-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(70,95,255,0)} 50%{box-shadow:0 0 0 4px rgba(70,95,255,0.15)} }`}</style>
                    ✨ Why I built Rackscope
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    <span className="bg-brand-100 text-brand-500 dark:bg-brand-500/20 ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                      fun to read
                    </span>
                  </button>
                </div>
              </div>

              <div className="hidden w-px self-stretch bg-gray-100 md:block dark:bg-gray-800" />
              <div className="h-px w-full bg-gray-100 md:hidden dark:bg-gray-800" />
              <div
                className="w-full md:shrink-0"
                style={{ flexBasis: '33.333%', maxWidth: '33.333%' }}
              >
                <QuoteBlock quote={quote} onShuffle={shuffle} fading={fading} />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 px-8 py-4 dark:border-gray-800">
            <div className="flex flex-wrap gap-3">
              {[
                {
                  label: 'Prometheus-first',
                  cls: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
                },
                {
                  label: 'File-based config',
                  cls: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
                },
                {
                  label: 'Template-driven',
                  cls: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
                },
                {
                  label: 'Plugin system',
                  cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
                },
                {
                  label: 'HPC-native',
                  cls: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
                },
              ].map((b) => (
                <span
                  key={b.label}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${b.cls}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Links + Credits ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <SectionCard title="Links" desc="Source code and documentation">
            <div className="space-y-2">
              <ExtLink href="https://github.com/SckyzO/rackscope" icon={Github}>
                GitHub — SckyzO/rackscope
              </ExtLink>
              <ExtLink href="https://www.rackscope.dev" icon={BookOpen}>
                Documentation — rackscope.dev
              </ExtLink>
            </div>
          </SectionCard>

          <SectionCard title="Credits" desc="Behind the project">
            <div className="flex items-start gap-4 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800">
              {/* No overflow-hidden on parent — the avatar click-count badge must overflow the rounded boundary */}
              <button
                onClick={handleAvatarClick}
                className="relative shrink-0 cursor-pointer transition-transform select-none active:scale-90"
                title={
                  avatarClicks > 0
                    ? `${3 - avatarClicks} more click${3 - avatarClicks !== 1 ? 's' : ''}…`
                    : 'Click 3×'
                }
              >
                <img
                  src="/assets/tom_avatar.webp"
                  alt="Thomas Bourcey"
                  className="h-12 w-12 rounded-full object-cover shadow"
                />
                {avatarClicks > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] font-black text-white shadow dark:border-gray-900">
                    {avatarClicks}
                  </span>
                )}
              </button>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Thomas Bourcey</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  aka SckyzO — creator &amp; maintainer
                </p>
                <a
                  href="https://github.com/SckyzO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 mt-1 flex items-center gap-1 text-xs hover:underline"
                >
                  <Github className="h-3 w-3" />
                  github.com/SckyzO
                </a>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 text-red-400" />
              <span>love,</span>
              <Coffee className="h-3.5 w-3.5 text-amber-500" />
              <span>too much coffee, and a bit of</span>
              <Bot className="h-3.5 w-3.5 text-sky-400" />
              <span>AI.</span>
            </div>
          </SectionCard>
        </div>

        {/* ── Tech stack ─────────────────────────────────────────────── */}
        <SectionCard
          title="Built with"
          icon={Code2}
          desc="Open-source technologies powering Rackscope"
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {TECH_STACK.map((tech) => (
              <div
                key={tech.name}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 p-3 dark:border-gray-800"
              >
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tech.color }} />
                <p className="text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {tech.name}
                </p>
                <p className="text-center text-[10px] text-gray-400">{tech.desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── License ────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-100 px-6 py-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            Rackscope is open-source software — AGPL-3.0 License. All trademarks are property of
            their respective owners.
          </p>
          <p className="mt-1 text-center font-mono text-[11px] text-gray-300 dark:text-gray-700">
            v1.0.0-beta
          </p>
        </div>
      </div>
    </>
  );
};
