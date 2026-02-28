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

// ── 2. Bar chart ──────────────────────────────────────────────────────────────

const BarChart = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'bar' },
    theme: baseTheme(dark),
    colors: [BRAND, '#10b981'],
    plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    grid: GRID(dark),
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      labels: AXIS_LABELS(dark),
    },
    yaxis: { labels: { ...AXIS_LABELS(dark) } },
    legend: { position: 'top', labels: { colors: dark ? '#d1d5db' : '#374151' } },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[
        { name: 'Sales', data: [44, 55, 57, 56, 61, 58, 63] },
        { name: 'Revenue', data: [76, 85, 101, 98, 87, 105, 91] },
      ]}
      type="bar"
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

// ── 4. Heatmap ────────────────────────────────────────────────────────────────

const HeatmapChart = () => {
  const dark = useDark();
  const gen = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      x: `N${String(i + 1).padStart(2, '0')}`,
      y: Math.floor(Math.random() * 100),
    }));
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'heatmap' },
    theme: baseTheme(dark),
    dataLabels: { enabled: false },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 30, color: '#10b981', name: 'OK' },
            { from: 31, to: 65, color: '#f59e0b', name: 'WARN' },
            { from: 66, to: 100, color: '#ef4444', name: 'CRIT' },
          ],
        },
      },
    },
    grid: GRID(dark),
    xaxis: {
      labels: { ...AXIS_LABELS(dark), style: { ...AXIS_LABELS(dark).style, fontSize: '10px' } },
    },
    yaxis: { labels: { ...AXIS_LABELS(dark) } },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[
        { name: 'Aisle A', data: gen(12) },
        { name: 'Aisle B', data: gen(12) },
        { name: 'Aisle C', data: gen(12) },
        { name: 'Aisle D', data: gen(12) },
      ]}
      type="heatmap"
      height={220}
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

// ── 6. Mixed: area + column ───────────────────────────────────────────────────

const MixedChart = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'line', stacked: false },
    theme: baseTheme(dark),
    colors: [BRAND, '#10b981', '#f59e0b'],
    stroke: { width: [2, 2, 0], curve: 'smooth' },
    dataLabels: { enabled: false },
    fill: { opacity: [0.3, 0.3, 1] },
    grid: GRID(dark),
    xaxis: {
      categories: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      labels: AXIS_LABELS(dark),
    },
    yaxis: [
      {
        seriesName: 'Temperature',
        min: 0,
        max: 100,
        labels: { formatter: (v) => `${Math.round(v)}°C`, ...AXIS_LABELS(dark) },
      },
      {
        seriesName: 'Power',
        opposite: true,
        labels: { formatter: (v) => `${v.toFixed(1)}kW`, ...AXIS_LABELS(dark) },
      },
    ],
    legend: { position: 'top', labels: { colors: dark ? '#d1d5db' : '#374151' } },
    tooltip: { theme: dark ? 'dark' : 'light', shared: true, intersect: false },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[
        { name: 'Temperature', type: 'area', data: [38, 40, 45, 52, 48, 42, 40] },
        { name: 'Power (kW)', type: 'area', data: [3.2, 3.8, 4.5, 5.1, 4.8, 4.0, 3.5] },
        { name: 'Alerts', type: 'column', data: [0, 0, 2, 5, 1, 0, 0] },
      ]}
      type="line"
      height={260}
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

// ── 8. Pie chart variants ─────────────────────────────────────────────────────

/** Simple Pie — standard colored slices */
const SimplePie = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'pie' },
    theme: baseTheme(dark),
    colors: COLORS,
    labels: ['OK', 'WARN', 'CRIT', 'UNKNOWN', 'Maintenance'],
    dataLabels: { style: { fontSize: '11px', fontWeight: '600' } },
    legend: { position: 'bottom', labels: { colors: dark ? '#d1d5db' : '#374151' } },
    tooltip: { theme: dark ? 'dark' : 'light' },
    responsive: [{ breakpoint: 480, options: { legend: { position: 'bottom' } } }],
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[44, 15, 8, 12, 21]}
      type="pie"
      height={280}
    />
  );
};

/** Monochrome Pie — single brand color with shades, label = name + % */
const MonochromePie = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'pie' },
    theme: {
      ...baseTheme(dark),
      monochrome: {
        enabled: true,
        color: BRAND,
        shadeTo: dark ? 'dark' : 'light',
        shadeIntensity: 0.65,
      },
    },
    labels: ['Servers', 'Switches', 'Storage', 'PDUs', 'Cooling', 'Other'],
    plotOptions: { pie: { dataLabels: { offset: -5 } } },
    dataLabels: {
      formatter: (
        val: number,
        opts: { w: { globals: { labels: string[] } }; seriesIndex: number }
      ) => [opts.w.globals.labels[opts.seriesIndex], `${val.toFixed(1)}%`],
      style: { fontSize: '11px' },
    },
    grid: { padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    legend: { show: false },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[25, 15, 44, 55, 41, 17]}
      type="pie"
      height={280}
    />
  );
};

/** Gradient Donut — startAngle:-90 endAngle:270, gradient fill, legend with values */
const GradientDonut = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'donut' },
    theme: baseTheme(dark),
    colors: COLORS,
    series: [44, 55, 41, 17, 15],
    labels: ['OK', 'WARN', 'CRIT', 'UNKNOWN', 'Other'],
    plotOptions: { pie: { startAngle: -90, endAngle: 270 } },
    dataLabels: { enabled: false },
    fill: { type: 'gradient' },
    legend: {
      position: 'bottom',
      formatter: (
        val: string,
        opts: { w: { globals: { series: number[] } }; seriesIndex: number }
      ) => `${val} — ${opts.w.globals.series[opts.seriesIndex]}`,
      labels: { colors: dark ? '#d1d5db' : '#374151' },
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[44, 55, 41, 17, 15]}
      type="donut"
      height={280}
    />
  );
};

/** Pattern Fill Donut — fill with patterns (verticalLines, squares, circles…) */
const PatternDonut = () => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'donut' },
    theme: baseTheme(dark),
    colors: COLORS,
    labels: ['Servers', 'Network', 'Storage', 'PDUs'],
    dataLabels: { enabled: false },
    fill: {
      type: 'pattern',
      opacity: 1,
      pattern: {
        enabled: true,
        style: ['verticalLines', 'squares', 'horizontalLines', 'circles'],
        width: 6,
        height: 6,
        strokeWidth: 2,
      },
    },
    legend: { position: 'bottom', labels: { colors: dark ? '#d1d5db' : '#374151' } },
    stroke: { width: 0 },
    tooltip: { theme: dark ? 'dark' : 'light' },
  };
  return (
    <ReactApexChart
      key={String(dark)}
      options={options}
      series={[44, 55, 41, 17]}
      type="donut"
      height={280}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export const ChartsPage = () => {
  usePageTitle('Charts');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Charts"
        description="Interactive data visualizations powered by ApexCharts — 6 chart types."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Line / Area" desc="Revenue vs expenses over 12 months">
          <LineAreaChart />
        </SectionCard>
        <SectionCard title="Bar / Column" desc="Grouped bars — sales and revenue by day">
          <BarChart />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Donut" desc="Node health distribution with center total">
          <DonutChart />
        </SectionCard>
        <SectionCard title="Mixed" desc="Area + column combo — temperature, power, alerts">
          <MixedChart />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Heatmap" desc="Intensity grid — ideal for rack/node health maps">
          <HeatmapChart />
        </SectionCard>
        <SectionCard
          title="Realtime"
          desc="Live metric with WARN/CRIT thresholds — updates every 2s"
        >
          <RealtimeChart />
        </SectionCard>
      </div>

      {/* ── Radial bar ── */}
      <SectionCard title="Radial Bar" desc="Multi-series radial gauge — health per device type">
        <RadialBarChart />
      </SectionCard>

      {/* ── Pie chart variants ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Simple Pie" desc="Standard colored slices with labels">
          <SimplePie />
        </SectionCard>
        <SectionCard title="Monochrome Pie" desc="Single brand color with shades — name + % labels">
          <MonochromePie />
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Gradient Donut"
          desc="startAngle:-90 endAngle:270, gradient fill, legend with values"
        >
          <GradientDonut />
        </SectionCard>
        <SectionCard title="Donut — Right Legend" desc="Compact donut, legend on the right side">
          <DonutRightLegend />
        </SectionCard>
      </div>

      <SectionCard
        title="Pattern Fill Donut"
        desc="Fill with patterns: verticalLines, squares, horizontalLines, circles"
      >
        <PatternDonut />
      </SectionCard>
      {/* ── Radial bar variants ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Semi-circle Gauges" desc="Half-circle format — ideal for single KPIs">
          <div className="flex justify-around">
            <SemiCircleGauge value={78} label="CPU" color={BRAND} />
            <SemiCircleGauge value={62} label="Memory" color="#10b981" />
            <SemiCircleGauge value={91} label="Disk" color="#f59e0b" />
          </div>
        </SectionCard>
        <SectionCard title="Gradient Circle" desc="Full circle with gradient fill">
          <GradientRadial />
        </SectionCard>
        <SectionCard title="Stroked Gauge" desc="Thin tracks, -135° to 135°, cluster total">
          <StrokedGauge />
        </SectionCard>
      </div>
    </div>
  );
};
