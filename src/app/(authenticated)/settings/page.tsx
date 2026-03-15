"use client";

import { useState, useEffect, Suspense } from "react";
import { Settings, Save, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  // Dynamically import client to avoid build-time SSR issues
  const [supabase, setSupabase] = useState<any>(null);
  useEffect(() => {
    import("@/lib/supabase/client").then(mod => setSupabase(mod.createClient()));
  }, []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (!supabase) return;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      // Fetch profile from pmflow schema
      const res = await fetch(`/api/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setWallet(data.polymarket_wallet || "");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polymarket_wallet: wallet }),
    });
    if (res.ok) {
      setMessage("Settings saved.");
    } else {
      setMessage("Failed to save.");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6 text-primary" />Settings</h1>
      </div>

      <div className="max-w-lg space-y-6">
        {/* Account */}
        <div className="terminal-card p-6 space-y-4">
          <h2 className="text-sm font-semibold">Account</h2>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input type="email" value={profile?.email || ""} disabled className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm text-muted-foreground" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Plan</label>
            <div className={`inline-flex px-3 py-1 rounded text-sm font-bold ${profile?.tier === "elite" ? "bg-warning/20 text-warning" : profile?.tier === "pro" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {(profile?.tier || "free").toUpperCase()}
            </div>
          </div>
        </div>

        {/* Polymarket wallet */}
        <div className="terminal-card p-6 space-y-4">
          <h2 className="text-sm font-semibold">Polymarket Wallet</h2>
          <p className="text-xs text-muted-foreground">Connect your wallet address to enable portfolio tracking.</p>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          {message && <p className="text-xs text-primary">{message}</p>}
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <LogOut className="h-4 w-4" />Sign Out
        </button>
      </div>
    </div>
  );
}
