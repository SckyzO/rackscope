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
  const chartRef = useRef<InstanceType<typeof ReactApexChart>>(null);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chartRef.current as any)?.chart?.updateSeries([{ data: [...bufRef.current] }], false);
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
      ref={chartRef}
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

// ── 8. Pie charts ─────────────────────────────────────────────────────────────

const PieChart = ({
  title,
  series,
  labels,
}: {
  title: string;
  series: number[];
  labels: string[];
}) => {
  const dark = useDark();
  const options: ApexOptions = {
    chart: { ...baseChart(), type: 'pie' },
    theme: baseTheme(dark),
    colors: COLORS,
    labels,
    dataLabels: { style: { fontSize: '11px' } },
    legend: {
      position: 'bottom',
      labels: { colors: dark ? '#d1d5db' : '#374151' },
      fontSize: '12px',
    },
    tooltip: { theme: dark ? 'dark' : 'light' },
    title: {
      text: title,
      align: 'center',
      style: { color: dark ? '#e5e7eb' : '#374151', fontSize: '13px', fontWeight: '600' },
    },
  };
  return (
    <ReactApexChart key={String(dark)} options={options} series={series} type="pie" height={260} />
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

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Radial Bar" desc="Multi-series radial gauge — health per device type">
          <RadialBarChart />
        </SectionCard>
        <SectionCard title="Pie Charts" desc="Three pie variants side by side">
          <div className="grid grid-cols-3 gap-2">
            <PieChart
              title="Servers"
              series={[60, 25, 10, 5]}
              labels={['OK', 'WARN', 'CRIT', 'UNK']}
            />
            <PieChart
              title="Network"
              series={[75, 15, 8, 2]}
              labels={['OK', 'WARN', 'CRIT', 'UNK']}
            />
            <PieChart
              title="Storage"
              series={[50, 30, 12, 8]}
              labels={['OK', 'WARN', 'CRIT', 'UNK']}
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
