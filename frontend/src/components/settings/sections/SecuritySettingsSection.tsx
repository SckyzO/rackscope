import { AlertTriangle, Type, Lock, ShieldAlert } from 'lucide-react';
import { FormSection } from '../common/FormSection';
import { TooltipHelp } from '../../../app/components/ui/Tooltip';
import { StepperInput } from '../../../app/components/forms/StepperInput';
import type { ConfigDraft } from '../useSettingsConfig';
import { useAuth } from '../../../contexts/AuthContext';

type Props = {
  draft: ConfigDraft;
  setDraft: (d: ConfigDraft) => void;
};

const Toggle = ({
  label,
  description,
  tooltip,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  tooltip?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {tooltip && <TooltipHelp text={tooltip} />}
      </p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        value ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const SecuritySettingsSection = ({ draft, setDraft }: Props) => {
  const { authConfigured } = useAuth(); // live from API — not stale draft
  const auth = draft.auth;
  const hasPassword = authConfigured;

  const setAuth = (updates: Partial<typeof auth>) =>
    setDraft({ ...draft, auth: { ...auth, ...updates } });

  return (
    <div className="space-y-4">
      {/* ── Authentication ── */}
      <FormSection
        title="Authentication"
        description="Protect the Rackscope UI with a username and password."
        icon={Lock}
        iconColor="text-red-500"
        iconBg="bg-red-50 dark:bg-red-500/10"
      >
        <div className="space-y-4">
          {!hasPassword && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-700/40 dark:bg-blue-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                No password set yet. Set one in{' '}
                <a href="/profile" className="font-semibold underline">
                  Profile → Change Password
                </a>{' '}
                then come back here to enable authentication.
              </p>
            </div>
          )}

          <Toggle
            label="Require authentication"
            description="Protect the dashboard with a username and password"
            tooltip="Protect the Rackscope UI with username+password. Requires a password to be set first in Change Password."
            value={auth.enabled}
            onChange={(v) => setAuth({ enabled: v })}
            disabled={!hasPassword}
          />

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Session duration
              <TooltipHelp text="How long authentication tokens remain valid before requiring re-login." />
            </label>
            <div className="flex gap-2">
              {(['8h', '24h', 'unlimited'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAuth({ session_duration: d })}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                    auth.session_duration === d
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  {d === 'unlimited' ? 'Unlimited' : d}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {auth.session_duration === 'unlimited'
                ? 'Tokens never expire.'
                : `Session expires after ${auth.session_duration}.`}
            </p>
          </div>
        </div>
      </FormSection>

      {/* ── Password Policy ── */}
      <FormSection
        title="Password Policy"
        description="Rules enforced when setting or changing the password."
        icon={ShieldAlert}
        iconColor="text-orange-500"
        iconBg="bg-orange-50 dark:bg-orange-500/10"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <Type className="h-3.5 w-3.5" /> Min length
                <TooltipHelp text="Minimum number of characters required for the password." />
              </label>
              <StepperInput
                value={Number(auth.policy_min_length)}
                onChange={(v) => setAuth({ policy_min_length: String(v) })}
                min={1}
                max={64}
                step={1}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <Type className="h-3.5 w-3.5" /> Max length
                <TooltipHelp text="Maximum password length allowed." />
              </label>
              <StepperInput
                value={Number(auth.policy_max_length)}
                onChange={(v) => setAuth({ policy_max_length: String(v) })}
                min={6}
                max={512}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <Toggle
            label="Require digit"
            description="Password must contain at least one number (0–9)"
            tooltip="Password must contain at least one number (0-9)."
            value={auth.policy_require_digit}
            onChange={(v) => setAuth({ policy_require_digit: v })}
          />
          <Toggle
            label="Require symbol"
            description="Password must contain at least one special character (!@#$…)"
            tooltip="Password must contain at least one special character (!@#$...)."
            value={auth.policy_require_symbol}
            onChange={(v) => setAuth({ policy_require_symbol: v })}
          />
        </div>
      </FormSection>
    </div>
  );
};
