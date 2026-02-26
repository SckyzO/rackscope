import React from 'react';
import { Activity, Tag, KeyRound, ShieldCheck } from 'lucide-react';
import { FormField } from '../common/FormField';
import { FormSection } from '../common/FormSection';
import { FormToggle } from '../common/FormToggle';
import type { ConfigDraft } from '../useSettingsConfig';

interface TelemetrySettingsSectionProps {
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

  return (
    <div className="space-y-4">
      <FormSection title="Prometheus Connection" icon={Activity} iconColor="text-purple-500" iconBg="bg-purple-50 dark:bg-purple-500/10">
        <FormField
          label="Prometheus URL"
          value={draft.telemetry.prometheus_url}
          onChange={(value) => update('prometheus_url', value)}
          placeholder="http://localhost:9090"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Heartbeat Interval (seconds)"
            value={draft.telemetry.prometheus_heartbeat_seconds}
            onChange={(value) => update('prometheus_heartbeat_seconds', value)}
            type="number"
          />
          <FormField
            label="Latency Window (queries)"
            value={draft.telemetry.prometheus_latency_window}
            onChange={(value) => update('prometheus_latency_window', value)}
            type="number"
          />
        </div>
        <FormToggle
          label="Debug Stats"
          description="Enable telemetry debug statistics"
          checked={draft.telemetry.debug_stats}
          onChange={(value) => update('debug_stats', value)}
        />
      </FormSection>

      <FormSection title="Label Mapping" icon={Tag} iconColor="text-blue-500" iconBg="bg-blue-50 dark:bg-blue-500/10">
        <FormField
          label="Identity Label"
          value={draft.telemetry.identity_label}
          onChange={(value) => update('identity_label', value)}
          placeholder="instance"
        />
        <FormField
          label="Rack Label"
          value={draft.telemetry.rack_label}
          onChange={(value) => update('rack_label', value)}
          placeholder="rack_id"
        />
        <FormField
          label="Chassis Label"
          value={draft.telemetry.chassis_label}
          onChange={(value) => update('chassis_label', value)}
          placeholder="chassis_id"
        />
        <FormField
          label="Job Regex"
          value={draft.telemetry.job_regex}
          onChange={(value) => update('job_regex', value)}
          placeholder=".*"
        />
      </FormSection>

      <FormSection title="Authentication (Optional)" icon={KeyRound} iconColor="text-amber-500" iconBg="bg-amber-50 dark:bg-amber-500/10">
        <FormToggle
          label="Enable Authentication"
          description="Enable basic authentication for Prometheus"
          checked={authEnabled}
          onChange={toggleAuth}
        />
        {authEnabled && (
          <>
            <FormField
              label="Basic Auth Username"
              value={draft.telemetry.basic_auth_user}
              onChange={(value) => update('basic_auth_user', value)}
              placeholder="username"
            />
            <FormField
              label="Basic Auth Password"
              value={draft.telemetry.basic_auth_password}
              onChange={(value) => update('basic_auth_password', value)}
              type="password"
              placeholder="password"
            />
          </>
        )}
      </FormSection>

      <FormSection title="TLS Configuration (Optional)" icon={ShieldCheck} iconColor="text-green-500" iconBg="bg-green-50 dark:bg-green-500/10">
        <FormToggle
          label="TLS Verify"
          description="Verify server TLS certificates"
          checked={draft.telemetry.tls_verify}
          onChange={(value) => update('tls_verify', value)}
        />
        {draft.telemetry.tls_verify && (
          <FormField
            label="CA File Path (optional)"
            value={draft.telemetry.tls_ca_file}
            onChange={(value) => update('tls_ca_file', value)}
            placeholder="/path/to/ca.crt"
          />
        )}
        <FormToggle
          label="Enable TLS Client Certificate"
          description="Use client certificate for mutual TLS authentication"
          checked={tlsClientCertEnabled}
          onChange={toggleTlsClientCert}
        />
        {tlsClientCertEnabled && (
          <>
            <FormField
              label="Client Certificate Path"
              value={draft.telemetry.tls_cert_file}
              onChange={(value) => update('tls_cert_file', value)}
              placeholder="/path/to/client.crt"
            />
            <FormField
              label="Client Key Path"
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
