import { playReminderSound } from "./sound";

export function playCreateSuccessFeedback() {
  void playReminderSound().catch(() => undefined);
}
