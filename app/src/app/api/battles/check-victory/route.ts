/**
 * BONK BATTLE - Check Victory API (REAL EXECUTION)
 * POST /api/battles/check-victory
 * 
 * Actually executes check_victory_conditions on-chain
 * This can be called by anyone - no keeper required for check
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

        console.log('\n🏆 CHECK VICTORY CONDITIONS');
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

        // Parse battle status (offset 90 for V2)
        const battleStatus = battleStateAccount.data[90];
        console.log('Current battle_status:', battleStatus);

        if (battleStatus !== 2) { // InBattle = 2
            return NextResponse.json({
                success: false,
                error: 'Token is not in battle',
                currentStatus: battleStatus,
                statusName: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][battleStatus] || 'Unknown'
            }, { status: 400 });
        }

        // Parse current values for logging
        const virtualSolReserves = Number(battleStateAccount.data.readBigUInt64LE(41)) / 1e9;
        const totalVolume = Number(battleStateAccount.data.readBigUInt64LE(81)) / 1e9;

        console.log('Virtual SOL:', virtualSolReserves.toFixed(3), 'SOL');
        console.log('Total Volume:', totalVolume.toFixed(3), 'SOL');

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

            const newBattleStatus = updatedAccount.data[90];
            const victory = newBattleStatus === 3; // VictoryPending = 3

            if (victory) {
                // Read victory timestamp
                const victoryTimestamp = Number(updatedAccount.data.readBigInt64LE(155));

                return NextResponse.json({
                    success: true,
                    victory: true,
                    message: '🏆 VICTORY ACHIEVED!',
                    signature,
                    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                    newStatus: 'VictoryPending',
                    victoryTimestamp,
                    nextStep: 'Call finalize_duel to claim spoils and proceed to listing'
                });
            } else {
                return NextResponse.json({
                    success: true,
                    victory: false,
                    message: 'Battle continues - victory conditions not yet met',
                    signature,
                    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                    currentStatus: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][newBattleStatus],
                    stats: {
                        virtualSolReserves,
                        totalVolumeSol: totalVolume,
                    }
                });
            }

        } catch (txError: any) {
            console.error('Transaction error:', txError);

            // Parse error for useful info
            const errorMessage = txError.message || String(txError);
            const logs = txError.logs || [];

            // Check for specific errors
            if (errorMessage.includes('NotInBattle')) {
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
        });
    }

    // Redirect GET to POST logic
    const response = await POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ tokenMint: mint }),
    }));

    return response;
}