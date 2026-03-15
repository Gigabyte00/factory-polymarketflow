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
  pro: process.env.STRIPE_PRO_PRICE_ID || "",
  elite: process.env.STRIPE_ELITE_PRICE_ID || "",
} as const;

export type PlanType = "pro" | "elite";
