import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type {
  Rack,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  InfrastructureComponent,
  RackState,
  RackNodeState,
} from '../types';
import { ChevronLeft, Activity, Zap, Thermometer, ShieldCheck } from 'lucide-react';
import { HUDTooltip, RackElevation } from '../components/RackVisualizer';
import { resolveRackComponents } from '../utils/rackComponents';

/**
 * RackPage Component
 *
 * The "Level 2" detail view for a specific rack.
 * Displays:
 * - Infrastructure components (PMC, HMC, RMC)
 * - Front View (Compute/Storage)
 * - Rear View (Cabling/Cooling)
 */
export const RackPage = ({ reloadKey = 0 }: { reloadKey?: number }) => {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();

  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackComponentTemplates, setRackComponentTemplates] = useState<
    Record<string, RackComponentTemplate>
  >({});
  const [rackTemplate, setRackTemplate] = useState<RackTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<RackState | null>(null);
  const [refreshMs, setRefreshMs] = useState(30000);

  // 1. Fetch Rack Details & Catalog
  useEffect(() => {
    const fetchData = async () => {
      if (!rackId) return;
      setLoading(true);
      try {
        const [rackData, catalogData, configData] = await Promise.all([
          api.getRack(rackId),
          api.getCatalog(),
          api.getConfig(),
        ]);

        setRack(rackData);

        // Map device templates
        const devCat = catalogData.device_templates || [];
        setDeviceCatalog(
          devCat.reduce<Record<string, DeviceTemplate>>((acc, t) => ({ ...acc, [t.id]: t }), {})
        );
        const componentCat = catalogData.rack_component_templates || [];
        setRackComponentTemplates(
          componentCat.reduce<Record<string, RackComponentTemplate>>(
            (acc, t) => ({ ...acc, [t.id]: t }),
            {}
          )
        );

        // Find specific rack template if assigned
        if (rackData.template_id) {
          const rackCat = catalogData.rack_templates || [];
          const template = rackCat.find((t: RackTemplate) => t.id === rackData.template_id);
          setRackTemplate(template || null);
        }
        const nextRefresh = Number(configData?.refresh?.rack_state_seconds) || 30;
        setRefreshMs(Math.max(10000, nextRefresh * 1000));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load rack';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rackId, reloadKey]);

  // 2. Telemetry Polling
  useEffect(() => {
    if (!rackId) return;
    const fetchHealth = async () => {
      try {
        const data = await api.getRackState(rackId);
        setHealthData(data);
      } catch (e) {
        console.error('Failed to fetch rack health', e);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshMs);
    return () => clearInterval(interval);
  }, [rackId, refreshMs, reloadKey]);

  if (loading)
    return (
      <div className="animate-pulse p-12 font-mono text-blue-500">
        LDR :: ANALYZING_RACK_STRUCTURE...
      </div>
    );
  if (error || !rack)
    return (
      <div className="text-status-crit p-12 font-mono">ERR :: {error || 'RACK_NOT_FOUND'}</div>
    );

  const resolvedRackComponents = rackTemplate
    ? resolveRackComponents(rackTemplate.infrastructure.rack_components, rackComponentTemplates)
    : { front: [], rear: [], side: [], main: [] };
  const baseInfra = rackTemplate?.infrastructure.components || [];
  const frontInfraBase = rackTemplate?.infrastructure.front_components?.length
    ? rackTemplate.infrastructure.front_components
    : baseInfra;
  const rearInfraBase = rackTemplate?.infrastructure.rear_components?.length
    ? rackTemplate.infrastructure.rear_components
    : baseInfra;
  const sideInfraBase = rackTemplate?.infrastructure.side_components || [];
  const frontInfra = [
    ...frontInfraBase,
    ...resolvedRackComponents.main,
    ...resolvedRackComponents.front,
  ];
  const rearInfra = [
    ...rearInfraBase,
    ...resolvedRackComponents.main,
    ...resolvedRackComponents.rear,
  ];
  const sideInfra = [...sideInfraBase, ...resolvedRackComponents.side];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-base)] p-8">
      {/* Top Navigation & Title */}
      <header className="mb-6 flex shrink-0 items-end justify-between">
        <div>
          <Link
            to={`/room/${rack.aisle_id?.split('-')[0] || ''}`}
            className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-blue-400"
          >
            <ChevronLeft className="h-3 w-3" /> Back to Floor Plan
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
              {rack.name}
            </h1>
            <div className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[10px] text-blue-400">
              {rackTemplate?.name || 'Generic Rack'}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] text-gray-500 uppercase">Avg Power</span>
            <span className="font-mono text-2xl text-white">
              {(healthData?.metrics?.power / 1000 || 0).toFixed(1)}{' '}
              <span className="text-xs text-gray-500">kW</span>
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] text-gray-500 uppercase">Health Score</span>
            <span
              className={`font-mono text-2xl ${healthData?.state === 'OK' ? 'text-status-ok' : 'text-status-crit'}`}
            >
              {healthData?.state || '---'}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] text-gray-500 uppercase">Active checks</span>
            <span className="text-status-warn font-mono text-2xl">
              {healthData?.nodes
                ? Object.values(healthData.nodes as Record<string, RackNodeState>).reduce(
                    (acc, node) => acc + (node.alerts?.length ?? 0),
                    0
                  )
                : 0}
            </span>
          </div>
        </div>
      </header>

      {/* Main Rack View Layout */}
      <div className="grid flex-1 grid-cols-12 gap-6 overflow-hidden">
        {/* LEFT: Infrastructure Column (HMC, PMC, RMC) */}
        <div className="custom-scrollbar col-span-2 flex flex-col gap-4 overflow-y-auto pr-2">
          <h3 className="border-b border-white/5 pb-2 text-[10px] font-bold tracking-widest text-gray-600 uppercase">
            Infrastructure
          </h3>

          {rackTemplate && (
            <div className="flex flex-col gap-4">
              {frontInfra.length > 0 && (
                <div className="space-y-2">
                  <div className="font-mono text-[9px] text-gray-500 uppercase">Front</div>
                  {frontInfra.map((comp) => (
                    <InfraComponentCard
                      key={comp.id}
                      component={comp}
                      pduMetrics={healthData?.infra_metrics?.pdu}
                    />
                  ))}
                </div>
              )}

              {rearInfra.length > 0 ? (
                <div className="space-y-2">
                  <div className="font-mono text-[9px] text-gray-500 uppercase">Rear</div>
                  {rearInfra.map((comp) => (
                    <InfraComponentCard
                      key={comp.id}
                      component={comp}
                      pduMetrics={healthData?.infra_metrics?.pdu}
                    />
                  ))}
                </div>
              ) : (
                baseInfra.map((comp) => (
                  <InfraComponentCard
                    key={comp.id}
                    component={comp}
                    pduMetrics={healthData?.infra_metrics?.pdu}
                  />
                ))
              )}
            </div>
          )}

          {!rackTemplate && (
            <div className="rounded border border-dashed border-gray-800 p-4 text-center font-mono text-[10px] text-gray-600 uppercase">
              No Template Assigned
            </div>
          )}
        </div>

        {/* CENTER: Front View */}
        <div className="relative col-span-5 flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-2xl">
          <div className="rounded-t-3xl border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/50 p-3 text-center text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">
            Front Orientation
          </div>
          <div className="flex-1 p-6">
            <RackElevation
              rack={rack}
              catalog={deviceCatalog}
              health={healthData?.state}
              nodesData={healthData?.nodes}
              infraComponents={frontInfra}
              sideComponents={sideInfra}
              pduMetrics={healthData?.infra_metrics?.pdu}
              onDeviceClick={(device) => navigate(`/rack/${rack.id}/device/${device.id}`)}
            />
          </div>
        </div>

        {/* RIGHT: Rear View */}
        <div className="relative col-span-5 flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-2xl">
          <div className="rounded-t-3xl border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/50 p-3 text-center text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">
            Rear Orientation
          </div>
          <div className="flex-1 p-6 opacity-90">
            <RackElevation
              rack={rack}
              catalog={deviceCatalog}
              health={healthData?.state}
              nodesData={healthData?.nodes}
              isRearView={true}
              infraComponents={rearInfra}
              sideComponents={sideInfra}
              allowInfraOverlap={true}
              pduMetrics={healthData?.infra_metrics?.pdu}
              onDeviceClick={(device) => navigate(`/rack/${rack.id}/device/${device.id}`)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Visual card for Infrastructure components (HMC, PMC, RMC)
 */
type PduMetric =
  NonNullable<RackState['infra_metrics']>['pdu'] extends Record<string, infer T> ? T : never;

const InfraComponentCard = ({
  component,
  pduMetrics,
}: {
  component: InfrastructureComponent;
  pduMetrics?: Record<string, PduMetric>;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  let Icon = ShieldCheck;
  let accentColor = 'border-gray-700 text-gray-400';

  if (component.type === 'power') {
    Icon = Zap;
    accentColor = 'border-yellow-500/30 text-yellow-500/70';
  }
  if (component.type === 'cooling') {
    Icon = Thermometer;
    accentColor = 'border-blue-500/30 text-blue-500/70';
  }
  if (component.type === 'management') {
    Icon = Activity;
    accentColor = 'border-purple-500/30 text-purple-500/70';
  }

  const pduEntries = pduMetrics ? Object.entries(pduMetrics) : [];
  const totalPower = pduEntries.reduce((acc, [, val]) => acc + (val.activepower_watt || 0), 0);
  const totalCurrent = pduEntries.reduce((acc, [, val]) => acc + (val.current_amp || 0), 0);
  const totalApparent = pduEntries.reduce((acc, [, val]) => acc + (val.apparentpower_va || 0), 0);
  const totalEnergy = pduEntries.reduce((acc, [, val]) => acc + (val.activeenergy_wh || 0), 0);
  const hasPduMetrics = component.type === 'power' && pduEntries.length > 0;

  return (
    <>
      <div
        className={`rounded-lg border bg-white/5 p-3 ${accentColor} group flex cursor-help flex-col gap-2 transition-colors hover:bg-white/10`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-bold tracking-tight uppercase">{component.name}</span>
          </div>
          {component.role && (
            <span className="rounded bg-black/40 px-1 text-[8px] text-gray-500 uppercase">
              {component.role}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div className="font-mono text-[9px] text-gray-500">
            {component.location === 'u-mount' ? `U${component.u_position}` : 'Zero-U'}
          </div>
          <div className="max-w-[80px] truncate font-mono text-[8px] text-gray-600">
            {component.model}
          </div>
        </div>
        {hasPduMetrics && (
          <div className="flex items-center justify-between font-mono text-[9px] text-gray-400">
            <span>{(totalPower / 1000).toFixed(1)} kW</span>
            <span>{pduEntries.length} PDU</span>
          </div>
        )}
        {/* Minimalist Health Bar for the component */}
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-800">
          <div className="bg-status-ok h-full w-full opacity-50 transition-opacity group-hover:opacity-100"></div>
        </div>
      </div>

      {isHovered && component.type === 'power' && (
        <HUDTooltip
          title={component.name}
          subtitle="Power Distribution"
          status="OK"
          details={[
            {
              label: 'Power',
              value: hasPduMetrics ? `${(totalPower / 1000).toFixed(1)} kW` : '--',
            },
            {
              label: 'Current',
              value: hasPduMetrics ? `${totalCurrent.toFixed(1)} A` : '--',
            },
            {
              label: 'Apparent',
              value: hasPduMetrics ? `${(totalApparent / 1000).toFixed(1)} kVA` : '--',
            },
            {
              label: 'Energy',
              value: hasPduMetrics ? `${(totalEnergy / 1000).toFixed(0)} kWh` : '--',
            },
          ]}
          reasons={
            hasPduMetrics
              ? pduEntries.map(
                  ([name, value]) => `${name}: ${(value.activepower_watt || 0).toFixed(0)} W`
                )
              : ['No PDU metrics available']
          }
          mousePos={mousePos}
        />
      )}
    </>
  );
};
