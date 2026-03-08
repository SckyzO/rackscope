import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb, SectionCard } from '../templates/EmptyPage';

const OTP = ({
  length,
  value,
  onChange,
  error = false,
  success = false,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  success?: boolean;
}) => {
  const refs = useRef<HTMLInputElement[]>([]);
  const handleChange = (idx: number, e: ChangeEvent<HTMLInputElement>) => {
    if (!/^\d*$/.test(e.target.value)) return;
    const arr = value.split('');
    arr[idx] = e.target.value.slice(-1);
    onChange(arr.join(''));
    if (e.target.value && idx < length - 1) refs.current[idx + 1]?.focus();
  };
  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < length - 1) refs.current[idx + 1]?.focus();
  };
  const base =
    'h-12 w-12 rounded-lg border-2 text-center text-lg font-bold focus:outline-none transition-colors';
  const stateClass = error
    ? 'border-error-500 bg-error-50 text-error-500 dark:bg-error-500/15'
    : success
      ? 'border-success-500 bg-success-50 text-success-500 dark:bg-success-500/15'
      : 'border-gray-200 bg-white text-gray-800 focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el as HTMLInputElement;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`${base} ${stateClass}`}
        />
      ))}
    </div>
  );
};

const AutoSubmit = () => {
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleChange = (v: string) => {
    setOtp(v);
    if (v.replace(/ /g, '').length === 6 && !verifying && !verified) {
      setVerifying(true);
      setTimeout(() => {
        setVerifying(false);
        setVerified(true);
      }, 2000);
    }
  };
  return (
    <div>
      <OTP length={6} value={otp} onChange={handleChange} success={verified} />
      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        {verifying ? (
          <>
            <Loader2 className="text-brand-500 h-4 w-4 animate-spin" />
            <span className="text-gray-500 dark:text-gray-400">Verifying...</span>
          </>
        ) : verified ? (
          <>
            <Check className="text-success-500 h-4 w-4" />
            <span className="text-success-500">Code verified!</span>
          </>
        ) : (
          <span className="text-gray-400">Enter 6-digit code to auto-submit</span>
        )}
      </div>
    </div>
  );
};

const ErrorOTP = () => {
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div>
      <OTP
        length={6}
        value={otp}
        onChange={(v) => {
          setOtp(v);
          setErr(v.replace(/ /g, '').length === 6);
        }}
        error={err}
      />
      {err && (
        <p className="text-error-500 mt-3 text-center text-sm">Invalid code. Please try again.</p>
      )}
    </div>
  );
};

export const OtpInputPage = () => {
  usePageTitle('OTP Input');
  const [otp4, setOtp4] = useState('');
  const [otp6, setOtp6] = useState('');
  return (
    <div className="space-y-6">
      <PageHeader
        title="OTP Input"
        description="One-time password and verification code inputs"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'UI Library', href: '/ui-library' },
              { label: 'OTP Input' },
            ]}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="4-digit OTP" desc="Type digits, auto-advances to next box">
          <OTP length={4} value={otp4} onChange={setOtp4} />
          <p className="mt-3 text-center text-xs text-gray-400">Enter 4-digit code</p>
        </SectionCard>
        <SectionCard title="6-digit OTP" desc="Standard verification code length">
          <OTP length={6} value={otp6} onChange={setOtp6} />
          <p className="mt-3 text-center text-xs text-gray-400">Enter 6-digit code</p>
        </SectionCard>
        <SectionCard title="Auto-Submit" desc="Triggers verification after last digit">
          <AutoSubmit />
        </SectionCard>
        <SectionCard title="Error State" desc="Highlights invalid code in red">
          <ErrorOTP />
        </SectionCard>
        <SectionCard title="Success State" desc="Green borders with success indicator">
          <div>
            <OTP
              length={6}
              value={'123456'}
              onChange={() => {
                /* noop */
              }}
              success
            />
            <div className="text-success-500 mt-3 flex items-center justify-center gap-2 text-sm">
              <Check className="h-4 w-4" />
              <span>Code verified successfully!</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
