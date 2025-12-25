import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WelcomePopupProvider } from "@/components/points/WelcomePopupProvider";
import { VictoryProviderWrapper } from "@/components/victory/VictoryProviderWrapper";
import { NotificationsProvider } from "@/providers/NotificationsProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ========================================================================
  // BASIC METADATA
  // ========================================================================
  title: "BONK BATTLE - Launch, Battle, Win",
  description: "Launch your token, battle against others. Winner gets listed on Raydium DEX. The ultimate gladiator arena for meme coins on Solana.",

  // ========================================================================
  // OPEN GRAPH (WhatsApp, Telegram, Facebook, Discord, LinkedIn)
  // ========================================================================
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bonkbattle.lol",
    siteName: "BONK BATTLE",
    title: "BONK BATTLE - Launch, Battle, Win",
    description: "Launch your token, battle against rivals. Winner takes the spoils and gets listed on Raydium DEX!",
    images: [
      {
        url: "https://bonkbattle.lol/bonk-og.png",
        width: 1200,
        height: 630,
        alt: "BONK BATTLE - Gladiator Arena for Meme Coins",
      },
    ],
  },

  // ========================================================================
  // TWITTER CARD
  // ========================================================================
  twitter: {
    card: "summary_large_image",
    title: "BONK BATTLE - Launch, Battle, Win",
    description: "Launch your token, battle against rivals. Winner gets listed on Raydium DEX!",
    images: ["https://bonkbattle.lol/bonk-og.png"],
  },

  // ========================================================================
  // ICONS & FAVICON
  // ========================================================================
  icons: {
    icon: "/BONK-LOGO.svg",
    shortcut: "/BONK-LOGO.svg",
    apple: "/BONK-LOGO.svg",
  },

  // ========================================================================
  // ADDITIONAL METADATA
  // ========================================================================
  keywords: ["solana", "meme coin", "token launch", "dex", "raydium", "crypto", "battle", "bonk"],
  themeColor: "#F97316",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={geistSans.variable + ' ' + geistMono.variable + ' antialiased bg-[#1a1b21] text-white min-h-screen overflow-x-hidden'}>
        <QueryProvider>
          <SolanaProvider>
            <NotificationsProvider>
              <VictoryProviderWrapper>
                <WelcomePopupProvider>
                  {children}
                </WelcomePopupProvider>
              </VictoryProviderWrapper>
            </NotificationsProvider>
          </SolanaProvider>
        </QueryProvider>
      </body>
    </html>
  );
}