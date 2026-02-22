import { Shield, AlertTriangle } from 'lucide-react';
import type { ConfigDraft } from '../useSettingsConfig';

type Props = {
  draft: ConfigDraft;
  setDraft: (d: ConfigDraft) => void;
};

export const SecuritySettingsSection = ({ draft, setDraft }: Props) => {
  const auth = draft.auth;
  const hasPassword = Boolean(auth.password_hash);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">Authentication</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Control access to the Cosmos UI with a username and password.
        </p>
      </div>

      {/* Password warning */}
      {!hasPassword && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-700/40 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No password set. Go to{' '}
            <a href="/cosmos/profile" className="font-semibold underline">
              Profile &rarr; Security
            </a>{' '}
            to set a password before enabling authentication.
          </p>
        </div>
      )}

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Require authentication
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Protect the dashboard with a username and password
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!hasPassword}
          onClick={() => setDraft({ ...draft, auth: { ...auth, enabled: !auth.enabled } })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
            auth.enabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
              auth.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Session duration */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Session duration
        </label>
        <div className="flex gap-2">
          {(['8h', '24h', 'unlimited'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDraft({ ...draft, auth: { ...auth, session_duration: d } })}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                auth.session_duration === d
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {d === 'unlimited' ? 'Unlimited' : d}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          How long a session stays valid before requiring re-login.
          {auth.session_duration === 'unlimited' && ' Tokens never expire.'}
        </p>
      </div>
    </div>
  );
};
