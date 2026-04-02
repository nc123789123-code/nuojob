import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#1A2B4A",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            fontFamily: "serif",
          }}
        >
          O
        </span>
      </div>
    ),
    { ...size }
  );
}
