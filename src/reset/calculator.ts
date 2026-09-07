export function withResetBuffer(resetAt: Date, bufferSeconds: number): Date {
  const buffer = Math.max(0, bufferSeconds);
  return new Date(resetAt.getTime() + buffer * 1000);
}

export function fallbackResetAt(now: Date, fallbackResetSeconds: number): Date {
  const seconds = Math.max(0, fallbackResetSeconds);
  return new Date(now.getTime() + seconds * 1000);
}

export function msUntil(target: Date, now: Date = new Date()): number {
  return Math.max(0, target.getTime() - now.getTime());
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatClock(date: Date): string {
  return date.toTimeString().slice(0, 8);
}
