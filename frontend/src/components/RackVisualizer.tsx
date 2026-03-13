import type { ReactNode } from 'react';
import { useState, useMemo, type KeyboardEvent } from 'react';
import { useMetricsThresholds } from '../hooks/useMetricsThresholds';
import { Server, Box, Thermometer, Router as RouterIcon, Fan, Power, Activity } from 'lucide-react';
import type {
  Device,
  DeviceTemplate,
  Rack,
  InfrastructureComponent,
  RackNodeState,
  AlertCheck,
} from '../types';
import { expandInstanceMap, type InstanceInput } from '../utils/instances';
import type { TooltipReason, HUDTooltipProps } from './HUDTooltip';
import { HUDTooltip } from './HUDTooltip';

// --- Core Visualizers ---

export const RackElevation = ({
  rack,
  catalog,
  health,
  nodesData,
  isRearView = false,
  infraComponents = [],
  sideComponents = [],
  allowInfraOverlap = false,
  flipView,
  rearInfraComponents = [],
  overlay,
  onDeviceClick,
  pduMetrics,
  rackAlerts = [],
  fullWidth = false,
  disableZoom = false,
  disableTooltip = false,
  rackWidth,
  maxUPx,
}: {
  rack: Rack;
  catalog: Record<string, DeviceTemplate>;
  health?: string;
  nodesData?: Record<string, RackNodeState>;
  isRearView?: boolean;
  infraComponents?: (InfrastructureComponent & { slot?: number; span?: number })[];
  sideComponents?: (InfrastructureComponent & { slot?: number; span?: number })[];
  allowInfraOverlap?: boolean;
  flipView?: 'front' | 'rear';
  rearInfraComponents?: (InfrastructureComponent & { slot?: number; span?: number })[];
  overlay?: ReactNode;
  onDeviceClick?: (device: Device) => void;
  pduMetrics?: Record<
    string,
    {
      activepower_watt?: number;
      activeenergy_wh?: number;
      apparentpower_va?: number;
      current_amp?: number;
      inlet_rating_amp?: number;
    }
  >;
  rackAlerts?: AlertCheck[];
  fullWidth?: boolean;
  /** Disable the hover scale-up zoom effect on devices */
  disableZoom?: boolean;
  /** Disable HUD tooltips (useful in preview/editor contexts with no real health data) */
  disableTooltip?: boolean;
  /**
   * Card width in pixels (from cluster view). Used to auto-hide node labels
   * when per-column width is too narrow to display text.
   */
  rackWidth?: number;
  /**
   * Cap the maximum height of each rack unit in pixels.
   * Prevents the rack from becoming disproportionately tall on large screens (4K).
   * Minimum recommended: 14px (readability floor).
   * Maximum recommended: 48px (comfort ceiling).
   * When undefined, no cap is applied (existing behaviour).
   */
  maxUPx?: number;
}) => {
  const [tooltip, setTooltip] = useState<HUDTooltipProps | null>(null);
  const uMap = new Map<number, Device>();
  rack.devices.forEach((d) => {
    const template = catalog[d.template_id];
    const height = template?.u_height || 1;
    for (let i = 0; i < height; i++) {
      uMap.set(d.u_position + i, d);
    }
  });

  const renderRackFace = (
    faceRearView: boolean,
    faceInfra: typeof infraComponents,
    faceAllowOverlap: boolean
  ) => {
    const infraMap = new Map<
      number,
      { component: InfrastructureComponent; height: number; hasCollision: boolean }
    >();
    faceInfra
      .filter(
        (c): c is typeof c & { u_position: number } =>
          c.location === 'u-mount' && c.u_position !== undefined && c.u_position !== null
      )
      .forEach((c) => {
        const height = c.u_height ?? 1;
        let hasCollision = false;
        if (!faceAllowOverlap) {
          for (let i = 0; i < height; i++) {
            if (uMap.has(c.u_position + i)) {
              hasCollision = true;
              break;
            }
          }
        }
        infraMap.set(c.u_position, { component: c, height, hasCollision });
      });

    const topSlots = Math.max(6, rack.u_height);
    const topSide = buildSideLayout(
      faceInfra.filter((c) => c.location === 'top'),
      topSlots
    );
    const bottomSide = buildSideLayout(
      faceInfra.filter((c) => c.location === 'bottom'),
      topSlots
    );

    const leftSide = buildSideLayout(
      sideComponents.filter((c) => c.location === 'side-left'),
      rack.u_height
    );
    const rightSide = buildSideLayout(
      sideComponents.filter((c) => c.location === 'side-right'),
      rack.u_height
    );

    return (
      <div className="relative flex h-full w-full items-stretch">
        {faceRearView && topSide.length > 0 && (
          <div
            className="absolute -top-10 right-4 left-4 grid h-8 gap-1"
            style={{ gridTemplateColumns: `repeat(${topSlots}, minmax(0, 1fr))` }}
          >
            {topSide.map(({ component, slot, span }) => (
              <SideAttachment
                key={component.id}
                component={component}
                horizontal
                style={{ gridColumn: `${slot} / span ${span}` }}
              />
            ))}
          </div>
        )}
        {faceRearView && bottomSide.length > 0 && (
          <div
            className="absolute right-4 -bottom-10 left-4 grid h-8 gap-1"
            style={{ gridTemplateColumns: `repeat(${topSlots}, minmax(0, 1fr))` }}
          >
            {bottomSide.map(({ component, slot, span }) => (
              <SideAttachment
                key={component.id}
                component={component}
                horizontal
                style={{ gridColumn: `${slot} / span ${span}` }}
              />
            ))}
          </div>
        )}
        {leftSide.length > 0 && (
          <SideRail
            components={leftSide}
            totalU={rack.u_height}
            rackName={rack.name}
            onTooltipChange={setTooltip}
            pduMetrics={pduMetrics}
            rackAlerts={rackAlerts}
          />
        )}
        <div className="relative flex h-full w-full flex-col-reverse rounded-sm border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-colors duration-500">
          {Array.from({ length: rack.u_height }).map((_, idx) => {
            const u = idx + 1;
            const device = uMap.get(u);
            const template = device ? catalog[device.template_id] : null;
            const isDeviceStart = device?.u_position === u;
            const infraStart = infraMap.get(u);

            return (
              <div
                key={u}
                className="relative flex min-h-0 w-full flex-1 items-center border-b border-[var(--color-border)]/10 transition-colors duration-300"
              >
                <div className="absolute -left-[20px] z-10 flex h-full w-4 items-center justify-center text-center font-mono text-[10px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                  {u}
                </div>
                <div className="absolute -right-[20px] z-10 flex h-full w-4 items-center justify-center text-center font-mono text-[10px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                  {u}
                </div>

                <div className="relative h-full w-full px-0.5 py-[1px]">
                  {isDeviceStart && template && (
                    <div
                      className="absolute right-0.5 bottom-0 left-0.5 z-20"
                      style={{ height: `calc(${template.u_height} * 100%)` }}
                    >
                      <DeviceChassis
                        device={device}
                        template={template}
                        rackHealth={health ?? 'UNKNOWN'}
                        nodesData={nodesData}
                        isRearView={faceRearView}
                        uPosition={u}
                        onClick={onDeviceClick ? () => onDeviceClick(device) : undefined}
                        onTooltipChange={disableTooltip ? undefined : setTooltip}
                        disableZoom={disableZoom}
                        rackWidth={rackWidth}
                      />
                    </div>
                  )}

                  {infraStart && (
                    <div
                      className={`absolute right-0.5 bottom-0 left-0.5 z-30 ${
                        infraStart.hasCollision ? 'ring-2 ring-[var(--color-status-crit)]/70' : ''
                      }`}
                      style={{ height: `calc(${infraStart.height} * 100%)` }}
                    >
                      <InfraOverlay
                        component={infraStart.component}
                        hasCollision={infraStart.hasCollision}
                      />
                    </div>
                  )}

                  {!device && (
                    <div className="h-full w-full bg-[var(--color-empty-slot)] opacity-40"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {rightSide.length > 0 && (
          <SideRail
            components={rightSide}
            totalU={rack.u_height}
            align="right"
            rackName={rack.name}
            onTooltipChange={setTooltip}
            pduMetrics={pduMetrics}
            rackAlerts={rackAlerts}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-1 items-center justify-center rounded-lg bg-[var(--color-rack-interior)] p-4 transition-colors duration-500">
      {overlay && <div className="absolute top-2 left-2 z-30">{overlay}</div>}
      <div
        className={`relative flex h-full w-full items-stretch ${fullWidth ? '' : 'max-w-[380px]'}`}
        style={maxUPx !== undefined ? { maxHeight: `${rack.u_height * maxUPx}px` } : undefined}
      >
        {flipView
          ? renderRackFace(
              flipView === 'rear',
              flipView === 'rear' ? rearInfraComponents : infraComponents,
              flipView === 'rear'
            )
          : renderRackFace(isRearView, infraComponents, allowInfraOverlap)}
      </div>
      {tooltip && <HUDTooltip {...tooltip} />}
    </div>
  );
};

const buildSideLayout = (
  components: Array<InfrastructureComponent & { slot?: number; span?: number }>,
  slots: number
) => {
  const used = new Array(slots + 1).fill(false);
  const withOrder = [...components].sort((a, b) => {
    const aSlot = a.slot ?? a.u_position ?? Number.MAX_SAFE_INTEGER;
    const bSlot = b.slot ?? b.u_position ?? Number.MAX_SAFE_INTEGER;
    if (aSlot !== bSlot) return aSlot - bSlot;
    return String(a.id).localeCompare(String(b.id));
  });

  return withOrder.map((component) => {
    const requestedSpan = component.span ?? component.u_height ?? 1;
    const span = Math.max(1, Math.min(slots, requestedSpan));
    const requestedSlot = component.slot ?? component.u_position ?? 1;
    let slot = Math.max(1, Math.min(slots, requestedSlot));
    while (slot <= slots && used[slot]) slot += 1;
    if (slot > slots) slot = slots;
    for (let i = 0; i < span; i += 1) {
      const s = slot + i;
      if (s <= slots) used[s] = true;
    }
    return { component, slot, span };
  });
};

const SideRail = ({
  components,
  totalU,
  align = 'left',
  rackName,
  onTooltipChange,
  pduMetrics,
  rackAlerts = [],
}: {
  components: Array<{
    component: InfrastructureComponent & { slot?: number; span?: number };
    slot: number;
    span: number;
  }>;
  totalU: number;
  align?: 'left' | 'right';
  rackName?: string;
  onTooltipChange?: (payload: HUDTooltipProps | null) => void;
  pduMetrics?: Record<
    string,
    {
      activepower_watt?: number;
      activeenergy_wh?: number;
      apparentpower_va?: number;
      current_amp?: number;
      inlet_rating_amp?: number;
    }
  >;
  rackAlerts?: AlertCheck[];
}) => {
  return (
    <div
      className={`relative flex h-full w-[28px] shrink-0 items-stretch ${
        align === 'left' ? 'mr-2' : 'ml-2'
      }`}
    >
      <div className="absolute inset-0 rounded-[2px] border border-[var(--color-border)]/30 bg-[var(--color-rack-interior)]/40" />
      {components.map(({ component, slot, span }) => {
        const heightPct = (span / totalU) * 100;
        const topPct = ((totalU - (slot + span) + 1) / totalU) * 100;
        return (
          <div
            key={component.id}
            className="absolute right-[2px] left-[2px]"
            style={{ top: `${topPct}%`, height: `${heightPct}%` }}
          >
            <SideAttachment
              component={component}
              rackName={rackName}
              onTooltipChange={onTooltipChange}
              pduMetrics={pduMetrics}
              rackAlerts={rackAlerts}
            />
          </div>
        );
      })}
    </div>
  );
};

const SideAttachment = ({
  component,
  horizontal = false,
  style,
  rackName,
  onTooltipChange,
  pduMetrics,
  rackAlerts = [],
}: {
  component: InfrastructureComponent & { slot?: number; span?: number };
  horizontal?: boolean;
  style?: React.CSSProperties;
  rackName?: string;
  onTooltipChange?: (payload: HUDTooltipProps | null) => void;
  pduMetrics?: Record<
    string,
    {
      activepower_watt?: number;
      activeenergy_wh?: number;
      apparentpower_va?: number;
      current_amp?: number;
      inlet_rating_amp?: number;
    }
  >;
  rackAlerts?: AlertCheck[];
}) => {
  // Derive component health from rack-level alerts for PDU checks
  const pduCheckIds = new Set(component.checks ?? []);
  const relevantAlerts = rackAlerts.filter((a) => pduCheckIds.has(a.id));
  const compHealth = relevantAlerts.some((a) => a.severity === 'CRIT')
    ? 'CRIT'
    : relevantAlerts.some((a) => a.severity === 'WARN')
      ? 'WARN'
      : 'OK';

  const accent =
    compHealth === 'CRIT'
      ? 'text-status-crit border-status-crit/60'
      : compHealth === 'WARN'
        ? 'text-status-warn border-status-warn/60'
        : component.type === 'power'
          ? 'text-status-warn/50 border-status-warn/30'
          : component.type === 'cooling'
            ? 'text-blue-400 border-blue-500/40'
            : component.type === 'management'
              ? 'text-cyan-400 border-cyan-500/40'
              : component.type === 'network'
                ? 'text-indigo-400 border-indigo-500/40'
                : 'text-gray-400 border-[var(--color-border)]/40';
  const layout = horizontal ? 'h-full w-full' : 'h-full w-full';
  const Icon =
    component.type === 'power'
      ? Power
      : component.type === 'cooling'
        ? Thermometer
        : component.type === 'management'
          ? Activity
          : component.type === 'network'
            ? RouterIcon
            : Box;
  const pduEntries = component.type === 'power' ? Object.values(pduMetrics ?? {}) : [];
  const hasPduMetrics = component.type === 'power' && pduEntries.length > 0;
  const totalPower = pduEntries.reduce((sum, pdu) => sum + (pdu.activepower_watt ?? 0), 0);
  const totalEnergy = pduEntries.reduce((sum, pdu) => sum + (pdu.activeenergy_wh ?? 0), 0);
  const maxCurrent = pduEntries.reduce((max, pdu) => Math.max(max, pdu.current_amp ?? 0), 0);
  return (
    <div
      className={`border bg-[var(--color-node-surface)]/70 ${accent} rounded-[2px] ${layout} flex items-center justify-center px-1 font-mono text-[8px] tracking-widest uppercase shadow-[inset_0_0_12px_rgba(0,0,0,0.25)]`}
      style={style}
      onMouseEnter={(e) => {
        const details = [
          { label: 'Rack', value: rackName ?? 'Unknown' },
          { label: 'Type', value: component.type.toUpperCase() },
          {
            label: 'Location',
            value:
              component.location === 'side-left' || component.location === 'side-right'
                ? 'SIDE'
                : 'U-MOUNT',
          },
        ];
        if (hasPduMetrics) {
          details.push({
            label: 'Power',
            value: `${(totalPower / 1000).toFixed(2)} kW`,
          });
          details.push({
            label: 'Energy (1h)',
            value: `${(totalEnergy / 1000).toFixed(1)} kWh`,
          });
          details.push({
            label: 'Peak Current',
            value: `${maxCurrent.toFixed(1)} A`,
          });
        }
        const checkReasons: TooltipReason[] =
          component.checks && component.checks.length > 0
            ? component.checks.map((id) => ({ label: id.replace(/_/g, ' ') }))
            : [{ label: 'No checks configured for this component' }];
        onTooltipChange?.({
          title: component.name,
          subtitle: component.type === 'power' ? 'PDU' : 'Rack Component',
          status: compHealth,
          details,
          reasons:
            relevantAlerts.length > 0
              ? relevantAlerts.map((a) => ({
                  label: a.name ?? a.id.replace(/_/g, ' '),
                  severity: a.severity,
                }))
              : checkReasons,
          mousePos: { x: e.clientX, y: e.clientY },
        });
      }}
      onMouseMove={(e) => {
        const details = [
          { label: 'Rack', value: rackName ?? 'Unknown' },
          { label: 'Type', value: component.type.toUpperCase() },
          {
            label: 'Location',
            value:
              component.location === 'side-left' || component.location === 'side-right'
                ? 'SIDE'
                : 'U-MOUNT',
          },
        ];
        if (hasPduMetrics) {
          details.push({
            label: 'Power',
            value: `${(totalPower / 1000).toFixed(2)} kW`,
          });
          details.push({
            label: 'Energy (1h)',
            value: `${(totalEnergy / 1000).toFixed(1)} kWh`,
          });
          details.push({
            label: 'Peak Current',
            value: `${maxCurrent.toFixed(1)} A`,
          });
        }
        const checkReasons: TooltipReason[] =
          component.checks && component.checks.length > 0
            ? component.checks.map((id) => ({ label: id.replace(/_/g, ' ') }))
            : [{ label: 'No checks configured for this component' }];
        onTooltipChange?.({
          title: component.name,
          subtitle: component.type === 'power' ? 'PDU' : 'Rack Component',
          status: compHealth,
          details,
          reasons:
            relevantAlerts.length > 0
              ? relevantAlerts.map((a) => ({
                  label: a.name ?? a.id.replace(/_/g, ' '),
                  severity: a.severity,
                }))
              : checkReasons,
          mousePos: { x: e.clientX, y: e.clientY },
        });
      }}
      onMouseLeave={() => {
        onTooltipChange?.(null);
      }}
    >
      <div className={`flex items-center gap-1 ${horizontal ? '' : 'flex-col'} truncate`}>
        <Icon className="h-3 w-3 opacity-70" />
        <span
          className="truncate"
          style={
            horizontal ? undefined : { writingMode: 'vertical-rl', transform: 'rotate(180deg)' }
          }
        >
          {component.type === 'power' ? 'PDU' : component.name}
        </span>
      </div>
    </div>
  );
};

const InfraOverlay = ({
  component,
  hasCollision,
}: {
  component: InfrastructureComponent;
  hasCollision: boolean;
}) => {
  const base = 'bg-[var(--color-node-surface)]/70 border border-[var(--color-border)]/30';
  const accent =
    component.type === 'power'
      ? 'text-status-warn border-status-warn/40'
      : component.type === 'cooling'
        ? 'text-blue-400 border-blue-500/40'
        : component.type === 'management'
          ? 'text-cyan-400 border-cyan-500/40'
          : 'text-gray-400 border-[var(--color-border)]/40';
  return (
    <div
      className={`h-full w-full ${base} ${accent} pointer-events-none flex items-center justify-between rounded-[2px] px-2 font-mono text-[9px] tracking-widest uppercase`}
    >
      <span className="truncate">{component.name}</span>
      {hasCollision && <span className="text-status-crit font-black">INVALID</span>}
    </div>
  );
};

export const DeviceChassis = ({
  device,
  template,
  rackHealth,
  nodesData,
  isRearView,
  uPosition,
  onClick,
  onTooltipChange,
  detailView = false,
  disableZoom = false,
  rackWidth,
}: {
  device: Device;
  template: DeviceTemplate;
  rackHealth: string;
  nodesData?: Record<string, RackNodeState>;
  isRearView?: boolean;
  uPosition: number;
  onClick?: () => void;
  onTooltipChange?: (payload: HUDTooltipProps | null) => void;
  detailView?: boolean;
  disableZoom?: boolean;
  /**
   * Card width in pixels (from cluster view). When provided, node labels are
   * hidden if the per-column width is too narrow to display text legibly.
   */
  rackWidth?: number;
}) => {
  const [suppressTooltip, setSuppressTooltip] = useState(false);
  const metricsThresholds = useMetricsThresholds();
  // Template-level thresholds override the metrics library defaults.
  // Allows per-device-type tuning (GPU: warn=52°C, switch: warn=40°C, etc.)
  const tempThresholds =
    template.display_thresholds?.temperature ?? metricsThresholds['node_temperature'];

  const nodeMap = useMemo(() => {
    // For storage devices, create virtual node IDs per slot
    if (template.type === 'storage') {
      const instanceInput = device.instance || device.nodes;
      // Get the single instance name (storage arrays have 1 controller instance)
      let instanceName: string;
      if (typeof instanceInput === 'string') {
        instanceName = instanceInput;
      } else if (Array.isArray(instanceInput) && instanceInput.length > 0) {
        instanceName = instanceInput[0];
      } else if (instanceInput && typeof instanceInput === 'object') {
        const values = Object.values(instanceInput);
        instanceName = values[0] ?? 'unknown';
      } else {
        instanceName = device.id;
      }

      // Get disk layout (or fallback to layout)
      const diskLayout = template.disk_layout ?? template.layout;
      if (!diskLayout?.matrix) {
        return { 1: instanceName };
      }

      // Create virtual node map: {slot: "instance:slotN"}
      const virtualNodeMap: Record<number, string> = {};
      diskLayout.matrix.flat().forEach((slotNum) => {
        if (slotNum > 0) {
          virtualNodeMap[slotNum] = `${instanceName}:slot${slotNum}`;
        }
      });
      return virtualNodeMap;
    }

    // For non-storage devices, use standard expansion
    return expandInstanceMap((device.instance || device.nodes) as InstanceInput);
  }, [
    device.instance,
    device.nodes,
    device.id,
    template.type,
    template.disk_layout,
    template.layout,
  ]);
  const instanceList = useMemo(() => Object.values(nodeMap).filter(Boolean), [nodeMap]);
  const chassisHealth = useMemo(() => {
    if (!nodesData) return rackHealth;
    const nodeIds = Object.values(nodeMap);
    const states = nodeIds.map((id) => nodesData[id]?.state).filter(Boolean);
    if (states.length === 0) return rackHealth;
    const critCount = states.filter((s) => s === 'CRIT').length;
    const warnCount = states.filter((s) => s === 'WARN').length;
    if (critCount === states.length && states.length > 0) return 'CRIT';
    if (critCount > 0 || warnCount > 0) return 'WARN';
    return 'OK';
  }, [nodesData, nodeMap, rackHealth]);
  const chassisChecks = useMemo(() => {
    if (!nodesData) return [];
    const checkIds = new Set<string>();
    for (const nodeId of instanceList) {
      const checks = nodesData[nodeId]?.checks;
      if (!Array.isArray(checks)) continue;
      for (const check of checks) {
        if (check?.id) checkIds.add(check.id);
      }
    }
    return Array.from(checkIds);
  }, [instanceList, nodesData]);

  const chassisAlerts = useMemo((): TooltipReason[] => {
    if (!nodesData) return [];
    // Deduplicate by check ID, keeping the most critical severity
    const alertMap = new Map<string, TooltipReason>();
    const sevOrder = (s?: string) => (s === 'CRIT' ? 2 : s === 'WARN' ? 1 : 0);
    for (const nodeId of instanceList) {
      const alerts = nodesData[nodeId]?.alerts;
      if (!Array.isArray(alerts)) continue;
      for (const alert of alerts) {
        if (!alert?.id) continue;
        const existing = alertMap.get(alert.id);
        if (!existing || sevOrder(alert.severity) > sevOrder(existing.severity)) {
          alertMap.set(alert.id, {
            label: alert.name ?? alert.id.replace(/_/g, ' '),
            severity: alert.severity,
          });
        }
      }
    }
    return Array.from(alertMap.values());
  }, [instanceList, nodesData]);

  const hasRearLayout = Boolean(template.rear_layout);
  if (isRearView && !hasRearLayout) {
    return null;
  }
  // For storage devices, use disk_layout if available, otherwise fallback to layout
  const frontLayout =
    template.type === 'storage' && template.disk_layout ? template.disk_layout : template.layout;
  const layout = isRearView && hasRearLayout ? template.rear_layout : frontLayout;

  // Safety check: layout should never be null for a valid device
  if (!layout) {
    console.error('Device template missing layout configuration:', template);
    return null;
  }

  // For storage in detail view, force full grid display (not high density mode)
  const forceFullGrid = detailView && template.type === 'storage';
  const isHighDensity = !forceFullGrid && layout.cols > 8 && template.type !== 'network';
  // Auto-hide text when per-column width is too narrow (< 65px) for legible display.
  // Rack interior = rackWidth - 2×16(p-4) - 2×24(border-x) = rackWidth - 80px.
  const compactHideText =
    rackWidth !== undefined && layout.cols > 1 ? (rackWidth - 80) / layout.cols < 65 : false;

  let borderColor = 'border-[var(--color-border)]/30';
  let bgColor = 'bg-[var(--color-device-surface)]';
  if (template.type === 'network') {
    borderColor = 'border-blue-500/40';
    bgColor = 'bg-blue-500/5';
  }
  const statusColor =
    chassisHealth === 'OK'
      ? 'bg-status-ok'
      : chassisHealth === 'CRIT'
        ? 'bg-status-crit'
        : chassisHealth === 'WARN'
          ? 'bg-status-warn'
          : 'bg-gray-600';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`h-full w-full border ${borderColor} ${bgColor} group relative flex rounded-[2px] transition-all duration-200 ${
        disableZoom ? '' : 'hover:z-[100] hover:scale-[1.03] hover:shadow-2xl'
      } ${onClick ? 'cursor-pointer' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        if (suppressTooltip) return;
        const chassisCheckSummary = {
          ok: Math.max(0, chassisChecks.length - chassisAlerts.length),
          warn: chassisAlerts.filter((a) => a.severity === 'WARN').length,
          crit: chassisAlerts.filter((a) => a.severity === 'CRIT').length,
        };
        onTooltipChange?.({
          title: device.name,
          subtitle:
            template.type === 'storage'
              ? 'Storage'
              : template.type === 'network'
                ? 'Network'
                : 'Device',
          status: chassisHealth,
          enclosure: template.name !== device.name ? template.name : undefined,
          checkSummary: chassisCheckSummary,
          details: [
            { label: 'Location', value: `RACK U${uPosition}`, italic: true },
            {
              label: 'Nodes',
              value:
                instanceList.length > 3
                  ? `${instanceList.slice(0, 3).join(', ')} +${instanceList.length - 3}`
                  : instanceList.join(', ') || 'None',
            },
          ],
          reasons:
            chassisAlerts.length > 0
              ? chassisAlerts
              : template.checks?.length
                ? []
                : [{ label: 'No checks configured' }],
          mousePos: { x: e.clientX, y: e.clientY },
        });
      }}
      onMouseMove={(e) => {
        if (suppressTooltip) return;
        const chassisCheckSummary = {
          ok: Math.max(0, chassisChecks.length - chassisAlerts.length),
          warn: chassisAlerts.filter((a) => a.severity === 'WARN').length,
          crit: chassisAlerts.filter((a) => a.severity === 'CRIT').length,
        };
        onTooltipChange?.({
          title: device.name,
          subtitle:
            template.type === 'storage'
              ? 'Storage'
              : template.type === 'network'
                ? 'Network'
                : 'Device',
          status: chassisHealth,
          enclosure: template.name !== device.name ? template.name : undefined,
          checkSummary: chassisCheckSummary,
          details: [
            { label: 'Location', value: `RACK U${uPosition}`, italic: true },
            {
              label: 'Nodes',
              value:
                instanceList.length > 3
                  ? `${instanceList.slice(0, 3).join(', ')} +${instanceList.length - 3}`
                  : instanceList.join(', ') || 'None',
            },
          ],
          reasons:
            chassisAlerts.length > 0
              ? chassisAlerts
              : template.checks?.length
                ? []
                : [{ label: 'No checks configured' }],
          mousePos: { x: e.clientX, y: e.clientY },
        });
      }}
      onMouseLeave={() => {
        onTooltipChange?.(null);
      }}
    >
      <div className={`h-full w-1.5 ${statusColor} relative shrink-0 opacity-90`}>
        <div className={`absolute inset-0 blur-[4px] ${statusColor} opacity-40`}></div>
      </div>
      <div
        className="grid min-w-0 flex-1 gap-[1px] overflow-hidden bg-[var(--color-border)]/5 p-[1px]"
        style={{
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: isHighDensity ? '1fr' : `repeat(${layout.cols}, 1fr)`,
        }}
      >
        {layout.matrix.map((row, rIdx) =>
          isHighDensity ? (
            <RowSummaryUnit
              key={rIdx}
              rowNodes={row.map((slot) => nodeMap[slot])}
              nodesData={nodesData ?? {}}
              label={
                template.type === 'storage'
                  ? (frontLayout?.rows ?? 1) > 1
                    ? `DRAWER ${rIdx + 1}`
                    : 'STORAGE ARRAY'
                  : template.name
              }
            />
          ) : (
            row.map((slotNum, cIdx) => {
              if (isRearView && slotNum > 900)
                return (
                  <RearModuleUnit
                    key={`${rIdx}-${cIdx}`}
                    type={slotNum % 2 === 0 ? 'psu' : 'fan'}
                  />
                );
              const nodeId = nodeMap[slotNum];
              const nodeHealth =
                (nodeId && nodesData?.[nodeId] ? nodesData[nodeId].state : undefined) ??
                'UNKNOWN';
              const nodeMetrics =
                nodeId && nodesData?.[nodeId] ? nodesData[nodeId] : undefined;
              return (
                <NodeUnit
                  key={`${rIdx}-${cIdx}`}
                  nodeName={nodeId}
                  slotNum={slotNum}
                  nodeHealth={nodeHealth}
                  nodeMetrics={nodeMetrics}
                  tempThresholds={tempThresholds}
                  type={template.type}
                  uHeight={template.u_height}
                  uPosition={uPosition}
                  chassisName={template.name}
                  onHoverChange={setSuppressTooltip}
                  onTooltipChange={onTooltipChange}
                  hideText={forceFullGrid || compactHideText}
                />
              );
            })
          )
        )}
      </div>
    </div>
  );
};

const RearModuleUnit = ({ type }: { type: 'psu' | 'fan' }) => {
  return (
    <div className="group relative flex h-full items-center justify-center border border-[var(--color-border)]/20 bg-[var(--color-node-surface)] transition-colors hover:bg-white/10">
      {type === 'fan' ? (
        <Fan className="h-5 w-5 animate-[spin_2s_linear_infinite] text-gray-600" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <Power className="h-4 w-4 text-gray-400" />
          <div className="bg-status-ok h-2 w-2 rounded-full shadow-[0_0_5px_var(--color-status-ok)]"></div>
        </div>
      )}
    </div>
  );
};

const RowSummaryUnit = ({
  rowNodes,
  nodesData,
  label,
}: {
  rowNodes: (string | undefined)[];
  nodesData: Record<string, RackNodeState>;
  label: string;
}) => {
  let worstState = 'OK';
  rowNodes.forEach((nodeId) => {
    if (!nodeId || !nodesData[nodeId]) return;
    const state = nodesData[nodeId].state;
    if (state === 'CRIT') worstState = 'CRIT';
    else if (state === 'WARN' && worstState !== 'CRIT') worstState = 'WARN';
  });
  const statusColor =
    worstState === 'CRIT'
      ? 'bg-status-crit'
      : worstState === 'WARN'
        ? 'bg-status-warn'
        : 'bg-status-ok';
  return (
    <div
      className={`group relative flex h-full min-w-0 cursor-help items-center justify-between overflow-hidden border-b border-[var(--color-border)]/10 bg-[var(--color-node-surface)] px-2 transition-colors last:border-0 hover:bg-[var(--color-accent-primary)]/10`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor} ${worstState === 'CRIT' ? 'animate-pulse shadow-[0_0_10px_var(--color-status-crit)]' : ''}`}
        ></div>
        <span className="min-w-0 truncate font-mono text-[11px] font-black tracking-widest text-[var(--color-text-base)] uppercase opacity-50 group-hover:opacity-100">
          {label}
        </span>
      </div>
      <div className="flex shrink-0 gap-3 opacity-30 group-hover:opacity-100">
        <span className="font-mono text-[9px] font-bold text-gray-500 uppercase">
          {rowNodes.length} UNITS
        </span>
      </div>
    </div>
  );
};

export const NodeUnit = ({
  nodeName,
  slotNum,
  nodeHealth,
  type,
  uHeight,
  uPosition,
  chassisName,
  nodeMetrics,
  tempThresholds,
  onHoverChange,
  onTooltipChange,
  hideText: hideTextProp,
}: {
  nodeName?: string;
  slotNum: number;
  nodeHealth: string;
  type?: string;
  uHeight: number;
  uPosition: number;
  chassisName: string;
  nodeMetrics?: RackNodeState;
  tempThresholds?: { warn?: number; crit?: number };
  onHoverChange?: (value: boolean) => void;
  onTooltipChange?: (payload: HUDTooltipProps | null) => void;
  hideText?: boolean;
}) => {
  const Icon = type === 'network' ? RouterIcon : Server;
  const hideText = hideTextProp ?? uHeight === 1;

  const checks = Array.isArray(nodeMetrics?.checks) ? (nodeMetrics.checks) : [];
  const alertList = Array.isArray(nodeMetrics?.alerts) ? (nodeMetrics.alerts) : [];
  const checkSummary = {
    ok: Math.max(0, checks.length - alertList.length),
    warn: alertList.filter((a) => a.severity === 'WARN').length,
    crit: alertList.filter((a) => a.severity === 'CRIT').length,
  };
  const reasons: TooltipReason[] = alertList
    .map((alert) => ({
      label: alert?.name ?? alert?.id?.replace(/_/g, ' ') ?? '',
      severity: alert?.severity,
    }))
    .filter((r) => r.label);

  const tooltipPayload = (): HUDTooltipProps => ({
    title: nodeName ?? 'UNASSIGNED',
    subtitle: 'Node',
    status: nodeHealth,
    enclosure: chassisName,
    checkSummary,
    details: [{ label: 'Location', value: `RACK U${uPosition} · S${slotNum}`, italic: true }],
    reasons,
    metrics: nodeMetrics
      ? {
          temp: nodeMetrics.temperature,
          tempWarn: tempThresholds?.warn,
          tempCrit: tempThresholds?.crit,
          power: nodeMetrics.power,
        }
      : undefined,
    mousePos: { x: 0, y: 0 },
  });

  return (
    <div
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHoverChange?.(true);
        onTooltipChange?.({ ...tooltipPayload(), mousePos: { x: e.clientX, y: e.clientY } });
      }}
      onMouseMove={(e) => {
        e.stopPropagation();
        onTooltipChange?.({ ...tooltipPayload(), mousePos: { x: e.clientX, y: e.clientY } });
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onHoverChange?.(false);
        onTooltipChange?.(null);
      }}
      className={`group relative flex h-full min-w-0 cursor-help items-center justify-center border border-[var(--color-border)]/20 bg-[var(--color-node-surface)] transition-all hover:bg-[var(--color-accent-primary)]/20`}
    >
      {nodeName ? (
        <div className="flex h-full w-full items-center justify-center overflow-hidden px-1">
          {hideText ? (
            <Icon
              className={`h-3 w-3 shrink-0 ${
                nodeHealth === 'OK'
                  ? 'text-[var(--color-status-ok)]'
                  : nodeHealth === 'CRIT'
                    ? 'animate-pulse text-[var(--color-status-crit)]'
                    : 'text-[var(--color-status-warn)]'
              }`}
            />
          ) : (
            <div className="flex w-full items-center justify-center gap-1 overflow-hidden">
              <Icon
                className={`h-3 w-3 shrink-0 ${
                  nodeHealth === 'OK'
                    ? 'text-[var(--color-status-ok)]'
                    : nodeHealth === 'CRIT'
                      ? 'animate-pulse text-[var(--color-status-crit)]'
                      : 'text-[var(--color-status-warn)]'
                }`}
              />
              <span className="min-w-0 truncate font-mono text-[10px] font-black tracking-tight text-[var(--color-text-base)] uppercase opacity-50 group-hover:opacity-100">
                {nodeName}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="font-mono text-[8px] text-gray-400 uppercase italic opacity-20">
          U{slotNum}
        </div>
      )}
    </div>
  );
};
