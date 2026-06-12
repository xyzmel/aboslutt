export const plans = ["free", "beta", "premium", "admin"] as const;

export type Plan = (typeof plans)[number];

const freeManualSubscriptionLimit = 10;

type PlanLikeUser = {
  plan?: string | null;
};

export function getUserPlan(user: PlanLikeUser | null | undefined): Plan {
  return normalizePlan(user?.plan);
}

export function normalizePlan(plan: string | null | undefined): Plan {
  if (plans.includes(plan as Plan)) {
    return plan as Plan;
  }

  return "free";
}

export function isValidPlan(plan: string): plan is Plan {
  return plans.includes(plan as Plan);
}

export function canUseGmailScan(user: PlanLikeUser) {
  return hasBetaEntitlements(getUserPlan(user));
}

export function canUseEmailReminders(user: PlanLikeUser) {
  return hasBetaEntitlements(getUserPlan(user));
}

export function canUseMonthlySummary(user: PlanLikeUser) {
  return hasBetaEntitlements(getUserPlan(user));
}

export function canAddManualSubscription(user: PlanLikeUser, currentSubscriptionCount: number) {
  if (hasBetaEntitlements(getUserPlan(user))) {
    return true;
  }

  return currentSubscriptionCount < freeManualSubscriptionLimit;
}

export function getManualSubscriptionLimit(user: PlanLikeUser) {
  return hasBetaEntitlements(getUserPlan(user)) ? null : freeManualSubscriptionLimit;
}

function hasBetaEntitlements(plan: Plan) {
  return plan === "beta" || plan === "premium" || plan === "admin";
}
