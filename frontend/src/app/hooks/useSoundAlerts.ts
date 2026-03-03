import { useEffect, useRef } from 'react';
import type { ActiveAlert } from '../../types';
import { playSound, loadSoundSettings } from '../lib/soundAlerts';

export const useSoundAlerts = (alerts: ActiveAlert[]) => {
  // Tracks IDs seen in previous poll to detect *new* alerts only
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialRef = useRef(true);

  useEffect(() => {
    // Skip the very first render — we don't know what's "new" yet
    if (initialRef.current) {
      initialRef.current = false;
      prevIdsRef.current = new Set(
        alerts.map((a) => `${a.rack_id}-${a.device_id}-${a.node_id}`)
      );
      return;
    }

    const settings = loadSoundSettings();
    if (!settings.enabled) {
      prevIdsRef.current = new Set(
        alerts.map((a) => `${a.rack_id}-${a.device_id}-${a.node_id}`)
      );
      return;
    }

    // Visibility check
    const hidden = document.hidden;
    if (settings.visibility === 'hidden-only' && !hidden) {
      prevIdsRef.current = new Set(
        alerts.map((a) => `${a.rack_id}-${a.device_id}-${a.node_id}`)
      );
      return;
    }
    if (settings.visibility === 'visible-only' && hidden) {
      prevIdsRef.current = new Set(
        alerts.map((a) => `${a.rack_id}-${a.device_id}-${a.node_id}`)
      );
      return;
    }

    const currentIds = new Set(alerts.map((a) => `${a.rack_id}-${a.device_id}-${a.node_id}`));
    const newAlerts = alerts.filter(
      (a) => !prevIdsRef.current.has(`${a.rack_id}-${a.device_id}-${a.node_id}`)
    );
    prevIdsRef.current = currentIds;

    if (newAlerts.length === 0) return;

    // Play the highest severity sound (CRIT > WARN)
    const hasCrit = newAlerts.some((a) => a.state === 'CRIT');
    const hasWarn = newAlerts.some((a) => a.state === 'WARN');
    const vol = settings.volume / 100;

    if (hasCrit && settings.critSound !== 'none') {
      playSound(settings.critSound, vol).catch(() => {
        // Ignore errors (autoplay blocked)
      });
    } else if (hasWarn && settings.warnSound !== 'none') {
      playSound(settings.warnSound, vol).catch(() => {
        // Ignore errors (autoplay blocked)
      });
    }
  }, [alerts]);
};
