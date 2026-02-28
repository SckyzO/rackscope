/**
 * PlaylistCountdown — visual countdown between playlist slides.
 * Visual style matches existing spinners at /ui/spinners
 * (brand-colored arc on gray background ring), but the arc shrinks
 * from 100% to 0% instead of spinning continuously.
 *
 * Circle variant → header (Normal / Focused mode)
 * Bar variant    → fixed bottom overlay (Kiosk mode)
 */
import { useState, useEffect, useRef } from 'react';
import { usePlaylistSafe } from '../contexts/PlaylistContext';

// ── Circle (header) ────────────────────────────────────────────────────────────

export const PlaylistCountdownCircle = () => {
  const { isPlaying, currentIndex, queue, globalInterval } = usePlaylistSafe();
  const [progress, setProgress] = useState(1);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    queueMicrotask(() => setProgress(1));
  }, [currentIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const item = queue[currentIndex];
    const totalMs =
      Math.max(5, item?.duration && item.duration > 0 ? item.duration : globalInterval) * 1000;
    const t = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.max(0, 1 - elapsed / totalMs));
    }, 100);
    return () => clearInterval(t);
  }, [isPlaying, currentIndex, queue, globalInterval]);

  if (!isPlaying) return null;

  const size = 28;
  const r = 11;
  const strokeW = 3;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden>
      <svg width={size} height={size} className="absolute" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track — same gray as spinner background */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={strokeW}
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress arc — brand color like spinner active part */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={strokeW}
          className="stroke-brand-500"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

// ── Bar (kiosk) ────────────────────────────────────────────────────────────────

export const PlaylistCountdownBar = () => {
  const { isPlaying, currentIndex, queue, globalInterval, mode } = usePlaylistSafe();
  const [progress, setProgress] = useState(1);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    queueMicrotask(() => setProgress(1));
  }, [currentIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const item = queue[currentIndex];
    const totalMs =
      Math.max(5, item?.duration && item.duration > 0 ? item.duration : globalInterval) * 1000;
    const t = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.max(0, 1 - elapsed / totalMs));
    }, 100);
    return () => clearInterval(t);
  }, [isPlaying, currentIndex, queue, globalInterval]);

  if (!isPlaying || mode !== 'kiosk') return null;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-[9998] h-1 bg-gray-800/50" aria-hidden>
      <div
        className="h-full bg-brand-500"
        style={{ width: `${progress * 100}%`, transition: 'width 100ms linear' }}
      />
    </div>
  );
};
