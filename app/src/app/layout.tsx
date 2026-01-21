import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { NetworkProvider } from "@/providers/NetworkProvider";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WelcomePopupProvider } from "@/components/points/WelcomePopupProvider";
import { VictoryProviderWrapper } from "@/components/victory/VictoryProviderWrapper";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { HowItWorksProvider } from "@/components/onboarding/HowItWorksProvider";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ========================================================================
  // BASIC METADATA
  // ========================================================================
  title: "BATTLECOIN MARKET - Launch, Battle, Win",
  description: "Launch your token, battle against others. Winner gets listed on Raydium DEX. The ultimate gladiator arena for meme coins on Solana.",

  // ========================================================================
  // OPEN GRAPH (WhatsApp, Telegram, Facebook, Discord, LinkedIn)
  // ========================================================================
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bonkbattle.lol",
    siteName: "BATTLECOIN MARKET",
    title: "BATTLECOIN MARKET - Launch, Battle, Win",
    description: "Launch your token, battle against rivals. Winner takes the spoils and gets listed on Raydium DEX!",
    images: [
      {
        url: "https://bonkbattle.lol/bonk.og.png",
        width: 1200,
        height: 630,
        alt: "BATTLECOIN MARKET - Gladiator Arena for Meme Coins",
      },
    ],
  },

  // ========================================================================
  // TWITTER CARD
  // ========================================================================
  twitter: {
    card: "summary_large_image",
    title: "BATTLECOIN MARKET - Launch, Battle, Win",
    description: "Launch your token, battle against rivals. Winner gets listed on Raydium DEX!",
    images: ["https://bonkbattle.lol/bonk.og.png"],
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
      <body suppressHydrationWarning className={roboto.variable + ' ' + robotoMono.variable + ' font-sans antialiased bg-[#1a1b21] text-white min-h-screen overflow-x-hidden'}>
        <HowItWorksProvider>
          <QueryProvider>
            <NetworkProvider>
              <SolanaProvider>
                <NotificationsProvider>
                  <VictoryProviderWrapper>
                    <WelcomePopupProvider>
                      {children}
                    </WelcomePopupProvider>
                  </VictoryProviderWrapper>
                </NotificationsProvider>
              </SolanaProvider>
            </NetworkProvider>
          </QueryProvider>
        </HowItWorksProvider>
      </body>
    </html>
  );
}