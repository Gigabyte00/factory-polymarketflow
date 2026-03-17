export type UserTier = "free" | "starter" | "pro";

export function getTier(profile?: { tier?: string | null } | null): UserTier {
  if (profile?.tier === "pro") return "pro";
  if (profile?.tier === "starter") return "starter";
  return "free";
}

export function isFree(profile?: { tier?: string | null } | null): boolean {
  return getTier(profile) === "free";
}

export function isStarter(profile?: { tier?: string | null } | null): boolean {
  const tier = getTier(profile);
  return tier === "starter" || tier === "pro";
}

export function isPro(profile?: { tier?: string | null } | null): boolean {
  return getTier(profile) === "pro";
}

export function getAlertLimit(profile?: { tier?: string | null } | null): number | null {
  const tier = getTier(profile);
  if (tier === "pro") return null;
  if (tier === "starter") return 20;
  return 3;
}

export function getWatchlistLimit(profile?: { tier?: string | null } | null): number | null {
  return isStarter(profile) ? null : 2;
}

export function getWatchlistItemLimit(profile?: { tier?: string | null } | null): number | null {
  return isStarter(profile) ? null : 10;
}

export function canAccessFlow(profile?: { tier?: string | null } | null): boolean {
  return isPro(profile);
}

export function canAccessPortfolio(profile?: { tier?: string | null } | null): boolean {
  return isStarter(profile);
}

export function canAccessAdvancedPortfolio(profile?: { tier?: string | null } | null): boolean {
  return isPro(profile);
}

export function canAccessBriefings(profile?: { tier?: string | null } | null): boolean {
  return isStarter(profile);
}

export function hasPersonalizedBriefings(profile?: { tier?: string | null } | null): boolean {
  return isPro(profile);
}

export function isInternalOrTestEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return (
    normalized.endsWith("@test.com") ||
    normalized.endsWith("@example.com") ||
    normalized === "support@polymarketflow.com" ||
    normalized.includes("pmflow.test")
  );
}
