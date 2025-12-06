# 🤖 BONK BATTLE - Keeper Automation System

## Setup Completo per Vercel Pro

> **Versione:** 1.0.0  
> **Data:** Dicembre 2025  
> **Costo:** $20/mese Vercel Pro  
> **Network:** Solana Devnet → Mainnet

---

# 📋 INDICE

1. [Setup Vercel Pro](#1-setup-vercel-pro)
2. [Environment Variables](#2-environment-variables)
3. [File da Creare](#3-file-da-creare)
4. [vercel.json - Cron Configuration](#4-verceljson)
5. [API Routes Keeper](#5-api-routes-keeper)
6. [Testing](#6-testing)
7. [Monitoring](#7-monitoring)

---

# 1. SETUP VERCEL PRO

## Passo 1: Upgrade a Pro

1. Vai su https://vercel.com/dashboard
2. Click sul tuo progetto BONK BATTLE
3. Settings → Billing → Upgrade to Pro ($20/mese)

## Passo 2: Verifica Cron Jobs

Dopo l'upgrade:
1. Settings → Cron Jobs
2. Dovresti vedere "Cron Jobs: Enabled"

---

# 2. ENVIRONMENT VARIABLES

## Aggiungi su Vercel Dashboard

```
Settings → Environment Variables → Add New
```

| Nome | Valore | Note |
|------|--------|------|
| `KEEPER_PRIVATE_KEY` | `[1,2,3,...]` | Array JSON della chiave privata |
| `CRON_SECRET` | `bonk-battle-keeper-2024-secret` | Segreto per autenticare cron jobs |
| `HELIUS_API_KEY` | `01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f` | Già presente probabilmente |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` | O `mainnet-beta` per produzione |

## Come Ottenere KEEPER_PRIVATE_KEY

```powershell
# Se hai il file keypair JSON
cat C:\path\to\keeper-keypair.json

# Output sarà tipo: [123,45,67,...]
# Copia TUTTO incluse le parentesi quadre
```

**⚠️ IMPORTANTE:** Mai committare questa chiave nel codice!

---

# 3. FILE DA CREARE

## Struttura Directory

```
app/src/app/api/keeper/
├── matchmaking/
│   └── route.ts          # Accoppia token qualified
├── check-victories/
│   └── route.ts          # Verifica vincitori
├── finalize-duels/
│   └── route.ts          # Finalizza battaglie
├── create-pools/
│   └── route.ts          # Crea pool Raydium
└── update-oracle/
    └── route.ts          # Aggiorna prezzo SOL

app/src/lib/solana/
└── keeper.ts             # Utility functions per keeper

vercel.json               # Configurazione cron jobs (root del progetto)
```

---

# 4. VERCEL.JSON

**File:** `vercel.json` (nella ROOT del progetto, stesso livello di package.json)

```json
{
  "crons": [
    {
      "path": "/api/keeper/matchmaking",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/keeper/check-victories",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/keeper/finalize-duels",
      "schedule": "*/3 * * * *"
    },
    {
      "path": "/api/keeper/create-pools",
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/keeper/update-oracle",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

### Spiegazione Schedule

| Job | Schedule | Frequenza | Motivo |
|-----|----------|-----------|--------|
| matchmaking | `*/5 * * * *` | Ogni 5 min | Non urgente, batch processing |
| check-victories | `*/2 * * * *` | Ogni 2 min | Importante, detecta vincitori rapidamente |
| finalize-duels | `*/3 * * * *` | Ogni 3 min | Trasferisce spoils, abbastanza urgente |
| create-pools | `*/10 * * * *` | Ogni 10 min | Pool creation è lenta, non urgente |
| update-oracle | `0 */12 * * *` | Ogni 12 ore | Prezzo SOL non cambia spesso |

---

# 5. API ROUTES KEEPER

## 5.1 Keeper Utilities

**File:** `app/src/lib/solana/keeper.ts`

```typescript
// ============================================================================
// KEEPER UTILITIES - BONK BATTLE
// ============================================================================

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  TOKEN_2022_PROGRAM_ID 
} from '@solana/spl-token';
import BN from 'bn.js';

// Constants
export const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
export const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf');
export const KEEPER_AUTHORITY = new PublicKey('753pndtcJx31bTXJNQPYvnesghXyQpBwTaYEACz7wQE3');

// Battle Status enum matching smart contract
export enum BattleStatus {
  Created = 0,
  Qualified = 1,
  InBattle = 2,
  VictoryPending = 3,
  Listed = 4,
}

// Discriminators (from IDL)
export const DISCRIMINATORS = {
  TOKEN_BATTLE_STATE: Buffer.from([54, 102, 185, 22, 231, 3, 228, 117]),
  START_BATTLE: Buffer.from([249, 195, 188, 75, 4, 222, 93, 147]),
  CHECK_VICTORY: Buffer.from([11, 203, 234, 81, 134, 200, 90, 134]),
  FINALIZE_DUEL: Buffer.from([57, 165, 69, 195, 50, 206, 212, 134]),
  WITHDRAW_FOR_LISTING: Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]),
  UPDATE_SOL_PRICE: Buffer.from([166, 98, 183, 175, 125, 81, 109, 119]),
};

// Get connection
export function getConnection(): Connection {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  const rpcUrl = network === 'mainnet-beta' 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  return new Connection(rpcUrl, 'confirmed');
}

// Get keeper keypair from environment
export function getKeeperKeypair(): Keypair {
  const privateKeyArray = JSON.parse(process.env.KEEPER_PRIVATE_KEY || '[]');
  if (privateKeyArray.length === 0) {
    throw new Error('KEEPER_PRIVATE_KEY not configured');
  }
  return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

// Get Battle State PDA
export function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    PROGRAM_ID
  );
}

// Get Price Oracle PDA
export function getPriceOraclePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('price_oracle')],
    PROGRAM_ID
  );
}

// Parse TokenBattleState account data
export interface ParsedBattleState {
  mint: PublicKey;
  solCollected: number;
  tokensSold: number;
  totalTradeVolume: number;
  isActive: boolean;
  battleStatus: BattleStatus;
  opponentMint: PublicKey;
  creationTimestamp: number;
  lastTradeTimestamp: number;
  battleStartTimestamp: number;
  victoryTimestamp: number;
  listingTimestamp: number;
  bump: number;
  name: string;
  symbol: string;
  uri: string;
}

export function parseTokenBattleState(data: Buffer): ParsedBattleState {
  let offset = 8; // Skip discriminator

  const mint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const parseU64 = (off: number): number => {
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value |= BigInt(data[off + i]) << BigInt(i * 8);
    }
    return Number(value);
  };

  const parseI64 = (off: number): number => {
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      value |= BigInt(data[off + i]) << BigInt(i * 8);
    }
    if (value > 0x7fffffffffffffffn) {
      value = value - 0x10000000000000000n;
    }
    return Number(value);
  };

  const solCollected = parseU64(offset);
  offset += 8;

  const tokensSold = parseU64(offset);
  offset += 8;

  const totalTradeVolume = parseU64(offset);
  offset += 8;

  const isActive = data[offset] === 1;
  offset += 1;

  const battleStatus = data[offset] as BattleStatus;
  offset += 1;

  const opponentMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const creationTimestamp = parseI64(offset);
  offset += 8;

  const lastTradeTimestamp = parseI64(offset);
  offset += 8;

  const battleStartTimestamp = parseI64(offset);
  offset += 8;

  const victoryTimestamp = parseI64(offset);
  offset += 8;

  const listingTimestamp = parseI64(offset);
  offset += 8;

  // Skip qualification_timestamp
  offset += 8;

  const bump = data[offset];
  offset += 1;

  // Parse strings
  const parseString = (off: number): { value: string; bytesRead: number } => {
    const len = data.readUInt32LE(off);
    const value = data.slice(off + 4, off + 4 + len).toString('utf-8');
    return { value, bytesRead: 4 + len };
  };

  const nameResult = parseString(offset);
  const name = nameResult.value;
  offset += nameResult.bytesRead;

  const symbolResult = parseString(offset);
  const symbol = symbolResult.value;
  offset += symbolResult.bytesRead;

  const uriResult = parseString(offset);
  const uri = uriResult.value;

  return {
    mint,
    solCollected,
    tokensSold,
    totalTradeVolume,
    isActive,
    battleStatus,
    opponentMint,
    creationTimestamp,
    lastTradeTimestamp,
    battleStartTimestamp,
    victoryTimestamp,
    listingTimestamp,
    bump,
    name,
    symbol,
    uri,
  };
}

// Fetch all tokens by battle status
export async function fetchTokensByStatus(
  connection: Connection,
  status: BattleStatus
): Promise<ParsedBattleState[]> {
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: Buffer.from(DISCRIMINATORS.TOKEN_BATTLE_STATE).toString('base64') } },
      { memcmp: { offset: 65, bytes: Buffer.from([status]).toString('base64') } },
    ],
  });

  return accounts.map(({ account }) => parseTokenBattleState(account.data as Buffer));
}

// Build start_battle instruction
export function buildStartBattleInstruction(
  keeper: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): TransactionInstruction {
  const [tokenAState] = getBattleStatePDA(tokenAMint);
  const [tokenBState] = getBattleStatePDA(tokenBMint);

  const keys = [
    { pubkey: tokenAState, isSigner: false, isWritable: true },
    { pubkey: tokenBState, isSigner: false, isWritable: true },
    { pubkey: keeper, isSigner: true, isWritable: false },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: DISCRIMINATORS.START_BATTLE,
  });
}

// Build check_victory_conditions instruction
export function buildCheckVictoryInstruction(
  tokenMint: PublicKey
): TransactionInstruction {
  const [battleState] = getBattleStatePDA(tokenMint);
  const [priceOracle] = getPriceOraclePDA();

  const keys = [
    { pubkey: battleState, isSigner: false, isWritable: true },
    { pubkey: priceOracle, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: DISCRIMINATORS.CHECK_VICTORY,
  });
}

// Build finalize_duel instruction
export function buildFinalizeDuelInstruction(
  keeper: PublicKey,
  winnerMint: PublicKey,
  loserMint: PublicKey
): TransactionInstruction {
  const [winnerState] = getBattleStatePDA(winnerMint);
  const [loserState] = getBattleStatePDA(loserMint);

  const keys = [
    { pubkey: winnerState, isSigner: false, isWritable: true },
    { pubkey: loserState, isSigner: false, isWritable: true },
    { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
    { pubkey: keeper, isSigner: true, isWritable: true },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: DISCRIMINATORS.FINALIZE_DUEL,
  });
}

// Build withdraw_for_listing instruction
export async function buildWithdrawForListingInstruction(
  connection: Connection,
  keeper: PublicKey,
  tokenMint: PublicKey
): Promise<TransactionInstruction> {
  const [battleState] = getBattleStatePDA(tokenMint);
  
  const contractTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    battleState,
    true,
    TOKEN_2022_PROGRAM_ID
  );
  
  const keeperTokenAccount = await getAssociatedTokenAddress(
    tokenMint,
    keeper,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const keys = [
    { pubkey: battleState, isSigner: false, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: true },
    { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
    { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
    { pubkey: keeper, isSigner: true, isWritable: true },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: DISCRIMINATORS.WITHDRAW_FOR_LISTING,
  });
}

// Build update_sol_price instruction
export function buildUpdateSolPriceInstruction(
  keeper: PublicKey,
  newPriceUsd: number // In USD with 6 decimals (e.g., 130000000 = $130.00)
): TransactionInstruction {
  const [priceOracle] = getPriceOraclePDA();

  const data = Buffer.alloc(16);
  DISCRIMINATORS.UPDATE_SOL_PRICE.copy(data, 0);
  
  // Write u64 little-endian
  const priceBN = BigInt(newPriceUsd);
  for (let i = 0; i < 8; i++) {
    data[8 + i] = Number((priceBN >> BigInt(i * 8)) & 0xFFn);
  }

  const keys = [
    { pubkey: priceOracle, isSigner: false, isWritable: true },
    { pubkey: keeper, isSigner: true, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}

// Fetch current SOL price from CoinGecko
export async function fetchSolPriceUsd(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const data = await response.json();
    const price = data.solana.usd;
    // Return with 6 decimals (e.g., $130.50 → 130500000)
    return Math.round(price * 1_000_000);
  } catch (error) {
    console.error('Failed to fetch SOL price:', error);
    // Fallback price
    return 130_000_000; // $130.00
  }
}

// Verify cron secret
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Vercel cron jobs send this header
  const vercelCron = request.headers.get('x-vercel-cron');
  
  // Allow if it's a Vercel cron job OR has correct secret
  if (vercelCron === '1') return true;
  if (authHeader === `Bearer ${cronSecret}`) return true;
  
  return false;
}

// Calculate market cap USD from SOL collected
export function calculateMarketCapUsd(solCollected: number): number {
  const INITIAL_MC = 5000;
  const TARGET_MC = 5500;
  const SOL_FOR_GRADUATION = 10_784_313_725; // lamports
  
  if (solCollected === 0) return INITIAL_MC;
  
  const progress = solCollected / SOL_FOR_GRADUATION;
  const mcRange = TARGET_MC - INITIAL_MC;
  
  return Math.round(INITIAL_MC + (mcRange * progress));
}
```

---

## 5.2 Matchmaking API

**File:** `app/src/app/api/keeper/matchmaking/route.ts`

```typescript
// ============================================================================
// KEEPER: MATCHMAKING - Accoppia token qualified per battaglia
// Schedule: Ogni 5 minuti
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import {
  getConnection,
  getKeeperKeypair,
  fetchTokensByStatus,
  buildStartBattleInstruction,
  verifyCronSecret,
  calculateMarketCapUsd,
  BattleStatus,
  ParsedBattleState,
} from '@/lib/solana/keeper';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('🎯 [KEEPER] Matchmaking started');

  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.log('❌ [KEEPER] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = getConnection();
    const keeper = getKeeperKeypair();

    // Fetch all qualified tokens
    const qualifiedTokens = await fetchTokensByStatus(connection, BattleStatus.Qualified);
    
    console.log(`📊 [KEEPER] Found ${qualifiedTokens.length} qualified tokens`);

    if (qualifiedTokens.length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Not enough qualified tokens for matchmaking',
        qualifiedCount: qualifiedTokens.length,
      });
    }

    // Sort by market cap for fair matching
    const sortedTokens = qualifiedTokens
      .map(token => ({
        ...token,
        marketCap: calculateMarketCapUsd(token.solCollected),
      }))
      .sort((a, b) => a.marketCap - b.marketCap);

    // Match tokens with similar market cap
    const matches: Array<{ tokenA: ParsedBattleState; tokenB: ParsedBattleState }> = [];
    const matched = new Set<string>();

    for (let i = 0; i < sortedTokens.length - 1; i++) {
      if (matched.has(sortedTokens[i].mint.toString())) continue;

      for (let j = i + 1; j < sortedTokens.length; j++) {
        if (matched.has(sortedTokens[j].mint.toString())) continue;

        const mcDiff = Math.abs(sortedTokens[i].marketCap - sortedTokens[j].marketCap);
        
        // Match if MC difference is within tolerance ($5,000)
        if (mcDiff <= 5000) {
          matches.push({
            tokenA: sortedTokens[i],
            tokenB: sortedTokens[j],
          });
          matched.add(sortedTokens[i].mint.toString());
          matched.add(sortedTokens[j].mint.toString());
          break;
        }
      }
    }

    console.log(`⚔️ [KEEPER] Created ${matches.length} matches`);

    // Execute matches
    const results = [];
    for (const match of matches) {
      try {
        const instruction = buildStartBattleInstruction(
          keeper.publicKey,
          match.tokenA.mint,
          match.tokenB.mint
        );

        const transaction = new Transaction().add(instruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keeper.publicKey;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [keeper],
          { commitment: 'confirmed' }
        );

        console.log(`✅ [KEEPER] Battle started: ${match.tokenA.symbol} vs ${match.tokenB.symbol}`);
        console.log(`   Signature: ${signature}`);

        // Update database
        await supabase
          .from('tokens')
          .update({ 
            battle_status: BattleStatus.InBattle,
            opponent_mint: match.tokenB.mint.toString(),
          })
          .eq('mint', match.tokenA.mint.toString());

        await supabase
          .from('tokens')
          .update({ 
            battle_status: BattleStatus.InBattle,
            opponent_mint: match.tokenA.mint.toString(),
          })
          .eq('mint', match.tokenB.mint.toString());

        // Insert battle record
        await supabase.from('battles').insert({
          id: signature,
          token_a_mint: match.tokenA.mint.toString(),
          token_b_mint: match.tokenB.mint.toString(),
          token_a_name: match.tokenA.name,
          token_b_name: match.tokenB.name,
          token_a_symbol: match.tokenA.symbol,
          token_b_symbol: match.tokenB.symbol,
          started_at: new Date().toISOString(),
          status: 'active',
        });

        results.push({
          tokenA: match.tokenA.mint.toString(),
          tokenB: match.tokenB.mint.toString(),
          signature,
          success: true,
        });
      } catch (error) {
        console.error(`❌ [KEEPER] Failed to start battle:`, error);
        results.push({
          tokenA: match.tokenA.mint.toString(),
          tokenB: match.tokenB.mint.toString(),
          error: (error as Error).message,
          success: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      matchesCreated: results.filter(r => r.success).length,
      matchesFailed: results.filter(r => !r.success).length,
      results,
    });

  } catch (error) {
    console.error('❌ [KEEPER] Matchmaking error:', error);
    return NextResponse.json(
      { error: 'Matchmaking failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
```

---

## 5.3 Check Victories API

**File:** `app/src/app/api/keeper/check-victories/route.ts`

```typescript
// ============================================================================
// KEEPER: CHECK VICTORIES - Verifica condizioni di vittoria
// Schedule: Ogni 2 minuti
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import {
  getConnection,
  getKeeperKeypair,
  fetchTokensByStatus,
  buildCheckVictoryInstruction,
  verifyCronSecret,
  calculateMarketCapUsd,
  BattleStatus,
  getPriceOraclePDA,
} from '@/lib/solana/keeper';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Victory thresholds (from smart contract)
const VICTORY_MC_USD = 5500;
const VICTORY_VOLUME_USD = 100;

export async function POST(request: NextRequest) {
  console.log('🔍 [KEEPER] Checking victory conditions');

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = getConnection();
    const keeper = getKeeperKeypair();

    // Fetch all tokens in battle
    const battlingTokens = await fetchTokensByStatus(connection, BattleStatus.InBattle);
    
    console.log(`⚔️ [KEEPER] Found ${battlingTokens.length} tokens in battle`);

    if (battlingTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active battles',
        checked: 0,
      });
    }

    // Fetch SOL price from oracle
    const [oraclePDA] = getPriceOraclePDA();
    const oracleAccount = await connection.getAccountInfo(oraclePDA);
    let solPriceUsd = 130_000_000; // Default $130

    if (oracleAccount) {
      // Parse oracle price (offset 8 for discriminator, then u64)
      const data = oracleAccount.data;
      let price = 0n;
      for (let i = 0; i < 8; i++) {
        price |= BigInt(data[8 + i]) << BigInt(i * 8);
      }
      solPriceUsd = Number(price);
    }

    const results = [];

    for (const token of battlingTokens) {
      const marketCap = calculateMarketCapUsd(token.solCollected);
      
      // Calculate volume in USD
      const volumeUsd = (token.totalTradeVolume * solPriceUsd) / (1e9 * 1e6);

      console.log(`📊 [KEEPER] ${token.symbol}: MC $${marketCap} | Volume $${volumeUsd.toFixed(2)}`);

      // Check if victory conditions are met
      const hasVictory = marketCap >= VICTORY_MC_USD && volumeUsd >= VICTORY_VOLUME_USD;

      if (hasVictory) {
        try {
          const instruction = buildCheckVictoryInstruction(token.mint);
          const transaction = new Transaction().add(instruction);
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = keeper.publicKey;

          const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keeper],
            { commitment: 'confirmed' }
          );

          console.log(`🏆 [KEEPER] Victory detected for ${token.symbol}!`);
          console.log(`   Signature: ${signature}`);

          // Update database
          await supabase
            .from('tokens')
            .update({ battle_status: BattleStatus.VictoryPending })
            .eq('mint', token.mint.toString());

          results.push({
            mint: token.mint.toString(),
            symbol: token.symbol,
            marketCap,
            volumeUsd,
            victory: true,
            signature,
          });
        } catch (error) {
          console.error(`❌ [KEEPER] Failed to confirm victory for ${token.symbol}:`, error);
          results.push({
            mint: token.mint.toString(),
            symbol: token.symbol,
            error: (error as Error).message,
            victory: false,
          });
        }
      } else {
        results.push({
          mint: token.mint.toString(),
          symbol: token.symbol,
          marketCap,
          volumeUsd,
          victory: false,
          reason: marketCap < VICTORY_MC_USD 
            ? `MC ${marketCap}/${VICTORY_MC_USD}` 
            : `Volume ${volumeUsd.toFixed(0)}/${VICTORY_VOLUME_USD}`,
        });
      }
    }

    const victoriesFound = results.filter(r => r.victory).length;

    return NextResponse.json({
      success: true,
      checked: battlingTokens.length,
      victoriesFound,
      results,
    });

  } catch (error) {
    console.error('❌ [KEEPER] Check victories error:', error);
    return NextResponse.json(
      { error: 'Check victories failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
```

---

## 5.4 Finalize Duels API

**File:** `app/src/app/api/keeper/finalize-duels/route.ts`

```typescript
// ============================================================================
// KEEPER: FINALIZE DUELS - Finalizza battaglie e trasferisce spoils
// Schedule: Ogni 3 minuti
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import {
  getConnection,
  getKeeperKeypair,
  fetchTokensByStatus,
  buildFinalizeDuelInstruction,
  verifyCronSecret,
  BattleStatus,
  getBattleStatePDA,
  parseTokenBattleState,
} from '@/lib/solana/keeper';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('👑 [KEEPER] Finalizing duels');

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = getConnection();
    const keeper = getKeeperKeypair();

    // Fetch all tokens with VictoryPending status
    const victoryPendingTokens = await fetchTokensByStatus(connection, BattleStatus.VictoryPending);
    
    console.log(`🏆 [KEEPER] Found ${victoryPendingTokens.length} victories to finalize`);

    if (victoryPendingTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No duels to finalize',
        finalized: 0,
      });
    }

    const results = [];

    for (const winner of victoryPendingTokens) {
      try {
        // Get loser info from opponent_mint
        const loserMint = winner.opponentMint;
        
        if (loserMint.equals(new (await import('@solana/web3.js')).PublicKey('11111111111111111111111111111111'))) {
          console.log(`⚠️ [KEEPER] ${winner.symbol} has no opponent, skipping`);
          continue;
        }

        // Fetch loser state to verify
        const [loserPDA] = getBattleStatePDA(loserMint);
        const loserAccount = await connection.getAccountInfo(loserPDA);
        
        if (!loserAccount) {
          console.log(`⚠️ [KEEPER] Loser account not found for ${winner.symbol}`);
          continue;
        }

        const loser = parseTokenBattleState(loserAccount.data as Buffer);

        // Verify loser is still InBattle
        if (loser.battleStatus !== BattleStatus.InBattle) {
          console.log(`⚠️ [KEEPER] Loser ${loser.symbol} is not InBattle (status: ${loser.battleStatus})`);
          continue;
        }

        const instruction = buildFinalizeDuelInstruction(
          keeper.publicKey,
          winner.mint,
          loserMint
        );

        const transaction = new Transaction().add(instruction);
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keeper.publicKey;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [keeper],
          { commitment: 'confirmed' }
        );

        console.log(`✅ [KEEPER] Duel finalized: ${winner.symbol} defeated ${loser.symbol}`);
        console.log(`   Signature: ${signature}`);

        // Calculate spoils for database
        const spoilsLamports = Math.floor(loser.solCollected / 2);
        const spoilsSol = spoilsLamports / 1e9;

        // Update winner in database
        await supabase
          .from('tokens')
          .update({ 
            battle_status: BattleStatus.Listed,
            is_active: false,
            opponent_mint: null,
          })
          .eq('mint', winner.mint.toString());

        // Update loser in database (can retry)
        await supabase
          .from('tokens')
          .update({ 
            battle_status: BattleStatus.Qualified,
            is_active: true,
            opponent_mint: null,
          })
          .eq('mint', loserMint.toString());

        // Update battle record
        await supabase
          .from('battles')
          .update({
            winner_mint: winner.mint.toString(),
            ended_at: new Date().toISOString(),
            status: 'completed',
            spoils_sol: spoilsSol,
          })
          .or(`token_a_mint.eq.${winner.mint.toString()},token_b_mint.eq.${winner.mint.toString()}`);

        // Insert winner record
        await supabase.from('winners').upsert({
          mint: winner.mint.toString(),
          name: winner.name,
          symbol: winner.symbol,
          loser_mint: loserMint.toString(),
          loser_name: loser.name,
          loser_symbol: loser.symbol,
          spoils_sol: spoilsSol,
          final_mc_usd: 5500, // Victory MC
          victory_timestamp: new Date().toISOString(),
          status: 'awaiting_pool',
        });

        results.push({
          winner: winner.mint.toString(),
          winnerSymbol: winner.symbol,
          loser: loserMint.toString(),
          loserSymbol: loser.symbol,
          spoilsSol,
          signature,
          success: true,
        });

      } catch (error) {
        console.error(`❌ [KEEPER] Failed to finalize duel for ${winner.symbol}:`, error);
        results.push({
          winner: winner.mint.toString(),
          winnerSymbol: winner.symbol,
          error: (error as Error).message,
          success: false,
        });
      }
    }

    const finalized = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      finalized,
      failed: results.filter(r => !r.success).length,
      results,
    });

  } catch (error) {
    console.error('❌ [KEEPER] Finalize duels error:', error);
    return NextResponse.json(
      { error: 'Finalize duels failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
```

---

## 5.5 Create Pools API

**File:** `app/src/app/api/keeper/create-pools/route.ts`

```typescript
// ============================================================================
// KEEPER: CREATE POOLS - Ritira liquidità e crea pool Raydium
// Schedule: Ogni 10 minuti
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  sendAndConfirmTransaction, 
  Transaction,
  PublicKey,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  getConnection,
  getKeeperKeypair,
  fetchTokensByStatus,
  buildWithdrawForListingInstruction,
  verifyCronSecret,
  BattleStatus,
} from '@/lib/solana/keeper';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  console.log('🏊 [KEEPER] Creating Raydium pools');

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = getConnection();
    const keeper = getKeeperKeypair();

    // Fetch all tokens ready for listing
    const listedTokens = await fetchTokensByStatus(connection, BattleStatus.Listed);
    
    // Filter tokens that haven't been withdrawn yet (sol_collected > 0)
    const tokensToWithdraw = listedTokens.filter(t => t.solCollected > 0);
    
    console.log(`📤 [KEEPER] Found ${tokensToWithdraw.length} tokens to withdraw`);

    if (tokensToWithdraw.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tokens ready for pool creation',
        processed: 0,
      });
    }

    const results = [];

    for (const token of tokensToWithdraw) {
      try {
        // First, ensure keeper has ATA for this token
        const keeperATA = await getAssociatedTokenAddress(
          token.mint,
          keeper.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID
        );

        const ataInfo = await connection.getAccountInfo(keeperATA);
        
        const transaction = new Transaction();

        // Create ATA if it doesn't exist
        if (!ataInfo) {
          console.log(`📝 [KEEPER] Creating ATA for ${token.symbol}`);
          transaction.add(
            createAssociatedTokenAccountInstruction(
              keeper.publicKey,
              keeperATA,
              keeper.publicKey,
              token.mint,
              TOKEN_2022_PROGRAM_ID
            )
          );
        }

        // Add withdraw instruction
        const withdrawIx = await buildWithdrawForListingInstruction(
          connection,
          keeper.publicKey,
          token.mint
        );
        transaction.add(withdrawIx);

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = keeper.publicKey;

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [keeper],
          { commitment: 'confirmed' }
        );

        console.log(`✅ [KEEPER] Withdrawn ${token.symbol}: ${token.solCollected / 1e9} SOL`);
        console.log(`   Signature: ${signature}`);

        // TODO: Create Raydium CPMM pool here
        // This requires Raydium SDK integration
        // For now, we just mark it as withdrawn

        // Update database
        await supabase
          .from('tokens')
          .update({ 
            sol_collected: 0,
            // raydium_pool_id will be set when pool is created
          })
          .eq('mint', token.mint.toString());

        await supabase
          .from('winners')
          .update({
            status: 'withdrawn',
            withdrawal_signature: signature,
          })
          .eq('mint', token.mint.toString());

        results.push({
          mint: token.mint.toString(),
          symbol: token.symbol,
          solWithdrawn: token.solCollected / 1e9,
          signature,
          success: true,
          poolCreated: false, // TODO: Will be true when Raydium integration is complete
        });

      } catch (error) {
        console.error(`❌ [KEEPER] Failed to process ${token.symbol}:`, error);
        results.push({
          mint: token.mint.toString(),
          symbol: token.symbol,
          error: (error as Error).message,
          success: false,
        });
      }
    }

    const processed = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      processed,
      failed: results.filter(r => !r.success).length,
      results,
      note: 'Raydium pool creation requires manual step or SDK integration',
    });

  } catch (error) {
    console.error('❌ [KEEPER] Create pools error:', error);
    return NextResponse.json(
      { error: 'Create pools failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
```

---

## 5.6 Update Oracle API

**File:** `app/src/app/api/keeper/update-oracle/route.ts`

```typescript
// ============================================================================
// KEEPER: UPDATE ORACLE - Aggiorna prezzo SOL/USD
// Schedule: Ogni 12 ore
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import {
  getConnection,
  getKeeperKeypair,
  buildUpdateSolPriceInstruction,
  fetchSolPriceUsd,
  verifyCronSecret,
  getPriceOraclePDA,
} from '@/lib/solana/keeper';

export async function POST(request: NextRequest) {
  console.log('💹 [KEEPER] Updating SOL price oracle');

  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connection = getConnection();
    const keeper = getKeeperKeypair();

    // Fetch current SOL price
    const newPriceUsd = await fetchSolPriceUsd();
    const priceFormatted = newPriceUsd / 1_000_000;

    console.log(`📊 [KEEPER] New SOL price: $${priceFormatted}`);

    // Get current oracle price for comparison
    const [oraclePDA] = getPriceOraclePDA();
    const oracleAccount = await connection.getAccountInfo(oraclePDA);
    
    let previousPrice = 0;
    if (oracleAccount) {
      const data = oracleAccount.data;
      let price = 0n;
      for (let i = 0; i < 8; i++) {
        price |= BigInt(data[8 + i]) << BigInt(i * 8);
      }
      previousPrice = Number(price) / 1_000_000;
    }

    // Build and send transaction
    const instruction = buildUpdateSolPriceInstruction(keeper.publicKey, newPriceUsd);
    const transaction = new Transaction().add(instruction);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keeper.publicKey;

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keeper],
      { commitment: 'confirmed' }
    );

    console.log(`✅ [KEEPER] Oracle updated: $${previousPrice} → $${priceFormatted}`);
    console.log(`   Signature: ${signature}`);

    return NextResponse.json({
      success: true,
      previousPrice: previousPrice,
      newPrice: priceFormatted,
      changePercent: previousPrice > 0 
        ? (((priceFormatted - previousPrice) / previousPrice) * 100).toFixed(2) 
        : 'N/A',
      signature,
    });

  } catch (error) {
    console.error('❌ [KEEPER] Update oracle error:', error);
    
    // Check if it's a "too soon" error
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('PriceUpdateTooSoon')) {
      return NextResponse.json({
        success: false,
        message: 'Price update too soon, must wait 24 hours between updates',
        error: 'PriceUpdateTooSoon',
      });
    }

    return NextResponse.json(
      { error: 'Update oracle failed', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
```

---

# 6. TESTING

## Test Manuale (Prima del Deploy)

```powershell
# 1. Avvia il server locale
cd app
npm run dev

# 2. Testa ogni endpoint (apri nuovo terminale)

# Test matchmaking
Invoke-RestMethod -Uri "http://localhost:3000/api/keeper/matchmaking" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer bonk-battle-keeper-2024-secret" }

# Test check victories
Invoke-RestMethod -Uri "http://localhost:3000/api/keeper/check-victories" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer bonk-battle-keeper-2024-secret" }

# Test finalize duels
Invoke-RestMethod -Uri "http://localhost:3000/api/keeper/finalize-duels" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer bonk-battle-keeper-2024-secret" }

# Test create pools
Invoke-RestMethod -Uri "http://localhost:3000/api/keeper/create-pools" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer bonk-battle-keeper-2024-secret" }

# Test update oracle
Invoke-RestMethod -Uri "http://localhost:3000/api/keeper/update-oracle" `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer bonk-battle-keeper-2024-secret" }
```

## Verifica Cron Jobs su Vercel

Dopo il deploy:

1. Vai su Vercel Dashboard → Project → Settings → Cron Jobs
2. Dovresti vedere tutti i 5 job elencati
3. Click su un job per vedere i logs recenti

---

# 7. MONITORING

## Vercel Logs

```
Vercel Dashboard → Project → Logs → Filter: "KEEPER"
```

## Alert Telegram (Opzionale)

Aggiungi in ogni API route:

```typescript
async function sendTelegramAlert(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) return;
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `🤖 BONK KEEPER\n\n${message}`,
      parse_mode: 'HTML',
    }),
  });
}

// Usa così:
await sendTelegramAlert(`✅ Battle started: ${tokenA.symbol} vs ${tokenB.symbol}`);
```

---

# 📋 CHECKLIST IMPLEMENTAZIONE

```
□ 1. Upgrade Vercel a Pro ($20/mese)
□ 2. Aggiungi Environment Variables su Vercel:
     □ KEEPER_PRIVATE_KEY
     □ CRON_SECRET
     □ HELIUS_API_KEY
     □ SUPABASE_SERVICE_ROLE_KEY
□ 3. Crea file vercel.json nella root
□ 4. Crea cartella app/src/lib/solana/keeper.ts
□ 5. Crea cartella app/src/app/api/keeper/
□ 6. Crea i 5 file route.ts
□ 7. Test locale con npm run dev
□ 8. Deploy: git push
□ 9. Verifica Cron Jobs su Vercel Dashboard
□ 10. Monitora logs per 24 ore
```

---

# ⚠️ NOTE IMPORTANTI

## Sicurezza

- **MAI** committare KEEPER_PRIVATE_KEY nel codice
- Usa SEMPRE variabili d'ambiente
- Il CRON_SECRET protegge da chiamate non autorizzate

## Limiti

- Vercel timeout: 60 secondi per API
- Se un'operazione impiega più tempo, dividi in step
- Raydium pool creation potrebbe richiedere script separato

## Costi

- Vercel Pro: $20/mese
- Transaction fees: ~0.001 SOL per operazione
- Con 10 battaglie/giorno: ~$42,000/mese revenue vs ~$30/mese costi

---

**Documento creato:** Dicembre 2025  
**Autore:** Claude  
**Progetto:** BONK BATTLE Keeper Automation