"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import type { PerpsCandle, PerpsFundingPoint } from "@/lib/perps-api";

const CHART_OPTS = {
  layout: {
    background: { type: ColorType.Solid, color: "transparent" },
    textColor: "#94a3b8",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: "rgba(148,163,184,0.08)" },
    horzLines: { color: "rgba(148,163,184,0.08)" },
  },
  rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
  timeScale: { borderColor: "rgba(148,163,184,0.15)", timeVisible: true, secondsVisible: false },
  crosshair: { mode: 1 },
} as const;

/** SSR-fed price (candlestick, 7d hourly) + funding-rate (line, ~4d hourly)
 *  charts for one Perps instrument. Data arrives as props — crawlable stats
 *  live in the surrounding server component. */
export function PerpsMarketCharts({
  candles,
  funding,
}: {
  candles: PerpsCandle[];
  funding: PerpsFundingPoint[];
}) {
  const priceRef = useRef<HTMLDivElement>(null);
  const fundingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!priceRef.current || candles.length === 0) return;
    const chart: IChartApi = createChart(priceRef.current, { ...CHART_OPTS, height: 280, autoSize: true });
    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    series.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    chart.timeScale().fitContent();
    const onResize = () => chart.applyOptions({});
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [candles]);

  useEffect(() => {
    if (!fundingRef.current || funding.length === 0) return;
    const chart: IChartApi = createChart(fundingRef.current, { ...CHART_OPTS, height: 180, autoSize: true });
    const series = chart.addLineSeries({
      color: "#818cf8",
      lineWidth: 2,
      priceFormat: { type: "custom", formatter: (v: number) => `${v.toFixed(4)}%` },
    });
    series.setData(funding.map((f) => ({ time: Math.floor(f.timestamp / 1000) as UTCTimestamp, value: f.fundingHourlyPct })));
    // zero line for pay-direction context
    series.createPriceLine({ price: 0, color: "rgba(148,163,184,0.4)", lineWidth: 1, lineStyle: 3, axisLabelVisible: false, title: "" });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [funding]);

  return (
    <div className="space-y-4">
      <div className="terminal-card p-4">
        <h2 className="text-sm font-bold mb-2">Price — last 7 days (hourly)</h2>
        {candles.length > 0 ? (
          <div ref={priceRef} className="w-full" />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Price history temporarily unavailable.</p>
        )}
      </div>
      <div className="terminal-card p-4">
        <h2 className="text-sm font-bold mb-1">Hourly funding rate — recent history</h2>
        <p className="text-[11px] text-muted-foreground mb-2">Positive = longs pay shorts · negative = shorts pay longs · settles every hour</p>
        {funding.length > 0 ? (
          <div ref={fundingRef} className="w-full" />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Funding history temporarily unavailable.</p>
        )}
      </div>
    </div>
  );
}
