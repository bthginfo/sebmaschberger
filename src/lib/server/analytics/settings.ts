import { randomBytes } from "node:crypto";
import type { AnalyticsSettings } from "../../analytics/model";

export function initialAnalyticsSettings(enabled = false): AnalyticsSettings {
  return {
    revision: 1,
    enabled,
    everEnabled: enabled,
    generation: enabled ? 2 : 1,
    retentionDays: 90,
    changedAt: new Date().toISOString(),
    secret: randomBytes(48).toString("base64url"),
    goals: [],
  };
}
