import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { WelcomePopupProvider } from "@/components/points/WelcomePopupProvider";
import { VictoryProviderWrapper } from "@/components/victory/VictoryProviderWrapper";
import { NotificationsProvider } from "@/providers/NotificationsProvider"; // ⭐ ADD

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BONK BATTLE - Gladiator Tokens Fight to the Death 💎⚔️",
  description: "Create tokens, reach targets, battle for supremacy. Winner takes 50% of loser's liquidity. Only the strongest survive.",
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
            <NotificationsProvider>  {/* ⭐ ADD */}
              <VictoryProviderWrapper>
                <WelcomePopupProvider>
                  {children}
                </WelcomePopupProvider>
              </VictoryProviderWrapper>
            </NotificationsProvider>  {/* ⭐ ADD */}
          </SolanaProvider>
        </QueryProvider>
      </body>
    </html>
  );
}