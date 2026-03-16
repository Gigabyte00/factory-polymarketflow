import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/subscribe — Email newsletter signup (no auth required)
 */
export async function POST(request: Request) {
  let email: string;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    email = body.email;
  } else {
    // Form submission
    const formData = await request.formData();
    email = formData.get("email") as string;
  }

  if (!email || !email.includes("@")) {
    // Redirect back with error for form submissions
    return NextResponse.redirect(new URL("/?subscribed=error", request.url));
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );

  const { error } = await db.from("email_subscribers").upsert(
    { email: email.toLowerCase().trim(), source: "homepage" },
    { onConflict: "email", ignoreDuplicates: true }
  );

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: !error, email });
  }

  // Redirect for form submissions
  return NextResponse.redirect(new URL("/?subscribed=true", request.url));
}
