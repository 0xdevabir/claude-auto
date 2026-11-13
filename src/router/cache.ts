import { createHash } from "node:crypto";
import { RoutingDecision } from "./types.js";

export interface CacheKeyPayload {
  prompt?: string | undefined;
  targetPaths?: string[] | undefined;
  profile: string;
  category?: string | undefined;
}

export class RoutingCache {
  private cache = new Map<string, { decision: RoutingDecision; timestamp: number }>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 200, ttlMs = 1000 * 60 * 30) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  computeHash(payload: CacheKeyPayload): string {
    const raw = JSON.stringify({
      prompt: payload.prompt ?? "",
      targetPaths: (payload.targetPaths ?? []).slice().sort(),
      profile: payload.profile,
      category: payload.category ?? "",
    });
    return createHash("sha256").update(raw).digest("hex");
  }

  get(key: string): RoutingDecision | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.decision;
  }

  set(key: string, decision: RoutingDecision): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { decision, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const globalRoutingCache = new RoutingCache();
