// In-memory state lasts for this app load and resets on a browser reload.
let startedAt: number | null = null;
let completed = false;
export function isStartupIntroComplete() { return completed; }
export function startupIntroDelay(reducedMotion: boolean, now = Date.now()) {
  startedAt ??= now;
  return reducedMotion || completed ? 0 : Math.max(0, 1600 - (now - startedAt));
}
export function completeStartupIntro() { completed = true; }
