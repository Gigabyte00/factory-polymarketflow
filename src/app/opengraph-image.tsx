import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PolymarketFlow - Prediction Market Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d1117 0%, #0f1923 50%, #0d1117 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(30,40,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,40,55,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Green glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)",
            transform: "translateX(-50%)",
          }}
        />

        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(34,197,94,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              color: "#22c55e",
            }}
          >
            ~
          </div>
          <div style={{ display: "flex", fontSize: "42px", fontWeight: 800 }}>
            <span style={{ color: "#22c55e" }}>Polymarket</span>
            <span style={{ color: "#e2e8f0" }}>Flow</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "28px",
            color: "#94a3b8",
            marginBottom: "40px",
            textAlign: "center",
          }}
        >
          Prediction Market Intelligence
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "48px",
          }}
        >
          {[
            { label: "Active Markets", value: "1,100+" },
            { label: "Tracked Whales", value: "1,000+" },
            { label: "Data Points", value: "14K+" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "#22c55e",
                  fontFamily: "monospace",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            fontSize: "16px",
            color: "#475569",
          }}
        >
          polymarketflow.com
        </div>
      </div>
    ),
    { ...size }
  );
}
