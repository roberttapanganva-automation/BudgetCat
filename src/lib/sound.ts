const soundPreferenceKey = "budgetcat-reminder-sound";

export function getReminderSoundEnabled() {
  return localStorage.getItem(soundPreferenceKey) !== "off";
}

export function setReminderSoundEnabled(enabled: boolean) {
  localStorage.setItem(soundPreferenceKey, enabled ? "on" : "off");
}

export async function playReminderSound() {
  if (!getReminderSoundEnabled()) return { ok: false, reason: "Reminder sound is off." };

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return { ok: false, reason: "Web Audio is not supported in this browser." };
    }

    const audioContext = new AudioContextClass();
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
  } catch {
    return { ok: false, reason: "Reminder sound could not play in this browser." };
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
