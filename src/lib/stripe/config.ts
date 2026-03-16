import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || "",
  starter_annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || "",
  pro_monthly: process.env.STRIPE_MONTHLY_PRICE_ID || "",
  pro_annual: process.env.STRIPE_ANNUAL_PRICE_ID || "",
} as const;

export type PlanType = "starter" | "pro";
export type BillingInterval = "monthly" | "annual";

export function getPriceId(plan: PlanType, billing: BillingInterval): string {
  const key = `${plan}_${billing}` as keyof typeof PRICE_IDS;
  return PRICE_IDS[key] || "";
}
