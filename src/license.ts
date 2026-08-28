export const LICENSE_VERIFY_COOLDOWN_MS = 30_000;

export function verificationDelayMs(lastAttemptAt: number, now = Date.now()): number {
  if (!Number.isFinite(lastAttemptAt) || lastAttemptAt <= 0) return 0;
  return Math.max(0, lastAttemptAt + LICENSE_VERIFY_COOLDOWN_MS - now);
}

export function retryAfterMs(value: string | null, now = Date.now()): number {
  if (!value) return LICENSE_VERIFY_COOLDOWN_MS;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1_000, seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1_000, date - now) : LICENSE_VERIFY_COOLDOWN_MS;
}

export function waitMessage(delayMs: number): string {
  const seconds = Math.max(1, Math.ceil(delayMs / 1_000));
  return `Please wait ${seconds} second${seconds === 1 ? "" : "s"} before verifying another license.`;
}
