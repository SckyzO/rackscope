import { useState } from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
    </div>
    {children}
  </div>
);

const alerts = [
  {
    type: 'success',
    icon: CheckCircle,
    title: 'Success!',
    msg: 'Your action was completed successfully.',
    bg: 'bg-success-50 dark:bg-success-500/10',
    border: 'border-success-500',
    icon_c: 'text-success-500',
    title_c: 'text-success-700 dark:text-success-400',
  },
  {
    type: 'info',
    icon: Info,
    title: 'Heads Up!',
    msg: 'Here is some important information for you.',
    bg: 'bg-brand-50 dark:bg-brand-500/10',
    border: 'border-brand-500',
    icon_c: 'text-brand-500',
    title_c: 'text-brand-700 dark:text-brand-400',
  },
  {
    type: 'warning',
    icon: AlertTriangle,
    title: 'Warning!',
    msg: 'Please double-check before proceeding.',
    bg: 'bg-warning-50 dark:bg-warning-500/10',
    border: 'border-warning-500',
    icon_c: 'text-warning-500',
    title_c: 'text-warning-700 dark:text-warning-400',
  },
  {
    type: 'error',
    icon: XCircle,
    title: 'Error!',
    msg: 'Something went wrong. Please try again.',
    bg: 'bg-error-50 dark:bg-error-500/10',
    border: 'border-error-500',
    icon_c: 'text-error-500',
    title_c: 'text-error-700 dark:text-error-400',
  },
];

export const AlertsPage = () => {
  usePageTitle('Alerts');
  const [dismissed, setDismissed] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alerts</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Contextual feedback messages
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="With Border Left" desc="Alert with left accent border">
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.type}
                className={`flex items-start gap-3 rounded-lg border-l-4 ${a.border} ${a.bg} p-4`}
              >
                <a.icon className={`h-5 w-5 shrink-0 ${a.icon_c}`} />
                <div>
                  <p className={`text-sm font-semibold ${a.title_c}`}>{a.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{a.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="With Full Border" desc="Alert with full border outline">
          <div className="space-y-3">
            {alerts.map((a) => (
              <div
                key={a.type}
                className={`flex items-start gap-3 rounded-xl border ${a.bg} p-4`}
                style={{ borderColor: 'transparent', outline: '1px solid' }}
              >
                <div className={`flex items-start gap-3 rounded-xl ${a.bg} w-full p-4`}>
                  <a.icon className={`h-5 w-5 shrink-0 ${a.icon_c}`} />
                  <div>
                    <p className={`text-sm font-semibold ${a.title_c}`}>{a.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{a.msg}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Dismissible Alerts" desc="Alerts with close button">
          <div className="space-y-3">
            {alerts
              .filter((a) => !dismissed.includes(a.type))
              .map((a) => (
                <div key={a.type} className={`flex items-start gap-3 rounded-xl ${a.bg} p-4`}>
                  <a.icon className={`h-5 w-5 shrink-0 ${a.icon_c}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${a.title_c}`}>{a.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{a.msg}</p>
                  </div>
                  <button
                    onClick={() => setDismissed([...dismissed, a.type])}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            {dismissed.length === alerts.length && (
              <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                All alerts dismissed.{' '}
                <button onClick={() => setDismissed([])} className="text-brand-500 hover:underline">
                  Reset
                </button>
              </div>
            )}
          </div>
        </SectionCard>
        <SectionCard title="With Action Button" desc="Alert with an actionable link">
          <div className="space-y-3">
            <div className="bg-success-50 dark:bg-success-500/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-success-500 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-success-700 dark:text-success-400 text-sm font-semibold">
                    Deployment successful!
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    Your app has been deployed to production.
                  </p>
                  <button className="text-success-600 dark:text-success-400 mt-2 text-sm font-medium hover:underline">
                    View deployment →
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-error-50 dark:bg-error-500/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <XCircle className="text-error-500 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-error-700 dark:text-error-400 text-sm font-semibold">
                    Connection failed
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    Unable to connect to the server.
                  </p>
                  <button className="text-error-600 dark:text-error-400 mt-2 text-sm font-medium hover:underline">
                    Try again →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
