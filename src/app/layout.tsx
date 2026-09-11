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
<<<<<<< HEAD
    <html lang="en" className={`${notoSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">{children}</body>
=======
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider capabilities={capabilities}>
          <AppShell>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
>>>>>>> 0f4e3140a4eb86f9ed99138dbf9c0b7efc802d57
    </html>
  );
}
