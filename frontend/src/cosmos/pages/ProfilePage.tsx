import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

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

const ChangeUsernameForm = () => {
  const { user, authEnabled, refreshStatus } = useAuth();
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

  if (!authEnabled) {
    return (
      <p className="text-sm text-gray-400">
        Authentication is not enabled. Enable it in{' '}
        <a href="/cosmos/settings#security" className="text-brand-500 hover:underline">
          Settings &rarr; Security
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Current username:{' '}
          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
            {user?.username ?? '\u2014'}
          </span>
        </p>
      </div>
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
      <button
        type="submit"
        disabled={status === 'saving'}
        className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving\u2026' : 'Change username'}
      </button>
      <StatusBanner status={status} error={error} />
    </form>
  );
};

const PwInput = ({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  label,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  label: string;
  autoComplete: string;
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
        required
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

const ChangePasswordForm = () => {
  const { authEnabled } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      setError('Password must be at least 6 characters');
      setStatus('error');
      return;
    }
    setStatus('saving');
    setError(undefined);
    try {
      await api.changePassword(currentPw, newPw);
      setStatus('success');
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
      setStatus('error');
    }
  };

  if (!authEnabled) {
    return (
      <p className="text-sm text-gray-400">
        Authentication is not enabled. Enable it in{' '}
        <a href="/cosmos/settings#security" className="text-brand-500 hover:underline">
          Settings &rarr; Security
        </a>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PwInput
        value={currentPw}
        onChange={setCurrentPw}
        show={showCurrent}
        onToggle={() => setShowCurrent((v) => !v)}
        placeholder="••••••••"
        label="Current password"
        autoComplete="current-password"
      />
      <PwInput
        value={newPw}
        onChange={setNewPw}
        show={showNew}
        onToggle={() => setShowNew((v) => !v)}
        placeholder="Min. 6 characters"
        label="New password"
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={status === 'saving'}
        className="bg-brand-500 hover:bg-brand-600 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving\u2026' : 'Change password'}
      </button>
      <StatusBanner status={status} error={error} />
    </form>
  );
};

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

      {/* Current identity */}
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

      {/* Security section */}
      <SectionCard title="Change Username" icon={User}>
        <ChangeUsernameForm />
      </SectionCard>

      <SectionCard title="Change Password" icon={Lock}>
        <ChangePasswordForm />
      </SectionCard>
    </div>
  );
};
