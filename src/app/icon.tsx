import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1117",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#22c55e",
            fontFamily: "monospace",
          }}
        >
          ~
        </div>
      </div>
    ),
    { ...size }
  );
}
