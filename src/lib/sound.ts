import type { ReminderSoundMode } from "../types/finance";

const soundPreferenceKey = "budgetcat-reminder-sound";

function normalizeSoundMode(value: string | null): ReminderSoundMode {
  if (value === "off" || value === "chime" || value === "meow") return value;
  if (value === "on") return "meow";
  return "meow";
}

export function getReminderSoundMode(): ReminderSoundMode {
  return normalizeSoundMode(localStorage.getItem(soundPreferenceKey));
}

export function setReminderSoundMode(mode: ReminderSoundMode) {
  localStorage.setItem(soundPreferenceKey, mode);
}

export function getReminderSoundEnabled() {
  return getReminderSoundMode() !== "off";
}

export function setReminderSoundEnabled(enabled: boolean) {
  setReminderSoundMode(enabled ? "meow" : "off");
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  return new AudioContextClass();
}

async function playSoftChime() {
  const audioContext = createAudioContext();
  if (!audioContext) {
    return { ok: false, reason: "Web Audio is not supported in this browser." };
  }

  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.22);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.36);

  oscillator.onended = () => {
    audioContext.close().catch(() => undefined);
  };

  return { ok: true };
}

async function playMeow() {
  const audioContext = createAudioContext();
  if (!audioContext) {
    return { ok: false, reason: "Web Audio is not supported in this browser." };
  }

  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const body = audioContext.createOscillator();
  const throat = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();

  body.type = "sawtooth";
  throat.type = "triangle";
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1500, now);
  filter.frequency.exponentialRampToValueAtTime(900, now + 0.46);

  body.frequency.setValueAtTime(520, now);
  body.frequency.exponentialRampToValueAtTime(780, now + 0.18);
  body.frequency.exponentialRampToValueAtTime(360, now + 0.52);

  throat.frequency.setValueAtTime(330, now);
  throat.frequency.exponentialRampToValueAtTime(510, now + 0.16);
  throat.frequency.exponentialRampToValueAtTime(260, now + 0.5);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

  body.connect(filter);
  throat.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);

  body.start(now);
  throat.start(now + 0.02);
  body.stop(now + 0.58);
  throat.stop(now + 0.55);

  body.onended = () => {
    audioContext.close().catch(() => undefined);
  };

  return { ok: true };
}

export async function playReminderSound(mode: ReminderSoundMode = getReminderSoundMode()) {
  if (mode === "off") return { ok: false, reason: "Reminder sound is off." };

  try {
    return mode === "chime" ? playSoftChime() : playMeow();
  } catch {
    return { ok: false, reason: "Reminder sound could not play in this browser." };
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
