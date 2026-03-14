import React, { useState } from 'react';
import { Activity, Tag, KeyRound, ShieldCheck, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { FormToggle } from '../common/FormToggle';
import { StepperInput } from '@app/components/forms/StepperInput';
import { TooltipHelp } from '@app/components/ui/Tooltip';
import type { ConfigDraft } from '../useSettingsConfig';

type TelemetrySettingsSectionProps = {
  draft: ConfigDraft;
  setDraft: React.Dispatch<React.SetStateAction<ConfigDraft | null>>;
}

export const TelemetrySettingsSection: React.FC<TelemetrySettingsSectionProps> = ({
  draft,
  setDraft,
}) => {
  // Track if auth and TLS client cert are enabled
  const [authEnabled, setAuthEnabled] = React.useState(
    !!(draft.telemetry.basic_auth_user || draft.telemetry.basic_auth_password)
  );
  const [tlsClientCertEnabled, setTlsClientCertEnabled] = React.useState(
    !!(draft.telemetry.tls_cert_file || draft.telemetry.tls_key_file)
  );

  const update = (field: string, value: string | boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        telemetry: {
          ...prev.telemetry,
          [field]: value,
        },
      };
    });
  };

  const toggleAuth = (enabled: boolean) => {
    setAuthEnabled(enabled);
    if (!enabled) {
      // Clear auth fields when disabled
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          telemetry: {
            ...prev.telemetry,
            basic_auth_user: '',
            basic_auth_password: '',
          },
        };
      });
    }
  };

  const toggleTlsClientCert = (enabled: boolean) => {
    setTlsClientCertEnabled(enabled);
    if (!enabled) {
      // Clear TLS client cert fields when disabled
      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          telemetry: {
            ...prev.telemetry,
            tls_cert_file: '',
            tls_key_file: '',
          },
        };
      });
    }
  };

  // ── Prometheus connection test ─────────────────────────────────────────────
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testDetail, setTestDetail] = useState('');

  const handleTestConnection = async () => {
    setTestState('testing');
    setTestDetail('');
    try {
      const res = await fetch('/api/stats/prometheus', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { last_ms?: number; avg_ms?: number };
      setTestState('ok');
      setTestDetail(
        `${data.last_ms != null ? `Latency: ${data.last_ms.toFixed(1)} ms` : ''}${data.avg_ms != null ? ` · avg ${data.avg_ms.toFixed(1)} ms` : ''}`
      );
    } catch (e) {
      setTestState('error');
      setTestDetail(e instanceof Error ? e.message : 'Connection failed');
    }
  };

  return (
    <div className="space-y-4">
      <FormSection
        title="Prometheus Connection"
        description="URL and credentials for your Prometheus instance."
        icon={Activity}
        iconColor="text-purple-500"
        iconBg="bg-purple-50 dark:bg-purple-500/10"
      >
        <FormField
          label="Prometheus URL"
          tooltip="URL of your Prometheus instance accessible from the backend container. Example: http://prometheus:9090"
          value={draft.telemetry.prometheus_url}
          onChange={(value) => {
            update('prometheus_url', value);
            setTestState('idle');
          }}
          placeholder="http://localhost:9090"
        />
        {/* Test Connection button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testState === 'testing'}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {testState === 'testing' ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : testState === 'ok' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : testState === 'error' ? (
              <WifiOff className="h-4 w-4 text-red-500" />
            ) : (
              <Wifi className="h-4 w-4 text-gray-400" />
            )}
            {testState === 'testing' ? 'Testing…' : 'Test Connection'}
          </button>
          {testDetail && (
            <span
              className={`text-xs font-medium ${testState === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
            >
              {testState === 'ok' ? '✓' : '✗'} {testDetail}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Heartbeat Interval (seconds)
              <TooltipHelp text="How often the backend pings Prometheus with a lightweight query to measure connection latency." />
            </label>
            <StepperInput
              value={Number(draft.telemetry.prometheus_heartbeat_seconds)}
              onChange={(v) => update('prometheus_heartbeat_seconds', String(v))}
              min={5}
              max={300}
              step={5}
              unit="s"
              className="w-32"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Latency Window (queries)
              <TooltipHelp text="Number of recent heartbeat samples used to compute average Prometheus latency. Higher = smoother average." />
            </label>
            <StepperInput
              value={Number(draft.telemetry.prometheus_latency_window)}
              onChange={(v) => update('prometheus_latency_window', String(v))}
              min={5}
              max={100}
              step={5}
              className="w-32"
            />
          </div>
        </div>
        <FormToggle
          label="Debug Stats"
          description="Enable telemetry debug statistics"
          tooltip="Log detailed Prometheus query statistics (count, cache hits, latency) to the backend container logs. For performance troubleshooting only."
          checked={draft.telemetry.debug_stats}
          onChange={(value) => update('debug_stats', value)}
        />
      </FormSection>

      <FormSection
        title="Label Mapping"
        description="Prometheus label names used to identify nodes, racks and chassis."
        icon={Tag}
        iconColor="text-blue-500"
        iconBg="bg-blue-50 dark:bg-blue-500/10"
      >
        <FormField
          label="Identity Label"
          tooltip="Prometheus label used to identify node instances. Usually 'instance'."
          value={draft.telemetry.identity_label}
          onChange={(value) => update('identity_label', value)}
          placeholder="instance"
        />
        <FormField
          label="Rack Label"
          tooltip="Prometheus label identifying rack IDs. Used for rack-scoped health checks."
          value={draft.telemetry.rack_label}
          onChange={(value) => update('rack_label', value)}
          placeholder="rack_id"
        />
        <FormField
          label="Chassis Label"
          tooltip="Prometheus label identifying chassis units. Used for chassis-scoped queries."
          value={draft.telemetry.chassis_label}
          onChange={(value) => update('chassis_label', value)}
          placeholder="chassis_id"
        />
        <FormField
          label="Job Regex"
          tooltip="Regular expression to filter Prometheus jobs for health check queries. '.*' matches all jobs."
          value={draft.telemetry.job_regex}
          onChange={(value) => update('job_regex', value)}
          placeholder=".*"
        />
      </FormSection>

      <FormSection
        title="Authentication (Optional)"
        description="Basic auth or bearer token for Prometheus instances requiring credentials."
        icon={KeyRound}
        iconColor="text-amber-500"
        iconBg="bg-amber-50 dark:bg-amber-500/10"
      >
        <FormToggle
          label="Enable Authentication"
          description="Enable basic authentication for Prometheus"
          tooltip="Send credentials with every Prometheus request. Enable only when your Prometheus instance requires authentication."
          checked={authEnabled}
          onChange={toggleAuth}
        />
        {authEnabled && (
          <>
            <FormField
              label="Basic Auth Username"
              tooltip="Username for HTTP Basic Authentication when connecting to Prometheus."
              value={draft.telemetry.basic_auth_user}
              onChange={(value) => update('basic_auth_user', value)}
              placeholder="username"
            />
            <FormField
              label="Basic Auth Password"
              tooltip="Password for HTTP Basic Authentication when connecting to Prometheus."
              value={draft.telemetry.basic_auth_password}
              onChange={(value) => update('basic_auth_password', value)}
              type="password"
              placeholder="password"
            />
          </>
        )}
      </FormSection>

      <FormSection
        title="TLS Configuration (Optional)"
        description="Certificate verification and mutual TLS for secure Prometheus connections."
        icon={ShieldCheck}
        iconColor="text-green-500"
        iconBg="bg-green-50 dark:bg-green-500/10"
      >
        <FormToggle
          label="TLS Verify"
          description="Verify server TLS certificates"
          tooltip="Validate the Prometheus server TLS certificate against a trusted CA. Disable only for self-signed certs in development."
          checked={draft.telemetry.tls_verify}
          onChange={(value) => update('tls_verify', value)}
        />
        {draft.telemetry.tls_verify && (
          <FormField
            label="CA File Path (optional)"
            tooltip="Path to the Certificate Authority file for verifying the Prometheus server TLS certificate."
            value={draft.telemetry.tls_ca_file}
            onChange={(value) => update('tls_ca_file', value)}
            placeholder="/path/to/ca.crt"
          />
        )}
        <FormToggle
          label="Enable TLS Client Certificate"
          description="Use client certificate for mutual TLS authentication"
          tooltip="Send a client certificate with every Prometheus request (mutual TLS). Required only when Prometheus enforces client identity verification."
          checked={tlsClientCertEnabled}
          onChange={toggleTlsClientCert}
        />
        {tlsClientCertEnabled && (
          <>
            <FormField
              label="Client Certificate Path"
              tooltip="Path to the client TLS certificate file for mutual TLS authentication."
              value={draft.telemetry.tls_cert_file}
              onChange={(value) => update('tls_cert_file', value)}
              placeholder="/path/to/client.crt"
            />
            <FormField
              label="Client Key Path"
              tooltip="Path to the private key file corresponding to the client TLS certificate."
              value={draft.telemetry.tls_key_file}
              onChange={(value) => update('tls_key_file', value)}
              placeholder="/path/to/client.key"
            />
          </>
        )}
      </FormSection>
    </div>
  );
};
