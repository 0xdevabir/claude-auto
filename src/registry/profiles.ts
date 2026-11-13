import { z } from "zod";

export const OptimizationProfileSchema = z.enum(["economy", "balanced", "quality"]);
export type OptimizationProfile = z.infer<typeof OptimizationProfileSchema>;

export interface ProfileDefinition {
  id: OptimizationProfile;
  name: string;
  description: string;
  costSensitivity: "low" | "medium" | "high";
  speedBias: "high" | "balanced" | "quality";
}

export const OPTIMIZATION_PROFILES: Record<OptimizationProfile, ProfileDefinition> = {
  economy: {
    id: "economy",
    name: "Economy",
    description: "Aggressive Haiku routing, low effort thinking; minimize token and quota cost",
    costSensitivity: "high",
    speedBias: "high",
  },
  balanced: {
    id: "balanced",
    name: "Balanced",
    description: "Default profile; balance precision and token efficiency using Sonnet and Haiku",
    costSensitivity: "medium",
    speedBias: "balanced",
  },
  quality: {
    id: "quality",
    name: "Quality",
    description: "Opus & high-effort Sonnet for deep reasoning, architectural plans and reviews",
    costSensitivity: "low",
    speedBias: "quality",
  },
};
