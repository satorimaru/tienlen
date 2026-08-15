import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Card games",
    short_name: "Games",
    description:
      "Play Tiến Lên and more card games online. Same table, friends or bots.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1210",
    theme_color: "#0a1210",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
