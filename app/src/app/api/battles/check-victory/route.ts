/**
 * BONK BATTLE - Check Victory API (REAL EXECUTION)
 * POST /api/battles/check-victory
 * 
 * Actually executes check_victory_conditions on-chain
 * This can be called by anyone - no keeper required for check
 * 
 * ⚠️ FIXED: Uses V1 struct offsets matching deployed contract
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    Keypair,
    sendAndConfirmTransaction,
} from '@solana/web3.js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// ═══════════════════════════════════════════════════════════════════════════
// V1 STRUCT OFFSETS (DEPLOYED CONTRACT)
// ═══════════════════════════════════════════════════════════════════════════
// pub struct TokenBattleState {
//     // discriminator: 8 bytes (0-8)
//     pub mint: Pubkey,                    // 32 bytes (8-40)
//     pub sol_collected: u64,              // 8 bytes  (40-48)
//     pub tokens_sold: u64,                // 8 bytes  (48-56)
//     pub total_trade_volume: u64,         // 8 bytes  (56-64)
//     pub is_active: bool,                 // 1 byte   (64)
//     pub battle_status: BattleStatus,     // 1 byte   (65) ← KEY!
//     pub opponent_mint: Pubkey,           // 32 bytes (66-98)
//     pub creation_timestamp: i64,         // 8 bytes  (98-106)
//     pub last_trade_timestamp: i64,       // 8 bytes  (106-114)
//     pub battle_start_timestamp: i64,     // 8 bytes  (114-122)
//     pub victory_timestamp: i64,          // 8 bytes  (122-130)
//     pub listing_timestamp: i64,          // 8 bytes  (130-138)
//     pub bump: u8,                        // 1 byte   (138)
//     pub name: String,                    // 4 + N bytes
//     pub symbol: String,
//     pub uri: String,
// }
// ═══════════════════════════════════════════════════════════════════════════

const V1_OFFSET_SOL_COLLECTED = 40;
const V1_OFFSET_TOKENS_SOLD = 48;
const V1_OFFSET_TOTAL_VOLUME = 56;
const V1_OFFSET_IS_ACTIVE = 64;
const V1_OFFSET_BATTLE_STATUS = 65;
const V1_OFFSET_OPPONENT_MINT = 66;
const V1_OFFSET_VICTORY_TIMESTAMP = 122;

// Load keeper for paying fees (check_victory doesn't require keeper auth, just needs a fee payer)
function getKeeperKeypair(): Keypair {
    const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKeyString) {
        throw new Error('KEEPER_PRIVATE_KEY not configured');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

// Anchor discriminator for check_victory_conditions
// Generated from: sha256("global:check_victory_conditions")[0..8]
const CHECK_VICTORY_DISCRIMINATOR = Buffer.from([176, 199, 31, 103, 154, 28, 170, 98]);

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('battle_state'), mint.toBuffer()],
        PROGRAM_ID
    );
}

function getPriceOraclePDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('price_oracle')],
        PROGRAM_ID
    );
}

// Battle status enum
const BATTLE_STATUS_NAMES = ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'Defeated'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tokenMint } = body;

        if (!tokenMint) {
            return NextResponse.json({ error: 'Missing tokenMint' }, { status: 400 });
        }

        let mint: PublicKey;
        try {
            mint = new PublicKey(tokenMint);
        } catch {
            return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
        }

        console.log('\n🏆 CHECK VICTORY CONDITIONS (V1)');
        console.log('Token:', tokenMint);

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const keeperKeypair = getKeeperKeypair();

        const [battleStatePDA] = getBattleStatePDA(mint);
        const [priceOraclePDA] = getPriceOraclePDA();

        console.log('Battle State PDA:', battleStatePDA.toString());
        console.log('Price Oracle PDA:', priceOraclePDA.toString());
        console.log('Fee Payer:', keeperKeypair.publicKey.toString());

        // First, read current state to show progress
        const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
        if (!battleStateAccount) {
            return NextResponse.json({
                error: 'Token battle state not found',
                mint: tokenMint
            }, { status: 404 });
        }

        // ⭐ Parse battle status with V1 offset
        const battleStatus = battleStateAccount.data[V1_OFFSET_BATTLE_STATUS];
        console.log('Current battle_status:', battleStatus, `(${BATTLE_STATUS_NAMES[battleStatus] || 'Unknown'})`);

        if (battleStatus !== 2) { // InBattle = 2
            return NextResponse.json({
                success: false,
                error: 'Token is not in battle',
                currentStatus: battleStatus,
                statusName: BATTLE_STATUS_NAMES[battleStatus] || 'Unknown',
                hint: battleStatus === 1 ? 'Token is Qualified but not in battle yet. Use Find Opponent first.' :
                    battleStatus === 3 ? 'Victory already pending! Call finalize_duel.' :
                        battleStatus === 4 ? 'Token already Listed!' : undefined
            }, { status: 400 });
        }

        // ⭐ Parse current values with V1 offsets
        const solCollected = Number(battleStateAccount.data.readBigUInt64LE(V1_OFFSET_SOL_COLLECTED)) / 1e9;
        const totalVolume = Number(battleStateAccount.data.readBigUInt64LE(V1_OFFSET_TOTAL_VOLUME)) / 1e9;

        console.log('SOL Collected:', solCollected.toFixed(4), 'SOL');
        console.log('Total Volume:', totalVolume.toFixed(4), 'SOL');

        // Victory conditions (from contract)
        const TARGET_SOL = 6; // TEST tier
        const VICTORY_VOLUME_SOL = 6.6; // TEST tier (110% of target)

        console.log('Target SOL:', TARGET_SOL);
        console.log('Victory Volume:', VICTORY_VOLUME_SOL);
        console.log('SOL Progress:', ((solCollected / TARGET_SOL) * 100).toFixed(1) + '%');
        console.log('Volume Progress:', ((totalVolume / VICTORY_VOLUME_SOL) * 100).toFixed(1) + '%');

        // Build check_victory_conditions instruction
        // Accounts: [token_battle_state (mut), price_oracle]
        const keys = [
            { pubkey: battleStatePDA, isSigner: false, isWritable: true },
            { pubkey: priceOraclePDA, isSigner: false, isWritable: false },
        ];

        const instruction = new TransactionInstruction({
            keys,
            programId: PROGRAM_ID,
            data: CHECK_VICTORY_DISCRIMINATOR,
        });

        // Build and send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const transaction = new Transaction({
            feePayer: keeperKeypair.publicKey,
            blockhash,
            lastValidBlockHeight,
        }).add(instruction);

        console.log('📤 Sending check_victory_conditions transaction...');

        try {
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [keeperKeypair],
                { commitment: 'confirmed' }
            );

            console.log('✅ Transaction confirmed:', signature);
            console.log('🔗 https://solscan.io/tx/' + signature + '?cluster=devnet');

            // Re-read state to check if victory was achieved
            const updatedAccount = await connection.getAccountInfo(battleStatePDA);
            if (!updatedAccount) {
                return NextResponse.json({ error: 'Could not re-read state' }, { status: 500 });
            }

            // ⭐ Use V1 offset for updated status
            const newBattleStatus = updatedAccount.data[V1_OFFSET_BATTLE_STATUS];
            const victory = newBattleStatus === 3; // VictoryPending = 3

            if (victory) {
                // Read victory timestamp with V1 offset
                const victoryTimestamp = Number(updatedAccount.data.readBigInt64LE(V1_OFFSET_VICTORY_TIMESTAMP));

                console.log('🏆 VICTORY ACHIEVED!');

                return NextResponse.json({
                    success: true,
                    victory: true,
                    message: '🏆 VICTORY ACHIEVED!',
                    signature,
                    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                    newStatus: 'VictoryPending',
                    victoryTimestamp,
                    stats: {
                        solCollected,
                        totalVolumeSol: totalVolume,
                        targetSol: TARGET_SOL,
                        victoryVolumeSol: VICTORY_VOLUME_SOL,
                    },
                    nextStep: 'Call finalize_duel to claim spoils and proceed to listing'
                });
            } else {
                console.log('⚔️ Battle continues - conditions not met');

                return NextResponse.json({
                    success: true,
                    victory: false,
                    message: 'Battle continues - victory conditions not yet met',
                    signature,
                    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                    currentStatus: BATTLE_STATUS_NAMES[newBattleStatus] || 'Unknown',
                    stats: {
                        solCollected,
                        totalVolumeSol: totalVolume,
                        targetSol: TARGET_SOL,
                        victoryVolumeSol: VICTORY_VOLUME_SOL,
                        solProgress: ((solCollected / TARGET_SOL) * 100).toFixed(1) + '%',
                        volumeProgress: ((totalVolume / VICTORY_VOLUME_SOL) * 100).toFixed(1) + '%',
                    },
                    requirements: {
                        needMoreSol: solCollected < TARGET_SOL ? (TARGET_SOL - solCollected).toFixed(4) + ' SOL' : 'Met ✅',
                        needMoreVolume: totalVolume < VICTORY_VOLUME_SOL ? (VICTORY_VOLUME_SOL - totalVolume).toFixed(4) + ' SOL' : 'Met ✅',
                    }
                });
            }

        } catch (txError: any) {
            console.error('Transaction error:', txError);

            // Parse error for useful info
            const errorMessage = txError.message || String(txError);
            const logs = txError.logs || [];

            // Check for specific errors
            if (errorMessage.includes('NotInBattle') || errorMessage.includes('0x1780')) {
                return NextResponse.json({
                    success: false,
                    error: 'Token is not in battle',
                    logs
                }, { status: 400 });
            }

            return NextResponse.json({
                success: false,
                error: 'Transaction failed',
                details: errorMessage,
                logs
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Check victory API error:', error);
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
            endpoint: 'check-victory',
            usage: 'POST with { tokenMint: "..." } or GET with ?mint=...',
            description: 'Executes check_victory_conditions on-chain to verify if victory achieved',
            v1Note: 'Uses V1 struct offsets matching deployed contract',
        });
    }

    // Redirect GET to POST logic
    const response = await POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ tokenMint: mint }),
    }));

    return response;
}