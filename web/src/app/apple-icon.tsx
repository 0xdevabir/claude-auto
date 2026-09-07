import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f766e",
          borderRadius: 40,
        }}
      >
        {/* Arc: wait cycle */}
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 999,
            border: "12px solid #f4f1ea",
            borderRightColor: "transparent",
            borderBottomColor: "transparent",
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        {/* Resume corner tip */}
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 44,
            width: 34,
            height: 12,
            background: "#f4f1ea",
            borderRadius: 6,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 44,
            width: 12,
            height: 34,
            background: "#f4f1ea",
            borderRadius: 6,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
