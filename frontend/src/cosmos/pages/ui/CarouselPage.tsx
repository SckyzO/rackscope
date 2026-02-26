import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const slides = [
  { bg: 'from-brand-500 to-brand-700', label: 'Slide 1 — Brand' },
  { bg: 'from-success-500 to-success-700', label: 'Slide 2 — Success' },
  { bg: 'from-warning-500 to-warning-700', label: 'Slide 3 — Warning' },
  { bg: 'from-error-500 to-error-700', label: 'Slide 4 — Error' },
];

function useCarousel(auto = false) {
  const [idx, setIdx] = useState(0);
  const next = useCallback(() => setIdx((i) => (i + 1) % slides.length), []);
  const prev = useCallback(() => setIdx((i) => (i - 1 + slides.length) % slides.length), []);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(next, 3000);
    return () => clearInterval(t);
  }, [auto, next]);
  return { idx, next, prev, setIdx };
}

const Slide = ({ idx }: { idx: number }) => (
  <div
    className={`flex h-44 items-center justify-center rounded-xl bg-gradient-to-br ${slides[idx].bg}`}
  >
    <span className="text-lg font-bold text-white">{slides[idx].label}</span>
  </div>
);

export const CarouselPage = () => {
  usePageTitle('Carousel');
  const c1 = useCarousel(true);
  const c2 = useCarousel(false);
  const c3 = useCarousel(false);
  const c4 = useCarousel(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carousel"
        description="Image and content slideshow components"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'UI Library', href: '/cosmos/ui' },
              { label: 'Carousel' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Slides Only" desc="Auto-rotating, no controls">
          <Slide idx={c1.idx} />
        </SectionCard>
        <SectionCard title="With Controls" desc="Manual navigation with prev/next buttons">
          <div className="relative">
            <Slide idx={c2.idx} />
            <button
              onClick={c2.prev}
              className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={c2.next}
              className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </SectionCard>
        <SectionCard title="With Indicators" desc="Dot indicators showing current slide">
          <div className="relative">
            <Slide idx={c3.idx} />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => c3.setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === c3.idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard
          title="With Controls & Indicators"
          desc="Full navigation with both controls and dots"
        >
          <div className="relative">
            <Slide idx={c4.idx} />
            <button
              onClick={c4.prev}
              className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={c4.next}
              className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => c4.setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${i === c4.idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
