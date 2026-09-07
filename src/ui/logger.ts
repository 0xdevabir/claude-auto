import { supportsColor } from "../process/terminal.js";

function paint(code: string, text: string): string {
  if (!supportsColor()) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

export class Logger {
  constructor(private readonly verboseEnabled: boolean) {}

  info(message: string): void {
    console.error(message);
  }

  banner(title: string): void {
    const line = "─".repeat(40);
    console.error(paint("36", line));
    console.error(paint("1", title));
    console.error(paint("36", line));
  }

  verbose(message: string): void {
    if (!this.verboseEnabled) return;
    const ts = new Date().toTimeString().slice(0, 8);
    console.error(paint("90", `[${ts}] ${redact(message)}`));
  }

  warn(message: string): void {
    console.error(paint("33", message));
  }

  error(message: string): void {
    console.error(paint("31", message));
  }
}

export function redact(input: string): string {
  return input
    .replace(/(api[_-]?key|token|authorization)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/sk-[a-zA-Z0-9]{10,}/g, "[redacted]");
}
