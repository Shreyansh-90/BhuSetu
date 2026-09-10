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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${notoSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
