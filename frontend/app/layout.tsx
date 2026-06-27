import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Nav } from "@/components/layout/Nav";
import { AuthGuard } from "@/components/layout/AuthGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "短视频批量分析工具",
  description: "基于 Qwen3-VL-8B 的 AI 短视频内容分析平台",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  other: { "mobile-web-app-capable": "yes", "apple-mobile-web-app-capable": "yes" },
};

export const viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark" style={{ colorScheme: "dark" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen bg-background text-foreground antialiased`}
      >
        <AuthGuard>
          <Nav />
          <main className="mx-auto max-w-7xl px-10 py-12">{children}</main>
        </AuthGuard>
        <Toaster
          position="top-right"
          theme="dark"
          closeButton
          toastOptions={{
            style: {
              background: "oklch(0.17 0 0)",
              border: "1px solid oklch(0.22 0 0)",
              color: "oklch(0.96 0 0)",
              fontSize: "13px",
              borderRadius: "6px",
            },
          }}
        />
      </body>
    </html>
  );
}
