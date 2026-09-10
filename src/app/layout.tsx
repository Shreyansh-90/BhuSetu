import { getUserCapabilities } from "./actions/auth";
import { AuthProvider } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";
import type { Metadata } from "next";
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
  title: "BhuSetu - Land Acquisition",
  description: "National Land Acquisition and Monitoring System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const capabilities = await getUserCapabilities();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider capabilities={capabilities}>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
