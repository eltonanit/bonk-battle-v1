import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STONKS.FAN - Diamond Hands Win Together 💎🙌",
  description: "The GameStop of Memecoins. Fair launch or refund. Only diamond hands. Paper hands can fuck off.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* ⭐ FIX: Aggiunto overflow-x-hidden per prevenire scroll orizzontale globale */}
      <body suppressHydrationWarning className={geistSans.variable + ' ' + geistMono.variable + ' antialiased bg-[#1a1b21] text-white min-h-screen overflow-x-hidden'}>
        <SolanaProvider>
          {children}
        </SolanaProvider>
      </body>
    </html>
  );
}