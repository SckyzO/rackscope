import { useState, useRef, type KeyboardEvent, type ChangeEvent } from 'react';
import { Check, Loader2 } from 'lucide-react';

const SectionCard = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-5"><h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {desc && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}</div>
    {children}
  </div>
);

const OTP = ({ length, value, onChange, error = false, success = false }: { length: number; value: string; onChange: (v: string) => void; error?: boolean; success?: boolean }) => {
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
  const base = 'h-12 w-12 rounded-lg border-2 text-center text-lg font-bold focus:outline-none transition-colors';
  const stateClass = error ? 'border-error-500 bg-error-50 text-error-500 dark:bg-error-500/15' : success ? 'border-success-500 bg-success-50 text-success-500 dark:bg-success-500/15' : 'border-gray-200 bg-white text-gray-800 focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white';
  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el!)} type="text" inputMode="numeric" maxLength={1} value={value[i] || ''} onChange={(e) => handleChange(i, e)} onKeyDown={(e) => handleKeyDown(i, e)} className={`${base} ${stateClass}`} />
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
      setTimeout(() => { setVerifying(false); setVerified(true); }, 2000);
    }
  };
  return (
    <div>
      <OTP length={6} value={otp} onChange={handleChange} success={verified} />
      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        {verifying ? <><Loader2 className="h-4 w-4 animate-spin text-brand-500" /><span className="text-gray-500 dark:text-gray-400">Verifying...</span></> :
         verified ? <><Check className="h-4 w-4 text-success-500" /><span className="text-success-500">Code verified!</span></> :
         <span className="text-gray-400">Enter 6-digit code to auto-submit</span>}
      </div>
    </div>
  );
};

const ErrorOTP = () => {
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState(false);
  return (
    <div>
      <OTP length={6} value={otp} onChange={(v) => { setOtp(v); setErr(v.replace(/ /g, '').length === 6); }} error={err} />
      {err && <p className="mt-3 text-center text-sm text-error-500">Invalid code. Please try again.</p>}
    </div>
  );
};

export const OtpInputPage = () => {
  const [otp4, setOtp4] = useState('');
  const [otp6, setOtp6] = useState('');
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-gray-900 dark:text-white">OTP Input</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">One-time password and verification code inputs</p></div>
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
            <OTP length={6} value={'123456'} onChange={() => {}} success />
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-success-500">
              <Check className="h-4 w-4" /><span>Code verified successfully!</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
