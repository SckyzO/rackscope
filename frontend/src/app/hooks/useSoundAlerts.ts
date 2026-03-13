import { useEffect, useRef } from 'react';
import type { ActiveAlert } from '@src/types';
import { playSound, loadSoundSettings } from '../lib/soundAlerts';

const COOLDOWN_MS = 5000; // minimum ms between two sounds

const makeId = (a: ActiveAlert) => `${a.rack_id}-${a.device_id}-${a.node_id}`;

export const useSoundAlerts = (alerts: ActiveAlert[]) => {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialRef = useRef(true);
  const playingRef = useRef(false); // true while a sound is playing
  const lastPlayedRef = useRef<number>(0); // timestamp of last sound

  useEffect(() => {
    // Skip the very first render — seed prevIds so initial alerts don't trigger a sound
    if (initialRef.current) {
      initialRef.current = false;
      prevIdsRef.current = new Set(alerts.map(makeId));
      return;
    }

    const settings = loadSoundSettings();
    if (!settings.enabled) {
      prevIdsRef.current = new Set(alerts.map(makeId));
      return;
    }

    // Visibility check
    const hidden = document.hidden;
    if (settings.visibility === 'hidden-only' && !hidden) {
      prevIdsRef.current = new Set(alerts.map(makeId));
      return;
    }
    if (settings.visibility === 'visible-only' && hidden) {
      prevIdsRef.current = new Set(alerts.map(makeId));
      return;
    }

    const currentIds = new Set(alerts.map(makeId));
    const newAlerts = alerts.filter((a) => !prevIdsRef.current.has(makeId(a)));
    prevIdsRef.current = currentIds;

    if (newAlerts.length === 0) return;

    // Prevent overlapping sounds: skip if already playing or within cooldown window
    if (playingRef.current) return;
    if (Date.now() - lastPlayedRef.current < COOLDOWN_MS) return;

    const hasCrit = newAlerts.some((a) => a.state === 'CRIT');
    const hasWarn = newAlerts.some((a) => a.state === 'WARN');
    const vol = settings.volume / 100;

    const preset =
      hasCrit && settings.critSound !== 'none'
        ? settings.critSound
        : hasWarn && settings.warnSound !== 'none'
          ? settings.warnSound
          : null;

    if (!preset) return;

    playingRef.current = true;
    lastPlayedRef.current = Date.now();
    playSound(preset, vol)
      .catch(() => {
        /* ignore playback errors */
      })
      .finally(() => {
        playingRef.current = false;
      });
  }, [alerts]);
};
