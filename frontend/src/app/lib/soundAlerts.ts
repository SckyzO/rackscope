export type SoundPreset = 'soft-ping' | 'double-beep' | 'alert-tone' | 'alarm' | 'noc-chime' | 'siren';

export type SoundAlertSettings = {
  enabled: boolean;
  warnSound: SoundPreset | 'none';
  critSound: SoundPreset | 'none';
  volume: number; // 0–100
  visibility: 'always' | 'hidden-only' | 'visible-only';
  alertPollMs: number; // polling interval in ms
};

export const ALERT_POLL_OPTIONS = [
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '1m',  ms: 60_000 },
  { label: '2m',  ms: 120_000 },
  { label: '5m',  ms: 300_000 },
  { label: '10m', ms: 600_000 },
  { label: '15m', ms: 900_000 },
  { label: '30m', ms: 1_800_000 },
];

export const DEFAULT_SOUND_SETTINGS: SoundAlertSettings = {
  enabled: false,
  warnSound: 'double-beep',
  critSound: 'siren',
  volume: 70,
  visibility: 'always',
  alertPollMs: 60_000,
};

export const SOUND_PRESETS: Record<SoundPreset, { name: string; description: string }> = {
  'soft-ping': { name: 'Soft ping', description: 'Gentle sine wave — subtle notification' },
  'double-beep': { name: 'Double beep', description: 'Two short beeps — clear attention signal' },
  'alert-tone': { name: 'Alert tone', description: 'Rising tone — moderate urgency' },
  alarm: { name: 'Alarm', description: 'Rapid alternating tones — high urgency' },
  'noc-chime': { name: 'NOC chime', description: 'Three-note chime — professional NOC style' },
  siren: { name: 'Siren', description: 'Fire truck two-tone siren (960/770Hz, 3 cycles) — maximum urgency' },
};

// Plays a preset at given volume (0–1). Returns a Promise that resolves when done.
export async function playSound(preset: SoundPreset, volume: number): Promise<void> {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.gain.value = Math.min(1, Math.max(0, volume));
  gain.connect(ctx.destination);

  switch (preset) {
    case 'soft-ping': {
      // Single gentle sine at 880Hz, 0.3s
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      await new Promise((r) => setTimeout(r, 350));
      break;
    }
    case 'double-beep': {
      // Two beeps at 660Hz, 100ms each, 150ms apart
      for (const offset of [0, 0.25]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 660;
        osc.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(volume * 0.3, ctx.currentTime + offset);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.1);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.1);
      }
      await new Promise((r) => setTimeout(r, 500));
      break;
    }
    case 'alert-tone': {
      // Rising tone 440→880Hz over 0.4s
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      await new Promise((r) => setTimeout(r, 600));
      break;
    }
    case 'alarm': {
      // Rapid alternating 440/880Hz, 6 cycles
      for (let i = 0; i < 6; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = i % 2 === 0 ? 440 : 880;
        osc.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(volume * 0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
      }
      await new Promise((r) => setTimeout(r, 800));
      break;
    }
    case 'noc-chime': {
      // Three-note descending chime: 880, 660, 440Hz
      for (const [i, freq] of [
        [0, 880],
        [0.2, 660],
        [0.4, 440],
      ] as [number, number][]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + i;
        g.gain.setValueAtTime(volume * 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      }
      await new Promise((r) => setTimeout(r, 800));
      break;
    }
    case 'siren': {
      // Fire truck siren (European two-tone: 960Hz / 770Hz, alternating, 3 cycles)
      // Two detuned oscillators per tone + bandpass filter = authentic horn character
      const toneDuration = 0.42;
      const tones = [960, 770];
      const cycles = 3;

      for (let cycle = 0; cycle < cycles; cycle++) {
        for (let t = 0; t < 2; t++) {
          const startTime = ctx.currentTime + (cycle * 2 + t) * toneDuration;
          const freq = tones[t];

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';
          osc1.frequency.value = freq;
          osc2.frequency.value = freq * 1.006; // slight detuning for richness

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = freq;
          filter.Q.value = 1.2;

          const g = ctx.createGain();
          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(g);
          g.connect(ctx.destination);

          // Sharp 20ms attack + hold + 20ms release = clean two-tone character
          g.gain.setValueAtTime(0.001, startTime);
          g.gain.linearRampToValueAtTime(volume * 0.45, startTime + 0.02);
          g.gain.setValueAtTime(volume * 0.45, startTime + toneDuration - 0.02);
          g.gain.linearRampToValueAtTime(0.001, startTime + toneDuration);

          osc1.start(startTime);
          osc1.stop(startTime + toneDuration);
          osc2.start(startTime);
          osc2.stop(startTime + toneDuration);
        }
      }

      const totalTime = cycles * 2 * toneDuration;
      await new Promise((r) => setTimeout(r, totalTime * 1000 + 100));
      break;
    }
  }
  ctx.close();
}

// localStorage helpers
const STORAGE_KEY = 'rackscope.sound-alerts';

export function loadSoundSettings(): SoundAlertSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SOUND_SETTINGS };
    return { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
}

export function saveSoundSettings(s: SoundAlertSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded — ignore
  }
}
