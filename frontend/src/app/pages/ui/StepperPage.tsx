import { Check } from 'lucide-react';
import { usePageTitle } from '@app/contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const steps = [
  { label: 'Account', desc: 'Create your account' },
  { label: 'Profile', desc: 'Fill in your profile' },
  { label: 'Payment', desc: 'Add payment method' },
  { label: 'Confirm', desc: 'Review and confirm' },
];

// currentStep: 0=completed, 1=active, 2=upcoming
const stepState = (idx: number, current: number) =>
  idx < current ? 'completed' : idx === current ? 'current' : 'upcoming';

const StepCircle = ({ state, num }: { state: string; num: number }) => {
  if (state === 'completed')
    return (
      <div className="bg-success-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white">
        <Check className="h-4 w-4" />
      </div>
    );
  if (state === 'current')
    return (
      <div className="bg-brand-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
        {num}
      </div>
    );
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-sm font-semibold text-gray-400 dark:border-gray-700">
      {num}
    </div>
  );
};

const ConnectorH = ({ state }: { state: string }) => (
  <div
    className={`h-0.5 flex-1 ${state === 'completed' ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'}`}
  />
);

const ConnectorV = ({ state }: { state: string }) => (
  <div
    className={`ml-4 h-8 w-0.5 ${state === 'completed' ? 'bg-success-500' : 'bg-gray-200 dark:bg-gray-700'}`}
  />
);

export const StepperPage = () => {
  usePageTitle('Stepper');
  const current = 1; // Profile is active

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stepper"
        description="Multi-step process indicators"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'Stepper' },
            ]}
          />
        }
      />
      <div className="grid gap-6">
        <SectionCard
          title="Horizontal Stepper"
          desc="Step 1 completed, Step 2 active, Steps 3-4 upcoming"
        >
          <div className="flex items-center">
            {steps.map((step, idx) => {
              const state = stepState(idx, current);
              return (
                <div key={step.label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <StepCircle state={state} num={idx + 1} />
                    <span
                      className={`text-xs font-medium ${state === 'current' ? 'text-brand-500' : state === 'completed' ? 'text-success-500' : 'text-gray-400'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && <ConnectorH state={state} />}
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="Vertical Stepper" desc="Same steps in vertical layout">
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const state = stepState(idx, current);
              return (
                <div key={step.label}>
                  <div className="flex items-center gap-4">
                    <StepCircle state={state} num={idx + 1} />
                    <span
                      className={`text-sm font-medium ${state === 'current' ? 'text-brand-500' : state === 'completed' ? 'text-success-500' : 'text-gray-400'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && <ConnectorV state={state} />}
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="With Description" desc="Each step shows title and description">
          <div className="flex items-start">
            {steps.map((step, idx) => {
              const state = stepState(idx, current);
              return (
                <div key={step.label} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center gap-2">
                    <StepCircle state={state} num={idx + 1} />
                    <div className="text-center">
                      <div
                        className={`text-xs font-semibold ${state === 'current' ? 'text-brand-500' : state === 'completed' ? 'text-success-500' : 'text-gray-400'}`}
                      >
                        {step.label}
                      </div>
                      <div className="mt-0.5 hidden text-[10px] text-gray-400 sm:block dark:text-gray-500">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="mt-4 flex-1">
                      <ConnectorH state={state} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
