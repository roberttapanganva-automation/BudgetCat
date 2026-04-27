import type { ReminderSoundMode } from "../types/finance";

const soundPreferenceKey = "budgetcat-reminder-sound";
const meowSoundPath = "/assets/sounds/garage-cat-meow-7-fx-306186.mp3";

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
  const audio = new Audio(meowSoundPath);
  audio.volume = 0.75;
  audio.preload = "auto";

  await audio.play();
  return { ok: true };
}

export async function playReminderSound(mode: ReminderSoundMode = getReminderSoundMode()) {
  if (mode === "off") return { ok: false, reason: "Reminder sound is off." };

  try {
    return await (mode === "chime" ? playSoftChime() : playMeow());
  } catch {
    return { ok: false, reason: "Reminder sound could not play in this browser." };
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
