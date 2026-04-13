import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Matches the LogoMark SVG: white circle with three diagonal pastel bands
// (mint / lavender / salmon) and a salmon-pink outline.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          overflow: "hidden",
          background: "white",
          display: "flex",
          position: "relative",
          border: "1.5px solid #e8a898",
        }}
      >
        {/* Salmon — bottom band (largest) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "52%",
            background: "#f0b2a0",
          }}
        />
        {/* Lavender — middle band */}
        <div
          style={{
            position: "absolute",
            bottom: "34%",
            left: 0,
            right: 0,
            height: "13%",
            background: "#c4b0de",
          }}
        />
        {/* Mint — top band */}
        <div
          style={{
            position: "absolute",
            bottom: "47%",
            left: 0,
            right: 0,
            height: "13%",
            background: "#9ecfc0",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
