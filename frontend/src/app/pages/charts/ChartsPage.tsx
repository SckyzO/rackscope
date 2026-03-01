import { useState, useEffect, useRef } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, SectionCard } from '../templates/EmptyPage';

// ── Dark mode helper ──────────────────────────────────────────────────────────

const useDark = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
};

const baseChart = (): ApexOptions['chart'] => ({
  background: 'transparent',
  toolbar: { show: false },
  fontFamily: 'Outfit, system-ui, sans-serif',
});

const baseTheme = (dark: boolean): ApexOptions['theme'] => ({ mode: dark ? 'dark' : 'light' });

const BRAND = '#465fff';
const COLORS = ['#465fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const GRID = (dark: boolean): ApexOptions['grid'] => ({
  borderColor: dark ? '#1f2937' : '#f3f4f6',
  strokeDashArray: 4,
});
const AXIS_LABELS = (dark: boolean) => ({
  style: { colors: dark ? '#6b7280' : '#9ca3af', fontSize: '12px' },
});

// ── 1. Line / Area chart ──────────────────────────────────────────────────────

const LineAreaChart = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'area' },
    theme: baseTheme(dark),
    colors: [BRAND, '#10b981'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    grid: GRID(dark),
    xaxis: {
      categories: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ],
      labels: AXIS_LABELS(dark),
    },
    yaxis: { labels: { ...AXIS_LABELS(dark) } },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      labels: { colors: dark ? '#d1d5db' : '#374151' },
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[
        { name: 'Revenue', data: [31, 40, 28, 51, 42, 109, 100, 87, 78, 95, 110, 130] },
        { name: 'Expenses', data: [11, 32, 45, 32, 34, 52, 41, 67, 54, 72, 68, 80] },
      ]}
      type="area"
      height={280}
    />
  );
};

// ── 3. Donut chart ────────────────────────────────────────────────────────────

const DonutChart = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'donut' },
    theme: baseTheme(dark),
    colors: COLORS,
    labels: ['OK', 'WARN', 'CRIT', 'UNKNOWN', 'Other'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', labels: { colors: dark ? '#d1d5db' : '#374151' } },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: { show: true, label: 'Total', color: dark ? '#d1d5db' : '#374151' },
          },
        },
      },
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[44, 15, 8, 12, 21]}
      type="donut"
      height={280}
    />
  );
};

// ── 5. Realtime ────────────────────────────────────────────────────────────────

const RealtimeChart = () => {
  const dark = useDark();
  // In react-apexcharts v2, chartRef is a prop — current = ApexCharts instance directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // useState lazy initializer avoids calling impure functions during render
  const [initData] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      x: Date.now() - (30 - i) * 2000,
      y: Math.floor(Math.random() * 40) + 30,
    }))
  );
  const bufRef = useRef(initData);

  useEffect(() => {
    const t = setInterval(() => {
      const last = bufRef.current[bufRef.current.length - 1];
      bufRef.current = [
        ...bufRef.current.slice(-29),
        { x: last.x + 2000, y: Math.max(20, Math.min(95, last.y + (Math.random() - 0.5) * 14)) },
      ];
      // v2: chartRef.current IS the ApexCharts instance (no .chart wrapper)
      chartRef.current?.updateSeries?.([{ data: [...bufRef.current] }], false);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const options: ApexOptions = {
    chart: {
      ...baseChart(),
      type: 'line',
      animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } },
    },
    theme: baseTheme(dark),
    colors: [BRAND],
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    grid: GRID(dark),
    xaxis: {
      type: 'datetime',
      range: 60000,
      labels: { ...AXIS_LABELS(dark), datetimeFormatter: { minute: 'HH:mm:ss' } },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: { formatter: (v) => `${Math.round(v)}%`, ...AXIS_LABELS(dark) },
    },
    annotations: {
      yaxis: [
        {
          y: 70,
          borderColor: '#f59e0b',
          label: {
            text: 'WARN 70%',
            style: { color: '#f59e0b', background: 'transparent', border: 0 },
          },
        },
        {
          y: 85,
          borderColor: '#ef4444',
          label: {
            text: 'CRIT 85%',
            style: { color: '#ef4444', background: 'transparent', border: 0 },
          },
        },
      ],
    },
    tooltip: { theme: dark ? 'dark' : 'light', x: { format: 'HH:mm:ss' } },
  };
  return (
    <ReactApexChart
      chartRef={chartRef}
      key={String(dark)}
      options={options}
      series={[{ name: 'CPU Load', data: initData }]}
      type="line"
      height={220}
    />
  );
};

// ── 7. Radial Bar ─────────────────────────────────────────────────────────────

const RadialBarChart = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'radialBar' },
    theme: baseTheme(dark),
    colors: [BRAND, '#10b981', '#f59e0b', '#ef4444'],
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: 0,
        endAngle: 270,
        hollow: { margin: 5, size: '30%', background: 'transparent' },
        dataLabels: {
          name: { show: false },
          value: { show: false },
          total: {
            show: true,
            label: 'Health',
            color: dark ? '#d1d5db' : '#374151',
            formatter: () => '78%',
          },
        },
        track: { background: dark ? '#1f2937' : '#f3f4f6' },
      },
    },
    labels: ['Servers', 'Switches', 'Storage', 'PDUs'],
    legend: {
      show: true,
      position: 'left',
      offsetY: 40,
      labels: { colors: dark ? '#d1d5db' : '#374151' },
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[91, 85, 78, 62]}
      type="radialBar"
      height={260}
    />
  );
};

/** Donut with right-side legend — compact, no data labels */
const DonutRightLegend = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'donut' },
    theme: baseTheme(dark),
    colors: COLORS,
    labels: ['OK', 'WARN', 'CRIT', 'UNKNOWN'],
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    legend: {
      position: 'right',
      offsetY: 0,
      height: 230,
      labels: { colors: dark ? '#d1d5db' : '#374151' },
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
    responsive: [{ breakpoint: 480, options: { chart: { width: 200 }, legend: { show: false } } }],
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[44, 25, 13, 18]}
      type="donut"
      height={280}
    />
  );
};

// ── 9. Semi-circle gauge ─────────────────────────────────────────────────────
// startAngle: -90, endAngle: 90 → half-circle gauge

const SemiCircleGauge = ({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'radialBar' },
    theme: baseTheme(dark),
    colors: [color],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: { background: dark ? '#1f2937' : '#f3f4f6', startAngle: -90, endAngle: 90 },
        hollow: { size: '60%' },
        dataLabels: {
          name: { show: true, color: dark ? '#9ca3af' : '#6b7280', fontSize: '13px', offsetY: -5 },
          value: {
            show: true,
            fontSize: '22px',
            fontWeight: '700',
            color: color,
            offsetY: -35,
            formatter: (v) => `${Math.round(v)}%`,
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        gradientToColors: [color + 'aa'],
        stops: [0, 100],
      },
    },
    stroke: { lineCap: 'round' },
    labels: [label],
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[value]}
      type="radialBar"
      height={200}
    />
  );
};

// ── 10. Gradient circle ───────────────────────────────────────────────────────

const GradientRadial = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'radialBar' },
    theme: baseTheme(dark),
    colors: [BRAND],
    plotOptions: {
      radialBar: {
        hollow: { size: '70%' },
        track: { background: dark ? '#1f2937' : '#f3f4f6', strokeWidth: '50%' },
        dataLabels: {
          name: { show: true, color: dark ? '#9ca3af' : '#6b7280', fontSize: '14px', offsetY: -10 },
          value: {
            show: true,
            fontSize: '28px',
            fontWeight: '700',
            color: BRAND,
            offsetY: 5,
            formatter: (v) => `${Math.round(v)}%`,
          },
        },
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        gradientToColors: ['#10b981'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: { lineCap: 'round' },
    labels: ['Overall Health'],
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[78]}
      type="radialBar"
      height={240}
    />
  );
};

// ── 11. Stroked / thin gauge ──────────────────────────────────────────────────

const StrokedGauge = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'radialBar' },
    theme: baseTheme(dark),
    colors: ['#10b981', '#f59e0b', '#ef4444', '#465fff'],
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '50%', background: 'transparent' },
        track: { background: dark ? '#1f2937' : '#f3f4f6', strokeWidth: '20%', margin: 8 },
        dataLabels: {
          name: { fontSize: '13px', color: dark ? '#9ca3af' : '#6b7280', offsetY: -10 },
          value: {
            fontSize: '22px',
            fontWeight: '700',
            color: dark ? '#e5e7eb' : '#111827',
            offsetY: 5,
            formatter: (v) => `${Math.round(v)}%`,
          },
          total: {
            show: true,
            label: 'Cluster',
            color: dark ? '#6b7280' : '#9ca3af',
            fontSize: '12px',
            formatter: () => '82%',
          },
        },
      },
    },
    labels: ['OK', 'WARN', 'CRIT', 'UNKNOWN'],
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[91, 67, 42, 15]}
      type="radialBar"
      height={280}
    />
  );
};

// ── Sparkline group ───────────────────────────────────────────────────────────
// Row of mini inline charts — useful for a metrics overview at-a-glance panel.

const SparklineGroup = () => {
  const dark = useDark();
  const sparkOpts = (color: string, _data: number[]): ApexOptions => ({
    chart: { ...baseChart(), type: 'line', sparkline: { enabled: true } },
    theme: baseTheme(dark),
    colors: [color],
    stroke: { curve: 'smooth', width: 2 },
    tooltip: { theme: dark ? 'dark' : 'light', fixed: { enabled: false } },
  });
  const items = [
    { label: 'CPU', value: '78%', color: BRAND, data: [32, 44, 55, 51, 49, 60, 71, 65, 78] },
    { label: 'Memory', value: '61%', color: '#10b981', data: [52, 58, 60, 55, 59, 61, 64, 60, 61] },
    { label: 'Temp', value: '68°C', color: '#ef4444', data: [60, 62, 65, 68, 71, 69, 66, 67, 68] },
    {
      label: 'Power',
      value: '3.2 kW',
      color: '#f59e0b',
      data: [28, 32, 35, 31, 34, 38, 36, 33, 32],
    },
    {
      label: 'Net in',
      value: '1.4 Gb',
      color: '#8b5cf6',
      data: [10, 25, 30, 22, 35, 40, 38, 42, 45],
    },
    {
      label: 'Disk IO',
      value: '420 MB',
      color: '#0891b2',
      data: [80, 70, 90, 100, 85, 95, 88, 92, 85],
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ label, value, color, data }) => (
        <div
          key={label}
          className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-xl font-bold" style={{ color }}>
            {value}
          </p>
          <div className="mt-2">
            <ReactApexChart
              key={String(dark)}
              options={sparkOpts(color, data)}
              series={[{ data }]}
              type="line"
              height={40}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Treemap — rack space ───────────────────────────────────────────────────────
// Inspired by Context7 treemap docs — useful for visualizing rack device space.

const TreemapChart = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'treemap' },
    theme: baseTheme(dark),
    colors: [BRAND, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0891b2'],
    plotOptions: { treemap: { distributed: true, enableShades: false } },
    dataLabels: { style: { fontSize: '12px', fontWeight: '600' } },
    tooltip: { theme: dark ? 'dark' : 'light' },
    legend: { show: false },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[
        {
          data: [
            { x: 'Compute (×20)', y: 80 },
            { x: 'Storage array', y: 40 },
            { x: 'IB Switch', y: 8 },
            { x: 'Eth Switch', y: 4 },
            { x: 'PDU ×4', y: 12 },
            { x: 'Service ×2', y: 8 },
            { x: 'Empty', y: 48 },
          ],
        },
      ]}
      type="treemap"
      height={280}
    />
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'realtime', label: 'Realtime' },
  { id: 'line-area', label: 'Line / Area' },
  { id: 'radial-bar', label: 'Radial Bar' },
  { id: 'gradient-circle', label: 'Gradient Circle' },
  { id: 'donut', label: 'Donut' },
  { id: 'donut-legend', label: 'Donut Legend' },
  { id: 'semi-circle', label: 'Semi-circle' },
  { id: 'stroked', label: 'Stroked Gauge' },
  { id: 'sparklines', label: 'Sparklines' },
  { id: 'treemap', label: 'Treemap' },
];

export const ChartsPage = () => {
  usePageTitle('Charts');

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charts"
        description="Interactive data visualizations powered by ApexCharts — 10 chart types."
      />

      {/* Sticky nav */}
      <div className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex gap-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 1 — Realtime */}
      <div id="realtime">
        <SectionCard
          title="Realtime"
          desc="Live metric with WARN/CRIT thresholds — updates every 2s. Ideal for current node temp, power, or network throughput."
        >
          <RealtimeChart />
        </SectionCard>
      </div>

      {/* 2 — Line / Area */}
      <div id="line-area">
        <SectionCard
          title="Line / Area"
          desc="Smooth area chart with gradient fill — 24h time series. Standard chart for temperature, power, CPU, memory."
        >
          <LineAreaChart />
        </SectionCard>
      </div>

      {/* 3 — Radial Bar */}
      <div id="radial-bar">
        <SectionCard
          title="Radial Bar"
          desc="Multi-series radial gauge — health percentage per device type. Good for cluster-level summary."
        >
          <RadialBarChart />
        </SectionCard>
      </div>

      {/* 4 + 5 — Gauges: Gradient Circle + Semi-circle */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="gradient-circle">
          <SectionCard
            title="Gradient Circle"
            desc="Full circle radialBar with gradient fill — single KPI like cluster load."
          >
            <GradientRadial />
          </SectionCard>
        </div>
        <div id="semi-circle">
          <SectionCard
            title="Semi-circle Gauges"
            desc="Half-circle format — ideal for 3 related KPIs side by side (CPU / Mem / Disk)."
          >
            <div className="flex justify-around">
              <SemiCircleGauge value={78} label="CPU" color={BRAND} />
              <SemiCircleGauge value={62} label="Memory" color="#10b981" />
              <SemiCircleGauge value={91} label="Disk" color="#f59e0b" />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 6 — Stroked Gauge */}
      <div id="stroked">
        <SectionCard
          title="Stroked Gauge"
          desc="Thin multi-track radialBar (-135° to 135°) — 3 metrics on one dial. Good for cluster overview."
        >
          <StrokedGauge />
        </SectionCard>
      </div>

      {/* 7 + 8 — Donut variants */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div id="donut">
          <SectionCard
            title="Donut"
            desc="Health state distribution with center total — OK / WARN / CRIT / UNKNOWN."
          >
            <DonutChart />
          </SectionCard>
        </div>
        <div id="donut-legend">
          <SectionCard
            title="Donut — Right Legend"
            desc="Compact donut with right-side legend — fits in narrow panels."
          >
            <DonutRightLegend />
          </SectionCard>
        </div>
      </div>

      {/* 9 — Sparklines */}
      <div id="sparklines">
        <SectionCard
          title="Sparklines"
          desc="Mini inline trend charts — useful for at-a-glance metric overview panels. 6 KPIs in one row."
        >
          <SparklineGroup />
        </SectionCard>
      </div>

      {/* 10 — Treemap */}
      <div id="treemap">
        <SectionCard
          title="Treemap"
          desc="Area-proportional blocks — visualize rack device footprint by U-height. Distributed colors per cell (Context7 pattern)."
        >
          <TreemapChart />
        </SectionCard>
      </div>
    </div>
  );
};
