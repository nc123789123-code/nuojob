import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: "112px",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Pastel circle matching the LogoMark */}
        <div
          style={{
            width: 384,
            height: 384,
            borderRadius: "50%",
            overflow: "hidden",
            background: "white",
            display: "flex",
            position: "relative",
            border: "14px solid #e8a898",
          }}
        >
          {/* Salmon — bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "52%", background: "#f0b2a0" }} />
          {/* Lavender — middle */}
          <div style={{ position: "absolute", bottom: "34%", left: 0, right: 0, height: "13%", background: "#c4b0de" }} />
          {/* Mint — top */}
          <div style={{ position: "absolute", bottom: "47%", left: 0, right: 0, height: "13%", background: "#9ecfc0" }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
