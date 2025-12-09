/**
 * BONK BATTLE - Create Raydium Pool (CRON 3)
 * GET /api/battles/create-pool
 * 
 * Scans Listed tokens without pool and creates Raydium pool.
 * Withdraws SOL + tokens from contract, then creates CPMM pool.
 * Updates: Listed → PoolCreated
 * 
 * Run every 2 minutes via Vercel Cron
 */

import { NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    Keypair,
    SystemProgram,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
    Raydium,
    TxVersion,
    DEVNET_PROGRAM_ID,
    getCpmmPdaAmmConfigId
} from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { createClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Battle status enum
const BattleStatus = {
    Created: 0,
    Qualified: 1,
    InBattle: 2,
    VictoryPending: 3,
    Listed: 4,
    PoolCreated: 5,
};

// V1 Struct offsets
const V1_OFFSET_BATTLE_STATUS = 65;
const V1_OFFSET_TOTAL_VOLUME = 56;
const V1_OFFSET_OPPONENT_MINT = 66;

// Anchor discriminator for withdraw_for_listing
const WITHDRAW_FOR_LISTING_DISCRIMINATOR = Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getKeeperKeypair(): Keypair {
    const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKeyString) throw new Error('KEEPER_PRIVATE_KEY not configured');
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKeyString)));
}

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('battle_state'), mint.toBuffer()],
        PROGRAM_ID
    );
}

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
    const mintAccount = await connection.getAccountInfo(mint);
    if (!mintAccount) throw new Error('Mint account not found');
    return mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: WITHDRAW FOR LISTING
// ═══════════════════════════════════════════════════════════════════════════

async function withdrawForListing(
    connection: Connection,
    keeper: Keypair,
    mint: PublicKey
): Promise<{ success: boolean; solWithdrawn: number; alreadyWithdrawn: boolean; error?: string }> {

    console.log(`📤 Withdrawing for ${mint.toString().slice(0, 8)}...`);

    const tokenProgramId = await getTokenProgramForMint(connection, mint);
    const [battleStatePDA] = getBattleStatePDA(mint);

    // Check if already withdrawn
    const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
    const rent = await connection.getMinimumBalanceForRentExemption(battleStateAccount?.data.length || 200);
    const availableLamports = (battleStateAccount?.lamports || 0) - rent;

    if (availableLamports <= 0) {
        console.log(`ℹ️ Already withdrawn - no SOL beyond rent`);
        return { success: true, solWithdrawn: 0, alreadyWithdrawn: true };
    }

    const solInAccount = availableLamports / 1e9;

    const contractTokenAccount = getAssociatedTokenAddressSync(mint, battleStatePDA, true, tokenProgramId);
    const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeper.publicKey, false, tokenProgramId);

    // Create keeper ATA if needed
    const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
    if (!keeperTokenAccountInfo) {
        console.log(`Creating keeper token account...`);
        const createATAIx = createAssociatedTokenAccountInstruction(
            keeper.publicKey, keeperTokenAccount, keeper.publicKey, mint, tokenProgramId, ASSOCIATED_TOKEN_PROGRAM_ID
        );
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const ataTx = new Transaction({ feePayer: keeper.publicKey, blockhash, lastValidBlockHeight }).add(createATAIx);
        await sendAndConfirmTransaction(connection, ataTx, [keeper], { commitment: 'confirmed' });
        await sleep(2000);
    }

    // Withdraw instruction
    const withdrawIx = new TransactionInstruction({
        keys: [
            { pubkey: battleStatePDA, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
            { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
            { pubkey: keeper.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: tokenProgramId, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: WITHDRAW_FOR_LISTING_DISCRIMINATOR,
    });

    try {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        const transaction = new Transaction({ feePayer: keeper.publicKey, blockhash, lastValidBlockHeight }).add(withdrawIx);
        await sendAndConfirmTransaction(connection, transaction, [keeper], { commitment: 'confirmed' });

        console.log(`✅ Withdrawn ${solInAccount.toFixed(2)} SOL`);
        return { success: true, solWithdrawn: solInAccount, alreadyWithdrawn: false };

    } catch (error: any) {
        if (error.message?.includes('0x1788') || error.message?.includes('NoLiquidityToWithdraw')) {
            return { success: true, solWithdrawn: 0, alreadyWithdrawn: true };
        }
        return { success: false, solWithdrawn: 0, alreadyWithdrawn: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: CREATE RAYDIUM POOL
// ═══════════════════════════════════════════════════════════════════════════

async function createRaydiumPool(
    connection: Connection,
    keeper: Keypair,
    mint: PublicKey
): Promise<{ success: boolean; poolId?: string; signature?: string; error?: string }> {

    console.log(`🌊 Creating Raydium pool for ${mint.toString().slice(0, 8)}...`);

    try {
        const raydium = await Raydium.load({
            owner: keeper,
            connection,
            cluster: 'devnet',
            disableFeatureCheck: true,
            disableLoadToken: false,
        });

        const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
        const tokenMintStr = mint.toString();
        const solMintStr = SOL_MINT.toString();
        const solFirst = solMintStr < tokenMintStr;

        // Get keeper balances
        const tokenProgramId = await getTokenProgramForMint(connection, mint);
        const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeper.publicKey, false, tokenProgramId);

        const tokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
        if (!tokenAccountInfo) {
            return { success: false, error: 'Keeper has no token account' };
        }

        const tokenBalance = await connection.getTokenAccountBalance(keeperTokenAccount);
        const tokenAmountRaw = tokenBalance.value.amount;

        if (tokenAmountRaw === '0' || !tokenAmountRaw) {
            return { success: false, error: 'Keeper has 0 tokens - pool may already exist' };
        }

        const keeperBalance = await connection.getBalance(keeper.publicKey);
        const keeperSol = keeperBalance / 1e9;
        const actualSolAmount = Math.min(keeperSol - 0.1, 7); // Leave 0.1 for fees, max 7 SOL

        if (actualSolAmount < 1) {
            return { success: false, error: `Insufficient SOL: ${keeperSol.toFixed(2)}` };
        }

        console.log(`   SOL: ${actualSolAmount.toFixed(2)}`);
        console.log(`   Tokens: ${tokenAmountRaw}`);

        const solAmountBN = new BN(Math.floor(actualSolAmount * 1e9));
        const tokenAmountBN = new BN(tokenAmountRaw);

        const mintA = {
            address: solFirst ? SOL_MINT.toString() : mint.toString(),
            decimals: 9,
            programId: TOKEN_PROGRAM_ID.toString(),
        };
        const mintB = {
            address: solFirst ? mint.toString() : SOL_MINT.toString(),
            decimals: 9,
            programId: TOKEN_PROGRAM_ID.toString(),
        };

        const mintAAmount = solFirst ? solAmountBN : tokenAmountBN;
        const mintBAmount = solFirst ? tokenAmountBN : solAmountBN;

        const feeConfigs = await raydium.api.getCpmmConfigs();
        feeConfigs.forEach((config) => {
            config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58();
        });

        const { execute, extInfo } = await raydium.cpmm.createPool({
            programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
            poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
            mintA,
            mintB,
            mintAAmount,
            mintBAmount,
            startTime: new BN(0),
            feeConfig: feeConfigs[0],
            associatedOnly: false,
            ownerInfo: { useSOLBalance: true },
            txVersion: TxVersion.V0,
        });

        const { txId } = await execute({ sendAndConfirm: true });
        const poolId = extInfo.address.poolId.toString();

        console.log(`✅ Pool created! ${poolId}`);
        return { success: true, poolId, signature: txId };

    } catch (error: any) {
        console.error(`❌ Pool creation failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROCESS
// ═══════════════════════════════════════════════════════════════════════════

async function processListedToken(
    connection: Connection,
    keeper: Keypair,
    token: { mint: string; symbol: string; opponent_mint: string | null }
): Promise<{ success: boolean; poolId?: string; error?: string }> {

    const mint = new PublicKey(token.mint);

    // Step 1: Withdraw
    const withdrawResult = await withdrawForListing(connection, keeper, mint);
    if (!withdrawResult.success) {
        return { success: false, error: `Withdraw failed: ${withdrawResult.error}` };
    }

    await sleep(2000);

    // Step 2: Create Pool
    const poolResult = await createRaydiumPool(connection, keeper, mint);
    if (!poolResult.success) {
        // Save error to DB for debugging
        await supabase.from('tokens').update({
            raydium_pool_error: poolResult.error
        }).eq('mint', token.mint);
        return { success: false, error: poolResult.error };
    }

    // Success! Update database
    const raydiumUrl = `https://raydium.io/swap/?inputMint=${token.mint}&outputMint=sol&cluster=devnet`;

    await supabase.from('tokens').update({
        battle_status: BattleStatus.PoolCreated,
        raydium_pool_id: poolResult.poolId,
        raydium_url: raydiumUrl,
        raydium_pool_error: null,
    }).eq('mint', token.mint);

    // Get token data for winners table
    const { data: tokenData } = await supabase
        .from('tokens')
        .select('name, symbol, image_url, creator_wallet')
        .eq('mint', token.mint)
        .single();

    // Get opponent data
    let loserData = null;
    if (token.opponent_mint) {
        const { data } = await supabase
            .from('tokens')
            .select('name, symbol, image_url')
            .eq('mint', token.opponent_mint)
            .single();
        loserData = data;
    }

    // Insert into winners table
    await supabase.from('winners').upsert({
        mint: token.mint,
        name: tokenData?.name || 'Unknown',
        symbol: tokenData?.symbol || token.symbol,
        image: tokenData?.image_url || null,
        loser_mint: token.opponent_mint,
        loser_name: loserData?.name || 'Unknown',
        loser_symbol: loserData?.symbol || '???',
        loser_image: loserData?.image_url || null,
        pool_id: poolResult.poolId,
        raydium_url: raydiumUrl,
        victory_timestamp: new Date().toISOString(),
        status: 'pool_created',
    }, { onConflict: 'mint' });

    // Award points to creator
    if (tokenData?.creator_wallet) {
        const { data: currentPoints } = await supabase
            .from('user_stonks')
            .select('total_stonks')
            .eq('wallet_address', tokenData.creator_wallet)
            .single();

        await supabase.from('user_stonks').upsert({
            wallet_address: tokenData.creator_wallet,
            total_stonks: (currentPoints?.total_stonks || 0) + 10000,
        }, { onConflict: 'wallet_address' });

        console.log(`🎮 +10,000 points to ${tokenData.creator_wallet.slice(0, 8)}...`);
    }

    // Log activity
    await supabase.from('activity_feed').insert({
        wallet: 'system',
        action_type: 'pool_created',
        token_mint: token.mint,
        token_symbol: token.symbol,
        metadata: { pool_id: poolResult.poolId, raydium_url: raydiumUrl }
    });

    return { success: true, poolId: poolResult.poolId };
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
    const startTime = Date.now();
    console.log('\n🌊 ═══════════════════════════════════════════════════════');
    console.log('CRON 3: CREATE RAYDIUM POOL');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const keeper = getKeeperKeypair();

        // Get Listed tokens WITHOUT pool
        const { data: listedTokens, error } = await supabase
            .from('tokens')
            .select('mint, symbol, opponent_mint')
            .eq('battle_status', BattleStatus.Listed)
            .is('raydium_pool_id', null);

        if (error || !listedTokens?.length) {
            console.log('📭 No Listed tokens needing pool');
            return NextResponse.json({
                success: true,
                message: 'No Listed tokens to process',
                processed: 0,
                duration: Date.now() - startTime
            });
        }

        console.log(`📊 Processing ${listedTokens.length} Listed token(s)...`);

        const results: Array<{
            symbol: string;
            success: boolean;
            poolId?: string;
            error?: string;
        }> = [];

        // Process ONE token at a time to avoid timeout
        // If there are multiple, subsequent cron runs will handle them
        const token = listedTokens[0];

        try {
            // Verify chain status
            const [battleStatePDA] = getBattleStatePDA(new PublicKey(token.mint));
            const account = await connection.getAccountInfo(battleStatePDA);

            if (!account) {
                console.warn(`⚠️ No battle state for ${token.symbol}`);
                results.push({ symbol: token.symbol, success: false, error: 'No battle state' });
            } else {
                const chainStatus = account.data[V1_OFFSET_BATTLE_STATUS];

                if (chainStatus === BattleStatus.PoolCreated) {
                    console.log(`⏭️ ${token.symbol}: Already PoolCreated on-chain`);
                    await supabase.from('tokens').update({ battle_status: BattleStatus.PoolCreated }).eq('mint', token.mint);
                    results.push({ symbol: token.symbol, success: true, error: 'Already created' });
                } else if (chainStatus === BattleStatus.Listed) {
                    console.log(`🚀 Processing ${token.symbol}...`);
                    const result = await processListedToken(connection, keeper, token);
                    results.push({
                        symbol: token.symbol,
                        success: result.success,
                        poolId: result.poolId,
                        error: result.error
                    });
                } else {
                    console.log(`⏭️ ${token.symbol}: Chain status ${chainStatus} (not Listed)`);
                    await supabase.from('tokens').update({ battle_status: chainStatus }).eq('mint', token.mint);
                    results.push({ symbol: token.symbol, success: false, error: `Wrong status: ${chainStatus}` });
                }
            }
        } catch (err: any) {
            console.error(`❌ Error processing ${token.symbol}:`, err.message);
            results.push({ symbol: token.symbol, success: false, error: err.message });
        }

        const successful = results.filter(r => r.success && r.poolId).length;
        const duration = Date.now() - startTime;

        console.log(`\n✅ Pool creation complete: ${successful} pool(s) in ${duration}ms`);
        if (listedTokens.length > 1) {
            console.log(`ℹ️ ${listedTokens.length - 1} more token(s) will be processed in next cron run`);
        }

        return NextResponse.json({
            success: true,
            message: successful > 0 ? `${successful} pool(s) created!` : 'No pools created',
            processed: results.length,
            remaining: listedTokens.length - 1,
            successful,
            results,
            duration
        });

    } catch (error: any) {
        console.error('❌ CRON 3 Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Vercel Cron config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;