import React from 'react';
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

  return (
    <div className="space-y-8">
      <FormSection title="Prometheus Connection">
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

      <FormSection title="Label Mapping">
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

      <FormSection title="Authentication (Optional)">
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
          type="text"
          placeholder="password"
        />
      </FormSection>

      <FormSection title="TLS Configuration (Optional)">
        <FormToggle
          label="TLS Verify"
          description="Verify TLS certificates"
          checked={draft.telemetry.tls_verify}
          onChange={(value) => update('tls_verify', value)}
        />
        <FormField
          label="CA File Path"
          value={draft.telemetry.tls_ca_file}
          onChange={(value) => update('tls_ca_file', value)}
          placeholder="/path/to/ca.crt"
        />
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
      </FormSection>
    </div>
  );
};
