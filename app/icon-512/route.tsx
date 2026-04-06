import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#1A2B4A",
          borderRadius: "112px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{
          width: 256, height: 256, borderRadius: "50%",
          background: "linear-gradient(160deg, #9ecfc0 0%, #c4b0de 50%, #f0b2a0 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "6px solid rgba(255,255,255,0.3)",
        }}>
          <span style={{ color: "#1A2B4A", fontSize: 100, fontWeight: 800, letterSpacing: "-3px" }}>O</span>
        </div>
        <span style={{ color: "#ffffff", fontSize: 52, fontWeight: 700, letterSpacing: "6px", marginTop: 8 }}>
          ONLU
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
