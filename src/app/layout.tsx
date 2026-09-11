import { getUserCapabilities } from "./actions/auth";
import { AuthProvider } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";
import type { Metadata } from "next";
import { Noto_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BhuSetu | National Land Acquisition & Management Platform",
  description: "National unified land-acquisition and project monitoring platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const capabilities = await getUserCapabilities();

  return (
    <html lang="en" className={`${notoSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
