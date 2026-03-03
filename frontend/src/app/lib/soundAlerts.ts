export type SoundPreset = 'soft-ping' | 'double-beep' | 'alert-tone' | 'alarm' | 'noc-chime';

export type SoundAlertSettings = {
  enabled: boolean;
  warnSound: SoundPreset | 'none';
  critSound: SoundPreset | 'none';
  volume: number; // 0–100
  visibility: 'always' | 'hidden-only' | 'visible-only';
};

export const DEFAULT_SOUND_SETTINGS: SoundAlertSettings = {
  enabled: false,
  warnSound: 'double-beep',
  critSound: 'alarm',
  volume: 70,
  visibility: 'always',
};

export const SOUND_PRESETS: Record<SoundPreset, { name: string; description: string }> = {
  'soft-ping': { name: 'Soft ping', description: 'Gentle sine wave — subtle notification' },
  'double-beep': { name: 'Double beep', description: 'Two short beeps — clear attention signal' },
  'alert-tone': { name: 'Alert tone', description: 'Rising tone — moderate urgency' },
  alarm: { name: 'Alarm', description: 'Rapid alternating tones — high urgency' },
  'noc-chime': { name: 'NOC chime', description: 'Three-note chime — professional NOC style' },
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
