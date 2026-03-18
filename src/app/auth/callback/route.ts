import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options as any)
              );
            } catch {
              // Edge case: cookies can't be set in Server Component
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Create user profile in pmflow.users if it doesn't exist
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Use service role to insert into pmflow schema
        const { createClient } = await import("@supabase/supabase-js");
        const serviceClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Generate referral code from user ID
        const referralCode = user.id.split("-")[0] + user.id.split("-")[1];

        let referredBy: string | null = null;
        const incomingReferralCode = user.user_metadata?.referral_code || null;
        if (incomingReferralCode) {
          const { data: referrer } = await serviceClient
            .schema("pmflow")
            .from("users")
            .select("id")
            .eq("referral_code", incomingReferralCode)
            .single();
          referredBy = referrer?.id || null;
        }

        await serviceClient.schema("pmflow").from("users").upsert(
          {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || null,
            tier: "free",
            referral_code: referralCode,
            referred_by: referredBy,
          },
          { onConflict: "id" }
        );

        if (referredBy && user.email) {
          await serviceClient
            .schema("pmflow")
            .from("referrals")
            .upsert(
              {
                referrer_user_id: referredBy,
                referred_email: user.email,
                referred_user_id: user.id,
                status: "signed_up",
              },
              { onConflict: "referred_email" }
            );
        }

        // Onboarding: auto-create default watchlist with top markets
        try {
          const { data: existingWl } = await serviceClient
            .schema("pmflow")
            .from("watchlists")
            .select("id")
            .eq("user_id", user.id)
            .limit(1);

          if (!existingWl || existingWl.length === 0) {
            const { data: wl } = await serviceClient
              .schema("pmflow")
              .from("watchlists")
              .insert({ user_id: user.id, name: "My Watchlist" })
              .select("id")
              .single();

            if (wl) {
              // Add top 5 markets by volume
              const { data: topEvents } = await serviceClient
                .schema("pmflow")
                .from("events")
                .select("id")
                .eq("active", true)
                .order("volume_24h", { ascending: false })
                .limit(5);

              if (topEvents) {
                const items = topEvents.map((e: any) => ({
                  watchlist_id: wl.id,
                  event_id: e.id,
                }));
                await serviceClient.schema("pmflow").from("watchlist_items").insert(items);
              }
            }
          }
        } catch {
          // Non-critical: don't fail auth if onboarding fails
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return to auth page if something went wrong
  return NextResponse.redirect(`${origin}/auth?error=Could+not+authenticate`);
}
