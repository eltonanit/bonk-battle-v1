/**
 * BONK BATTLE - Create Raydium Pool (CRON 3) - FIXED V2
 * GET /api/battles/create-pool
 * 
 * Scans Listed tokens without pool and creates Raydium pool.
 * Withdraws SOL + tokens from contract, then creates CPMM pool.
 * Updates: Listed → PoolCreated
 * 
 * ⭐ FIX V2:
 * - Checks if pool already exists on-chain BEFORE saying "0 tokens"
 * - Updates database immediately after each step
 * - Better error recovery and logging
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
const PROGRAM_ID = new PublicKey('F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD');
const RAYDIUM_CPMM_PROGRAM = new PublicKey('CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW');

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
// ⭐ NEW: CHECK IF POOL ALREADY EXISTS ON-CHAIN
// ═══════════════════════════════════════════════════════════════════════════

async function checkExistingPool(
    connection: Connection,
    mint: PublicKey
): Promise<{ exists: boolean; poolId?: string }> {
    console.log(`🔍 Checking if pool already exists for ${mint.toString().slice(0, 8)}...`);

    try {
        // Search for Raydium CPMM pools containing this mint
        const accounts = await connection.getProgramAccounts(RAYDIUM_CPMM_PROGRAM, {
            filters: [
                { memcmp: { offset: 72, bytes: mint.toBase58() } }
            ],
            dataSlice: { offset: 0, length: 0 } // We only need to know if it exists
        });

        if (accounts.length > 0) {
            const poolId = accounts[0].pubkey.toString();
            console.log(`✅ Pool already exists on-chain: ${poolId}`);
            return { exists: true, poolId };
        }

        // Also check with mint in second position (SOL might be first)
        const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
        const accounts2 = await connection.getProgramAccounts(RAYDIUM_CPMM_PROGRAM, {
            filters: [
                { memcmp: { offset: 104, bytes: mint.toBase58() } }
            ],
            dataSlice: { offset: 0, length: 0 }
        });

        if (accounts2.length > 0) {
            const poolId = accounts2[0].pubkey.toString();
            console.log(`✅ Pool already exists on-chain (mint in position 2): ${poolId}`);
            return { exists: true, poolId };
        }

        console.log(`📭 No existing pool found`);
        return { exists: false };

    } catch (error: any) {
        console.warn(`⚠️ Error checking existing pool:`, error.message);
        return { exists: false };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ NEW: UPDATE DATABASE WITH POOL INFO
// ═══════════════════════════════════════════════════════════════════════════

async function updateDatabaseWithPool(
    tokenMint: string,
    tokenSymbol: string,
    poolId: string,
    opponentMint: string | null
): Promise<boolean> {
    console.log(`💾 Updating database for ${tokenSymbol}...`);

    const raydiumUrl = `https://raydium.io/swap/?inputMint=${tokenMint}&outputMint=sol`;

    try {
        // 1. Update token status
        const { error: tokenError } = await supabase.from('tokens').update({
            battle_status: BattleStatus.PoolCreated,
            raydium_pool_id: poolId,
            raydium_url: raydiumUrl,
        }).eq('mint', tokenMint);

        if (tokenError) {
            console.error(`❌ Failed to update token:`, tokenError.message);
            return false;
        }
        console.log(`   ✅ Token status updated to PoolCreated`);

        // 2. Get token data for winners table
        const { data: tokenData } = await supabase
            .from('tokens')
            .select('name, symbol, image, creator_wallet')
            .eq('mint', tokenMint)
            .single();

        // 3. Get opponent data if exists
        let loserData = null;
        if (opponentMint) {
            const { data } = await supabase
                .from('tokens')
                .select('name, symbol, image_url')
                .eq('mint', opponentMint)
                .single();
            loserData = data;
        }

        // 4. Insert into winners table
        const { error: winnersError } = await supabase.from('winners').upsert({
            mint: tokenMint,
            name: tokenData?.name || 'Unknown',
            symbol: tokenData?.symbol || tokenSymbol,
            image: tokenData?.image || null,
            loser_mint: opponentMint,
            loser_name: loserData?.name || 'Unknown',
            loser_symbol: loserData?.symbol || '???',
            loser_image: loserData?.image_url || null,
            pool_id: poolId,
            raydium_url: raydiumUrl,
            victory_timestamp: new Date().toISOString(),
            status: 'pool_created',
        }, { onConflict: 'mint' });

        if (winnersError) {
            console.warn(`⚠️ Failed to update winners:`, winnersError.message);
        } else {
            console.log(`   ✅ Winners table updated`);
        }

        // 5. Award points to creator
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

            console.log(`   🎮 +10,000 points to ${tokenData.creator_wallet.slice(0, 8)}...`);
        }

        // 6. Log activity
        await supabase.from('activity_feed').insert({
            wallet: 'system',
            action_type: 'pool_created',
            token_mint: tokenMint,
            token_symbol: tokenSymbol,
            metadata: { pool_id: poolId, raydium_url: raydiumUrl },
            created_at: new Date().toISOString()
        });
        console.log(`   ✅ Activity logged`);

        return true;

    } catch (error: any) {
        console.error(`❌ Database update failed:`, error.message);
        return false;
    }
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
        console.log(`   ℹ️ Already withdrawn - no SOL beyond rent`);
        return { success: true, solWithdrawn: 0, alreadyWithdrawn: true };
    }

    const solInAccount = availableLamports / 1e9;

    const contractTokenAccount = getAssociatedTokenAddressSync(mint, battleStatePDA, true, tokenProgramId);
    const keeperTokenAccount = getAssociatedTokenAddressSync(mint, keeper.publicKey, false, tokenProgramId);

    // Create keeper ATA if needed
    const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);
    if (!keeperTokenAccountInfo) {
        console.log(`   Creating keeper token account...`);
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
        const signature = await sendAndConfirmTransaction(connection, transaction, [keeper], { commitment: 'confirmed' });

        console.log(`   ✅ Withdrawn ${solInAccount.toFixed(2)} SOL (tx: ${signature.slice(0, 8)}...)`);
        return { success: true, solWithdrawn: solInAccount, alreadyWithdrawn: false };

    } catch (error: any) {
        if (error.message?.includes('0x1788') || error.message?.includes('NoLiquidityToWithdraw')) {
            console.log(`   ℹ️ Already withdrawn (NoLiquidityToWithdraw)`);
            return { success: true, solWithdrawn: 0, alreadyWithdrawn: true };
        }
        console.error(`   ❌ Withdraw failed:`, error.message);
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
            return { success: false, error: 'Keeper has 0 tokens' };
        }

        const keeperBalance = await connection.getBalance(keeper.publicKey);
        const keeperSol = keeperBalance / 1e9;
        const actualSolAmount = Math.min(keeperSol - 0.1, 7); // Leave 0.1 for fees, max 7 SOL

        if (actualSolAmount < 1) {
            return { success: false, error: `Insufficient SOL: ${keeperSol.toFixed(2)}` };
        }

        console.log(`   SOL: ${actualSolAmount.toFixed(2)}`);
        console.log(`   Tokens: ${(BigInt(tokenAmountRaw) / BigInt(1e9)).toString()}`);

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

        console.log(`   Creating pool: ${mintA.address.slice(0, 8)}... <-> ${mintB.address.slice(0, 8)}...`);

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

        console.log(`   ⏳ Executing transaction...`);
        const { txId } = await execute({ sendAndConfirm: true });
        const poolId = extInfo.address.poolId.toString();

        console.log(`   ✅ Pool created! ${poolId}`);
        console.log(`   📝 TX: ${txId}`);
        return { success: true, poolId, signature: txId };

    } catch (error: any) {
        console.error(`   ❌ Pool creation failed:`, error.message);
        return { success: false, error: error.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PROCESS - FIXED V2
// ═══════════════════════════════════════════════════════════════════════════

async function processListedToken(
    connection: Connection,
    keeper: Keypair,
    token: { mint: string; symbol: string; opponent_mint: string | null }
): Promise<{ success: boolean; poolId?: string; error?: string }> {

    const mint = new PublicKey(token.mint);
    console.log(`\n🚀 Processing ${token.symbol} (${token.mint.slice(0, 8)}...)...`);

    // ⭐ STEP 0: Check if pool already exists on-chain
    const existingPool = await checkExistingPool(connection, mint);
    if (existingPool.exists && existingPool.poolId) {
        console.log(`🎉 Pool already exists! Updating database...`);
        const dbUpdated = await updateDatabaseWithPool(
            token.mint,
            token.symbol,
            existingPool.poolId,
            token.opponent_mint
        );
        return {
            success: dbUpdated,
            poolId: existingPool.poolId,
            error: dbUpdated ? undefined : 'Database update failed'
        };
    }

    // STEP 1: Withdraw
    const withdrawResult = await withdrawForListing(connection, keeper, mint);
    if (!withdrawResult.success) {
        return { success: false, error: `Withdraw failed: ${withdrawResult.error}` };
    }

    // If already withdrawn, check again if pool exists (might have been created)
    if (withdrawResult.alreadyWithdrawn) {
        console.log(`   🔍 Re-checking for existing pool after withdraw...`);
        const recheck = await checkExistingPool(connection, mint);
        if (recheck.exists && recheck.poolId) {
            console.log(`   🎉 Pool found on re-check! Updating database...`);
            const dbUpdated = await updateDatabaseWithPool(
                token.mint,
                token.symbol,
                recheck.poolId,
                token.opponent_mint
            );
            return {
                success: dbUpdated,
                poolId: recheck.poolId,
                error: dbUpdated ? undefined : 'Database update failed'
            };
        }
    }

    await sleep(2000);

    // STEP 2: Create Pool
    const poolResult = await createRaydiumPool(connection, keeper, mint);

    if (!poolResult.success) {
        // ⭐ One more check - pool might have been created despite error
        console.log(`   🔍 Final check for pool after error...`);
        const finalCheck = await checkExistingPool(connection, mint);
        if (finalCheck.exists && finalCheck.poolId) {
            console.log(`   🎉 Pool exists despite error! Updating database...`);
            const dbUpdated = await updateDatabaseWithPool(
                token.mint,
                token.symbol,
                finalCheck.poolId,
                token.opponent_mint
            );
            return {
                success: dbUpdated,
                poolId: finalCheck.poolId,
                error: dbUpdated ? undefined : 'Database update failed'
            };
        }

        return { success: false, error: poolResult.error };
    }

    // STEP 3: Update database
    const dbUpdated = await updateDatabaseWithPool(
        token.mint,
        token.symbol,
        poolResult.poolId!,
        token.opponent_mint
    );

    if (!dbUpdated) {
        console.error(`   ⚠️ Pool created but database update failed!`);
        console.error(`   📝 Pool ID: ${poolResult.poolId}`);
        console.error(`   📝 Please update manually if needed`);
    }

    return {
        success: true,
        poolId: poolResult.poolId,
        error: dbUpdated ? undefined : 'Pool created but DB update failed'
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
    const startTime = Date.now();
    console.log('\n🌊 ═══════════════════════════════════════════════════════');
    console.log('CRON 3: CREATE RAYDIUM POOL (V2 - with pool existence check)');
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

        console.log(`📊 Found ${listedTokens.length} Listed token(s) without pool`);

        const results: Array<{
            symbol: string;
            success: boolean;
            poolId?: string;
            error?: string;
        }> = [];

        // Process ONE token at a time to avoid timeout
        const token = listedTokens[0];

        try {
            // Verify chain status first
            const [battleStatePDA] = getBattleStatePDA(new PublicKey(token.mint));
            const account = await connection.getAccountInfo(battleStatePDA);

            if (!account) {
                console.warn(`⚠️ No battle state for ${token.symbol}`);
                results.push({ symbol: token.symbol, success: false, error: 'No battle state' });
            } else {
                const chainStatus = account.data[V1_OFFSET_BATTLE_STATUS];
                console.log(`📋 ${token.symbol} chain status: ${chainStatus}`);

                if (chainStatus === BattleStatus.PoolCreated) {
                    // Already PoolCreated on-chain, just need to sync DB
                    console.log(`⏭️ ${token.symbol}: Already PoolCreated on-chain, checking for pool...`);
                    const existingPool = await checkExistingPool(connection, new PublicKey(token.mint));
                    if (existingPool.exists && existingPool.poolId) {
                        await updateDatabaseWithPool(token.mint, token.symbol, existingPool.poolId, token.opponent_mint);
                        results.push({ symbol: token.symbol, success: true, poolId: existingPool.poolId });
                    } else {
                        await supabase.from('tokens').update({ battle_status: BattleStatus.PoolCreated }).eq('mint', token.mint);
                        results.push({ symbol: token.symbol, success: true, error: 'Status synced but no pool found' });
                    }
                } else if (chainStatus === BattleStatus.Listed) {
                    // Normal flow
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
            message: successful > 0 ? `${successful} pool(s) created!` : 'No new pools created',
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