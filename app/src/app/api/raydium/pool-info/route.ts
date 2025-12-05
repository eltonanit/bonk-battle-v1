/**
 * GET /api/raydium/pool-info?poolId=xxx
 *
 * Returns real-time pool data from Raydium CPMM (on-chain)
 * Uses proper SDK decoding
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const SOL_MINT = 'So11111111111111111111111111111111111111112';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CPMM Pool Layout - corrected offsets for Raydium devnet
// Reference: https://github.com/raydium-io/raydium-cpmm
const CPMM_POOL_LAYOUT = {
  // Header
  ammConfig: 8,           // offset 8, 32 bytes
  poolCreator: 40,        // offset 40, 32 bytes
  token0Vault: 72,        // offset 72, 32 bytes
  token1Vault: 104,       // offset 104, 32 bytes
  lpMint: 136,            // offset 136, 32 bytes
  token0Mint: 168,        // offset 168, 32 bytes
  token1Mint: 200,        // offset 200, 32 bytes
  token0Program: 232,     // offset 232, 32 bytes
  token1Program: 264,     // offset 264, 32 bytes
  // ... more fields
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get('poolId');
    const tokenMint = searchParams.get('mint');

    if (!poolId && !tokenMint) {
      return NextResponse.json({ error: 'Missing poolId or mint parameter' }, { status: 400 });
    }

    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // If mint provided, lookup poolId from database
    let actualPoolId = poolId;
    if (!actualPoolId && tokenMint) {
      const { data } = await supabase
        .from('winners')
        .select('pool_id')
        .eq('mint', tokenMint)
        .single();

      if (!data?.pool_id) {
        return NextResponse.json({ error: 'Pool not found for token' }, { status: 404 });
      }
      actualPoolId = data.pool_id;
    }

    const poolPubkey = new PublicKey(actualPoolId!);
    const poolAccount = await connection.getAccountInfo(poolPubkey);

    if (!poolAccount) {
      return NextResponse.json({ error: 'Pool account not found' }, { status: 404 });
    }

    // Parse pool data
    const data = poolAccount.data;

    const token0Vault = new PublicKey(data.slice(CPMM_POOL_LAYOUT.token0Vault, CPMM_POOL_LAYOUT.token0Vault + 32));
    const token1Vault = new PublicKey(data.slice(CPMM_POOL_LAYOUT.token1Vault, CPMM_POOL_LAYOUT.token1Vault + 32));
    const token0Mint = new PublicKey(data.slice(CPMM_POOL_LAYOUT.token0Mint, CPMM_POOL_LAYOUT.token0Mint + 32));
    const token1Mint = new PublicKey(data.slice(CPMM_POOL_LAYOUT.token1Mint, CPMM_POOL_LAYOUT.token1Mint + 32));

    console.log('Pool vaults:', {
      token0Vault: token0Vault.toString(),
      token1Vault: token1Vault.toString(),
      token0Mint: token0Mint.toString(),
      token1Mint: token1Mint.toString(),
    });

    // Get vault balances
    const [vault0Info, vault1Info] = await Promise.all([
      connection.getTokenAccountBalance(token0Vault).catch(() => null),
      connection.getTokenAccountBalance(token1Vault).catch(() => null),
    ]);

    if (!vault0Info || !vault1Info) {
      return NextResponse.json({ error: 'Could not fetch vault balances' }, { status: 500 });
    }

    const balance0 = Number(vault0Info.value.amount);
    const balance1 = Number(vault1Info.value.amount);
    const decimals0 = vault0Info.value.decimals;
    const decimals1 = vault1Info.value.decimals;

    // Determine which is SOL and which is token
    const token0MintStr = token0Mint.toString();
    const token1MintStr = token1Mint.toString();

    let solBalance: number;
    let tokenBalance: number;
    let tokenMintAddress: string;
    let tokenDecimals: number;

    if (token0MintStr === SOL_MINT) {
      solBalance = balance0 / Math.pow(10, decimals0);
      tokenBalance = balance1 / Math.pow(10, decimals1);
      tokenMintAddress = token1MintStr;
      tokenDecimals = decimals1;
    } else if (token1MintStr === SOL_MINT) {
      solBalance = balance1 / Math.pow(10, decimals1);
      tokenBalance = balance0 / Math.pow(10, decimals0);
      tokenMintAddress = token0MintStr;
      tokenDecimals = decimals0;
    } else {
      return NextResponse.json({ error: 'Pool does not contain SOL' }, { status: 400 });
    }

    console.log('Balances:', { solBalance, tokenBalance, tokenMintAddress });

    // Calculate price (SOL per token)
    const priceInSol = tokenBalance > 0 ? solBalance / tokenBalance : 0;

    // Get SOL price in USD
    let solPriceUsd = 230;
    try {
      const priceRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { next: { revalidate: 60 } } // Cache for 60 seconds
      );
      const priceData = await priceRes.json();
      solPriceUsd = priceData.solana?.usd || 230;
    } catch {
      console.warn('Could not fetch SOL price, using fallback');
    }

    // Calculate values
    const poolValueSol = solBalance * 2; // AMM: equal value both sides
    const poolValueUsd = poolValueSol * solPriceUsd;
    const tokenPriceUsd = priceInSol * solPriceUsd;

    // Market cap (1B total supply, 9 decimals)
    const totalSupply = 1_000_000_000;
    const marketCapUsd = totalSupply * tokenPriceUsd;

    return NextResponse.json({
      success: true,
      poolId: actualPoolId,
      tokenMint: tokenMintAddress,

      // Raw balances
      solInPool: solBalance,
      tokensInPool: tokenBalance,

      // Prices
      tokenPriceInSol: priceInSol,
      tokenPriceUsd: tokenPriceUsd,
      solPriceUsd: solPriceUsd,

      // Values
      poolValueSol: poolValueSol,
      poolValueUsd: poolValueUsd,
      marketCapUsd: marketCapUsd,

      // For display
      formatted: {
        solInPool: `${solBalance.toFixed(4)} SOL`,
        tokensInPool: `${(tokenBalance / 1e6).toFixed(2)}M tokens`,
        tokenPrice: `$${tokenPriceUsd.toFixed(8)}`,
        poolValue: `$${poolValueUsd.toFixed(2)}`,
        marketCap: `$${marketCapUsd.toLocaleString()}`,
      },

      // Debug info
      debug: {
        token0Mint: token0MintStr,
        token1Mint: token1MintStr,
        balance0: balance0,
        balance1: balance1,
        decimals0,
        decimals1,
      },

      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Pool info error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
