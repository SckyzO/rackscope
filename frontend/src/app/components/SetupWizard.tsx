/**
 * SetupWizard — shown on first launch (localStorage 'rackscope.setup.done' not set).
 * 3-step guide: Welcome → Prometheus connection → Done.
 * Can be dismissed at any step (user can configure later via Settings).
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  Loader2,
  Wifi,
  WifiOff,
  X,
  ChevronRight,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { ConfirmationModal } from './layout/ConfirmationModal';
import { api } from '../../services/api';

export const LS_KEY = 'rackscope.setup.done';

// ── Step definitions ──────────────────────────────────────────────────────────

type TestState = 'idle' | 'testing' | 'ok' | 'error';

// ── Wizard ────────────────────────────────────────────────────────────────────

export const SetupWizard = ({
  onDismiss,
  onPermanentDisable,
}: {
  onDismiss: () => void;
  onPermanentDisable?: () => void;
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prometheusUrl, setPrometheusUrl] = useState('http://prometheus:9090');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testDetail, setTestDetail] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const navigate = useNavigate();

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleDismissClick = useCallback(() => {
    setShowDisableModal(true);
  }, []);

  const handleKeepShowing = useCallback(() => {
    setShowDisableModal(false);
    dismiss();
  }, [dismiss]);

  const handlePermanentDisable = useCallback(async () => {
    if (!onPermanentDisable) {
      setShowDisableModal(false);
      dismiss();
      return;
    }
    setDisabling(true);
    try {
      await onPermanentDisable();
      setShowDisableModal(false);
    } catch (err) {
      console.error('Failed to disable wizard:', err);
      // Still close on error — user can try again later
      setShowDisableModal(false);
    } finally {
      setDisabling(false);
    }
  }, [onPermanentDisable, dismiss]);

  const handleTest = async () => {
    setTestState('testing');
    setTestDetail('');
    try {
      const res = await fetch('/api/stats/prometheus', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { last_ms?: number };
      setTestState('ok');
      setTestDetail(data.last_ms != null ? `${data.last_ms.toFixed(1)} ms` : 'Connected');
    } catch (e) {
      setTestState('error');
      setTestDetail(e instanceof Error ? e.message : 'Unreachable');
    }
  };

  const goToDatacenter = () => {
    dismiss();
    navigate('/editors/datacenter');
  };

  const goDashboard = () => {
    dismiss();
    navigate('/');
  };

  // ── Progress dots ───────────────────────────────────────────────────────────
  const Dots = () => (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all ${
            s === step
              ? 'bg-brand-500 h-2 w-6'
              : s < step
                ? 'bg-brand-300 h-2 w-2'
                : 'h-2 w-2 bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          {/* Close / skip */}
          <button
            onClick={handleDismissClick}
            className="absolute top-4 right-4 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
            title="Skip setup"
          >
            <X className="h-5 w-5" />
          </button>

        {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-8">
            <div className="flex justify-center">
              <div className="bg-brand-500 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg">
                <Activity className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="mt-5 text-center text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Welcome to Rackscope
            </h1>
            <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Prometheus-first physical infrastructure monitoring. Let's get you set up in 2 steps.
            </p>

            <div className="mt-6 space-y-3">
              {[
                { icon: Wifi, label: 'Connect to Prometheus' },
                { icon: LayoutDashboard, label: 'Configure your datacenter topology' },
                { icon: Settings, label: 'Customize views and alerts' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
                >
                  <div className="bg-brand-50 dark:bg-brand-500/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <Icon className="text-brand-500 h-3.5 w-3.5" />
                  </div>
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-2">
              <button
                onClick={() => setStep(2)}
                className="bg-brand-500 hover:bg-brand-600 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleDismissClick}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Skip — I'll configure manually
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Prometheus ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
              <Wifi className="h-5 w-5 text-purple-500" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
              Connect to Prometheus
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Rackscope queries Prometheus for all metrics. No metrics are stored internally.
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Prometheus URL
                </label>
                <input
                  type="text"
                  value={prometheusUrl}
                  onChange={(e) => {
                    setPrometheusUrl(e.target.value);
                    setTestState('idle');
                  }}
                  placeholder="http://prometheus:9090"
                  className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Test button + result */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTest}
                  disabled={testState === 'testing'}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {testState === 'testing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : testState === 'ok' ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : testState === 'error' ? (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Wifi className="h-4 w-4 text-gray-400" />
                  )}
                  Test connection
                </button>
                {testDetail && (
                  <span
                    className={`text-xs font-medium ${testState === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                  >
                    {testState === 'ok' ? `✓ Connected · ${testDetail}` : `✗ ${testDetail}`}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-600">
                The URL must be reachable from the backend container, not the browser. You can
                change this later in Settings → Telemetry.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="bg-brand-500 hover:bg-brand-600 ml-auto flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
              You're all set!
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Rackscope is ready. Next: describe your physical infrastructure (sites, rooms, racks)
              using the topology editor.
            </p>

            <div className="mt-6 space-y-2">
              <button
                onClick={goToDatacenter}
                className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Open Topology Editor
              </button>
              <button
                onClick={goDashboard}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Dots */}
        <div className="border-t border-gray-100 px-8 py-4 dark:border-gray-800">
          <Dots />
        </div>
      </div>
    </div>

      <ConfirmationModal
        open={showDisableModal}
        title="Disable setup wizard?"
        message="Would you like to permanently disable the setup wizard? This will update your app.yaml and the wizard won't appear again, even after clearing your browser cache."
        onStay={handleKeepShowing}
        onSave={handlePermanentDisable}
        saving={disabling}
        stayLabel="Not now"
        saveLabel="Disable permanently"
        hideSave={false}
      />
    </>
  );
};
