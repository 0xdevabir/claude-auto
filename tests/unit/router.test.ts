import { describe, expect, it } from "vitest";
import { defaultModelRouter, ModelRouterEngine } from "../../src/router/engine.js";
import { analyzeHeuristics } from "../../src/router/heuristics.js";

describe("Intelligent Model Router", () => {
  it("classifies documentation keywords to documentation category and haiku model", async () => {
    const analysis = await analyzeHeuristics({
      prompt: "Update JSDoc comments and README documentation for the API",
    });

    expect(analysis.category).toBe("documentation");

    const decision = await defaultModelRouter.route(
      { prompt: "Update JSDoc comments and README documentation for the API" },
      { profile: "economy" },
    );

    expect(decision.phases.execution.model).toBe("haiku");
    expect(decision.phases.execution.effort).toBe("low");
    expect(decision.explanation).toContain("DOCUMENTATION");
  });

  it("routes high-concurrency debugging to Opus in quality profile", async () => {
    const decision = await defaultModelRouter.route(
      { prompt: "Fix subtle concurrency race condition in websocket deadlock" },
      { profile: "quality" },
    );

    expect(decision.category).toBe("debugging");
    expect(decision.complexity).toBe("high");
    expect(decision.phases.plan?.model).toBe("opus");
  });

  it("uses the routing cache to avoid redundant analysis", async () => {
    const router = new ModelRouterEngine();
    const payload = { prompt: "Refactor database engine connection pool" };

    const first = await router.route(payload, { profile: "balanced" });
    const second = await router.route(payload, { profile: "balanced" });

    expect(first.taskId).toBe(second.taskId);
  });
});
