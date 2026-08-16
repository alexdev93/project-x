import { ImageResponse } from "next/og";
import { profile } from "@/content";

export const runtime = "nodejs";
export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated at build time. Uses system fonts rather than fetching a webfont so
 * the build stays offline-safe.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#14120f",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#8b8175",
            }}
          >
            {profile.role}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 82,
              lineHeight: 1.05,
              color: "#f5f1ea",
            }}
          >
            {profile.name}
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 32,
              lineHeight: 1.4,
              color: "#a79e93",
              maxWidth: 900,
            }}
          >
            {profile.tagline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#d97b4f",
            }}
          />
          <div style={{ fontSize: 24, color: "#8b8175" }}>
            {profile.location}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
