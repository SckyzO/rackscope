import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Monitor,
  Maximize2,
  Columns2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Play,
  ListVideo,
  GripVertical,
  BarChart2 as FallbackIcon,
} from 'lucide-react';
import { usePageTitle } from '../contexts/PageTitleContext';
import { useAppConfigSafe } from '../contexts/AppConfigContext';
import { usePlaylist } from '../contexts/PlaylistContext';
import {
  PageHeader,
  PageBreadcrumb,
  SectionCard,
  LoadingState,
  EmptyState,
} from './templates/EmptyPage';
import {
  expandRegistry,
  PLAYLIST_REGISTRY,
  getIcon,
  type PlaylistQueueItem,
  type PlaylistMode,
} from '../playlist/PlaylistRegistry';

// ── Duration presets ──────────────────────────────────────────────────────────
const DURATION_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
];

// Find nearest preset value, or 0 if no match (= use global)
const snapToPreset = (v: number): number => {
  if (v <= 0) return 0;
  const exact = DURATION_PRESETS.find((p) => p.value === v);
  return exact ? exact.value : v;
};

const selectCls =
  'focus:border-brand-400 h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer';
import { api } from '../../services/api';
import type { RoomSummary } from '../../types';

// ── RegistryIcon — renders an icon by name, avoids "component created during render" lint rule ──

// All icons are resolved at module level into a stable record so the components
// are never instantiated inside render functions.
const ICON_COMPONENTS: Record<string, ElementType> = {
  BarChart2: getIcon('BarChart2'),
  Globe: getIcon('Globe'),
  DoorOpen: getIcon('DoorOpen'),
  Cpu: getIcon('Cpu'),
  Activity: getIcon('Activity'),
  MapPin: getIcon('MapPin'),
  List: getIcon('List'),
  AlertTriangle: getIcon('AlertTriangle'),
  Bell: getIcon('Bell'),
  Server: getIcon('Server'),
};

const RegistryIcon = ({ name, className }: { name: string; className?: string }) => {
  const Resolved = ICON_COMPONENTS[name] ?? FallbackIcon;
  return <Resolved className={className} />;
};

// ── Queue Item Row ─────────────────────────────────────────────────────────────

const QueueItemRow = ({
  item,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDurationChange,
}: {
  item: PlaylistQueueItem;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDurationChange: (seconds: number) => void;
}) => (
  <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/50">
    <GripVertical className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {index + 1}
    </span>
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
      <RegistryIcon name={item.iconName} className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
    </div>
    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
      {item.title}
    </span>

    {/* Duration — preset selector */}
    <div className="flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-600" />
      <select
        value={snapToPreset(item.duration)}
        onChange={(e) => onDurationChange(parseInt(e.target.value, 10))}
        className={selectCls}
      >
        <option value={0}>Global</option>
        {DURATION_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>

    {/* Reorder buttons */}
    <div className="flex flex-col gap-0.5">
      <button
        onClick={onMoveUp}
        disabled={index === 0}
        title="Move up"
        className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <button
        onClick={onMoveDown}
        disabled={index === total - 1}
        title="Move down"
        className="flex h-5 w-5 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>

    {/* Remove */}
    <button
      onClick={onRemove}
      title="Remove from queue"
      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
);

// ── Page ────────────────────────────────────────────────────────────────────

export const PlaylistCenterPage = () => {
  usePageTitle('Playlist Center');
  const navigate = useNavigate();
  const { features, plugins } = useAppConfigSafe();
  const playlist = usePlaylist();

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [localQueue, setLocalQueue] = useState<PlaylistQueueItem[]>(playlist.queue);
  const [localInterval, setLocalInterval] = useState(snapToPreset(playlist.globalInterval) || 30);

  useEffect(() => {
    api
      .getRooms()
      .then((data) => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]))
      .finally(() => setRoomsLoading(false));
  }, []);

  const expanded = expandRegistry(PLAYLIST_REGISTRY, {
    rooms,
    features: { worldmap: features.worldmap, notifications: features.notifications },
    pluginSlurm: plugins.slurm,
  });

  // IDs already in queue for quick lookup
  const queuedIds = useMemo(() => new Set(localQueue.map((q) => q.id)), [localQueue]);

  const addToQueue = useCallback((item: PlaylistQueueItem) => {
    setLocalQueue((prev) => {
      if (prev.some((q) => q.id === item.id)) return prev;
      return [...prev, { ...item, duration: 0 }];
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setLocalQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setLocalQueue((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const updateItemDuration = useCallback((index: number, seconds: number) => {
    setLocalQueue((prev) =>
      prev.map((item, i) => (i === index ? { ...item, duration: seconds } : item))
    );
  }, []);

  const startPlaylist = (mode: PlaylistMode) => {
    if (localQueue.length === 0) return;
    playlist.setQueue(localQueue);
    playlist.setGlobalInterval(localInterval);
    playlist.play(mode);
    navigate(localQueue[0].route);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlist Center"
        description="Configure views for kiosk and NOC display rotation."
        breadcrumb={
          <PageBreadcrumb
            items={[{ label: 'Home', href: '/' }, { label: 'Playlist Center' }]}
          />
        }
      />

      {!features.playlist && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Playlist feature is disabled. Enable it in Settings → Features → Playlist.
          </p>
        </div>
      )}

      <div className="grid grid-cols-[3fr_2fr] gap-5">
        {/* Left: Available pages by category */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ListVideo className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Available Pages
            </h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Click to add to queue
            </span>
          </div>

          {roomsLoading ? (
            <SectionCard title="Loading pages…">
              <LoadingState message="Fetching rooms…" />
            </SectionCard>
          ) : expanded.length === 0 ? (
            <SectionCard title="No pages available">
              <EmptyState
                title="No eligible pages found"
                description="Enable plugins or features to see more pages."
              />
            </SectionCard>
          ) : (
            expanded.map((cat) => (
              <SectionCard
                key={cat.id}
                title={cat.label}
                icon={ICON_COMPONENTS[cat.iconName] ?? FallbackIcon}
              >
                <div className="space-y-1.5">
                  {cat.pages.map((page) => {
                    const inQueue = queuedIds.has(page.id);
                    return (
                      <button
                        key={page.id}
                        onClick={() => addToQueue(page)}
                        disabled={inQueue}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          inQueue
                            ? 'cursor-not-allowed opacity-40'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                          <RegistryIcon
                            name={page.iconName}
                            className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                            {page.title}
                          </p>
                          <p className="truncate font-mono text-[10px] text-gray-400 dark:text-gray-600">
                            {page.route}
                          </p>
                        </div>
                        {inQueue ? (
                          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-500/15 dark:text-green-400">
                            Added
                          </span>
                        ) : (
                          <Plus className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            ))
          )}
        </div>

        {/* Right: Queue + controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Queue</h3>
              {localQueue.length > 0 && (
                <span className="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {localQueue.length}
                </span>
              )}
            </div>
            {localQueue.length > 0 && (
              <button
                onClick={() => setLocalQueue([])}
                className="text-xs text-gray-400 transition-colors hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Queue items */}
          <div className="min-h-[200px] space-y-1.5">
            {localQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 py-12 dark:border-gray-800">
                <ListVideo className="h-8 w-8 text-gray-200 dark:text-gray-800" />
                <p className="text-sm text-gray-400 dark:text-gray-600">No pages in queue</p>
                <p className="text-xs text-gray-300 dark:text-gray-700">
                  Click pages on the left to add them
                </p>
              </div>
            ) : (
              localQueue.map((item, index) => (
                <QueueItemRow
                  key={`${item.id}-${index}`}
                  item={item}
                  index={index}
                  total={localQueue.length}
                  onRemove={() => removeFromQueue(index)}
                  onMoveUp={() => moveItem(index, 'up')}
                  onMoveDown={() => moveItem(index, 'down')}
                  onDurationChange={(s) => updateItemDuration(index, s)}
                />
              ))
            )}
          </div>

          {/* Global interval */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Global interval
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Default time per slide (per-slide overrides above)
                </p>
              </div>
              <select
                value={localInterval}
                onChange={(e) => setLocalInterval(parseInt(e.target.value, 10))}
                className={`${selectCls} w-20 text-sm font-medium`}
              >
                {DURATION_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start buttons */}
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
              Start playlist
            </p>

            {/* Normal mode */}
            <button
              onClick={() => startPlaylist('normal')}
              disabled={localQueue.length === 0 || !features.playlist}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-white/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <Monitor className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Normal</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Full UI — sidebar and header visible
                </p>
              </div>
              <Play className="ml-auto h-4 w-4 text-gray-300 dark:text-gray-700" />
            </button>

            {/* Focused mode */}
            <button
              onClick={() => startPlaylist('focused')}
              disabled={localQueue.length === 0 || !features.playlist}
              className="border-brand-200 bg-brand-50 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="bg-brand-100 dark:bg-brand-500/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Columns2 className="text-brand-500 h-4 w-4" />
              </div>
              <div>
                <p className="text-brand-700 dark:text-brand-300 text-sm font-semibold">Focused</p>
                <p className="text-brand-600/70 dark:text-brand-400/70 text-xs">
                  Sidebar collapsed — more content space
                </p>
              </div>
              <Play className="text-brand-300 dark:text-brand-700 ml-auto h-4 w-4" />
            </button>

            {/* Kiosk mode */}
            <button
              onClick={() => startPlaylist('kiosk')}
              disabled={localQueue.length === 0 || !features.playlist}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-900 bg-gray-900 px-4 py-3 text-left transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-800 dark:bg-gray-700">
                <Maximize2 className="h-4 w-4 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Kiosk</p>
                <p className="text-xs text-gray-400">Fullscreen — no chrome, NOC display mode</p>
              </div>
              <Play className="ml-auto h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
