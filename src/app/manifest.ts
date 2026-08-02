import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cash Flow App",
    short_name: "Cash Flow",
    description: "Private cash-flow, goals, investments and net-worth tracking.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f3f5f1",
    theme_color: "#1f5b49",
    orientation: "any",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
