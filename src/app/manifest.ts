import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tiến Lên (13)",
    short_name: "Tiến Lên",
    description:
      "Play Tiến Lên (Thirteen) online with friends. 2–4 players, Southern rules.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#022c22",
    theme_color: "#022c22",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
