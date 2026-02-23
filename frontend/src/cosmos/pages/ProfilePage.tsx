import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { PasswordPolicy } from '../../contexts/AuthContext';

type FormStatus = 'idle' | 'saving' | 'success' | 'error';

const SectionCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
      <Icon className="text-brand-500 h-4 w-4" />
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const StatusBanner = ({ status, error }: { status: FormStatus; error?: string }) => {
  if (status === 'success')
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
        <Check className="h-4 w-4" /> Saved successfully
      </div>
    );
  if (status === 'error')
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <AlertCircle className="h-4 w-4" /> {error ?? 'An error occurred'}
      </div>
    );
  return null;
};

// ── Password strength rules ───────────────────────────────────────────────────

type Rule = { label: string; ok: boolean };

const buildRules = (pw: string, confirm: string, policy: PasswordPolicy): Rule[] => {
  const rules: Rule[] = [
    { label: `At least ${policy.min_length} characters`, ok: pw.length >= policy.min_length },
  ];
  if (policy.max_length < 512) {
    rules.push({
      label: `At most ${policy.max_length} characters`,
      ok: pw.length <= policy.max_length,
    });
  }
  if (policy.require_digit) {
    rules.push({ label: 'Contains a digit (0–9)', ok: /\d/.test(pw) });
  }
  if (policy.require_symbol) {
    rules.push({
      label: 'Contains a symbol (!@#$…)',
      ok: /[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/\\`~]/.test(pw),
    });
  }
  if (confirm.length > 0 || pw.length > 0) {
    rules.push({ label: 'Passwords match', ok: pw === confirm && pw.length > 0 });
  }
  return rules;
};

const PasswordRules = ({ rules }: { rules: Rule[] }) => {
  if (rules.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {rules.map((r) => (
        <div key={r.label} className="flex items-center gap-1.5 text-xs">
          {r.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
          )}
          <span className={r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}>
            {r.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── PwInput helper ────────────────────────────────────────────────────────────

const PwInput = ({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  label,
  autoComplete,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  label: string;
  autoComplete: string;
  required?: boolean;
}) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="focus:border-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 pr-9 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

// ── Change Username ───────────────────────────────────────────────────────────

const ChangeUsernameForm = () => {
  const { user, authConfigured, refreshStatus } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setError(undefined);
    try {
      await api.changeUsername(password, newUsername);
      setStatus('success');
      setNewUsername('');
      setPassword('');
      await refreshStatus();
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change username');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Current username:{' '}
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
          {user?.username ?? 'admin'}
        </span>
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
          New username
        </label>
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="New username"
          required
          className="focus:border-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>
      {authConfigured && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Current password (for verification)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="focus:border-brand-500 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
      <button
        type="submit"
        disabled={status === 'saving'}
        className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : 'Change username'}
      </button>
      <StatusBanner status={status} error={error} />
    </form>
  );
};

// ── Change Password ───────────────────────────────────────────────────────────

const ChangePasswordForm = () => {
  const { authConfigured, policy } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string>();

  const rules = buildRules(newPw, confirmPw, policy);
  const allRulesPass = rules.every((r) => r.ok);
  const showRules = newPw.length > 0 || confirmPw.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass) return;
    setStatus('saving');
    setError(undefined);
    try {
      await api.changePassword(currentPw, newPw);
      setStatus('success');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!authConfigured && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Initial setup — no current password required.
        </p>
      )}
      {authConfigured && (
        <PwInput
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          placeholder="••••••••"
          label="Current password"
          autoComplete="current-password"
        />
      )}
      <PwInput
        value={newPw}
        onChange={setNewPw}
        show={showNew}
        onToggle={() => setShowNew((v) => !v)}
        placeholder={`Min. ${policy.min_length} characters`}
        label="New password"
        autoComplete="new-password"
      />
      <PwInput
        value={confirmPw}
        onChange={setConfirmPw}
        show={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        placeholder="Repeat new password"
        label="Confirm new password"
        autoComplete="new-password"
      />
      {showRules && <PasswordRules rules={rules} />}
      <button
        type="submit"
        disabled={status === 'saving' || !allRulesPass}
        className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : authConfigured ? 'Change password' : 'Set password'}
      </button>
      <StatusBanner status={status} error={error} />
    </form>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const ProfilePage = () => {
  const { user, authEnabled } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Manage your account credentials
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="bg-brand-500 flex h-12 w-12 items-center justify-center rounded-full text-white">
          <User className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {authEnabled && user ? user.username : 'Admin'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {authEnabled ? 'Authenticated user' : 'Authentication disabled'}
          </p>
        </div>
      </div>

      <SectionCard title="Change Username" icon={User}>
        <ChangeUsernameForm />
      </SectionCard>

      <SectionCard title="Change Password" icon={Lock}>
        <ChangePasswordForm />
      </SectionCard>
    </div>
  );
};
