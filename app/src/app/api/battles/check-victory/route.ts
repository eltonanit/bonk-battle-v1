/**
 * BONK BATTLE - Check Victory API
 * POST /api/battles/check-victory
 * 
 * Checks if a token has achieved victory conditions during battle
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// Anchor discriminator for check_victory_conditions
const CHECK_VICTORY_DISCRIMINATOR = Buffer.from([142, 50, 101, 186, 241, 85, 9, 63]);

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

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');

        const [battleStatePDA] = getBattleStatePDA(mint);
        const [priceOraclePDA] = getPriceOraclePDA();

        console.log('🔍 Checking victory for:', tokenMint);
        console.log('Battle State PDA:', battleStatePDA.toString());
        console.log('Price Oracle PDA:', priceOraclePDA.toString());

        // Build check_victory_conditions instruction
        // This is a read-only operation that anyone can call
        const keys = [
            { pubkey: battleStatePDA, isSigner: false, isWritable: true },
            { pubkey: priceOraclePDA, isSigner: false, isWritable: false },
        ];

        const instruction = new TransactionInstruction({
            keys,
            programId: PROGRAM_ID,
            data: CHECK_VICTORY_DISCRIMINATOR,
        });

        // Simulate the transaction to see the result
        const { blockhash } = await connection.getLatestBlockhash();

        const transaction = new Transaction({
            feePayer: battleStatePDA, // Will fail but we just want to simulate
            blockhash,
            lastValidBlockHeight: 0,
        }).add(instruction);

        try {
            const simulation = await connection.simulateTransaction(transaction);

            console.log('Simulation logs:', simulation.value.logs);

            // Parse logs to determine victory status
            const logs = simulation.value.logs || [];
            const victoryLog = logs.find(log => log.includes('VICTORY'));
            const continueLog = logs.find(log => log.includes('Battle continues'));

            if (victoryLog) {
                return NextResponse.json({
                    success: true,
                    victory: true,
                    message: 'Victory conditions met!',
                    logs: logs,
                });
            } else if (continueLog) {
                // Extract progress from logs
                const progressMatch = continueLog.match(/MC: \$(\d+)\/(\d+) \| Volume: \$(\d+)\/(\d+)/);

                return NextResponse.json({
                    success: true,
                    victory: false,
                    message: 'Battle continues - victory conditions not met yet',
                    progress: progressMatch ? {
                        currentMC: parseInt(progressMatch[1]),
                        targetMC: parseInt(progressMatch[2]),
                        currentVolume: parseInt(progressMatch[3]),
                        targetVolume: parseInt(progressMatch[4]),
                    } : null,
                    logs: logs,
                });
            }

            return NextResponse.json({
                success: true,
                victory: false,
                message: 'Could not determine victory status',
                logs: logs,
            });

        } catch (simError) {
            console.error('Simulation error:', simError);

            // Even if simulation fails, we can check the error for clues
            const errorMessage = simError instanceof Error ? simError.message : String(simError);

            return NextResponse.json({
                success: false,
                error: 'Simulation failed',
                details: errorMessage,
            });
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
            description: 'Checks if a token has achieved victory conditions',
        });
    }

    // Redirect GET to POST logic
    const response = await POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ tokenMint: mint }),
    }));

    return response;
}