# ============================================================================
# STONKS.FAN - Script Setup Automatico
# Esegui questo script nella directory: stonks-fan/app
# ============================================================================

# Verifica che siamo nella directory corretta
if (-not (Test-Path "package.json")) {
    Write-Error "Esegui questo script dalla directory stonks-fan/app"
    exit 1
}

Write-Host "🚀 Inizio setup automatico files..." -ForegroundColor Green

# ============================================================================
# 1. tailwind.config.ts
# ============================================================================
Write-Host "📝 Creando tailwind.config.ts..." -ForegroundColor Cyan

@"
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        foreground: '#ffffff',
        primary: {
          DEFAULT: '#10b981',
          dark: '#059669',
          light: '#34d399',
        },
        secondary: {
          DEFAULT: '#14b8a6',
          dark: '#0f766e',
        },
        card: {
          DEFAULT: '#1a1a1a',
          hover: '#262626',
        },
        danger: '#ef4444',
        success: '#10b981',
      },
      animation: {
        'scroll': 'scroll 30s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

export default config
"@ | Out-File -FilePath tailwind.config.ts -Encoding UTF8

# ============================================================================
# 2. next.config.js
# ============================================================================
Write-Host "📝 Creando next.config.js..." -ForegroundColor Cyan

@"
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig
"@ | Out-File -FilePath next.config.js -Encoding UTF8 -NoNewline

# ============================================================================
# 3. globals.css
# ============================================================================
Write-Host "📝 Creando globals.css..." -ForegroundColor Cyan

@"
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #000000;
  --foreground: #ffffff;
  --primary: #10b981;
  --primary-dark: #059669;
  --card: #1a1a1a;
  --card-hover: #262626;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
  background-color: var(--background);
  color: var(--foreground);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 4px;
}

.wallet-adapter-button {
  background-color: var(--primary) !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
}
"@ | Out-File -FilePath src\app\globals.css -Encoding UTF8

# ============================================================================
# 4. lib/db.ts
# ============================================================================
Write-Host "📝 Creando lib/db.ts..." -ForegroundColor Cyan

@"
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
"@ | Out-File -FilePath src\lib\db.ts -Encoding UTF8

# ============================================================================
# 5. lib/solana.ts
# ============================================================================
Write-Host "📝 Creando lib/solana.ts..." -ForegroundColor Cyan

@"
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: 'confirmed',
});

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'STONKSxVH8RuaFsBUq9WoPvDXvCzYvbXBWYfF2E9x'
);
"@ | Out-File -FilePath src\lib\solana.ts -Encoding UTF8

# ============================================================================
# 6. lib/utils.ts
# ============================================================================
Write-Host "📝 Creando lib/utils.ts..." -ForegroundColor Cyan

@"
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSOL(lamports: number | bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  if (sol < 0.01) return sol.toFixed(4);
  if (sol < 1) return sol.toFixed(3);
  return sol.toFixed(2);
}

export function formatUSD(cents: number | bigint): string {
  const dollars = Number(cents) / 1_000_000;
  if (dollars < 1000) return `\$${dollars.toFixed(0)}`;
  if (dollars < 1_000_000) return `\$${(dollars / 1000).toFixed(1)}K`;
  return `\$${(dollars / 1_000_000).toFixed(2)}M`;
}
"@ | Out-File -FilePath src\lib\utils.ts -Encoding UTF8

# ============================================================================
# 7. types/index.ts
# ============================================================================
Write-Host "📝 Creando types/index.ts..." -ForegroundColor Cyan

@"
export interface TokenLaunch {
  id: string;
  mintAddress: string;
  creatorAddress: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  tier: number;
  targetMarketcap: bigint;
  deadline: Date;
  status: string;
  solRaised: bigint;
  totalBuyers: number;
  createdAt: Date;
}
"@ | Out-File -FilePath src\types\index.ts -Encoding UTF8

Write-Host "✅ Setup base completato!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prossimi passi:" -ForegroundColor Yellow
Write-Host "1. Crea i componenti React manualmente (o copia dagli artifacts)"
Write-Host "2. Setup Codespace per Anchor"
Write-Host "3. Testa l'applicazione con: npm run dev"