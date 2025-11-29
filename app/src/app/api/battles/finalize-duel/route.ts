/**
 * BONK BATTLE - Finalize Duel API
 * POST /api/battles/finalize-duel
 * 
 * Finalizes a battle after victory is achieved:
 * - Winner gets 50% of loser's liquidity (minus platform fee)
 * - Winner status -> Listed (ready for Raydium)
 * - Loser status -> Qualified (can battle again)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    Keypair,
    SystemProgram,
    sendAndConfirmTransaction,
} from '@solana/web3.js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');
const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf');

// Load keeper keypair
function getKeeperKeypair(): Keypair {
    const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKeyString) {
        throw new Error('KEEPER_PRIVATE_KEY not configured');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

// Anchor discriminator for finalize_duel
// sha256("global:finalize_duel")[0..8]
const FINALIZE_DUEL_DISCRIMINATOR = Buffer.from([57, 165, 69, 195, 50, 206, 212, 134]);

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
        const { winnerMint, loserMint } = body;

        if (!winnerMint || !loserMint) {
            return NextResponse.json({
                error: 'Missing winnerMint or loserMint'
            }, { status: 400 });
        }

        let winner: PublicKey;
        let loser: PublicKey;
        try {
            winner = new PublicKey(winnerMint);
            loser = new PublicKey(loserMint);
        } catch {
            return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
        }

        console.log('\n👑 FINALIZE DUEL - WINNER TAKES ALL!');
        console.log('Winner:', winnerMint);
        console.log('Loser:', loserMint);

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const keeperKeypair = getKeeperKeypair();

        const [winnerStatePDA] = getBattleStatePDA(winner);
        const [loserStatePDA] = getBattleStatePDA(loser);

        console.log('Winner State PDA:', winnerStatePDA.toString());
        console.log('Loser State PDA:', loserStatePDA.toString());
        console.log('Keeper:', keeperKeypair.publicKey.toString());

        // Verify winner has VictoryPending status
        const winnerAccount = await connection.getAccountInfo(winnerStatePDA);
        if (!winnerAccount) {
            return NextResponse.json({
                error: 'Winner battle state not found'
            }, { status: 404 });
        }

        const winnerStatus = winnerAccount.data[90];
        if (winnerStatus !== BattleStatus.VictoryPending) {
            return NextResponse.json({
                error: 'Winner does not have VictoryPending status',
                currentStatus: winnerStatus,
                statusName: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][winnerStatus]
            }, { status: 400 });
        }

        // Verify loser has InBattle status
        const loserAccount = await connection.getAccountInfo(loserStatePDA);
        if (!loserAccount) {
            return NextResponse.json({
                error: 'Loser battle state not found'
            }, { status: 404 });
        }

        const loserStatus = loserAccount.data[90];
        if (loserStatus !== BattleStatus.InBattle) {
            return NextResponse.json({
                error: 'Loser does not have InBattle status',
                currentStatus: loserStatus,
                statusName: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][loserStatus]
            }, { status: 400 });
        }

        // Read current liquidity for logging
        const winnerSolBefore = Number(loserAccount.data.readBigUInt64LE(57)) / 1e9;
        const loserSolBefore = Number(loserAccount.data.readBigUInt64LE(57)) / 1e9;

        console.log('Winner SOL before:', winnerSolBefore.toFixed(3));
        console.log('Loser SOL before:', loserSolBefore.toFixed(3));
        console.log('Spoils (50% of loser):', (loserSolBefore / 2).toFixed(3), 'SOL');

        // Build finalize_duel instruction
        // Accounts from contract:
        // 1. winner_state (mut)
        // 2. loser_state (mut)
        // 3. treasury_wallet (mut)
        // 4. keeper_authority (signer, mut)
        // 5. system_program
        const keys = [
            { pubkey: winnerStatePDA, isSigner: false, isWritable: true },
            { pubkey: loserStatePDA, isSigner: false, isWritable: true },
            { pubkey: TREASURY_WALLET, isSigner: false, isWritable: true },
            { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        const instruction = new TransactionInstruction({
            keys,
            programId: PROGRAM_ID,
            data: FINALIZE_DUEL_DISCRIMINATOR,
        });

        // Build and send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const transaction = new Transaction({
            feePayer: keeperKeypair.publicKey,
            blockhash,
            lastValidBlockHeight,
        }).add(instruction);

        console.log('📤 Sending finalize_duel transaction...');

        try {
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [keeperKeypair],
                { commitment: 'confirmed' }
            );

            console.log('✅ Transaction confirmed:', signature);
            console.log('🔗 https://solscan.io/tx/' + signature + '?cluster=devnet');

            // Re-read states to get final values
            const updatedWinner = await connection.getAccountInfo(winnerStatePDA);
            const updatedLoser = await connection.getAccountInfo(loserStatePDA);

            if (!updatedWinner || !updatedLoser) {
                return NextResponse.json({
                    success: true,
                    message: 'Duel finalized but could not read final states',
                    signature,
                    solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                });
            }

            const winnerFinalStatus = updatedWinner.data[90];
            const loserFinalStatus = updatedLoser.data[90];
            const winnerSolAfter = Number(updatedWinner.data.readBigUInt64LE(57)) / 1e9;
            const loserSolAfter = Number(updatedLoser.data.readBigUInt64LE(57)) / 1e9;

            return NextResponse.json({
                success: true,
                message: '🎉 DUEL FINALIZED! Winner takes the spoils!',
                signature,
                solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                winner: {
                    mint: winnerMint,
                    newStatus: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][winnerFinalStatus],
                    solBefore: winnerSolBefore,
                    solAfter: winnerSolAfter,
                },
                loser: {
                    mint: loserMint,
                    newStatus: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][loserFinalStatus],
                    solBefore: loserSolBefore,
                    solAfter: loserSolAfter,
                },
                spoilsTransferred: loserSolBefore / 2,
                nextStep: 'Winner is now Listed - call withdraw_for_listing to proceed to Raydium'
            });

        } catch (txError: any) {
            console.error('Transaction error:', txError);

            const errorMessage = txError.message || String(txError);
            const logs = txError.logs || [];

            // Parse specific errors
            if (errorMessage.includes('NoVictoryAchieved')) {
                return NextResponse.json({
                    success: false,
                    error: 'Winner has not achieved victory yet',
                    logs
                }, { status: 400 });
            }

            if (errorMessage.includes('NotOpponents')) {
                return NextResponse.json({
                    success: false,
                    error: 'These tokens are not opponents in battle',
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
        console.error('Finalize duel API error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const winner = searchParams.get('winner');
    const loser = searchParams.get('loser');

    if (!winner || !loser) {
        return NextResponse.json({
            endpoint: 'finalize-duel',
            usage: 'POST with { winnerMint: "...", loserMint: "..." }',
            description: 'Finalizes a battle - winner gets 50% of loser liquidity, proceeds to listing',
            example: {
                winnerMint: 'GBZf7U9mRzxLfRiZL5hFs7Q397YCvd6C5ckW6kng1Y1',
                loserMint: 'DaFj1JYrPaGqGQx6xKho1DYEH5qeYJWK1JBm9JKa8tnN'
            }
        });
    }

    // Redirect GET to POST logic
    const response = await POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ winnerMint: winner, loserMint: loser }),
    }));

    return response;
}