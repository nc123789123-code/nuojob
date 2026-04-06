import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#1A2B4A",
          borderRadius: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {/* Mini logo bands */}
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: "linear-gradient(160deg, #9ecfc0 0%, #c4b0de 50%, #f0b2a0 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "3px solid rgba(255,255,255,0.3)",
        }}>
          <span style={{ color: "#1A2B4A", fontSize: 36, fontWeight: 800, letterSpacing: "-1px" }}>O</span>
        </div>
        <span style={{ color: "#ffffff", fontSize: 20, fontWeight: 700, letterSpacing: "2px", marginTop: 4 }}>
          ONLU
        </span>
      </div>
    ),
    { width: 192, height: 192 }
  );
}
