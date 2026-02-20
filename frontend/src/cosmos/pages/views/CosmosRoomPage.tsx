import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Building2, RotateCcw, Thermometer, Zap } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, RackState } from '../../../types';

const healthColor: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const healthBg: Record<string, string> = {
  OK: 'bg-green-50 dark:bg-green-500/10',
  WARN: 'bg-amber-50 dark:bg-amber-500/10',
  CRIT: 'bg-red-50 dark:bg-red-500/10',
  UNKNOWN: 'bg-gray-100 dark:bg-gray-800',
};

const healthText: Record<string, string> = {
  OK: 'text-green-600 dark:text-green-400',
  WARN: 'text-amber-600 dark:text-amber-400',
  CRIT: 'text-red-600 dark:text-red-400',
  UNKNOWN: 'text-gray-500 dark:text-gray-400',
};

const RackCard = ({
  rack,
  health,
  selected,
  onClick,
}: {
  rack: Rack;
  health: RackState | string | undefined;
  selected: boolean;
  onClick: () => void;
}) => {
  const state = typeof health === 'string' ? health : ((health as RackState)?.state ?? 'UNKNOWN');
  const metrics = typeof health !== 'string' ? (health as RackState)?.metrics : null;
  const color = healthColor[state] ?? healthColor.UNKNOWN;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all hover:shadow-lg ${selected ? 'ring-brand-500 ring-2 ring-offset-2 dark:ring-offset-gray-950' : ''}`}
      style={{ borderColor: color }}
      title={rack.name}
    >
      {/* Rack silhouette */}
      <div className="w-full space-y-0.5 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-sm"
            style={{ backgroundColor: i < 5 ? color : '#e4e7ec', opacity: i < 5 ? 0.6 : 0.3 }}
          />
        ))}
      </div>
      <span className="max-w-full truncate font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
        {rack.id}
      </span>
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${healthBg[state]} ${healthText[state]}`}
      >
        {state}
      </span>
      {metrics && (
        <div className="flex gap-2 text-[9px] text-gray-400">
          {metrics.temperature > 0 && <span>{Math.round(metrics.temperature)}°C</span>}
          {metrics.power > 0 && <span>{(metrics.power / 1000).toFixed(1)}kW</span>}
        </div>
      )}
    </button>
  );
};

export const CosmosRoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, RackState | string>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    if (!roomId) return;
    try {
      const state = await api.getRoomState(roomId);
      setHealthMap(state?.racks ?? {});
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!roomId) return;
    api
      .getRoomLayout(roomId)
      .then((data) => {
        setRoom(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const poll = async () => {
      try {
        const state = await api.getRoomState(roomId);
        if (active) setHealthMap(state?.racks ?? {});
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId]);

  useEffect(() => {
    if (!selectedRack) return;
    let active = true;
    api
      .getRackState(selectedRack.id, false)
      .then((data) => {
        if (active) setSelectedHealth(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [selectedRack]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
      </div>
    );
  if (!room)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">Room not found</div>
    );

  const allRacks = [
    ...(room.aisles?.flatMap((a) => a.racks ?? []) ?? []),
    ...(room.standalone_racks ?? []),
  ];

  const summary = allRacks.reduce(
    (acc, rack) => {
      const h = healthMap[rack.id];
      const state = typeof h === 'string' ? h : ((h as RackState)?.state ?? 'UNKNOWN');
      acc[state] = (acc[state] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
          World Map
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900 dark:text-white">{room.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {room.aisles?.length ?? 0} aisles · {allRacks.length} racks
          </p>
        </div>
        <button
          onClick={loadHealth}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <RotateCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Health summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          ['OK', '#10b981'],
          ['WARN', '#f59e0b'],
          ['CRIT', '#ef4444'],
          ['UNKNOWN', '#6b7280'],
        ].map(([state, color]) => (
          <div
            key={state}
            className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {state}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {summary[state] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr,340px]">
        {/* Left: floor plan */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Floor Plan
          </h3>
          {room.aisles && room.aisles.length > 0 ? (
            <div className="space-y-6">
              {room.aisles.map((aisle) => (
                <div key={aisle.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                      {aisle.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(aisle.racks ?? []).map((rack) => (
                      <div key={rack.id} className="w-20">
                        <RackCard
                          rack={rack}
                          health={healthMap[rack.id]}
                          selected={selectedRack?.id === rack.id}
                          onClick={() => setSelectedRack(rack)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-gray-400">
              No aisles configured
            </div>
          )}
          {(room.standalone_racks ?? []).length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Standalone Racks
              </div>
              <div className="flex flex-wrap gap-3">
                {(room.standalone_racks ?? []).map((rack) => (
                  <div key={rack.id} className="w-20">
                    <RackCard
                      rack={rack}
                      health={healthMap[rack.id]}
                      selected={selectedRack?.id === rack.id}
                      onClick={() => setSelectedRack(rack)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: rack detail panel */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {!selectedRack ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
              <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a rack</p>
              <p className="text-xs text-gray-400">Click any rack in the floor plan</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedRack.name}
                  </h3>
                  <p className="font-mono text-xs text-gray-400">{selectedRack.id}</p>
                </div>
                <button
                  onClick={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
                  className="bg-brand-500 hover:bg-brand-600 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                >
                  Open Rack →
                </button>
              </div>

              {selectedHealth && (
                <>
                  {/* Health badge */}
                  <div
                    className={`mb-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${healthBg[selectedHealth.state]} ${healthText[selectedHealth.state]}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: healthColor[selectedHealth.state] }}
                    />
                    {selectedHealth.state}
                  </div>

                  {/* Metrics */}
                  {selectedHealth.metrics && (
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      {selectedHealth.metrics.temperature > 0 && (
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Thermometer className="h-3.5 w-3.5" />
                            Temperature
                          </div>
                          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                            {Math.round(selectedHealth.metrics.temperature)}°C
                          </p>
                        </div>
                      )}
                      {selectedHealth.metrics.power > 0 && (
                        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Zap className="h-3.5 w-3.5" />
                            Power
                          </div>
                          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                            {(selectedHealth.metrics.power / 1000).toFixed(1)} kW
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Node summary */}
                  {selectedHealth.nodes && Object.keys(selectedHealth.nodes).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        Nodes ({Object.keys(selectedHealth.nodes).length})
                      </p>
                      <div className="grid grid-cols-5 gap-1">
                        {Object.entries(selectedHealth.nodes)
                          .slice(0, 20)
                          .map(([node, ns]) => {
                            const s = (ns as { state?: string }).state ?? 'UNKNOWN';
                            return (
                              <div
                                key={node}
                                title={`${node}: ${s}`}
                                className="aspect-square rounded"
                                style={{
                                  backgroundColor: healthColor[s] ?? healthColor.UNKNOWN,
                                  opacity: 0.7,
                                }}
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
