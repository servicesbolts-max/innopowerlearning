import { z } from "zod";
import type { TenantPreset } from "@/db/schema";

/** Every feature flag key. The database stores text; this enum is the allowlist. */
export const featureFlagKey = z.enum([
  "academic_records",
  "ai_authoring_assistant",
  "ai_study_assistant",
  "applications",
  "certificates",
  "commerce",
  "community",
  "gamification",
  "mentorship",
  "programs",
  "sponsor_reports",
]);
export type FeatureFlagKey = z.infer<typeof featureFlagKey>;

/**
 * Tenant presets (Section 3): the flags a new tenant starts with. Everything not listed is off.
 * Profile fields and the starter homepage join the presets in P3 and P10c.
 */
export const PRESET_FLAGS: Record<TenantPreset, readonly FeatureFlagKey[]> = {
  training_provider: ["certificates", "commerce", "community", "gamification"],
  funded_program: ["applications", "certificates", "programs", "sponsor_reports"],
  university: ["academic_records", "certificates", "programs"],
  community_organization: ["community", "certificates", "gamification"],
};

/** Flags for a preset plus explicit extras, as {key: enabled} over every known key. */
export function flagsForPreset(
  preset: TenantPreset,
  extra: readonly FeatureFlagKey[] = [],
): Record<FeatureFlagKey, boolean> {
  const on = new Set([...PRESET_FLAGS[preset], ...extra]);
  return Object.fromEntries(featureFlagKey.options.map((k) => [k, on.has(k)])) as Record<
    FeatureFlagKey,
    boolean
  >;
}
