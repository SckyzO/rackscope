import { useState } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const trackStyle = (val: number, color = '#465fff') => ({
  background: `linear-gradient(to right, ${color} ${val}%, #e4e7ec ${val}%)`,
});

export const RangeSliderPage = () => {
  usePageTitle('Range Slider');
  const [basic, setBasic] = useState(50);
  const [rMin, setRMin] = useState(20);
  const [rMax, setRMax] = useState(80);
  const [step, setStep] = useState(50);
  const [colors, setColors] = useState({ brand: 50, success: 60, warning: 40, error: 30 });
  const [labeled, setLabeled] = useState(65);
  const [prMin, setPrMin] = useState(200);
  const [prMax, setPrMax] = useState(800);

  const thumbCls =
    'pointer-events-none absolute h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Range Slider"
        description="Slider components for selecting values and ranges"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/cosmos/ui' },
              { label: 'Range Slider' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Basic Slider" desc="Single value 0–100">
          <input
            type="range"
            min="0"
            max="100"
            value={basic}
            onChange={(e) => setBasic(+e.target.value)}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg"
            style={trackStyle(basic)}
          />
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Value: {basic}
          </p>
        </SectionCard>
        <SectionCard title="Range Slider" desc="Two handles for min/max selection">
          <div className="relative h-2">
            <div className="absolute h-2 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div
              className="bg-brand-500 absolute h-2 rounded-lg"
              style={{ left: `${rMin}%`, right: `${100 - rMax}%` }}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={rMin}
              onChange={(e) => {
                const v = +e.target.value;
                if (v < rMax) setRMin(v);
              }}
              className={thumbCls}
            />
            <input
              type="range"
              min="0"
              max="100"
              value={rMax}
              onChange={(e) => {
                const v = +e.target.value;
                if (v > rMin) setRMax(v);
              }}
              className={thumbCls}
            />
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Min: {rMin}</span>
            <span>Max: {rMax}</span>
          </div>
        </SectionCard>
        <SectionCard title="Step Slider" desc="Steps of 10">
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={step}
            onChange={(e) => setStep(+e.target.value)}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg"
            style={trackStyle(step)}
          />
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Value: {step} (steps of 10)
          </p>
        </SectionCard>
        <SectionCard title="Colored Sliders" desc="Brand, success, warning, error tracks">
          <div className="space-y-5">
            {(
              [
                ['brand', '#465fff'],
                ['success', '#12b76a'],
                ['warning', '#f79009'],
                ['error', '#f04438'],
              ] as [string, string][]
            ).map(([key, color]) => (
              <div key={key}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-medium text-gray-600 capitalize dark:text-gray-400">
                    {key}
                  </span>
                  <span className="text-gray-400">{colors[key as keyof typeof colors]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={colors[key as keyof typeof colors]}
                  onChange={(e) => setColors({ ...colors, [key]: +e.target.value })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg"
                  style={trackStyle(colors[key as keyof typeof colors], color)}
                />
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="With Labels" desc="Shows min, max, and current value">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-400">0</span>
            <span className="text-brand-500 font-semibold">{labeled}</span>
            <span className="text-gray-400">100</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={labeled}
            onChange={(e) => setLabeled(+e.target.value)}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg"
            style={trackStyle(labeled)}
          />
        </SectionCard>
        <SectionCard title="Price Range" desc="$0–$1000 currency range">
          <div className="relative h-2">
            <div className="absolute h-2 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div
              className="bg-brand-500 absolute h-2 rounded-lg"
              style={{ left: `${(prMin / 1000) * 100}%`, right: `${100 - (prMax / 1000) * 100}%` }}
            />
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={prMin}
              onChange={(e) => {
                const v = +e.target.value;
                if (v < prMax) setPrMin(v);
              }}
              className={thumbCls}
            />
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={prMax}
              onChange={(e) => {
                const v = +e.target.value;
                if (v > prMin) setPrMax(v);
              }}
              className={thumbCls}
            />
          </div>
          <div className="mt-4 flex justify-between text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>${prMin}</span>
            <span>${prMax}</span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
