import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LayoutWrapper } from "@/components/layout-wrapper";
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
  title: "VideoScope - 批量视频分析平台",
  description: "多平台视频批量分析工具，基于小米 MiMo 多模态大模型",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full bg-zinc-950 text-zinc-100">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
