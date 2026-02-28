import { useState, useRef } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Camera,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import type { PasswordPolicy } from '../../contexts/AuthContext';
import { useAvatar, resizeAvatar } from '../../hooks/useAvatar';
import { usePageTitle } from '../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from './templates/EmptyPage';
import { SettingField } from '../components/SettingTooltip';

// ── Types ────────────────────────────────────────────────────────────────────

type FormStatus = 'idle' | 'saving' | 'success' | 'error';

// ── Save button helper ────────────────────────────────────────────────────────

const saveBtnProps = (status: FormStatus, errorMsg?: string) => {
  if (status === 'saving')
    return {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      label: 'Saving…',
      cls: 'bg-brand-500 text-white opacity-70 cursor-not-allowed',
    };
  if (status === 'success')
    return {
      icon: <Check className="h-4 w-4" />,
      label: 'Saved',
      cls: 'bg-green-500 text-white',
    };
  if (status === 'error')
    return {
      icon: <AlertCircle className="h-4 w-4" />,
      label: errorMsg ?? 'Error',
      cls: 'bg-red-500 text-white',
    };
  return {
    icon: <Save className="h-4 w-4" />,
    label: 'Save',
    cls: 'bg-brand-500 hover:bg-brand-600 text-white',
  };
};

// ── Input style ───────────────────────────────────────────────────────────────

const INPUT_CLS =
  'focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500';

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

// ── Password input helper ─────────────────────────────────────────────────────

const PwInput = ({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  label,
  tooltip,
  autoComplete,
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  label: string;
  tooltip: string;
  autoComplete: string;
  required?: boolean;
}) => (
  <SettingField label={label} tooltip={tooltip}>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={INPUT_CLS + ' pr-10'}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </SettingField>
);

// ── Avatar section ────────────────────────────────────────────────────────────

const AvatarSection = ({ username }: { username: string }) => {
  const { avatar, updateAvatar } = useAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = username.charAt(0).toUpperCase();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await resizeAvatar(file, 128);
      updateAvatar(dataUrl);
    } catch {
      setError('Failed to process image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      {/* Avatar preview */}
      <div className="relative shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt="Avatar"
            className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
          />
        ) : (
          <div className="bg-brand-500 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white">
            {initial}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <Camera className="h-4 w-4" />
            {avatar ? 'Change photo' : 'Upload photo'}
          </button>
          {avatar && (
            <button
              type="button"
              onClick={() => updateAvatar(null)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          JPG, PNG or GIF — cropped to 128×128 px
        </p>
      </div>
    </div>
  );
};

// ── Change Username form ──────────────────────────────────────────────────────

const ChangeUsernameForm = () => {
  const { user, authConfigured, refreshStatus } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string | undefined>();

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

  const btn = saveBtnProps(status, error);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current username display */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/60">
        <span className="text-sm text-gray-500 dark:text-gray-400">Current username</span>
        <span className="ml-auto font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
          {user?.username ?? 'admin'}
        </span>
      </div>

      <SettingField
        label="New username"
        tooltip="Your display name shown in the header, audit logs, and activity feed. Must be unique."
      >
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="Enter new username"
          required
          className={INPUT_CLS}
        />
      </SettingField>

      {authConfigured && (
        <SettingField
          label="Current password"
          tooltip="Required to verify your identity before changing your username."
        >
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className={INPUT_CLS + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              tabIndex={-1}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </SettingField>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={status === 'saving'}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed ${btn.cls}`}
        >
          {btn.icon}
          {btn.label}
        </button>
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {error ?? 'An error occurred'}
          </span>
        )}
      </div>
    </form>
  );
};

// ── Change Password form ──────────────────────────────────────────────────────

const ChangePasswordForm = () => {
  const { authConfigured, policy } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [error, setError] = useState<string | undefined>();

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

  const btn = saveBtnProps(status, error);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!authConfigured && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Initial setup — no current password required.
        </div>
      )}

      {authConfigured && (
        <PwInput
          value={currentPw}
          onChange={setCurrentPw}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          placeholder="••••••••"
          label="Current password"
          tooltip="Required to verify your identity before changing password."
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
        tooltip={`Minimum ${policy.min_length} characters${policy.require_digit ? ', must include a digit' : ''}${policy.require_symbol ? ', must include a symbol' : ''}. Leave empty to keep your current password.`}
        autoComplete="new-password"
      />

      <PwInput
        value={confirmPw}
        onChange={setConfirmPw}
        show={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        placeholder="Repeat new password"
        label="Confirm new password"
        tooltip="Must match the new password exactly."
        autoComplete="new-password"
      />

      {showRules && <PasswordRules rules={rules} />}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={status === 'saving' || !allRulesPass}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all disabled:cursor-not-allowed ${btn.cls}`}
        >
          {btn.icon}
          {btn.label === 'Save' ? (authConfigured ? 'Change password' : 'Set password') : btn.label}
        </button>
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {error ?? 'An error occurred'}
          </span>
        )}
      </div>
    </form>
  );
};

// ── Account header row ────────────────────────────────────────────────────────

const AccountSectionHeader = ({
  username,
  authEnabled,
}: {
  username: string;
  authEnabled: boolean;
}) => (
  <div className="mb-5 flex items-start gap-4">
    <AvatarSection username={username} />
    {!authEnabled && (
      <div
        className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        title="Authentication is disabled in app.yaml. Enable it in Settings → Security to manage usernames and passwords."
      >
        <Lock className="h-3 w-3 shrink-0" />
        Auth disabled
      </div>
    )}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const ProfilePage = () => {
  usePageTitle('Profile');
  const { user, authEnabled } = useAuth();
  const displayName = authEnabled && user ? user.username : 'Admin';

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-6">
      <PageHeader
        title="Profile"
        breadcrumb={<PageBreadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Profile' }]} />}
      />

      <div className="space-y-4">
        {/* Account — avatar + username */}
        <SectionCard
          title="Account"
          desc="Your display name and profile picture."
          icon={User}
          iconColor="text-brand-500"
          iconBg="bg-brand-50 dark:bg-brand-500/10"
        >
          <AccountSectionHeader username={displayName} authEnabled={authEnabled} />

          {authEnabled ? (
            <ChangeUsernameForm />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Enable authentication in Settings to manage your username.
            </p>
          )}
        </SectionCard>

        {/* Change Password */}
        <SectionCard
          title="Change Password"
          desc="Update your account password."
          icon={Lock}
          iconColor="text-red-500"
          iconBg="bg-red-50 dark:bg-red-500/10"
        >
          <ChangePasswordForm />
        </SectionCard>
      </div>
    </div>
  );
};
