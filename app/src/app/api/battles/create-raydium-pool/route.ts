/**
 * BONK BATTLE - Create Raydium CPMM Pool API
 * POST /api/battles/create-raydium-pool
 * 
 * Creates a Raydium CPMM liquidity pool for a token that has
 * completed the battle and withdrawal process.
 * 
 * The keeper must have:
 * - SOL for liquidity
 * - Tokens for liquidity (from withdraw_for_listing)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
    Keypair,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    Raydium,
    TxVersion,
    DEVNET_PROGRAM_ID,
    getCpmmPdaAmmConfigId
} from '@raydium-io/raydium-sdk-v2';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { createClient } from '@supabase/supabase-js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// Supabase client for updating database
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Token decimals
const TOKEN_DECIMALS = 9;

// Raydium reserved supply (206.9M tokens)
const RAYDIUM_RESERVED_SUPPLY = 206_900_000;

// Load keeper keypair
function getKeeperKeypair(): Keypair {
    const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKeyString) {
        throw new Error('KEEPER_PRIVATE_KEY not configured');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('battle_state'), mint.toBuffer()],
        PROGRAM_ID
    );
}

// Battle status enum
const BattleStatus = {
    Created: 0,
    Qualified: 1,
    InBattle: 2,
    VictoryPending: 3,
    Listed: 4,
    PoolCreated: 5,
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tokenMint, solAmount, tokenAmount } = body;

        if (!tokenMint) {
            return NextResponse.json({
                error: 'Missing tokenMint'
            }, { status: 400 });
        }

        let mint: PublicKey;
        try {
            mint = new PublicKey(tokenMint);
        } catch {
            return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
        }

        // Use provided amounts or defaults
        const solForPool = solAmount || 6; // Default 6 SOL
        const tokensForPool = tokenAmount || RAYDIUM_RESERVED_SUPPLY; // Default 206.9M

        console.log('\n🌊 CREATE RAYDIUM CPMM POOL');
        console.log('Token:', tokenMint);
        console.log('SOL Amount:', solForPool, 'SOL');
        console.log('Token Amount:', tokensForPool / 1_000_000, 'M');

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const keeperKeypair = getKeeperKeypair();

        const [battleStatePDA] = getBattleStatePDA(mint);

        // Verify token has Listed status (withdrew successfully)
        const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
        if (!battleStateAccount) {
            return NextResponse.json({
                error: 'Battle state not found'
            }, { status: 404 });
        }

        const battleStatus = battleStateAccount.data[65]; // V1 offset for battle_status
        if (battleStatus !== BattleStatus.Listed) {
            return NextResponse.json({
                error: 'Token not ready for pool creation',
                currentStatus: battleStatus,
                statusName: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][battleStatus],
                hint: 'Call withdraw-for-listing first'
            }, { status: 400 });
        }

        console.log('✅ Token status verified: Listed (ready for pool)');

        // Initialize Raydium SDK
        console.log('📦 Loading Raydium SDK...');
        const raydium = await Raydium.load({
            owner: keeperKeypair,
            connection: connection,
            cluster: 'devnet',
            disableFeatureCheck: true,
            disableLoadToken: false,
        });

        console.log('✅ Raydium SDK loaded');

        // Native SOL mint (wrapped SOL)
        const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

        // Raydium requires mintA address < mintB address
        // Compare addresses to determine order
        const solMintStr = SOL_MINT.toString();
        const tokenMintStr = mint.toString();
        const solFirst = solMintStr < tokenMintStr;

        console.log('  SOL Mint:', solMintStr);
        console.log('  Token Mint:', tokenMintStr);
        console.log('  SOL first?', solFirst);

        // Convert amounts
        const solAmountBN = new BN(solForPool * LAMPORTS_PER_SOL);
        // tokensForPool is in human units (206.9M = 206_900_000)
        // Need to multiply by 10^decimals to get smallest units
        const tokenAmountBN = new BN(tokensForPool).mul(new BN(10).pow(new BN(TOKEN_DECIMALS)));

        console.log('  SOL Amount (lamports):', solAmountBN.toString());
        console.log('  Token Amount (smallest):', tokenAmountBN.toString());

        // Set mintA/mintB based on address order
        const mintA = {
            address: solFirst ? SOL_MINT.toString() : mint.toString(),
            decimals: solFirst ? 9 : TOKEN_DECIMALS,
            programId: TOKEN_PROGRAM_ID.toString(),
        };

        const mintB = {
            address: solFirst ? mint.toString() : SOL_MINT.toString(),
            decimals: solFirst ? TOKEN_DECIMALS : 9,
            programId: TOKEN_PROGRAM_ID.toString(),
        };

        const mintAAmount = solFirst ? solAmountBN : tokenAmountBN;
        const mintBAmount = solFirst ? tokenAmountBN : solAmountBN;

        // Get fee configs
        console.log('📝 Getting fee configs...');
        const feeConfigs = await raydium.api.getCpmmConfigs();

        // For devnet, update config IDs
        feeConfigs.forEach((config) => {
            config.id = getCpmmPdaAmmConfigId(
                DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
                config.index
            ).publicKey.toBase58();
        });

        console.log('✅ Fee configs loaded:', feeConfigs.length);

        console.log('  Mint A Amount:', mintAAmount.toString(), 'lamports');
        console.log('  Mint B Amount:', mintBAmount.toString(), 'tokens');

        try {
            console.log('📤 Creating pool...');

            const { execute, extInfo } = await raydium.cpmm.createPool({
                programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
                poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
                mintA,
                mintB,
                mintAAmount,
                mintBAmount,
                startTime: new BN(0), // Start immediately
                feeConfig: feeConfigs[0], // Use first config (lowest fee)
                associatedOnly: false,
                ownerInfo: {
                    useSOLBalance: true, // Use keeper's SOL balance
                },
                txVersion: TxVersion.V0,
            });

            console.log('📤 Sending transaction...');

            // Execute transaction
            const { txId } = await execute({ sendAndConfirm: true });

            console.log('✅ Pool created!');
            console.log('  Pool ID:', extInfo.address.poolId.toString());
            console.log('  TX:', txId);

            const poolInfo = {
                poolId: extInfo.address.poolId.toString(),
                authority: extInfo.address.authority.toString(),
                configId: extInfo.address.configId.toString(),
                lpMint: extInfo.address.lpMint.toString(),
            };

            console.log('  Pool Info:', poolInfo);

            // ✅ FIX: Generate SWAP URL (not liquidity URL)
            // This is better for users who want to trade their tokens
            const raydiumSwapUrl = `https://raydium.io/swap/?inputMint=${tokenMint}&outputMint=sol&cluster=devnet`;
            const raydiumLiquidityUrl = `https://raydium.io/liquidity/increase/?mode=add&pool_id=${poolInfo.poolId}&cluster=devnet`;

            // Update database with pool info
            try {
                await supabase.from('tokens').update({
                    battle_status: BattleStatus.PoolCreated,
                    raydium_pool_id: poolInfo.poolId,
                    raydium_url: raydiumSwapUrl,
                    listing_timestamp: new Date().toISOString(),
                }).eq('mint', tokenMint);

                // Add to winners table
                await supabase.from('winners').upsert({
                    token_mint: tokenMint,
                    pool_id: poolInfo.poolId,
                    raydium_url: raydiumSwapUrl,
                    sol_liquidity: solForPool,
                    victory_timestamp: new Date().toISOString(),
                }, { onConflict: 'token_mint' });

                console.log('✅ Database updated with pool info');
            } catch (dbError) {
                console.warn('⚠️ Database update failed (non-critical):', dbError);
            }

            return NextResponse.json({
                success: true,
                message: '🎉 RAYDIUM POOL CREATED!',
                signature: txId,
                solscanUrl: `https://solscan.io/tx/${txId}?cluster=devnet`,
                pool: poolInfo,
                raydiumUrl: raydiumSwapUrl,        // ✅ Main URL for trading
                raydiumLiquidityUrl,               // Also provide liquidity URL
                liquidity: {
                    sol: solForPool,
                    tokens: tokensForPool,
                }
            });

        } catch (poolError: any) {
            console.error('❌ Failed to create pool:', poolError);

            return NextResponse.json({
                success: false,
                error: 'Failed to create Raydium pool',
                details: poolError.message || String(poolError),
                logs: poolError.logs || [],
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Create Raydium pool API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');

    if (!mint) {
        return NextResponse.json({
            endpoint: 'create-raydium-pool',
            usage: 'POST with { tokenMint: "...", solAmount?: number, tokenAmount?: number }',
            description: 'Creates a Raydium CPMM liquidity pool for a token that completed battle',
            requirements: 'Token must be in Listed status (completed withdraw-for-listing)',
            defaults: {
                solAmount: '6 SOL',
                tokenAmount: '206,900,000 tokens'
            },
            example: {
                tokenMint: 'GBZf7U9mRzxLfRiZL5hFs7Q397YCvd6C5ckW6kng1Y1',
                solAmount: 6,
                tokenAmount: 206900000
            },
            urls: {
                swap: 'https://raydium.io/swap/?inputMint={TOKEN}&outputMint=sol&cluster=devnet',
                liquidity: 'https://raydium.io/liquidity/increase/?mode=add&pool_id={POOL_ID}&cluster=devnet'
            }
        });
    }

    return NextResponse.json({
        error: 'Use POST method to create pool',
        usage: 'POST with { tokenMint: "..." }'
    }, { status: 405 });
}