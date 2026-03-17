"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Activity, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const plan = searchParams.get("plan");
  const referralCode = searchParams.get("ref");

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            requested_plan: plan || "free",
            referral_code: referralCode || null,
          },
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a confirmation link.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">
              <span className="text-primary">Polymarket</span>
              <span className="text-foreground">Flow</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin"
              ? "Sign in to your account"
              : "Create your free account"}
          </p>
        </div>

        {/* Plan badge */}
        {plan && mode === "signup" && (
          <div className="terminal-card p-3 mb-4 text-center">
            <span className="text-xs text-muted-foreground">
              Signing up for{" "}
            </span>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                plan === "pro"
                  ? "bg-primary/20 text-primary"
                  : plan === "starter"
                    ? "bg-info/20 text-info"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {plan.toUpperCase()}
            </span>
          </div>
        )}

        {referralCode && mode === "signup" && (
          <div className="terminal-card p-3 mb-4 text-center">
            <span className="text-xs text-muted-foreground">Referral applied: </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{referralCode}</span>
          </div>
        )}

        {/* Google OAuth */}
        <div className="terminal-card p-6 space-y-3">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError(null);
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: `${window.location.origin}/auth/callback`,
                  queryParams: { access_type: "offline", prompt: "consent" },
                },
              });
              if (error) {
                setError(error.message);
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="terminal-card p-6 space-y-4 -mt-1 rounded-t-none border-t-0">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "signup" ? "Min 6 characters" : "Your password"
                }
                required
                minLength={6}
                className="w-full pl-10 pr-3 py-2.5 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-md bg-primary/10 border border-primary/30 text-sm text-primary">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
