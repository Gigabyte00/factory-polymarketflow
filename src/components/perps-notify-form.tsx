"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * "Get notified" email capture for the /perps coming-soon variant. Posts to
 * the site's existing /api/subscribe endpoint (pmflow.email_subscribers) with
 * source=perps-waitlist, and redirects back to /perps to show confirmation.
 * Client component (useSearchParams) wrapped in Suspense so the host page
 * stays static/ISR.
 */
function NotifyFormInner() {
  const searchParams = useSearchParams();
  const subscribed = searchParams.get("subscribed");

  if (subscribed === "true") {
    return (
      <div className="px-4 py-3 rounded-md bg-primary/10 border border-primary/30 text-sm text-primary font-medium text-center">
        You&apos;re on the list — we&apos;ll email you the moment Perps coverage goes live.
      </div>
    );
  }

  return (
    <div>
      <form action="/api/subscribe" method="POST" className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input type="hidden" name="source" value="perps-waitlist" />
        <input type="hidden" name="next" value="/perps" />
        <input
          type="email"
          name="email"
          required
          placeholder="you@email.com"
          aria-label="Email address"
          className="flex-1 px-3 py-2.5 rounded-md bg-background border border-border text-sm focus:ring-1 focus:ring-primary focus:border-primary"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Notify Me
        </button>
      </form>
      {subscribed === "error" && (
        <p className="text-xs text-loss text-center mt-2">Please enter a valid email address.</p>
      )}
    </div>
  );
}

export function PerpsNotifyForm() {
  return (
    <Suspense fallback={null}>
      <NotifyFormInner />
    </Suspense>
  );
}
