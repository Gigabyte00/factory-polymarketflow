"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, type IChartApi, type ISeriesApi, ColorType } from "lightweight-charts";

interface PriceChartProps {
  tokenId: string;
  height?: number;
}

interface PricePoint {
  t: number;
  p: number;
}

export function PriceChart({ tokenId, height = 300 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState("1w");

  useEffect(() => {
    if (!containerRef.current || !tokenId) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(30, 40, 55, 0.5)" },
        horzLines: { color: "rgba(30, 40, 55, 0.5)" },
      },
      crosshair: {
        vertLine: { color: "#22c55e", width: 1, style: 2 },
        horzLine: { color: "#22c55e", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "rgba(30, 40, 55, 0.5)",
      },
      timeScale: {
        borderColor: "rgba(30, 40, 55, 0.5)",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // Area series for price
    const series = chart.addAreaSeries({
      topColor: "rgba(34, 197, 94, 0.3)",
      bottomColor: "rgba(34, 197, 94, 0.02)",
      lineColor: "#22c55e",
      lineWidth: 2,
    });

    // Fetch data
    fetchPriceData(tokenId, interval).then((data) => {
      if (data.length > 0) {
        series.setData(
          data.map((d) => ({
            time: d.t as any,
            value: d.p,
          }))
        );
        chart.timeScale().fitContent();
      } else {
        setError("No price data available");
      }
      setLoading(false);
    }).catch(() => {
      setError("Failed to load price data");
      setLoading(false);
    });

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [tokenId, interval, height]);

  return (
    <div>
      {/* Interval selector */}
      <div className="flex items-center gap-1 mb-2">
        {["1h", "1d", "1w", "1m", "all"].map((iv) => (
          <button
            key={iv}
            onClick={() => { setInterval(iv); setLoading(true); }}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
              interval === iv ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {iv.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="relative rounded-lg overflow-hidden border border-border bg-card">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}

async function fetchPriceData(tokenId: string, interval: string): Promise<PricePoint[]> {
  const fidelity = interval === "1h" ? 1 : interval === "1d" ? 5 : interval === "1w" ? 30 : 60;
  const res = await fetch(
    `https://clob.polymarket.com/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.history || [];
}
