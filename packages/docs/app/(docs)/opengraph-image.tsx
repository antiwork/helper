import { ImageResponse } from "next/og";

export const alt = "Helper.ai - World-class support can be effortless";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  const logoUrl = new URL("/logo-white.svg", "https://docs.helper.ai").href;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#3D0C11",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <img src={logoUrl} alt="Helper.ai" width={550} height={160} style={{ marginBottom: "20px" }} />
      </div>
    ),
    {
      ...size,
    },
  );
}