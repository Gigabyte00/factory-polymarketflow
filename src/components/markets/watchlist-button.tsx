"use client";

import { Star } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function WatchlistButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    setLoading(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_item", event_id: eventId }),
    });

    if (res.status === 401) {
      router.push(`/auth?redirectTo=${encodeURIComponent(pathname || "/markets")}`);
      return;
    }

    if (res.ok) {
      setAdded(true);
    }

    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={loading || added}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${added ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"}`}
    >
      <Star className={`h-3.5 w-3.5 ${added ? "fill-current" : ""}`} />
      {added ? "Saved" : loading ? "Saving..." : "Watchlist"}
    </button>
  );
}
