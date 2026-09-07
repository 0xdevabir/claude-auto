export interface ParsedDuration {
  seconds: number;
  raw: string;
}

const DURATION_TOKEN =
  /(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d)\b/gi;

export function parseDurationToSeconds(input: string): ParsedDuration | null {
  const text = input.trim();
  if (!text) return null;
  if (/^-/.test(text) || /-\d/.test(text)) return null;

  const onlyNumber = /^(\d+(?:\.\d+)?)$/.exec(text);
  if (onlyNumber?.[1]) {
    const seconds = Number(onlyNumber[1]);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return { seconds: Math.floor(seconds), raw: text };
  }

  let total = 0;
  let matched = false;
  for (const match of text.matchAll(DURATION_TOKEN)) {
    matched = true;
    const value = Number(match[1]);
    const unit = (match[2] ?? "").toLowerCase();
    if (!Number.isFinite(value) || value < 0) return null;
    if (unit.startsWith("d")) total += value * 86400;
    else if (unit.startsWith("h")) total += value * 3600;
    else if (unit.startsWith("m")) total += value * 60;
    else total += value;
  }

  if (!matched) return null;
  return { seconds: Math.floor(total), raw: text };
}

const CLOCK_RE =
  /^(?:(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+)?(\d{1,2})(?::(\d{2})(?::(\d{2}))?)?\s*(am|pm)?$/i;

export function parseClockTime(input: string, now: Date = new Date()): Date | null {
  const text = input.trim();

  if (/\d{4}-\d{2}-\d{2}|T\d{2}:/.test(text)) {
    const iso = Date.parse(text);
    if (!Number.isNaN(iso)) return new Date(iso);
  }

  const match = CLOCK_RE.exec(text);
  if (!match) return null;

  const dayName = match[1];
  let hour = Number(match[2]);
  const minute = Number(match[3] ?? 0);
  const second = Number(match[4] ?? 0);
  const ampm = match[5]?.toLowerCase();

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second) ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  // Bare hour without am/pm is ambiguous
  if (!ampm && match[3] === undefined) {
    return null;
  }
  if (!ampm && hour > 23) return null;

  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  const result = new Date(now.getTime());
  result.setSeconds(second, 0);
  result.setMinutes(minute);
  result.setHours(hour);

  if (dayName) {
    const target = weekdayIndex(dayName);
    if (target < 0) return null;
    const delta = (target - result.getDay() + 7) % 7;
    result.setDate(result.getDate() + delta);
    if (delta === 0 && result.getTime() <= now.getTime()) {
      result.setDate(result.getDate() + 7);
    }
  } else if (result.getTime() <= now.getTime()) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

function weekdayIndex(name: string): number {
  const n = name.toLowerCase().slice(0, 3);
  const map: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  return map[n] ?? -1;
}

export interface ResetParseResult {
  resetAt?: Date;
  retryAfterSeconds?: number;
  source: "timestamp" | "duration" | "clock" | "none";
  raw?: string;
}

export function parseResetInfo(text: string, now: Date = new Date()): ResetParseResult {
  const retryAfter = /retry after\s+(\d+)\s*seconds?/i.exec(text);
  if (retryAfter?.[1]) {
    const seconds = Number(retryAfter[1]);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return {
        resetAt: new Date(now.getTime() + seconds * 1000),
        retryAfterSeconds: seconds,
        source: "duration",
        raw: retryAfter[0],
      };
    }
  }

  const retryAfterHeader = /retry[- ]after[:\s]+(\d+)/i.exec(text);
  if (retryAfterHeader?.[1]) {
    const seconds = Number(retryAfterHeader[1]);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return {
        resetAt: new Date(now.getTime() + seconds * 1000),
        retryAfterSeconds: seconds,
        source: "duration",
        raw: retryAfterHeader[0],
      };
    }
  }

  const resets = /resets?\s+(?:at\s+)?([^\n·|,]+)/i.exec(text);
  if (resets?.[1]) {
    // Strip timezone / parenthetical suffixes: "4:40pm (Asia/Dhaka)"
    const chunk = resets[1]
      .replace(/\([^)]*\)/g, "")
      .replace(/\b(?:UTC|GMT)[+-]?\d*\b/gi, "")
      .trim();
    const duration = parseDurationToSeconds(chunk.replace(/^in\s+/i, ""));
    if (duration) {
      return {
        resetAt: new Date(now.getTime() + duration.seconds * 1000),
        retryAfterSeconds: duration.seconds,
        source: "duration",
        raw: chunk,
      };
    }
    const clock = parseClockTime(chunk, now);
    if (clock) {
      return { resetAt: clock, source: "clock", raw: chunk };
    }
  }

  const tryAgain = /try again in\s+([^\n.]+)/i.exec(text);
  if (tryAgain?.[1]) {
    const duration = parseDurationToSeconds(tryAgain[1]);
    if (duration) {
      return {
        resetAt: new Date(now.getTime() + duration.seconds * 1000),
        retryAfterSeconds: duration.seconds,
        source: "duration",
        raw: tryAgain[1],
      };
    }
  }

  const autoResume = /auto-resuming at\s+([^\n·|]+)/i.exec(text);
  if (autoResume?.[1]) {
    const clock = parseClockTime(autoResume[1].trim(), now);
    if (clock) {
      return { resetAt: clock, source: "clock", raw: autoResume[1].trim() };
    }
  }

  return { source: "none" };
}

