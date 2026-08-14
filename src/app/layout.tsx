import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Tiến Lên (13)",
  description:
    "Play Tiến Lên (Thirteen), the classic Vietnamese card game, online with friends. 2–4 players, Southern rules.",
  applicationName: "Tiến Lên",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tiến Lên",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a1210",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="felt-bg flex min-h-dvh flex-col font-sans text-[var(--ivory)]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
