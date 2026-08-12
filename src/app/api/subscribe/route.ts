import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/subscribe — Email newsletter signup (no auth required)
 *
 * Optional fields (form or JSON):
 *   source — attribution tag stored on the row (default "homepage",
 *            e.g. "perps-waitlist" from /perps)
 *   next   — internal path to redirect back to after form submission
 *            (default "/"); external URLs are rejected
 */

/** Only allow same-site relative paths like "/perps" as redirect targets. */
function safeReturnPath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  if (!/^\/[A-Za-z0-9/_-]*$/.test(raw)) return "/";
  return raw;
}

export async function POST(request: Request) {
  let email: string;
  let source = "homepage";
  let next = "/";
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    email = body.email;
    if (typeof body.source === "string" && body.source) source = body.source.slice(0, 64);
  } else {
    // Form submission
    const formData = await request.formData();
    email = formData.get("email") as string;
    const rawSource = formData.get("source");
    if (typeof rawSource === "string" && rawSource) source = rawSource.slice(0, 64);
    next = safeReturnPath(formData.get("next"));
  }

  if (!email || !email.includes("@")) {
    // Redirect back with error for form submissions
    return NextResponse.redirect(new URL(`${next}?subscribed=error`, request.url));
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );

  const { error } = await db.from("email_subscribers").upsert(
    { email: email.toLowerCase().trim(), source },
    { onConflict: "email", ignoreDuplicates: true }
  );

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: !error, email });
  }

  // Redirect for form submissions
  return NextResponse.redirect(new URL(`${next}?subscribed=true`, request.url));
}
