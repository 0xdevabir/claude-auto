import { UserCancelledError } from "../errors/errors.js";

export type CancelCallback = () => void;

export class SignalHub {
  private cancelled = false;
  private listeners = new Set<CancelCallback>();
  private attached = false;

  get isCancelled(): boolean {
    return this.cancelled;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    const onSignal = () => {
      this.cancel();
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  }

  onCancel(cb: CancelCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        // ignore listener errors
      }
    }
  }

  throwIfCancelled(): void {
    if (this.cancelled) {
      throw new UserCancelledError();
    }
  }
}

export const globalSignals = new SignalHub();
