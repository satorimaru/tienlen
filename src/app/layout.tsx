import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiến Lên (13) — Online Multiplayer",
  description:
    "Play Tiến Lên (Thirteen), the classic Vietnamese card game, online with friends. 2–4 players, Southern rules.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#022c22",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-950 font-sans text-slate-100">
        {children}
      </body>
    </html>
  );
}
