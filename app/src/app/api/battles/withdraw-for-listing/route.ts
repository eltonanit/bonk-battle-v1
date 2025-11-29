/**
 * BONK BATTLE - Withdraw For Listing API
 * POST /api/battles/withdraw-for-listing
 * 
 * Withdraws SOL and reserved tokens from a Listed token
 * for creating Raydium liquidity pool.
 * 
 * This transfers:
 * - All SOL from the battle state to keeper
 * - 206.9M reserved tokens to keeper
 * 
 * Keeper then uses these to create Raydium pool manually.
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
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

// Load keeper keypair
function getKeeperKeypair(): Keypair {
    const privateKeyString = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKeyString) {
        throw new Error('KEEPER_PRIVATE_KEY not configured');
    }
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

// Anchor discriminator for withdraw_for_listing
// sha256("global:withdraw_for_listing")[0..8]
const WITHDRAW_FOR_LISTING_DISCRIMINATOR = Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]);

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
        const { tokenMint } = body;

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

        console.log('\n📤 WITHDRAW FOR LISTING');
        console.log('Token:', tokenMint);

        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const keeperKeypair = getKeeperKeypair();

        const [battleStatePDA] = getBattleStatePDA(mint);

        console.log('Battle State PDA:', battleStatePDA.toString());
        console.log('Keeper:', keeperKeypair.publicKey.toString());

        // Verify token has Listed status
        const battleStateAccount = await connection.getAccountInfo(battleStatePDA);
        if (!battleStateAccount) {
            return NextResponse.json({
                error: 'Battle state not found'
            }, { status: 404 });
        }

        const battleStatus = battleStateAccount.data[90];
        if (battleStatus !== BattleStatus.Listed) {
            return NextResponse.json({
                error: 'Token is not in Listed status',
                currentStatus: battleStatus,
                statusName: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][battleStatus],
                hint: 'Token must win a battle and be finalized before withdrawal'
            }, { status: 400 });
        }

        // Get current SOL in battle state
        const solInAccount = battleStateAccount.lamports / 1e9;
        console.log('SOL in battle state:', solInAccount.toFixed(4), 'SOL');

        // Get contract token account (holds the reserved tokens)
        const contractTokenAccount = getAssociatedTokenAddressSync(
            mint,
            battleStatePDA,
            true, // allowOwnerOffCurve
            TOKEN_PROGRAM_ID
        );
        console.log('Contract Token Account:', contractTokenAccount.toString());

        // Get or create keeper token account
        const keeperTokenAccount = getAssociatedTokenAddressSync(
            mint,
            keeperKeypair.publicKey,
            false,
            TOKEN_PROGRAM_ID
        );
        console.log('Keeper Token Account:', keeperTokenAccount.toString());

        // Check if keeper token account exists
        const keeperTokenAccountInfo = await connection.getAccountInfo(keeperTokenAccount);

        const instructions: TransactionInstruction[] = [];

        // Create keeper token account if needed
        if (!keeperTokenAccountInfo) {
            console.log('Creating keeper token account...');
            const createATAIx = createAssociatedTokenAccountInstruction(
                keeperKeypair.publicKey,
                keeperTokenAccount,
                keeperKeypair.publicKey,
                mint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            instructions.push(createATAIx);
        }

        // Build withdraw_for_listing instruction
        // Accounts from contract:
        // 1. token_battle_state (mut)
        // 2. mint (mut)
        // 3. contract_token_account (mut)
        // 4. keeper_token_account (mut)
        // 5. keeper_authority (signer, mut)
        // 6. system_program
        // 7. token_program
        // 8. associated_token_program
        const withdrawIx = new TransactionInstruction({
            keys: [
                { pubkey: battleStatePDA, isSigner: false, isWritable: true },
                { pubkey: mint, isSigner: false, isWritable: true },
                { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
                { pubkey: keeperTokenAccount, isSigner: false, isWritable: true },
                { pubkey: keeperKeypair.publicKey, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            programId: PROGRAM_ID,
            data: WITHDRAW_FOR_LISTING_DISCRIMINATOR,
        });
        instructions.push(withdrawIx);

        // Build and send transaction
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

        const transaction = new Transaction({
            feePayer: keeperKeypair.publicKey,
            blockhash,
            lastValidBlockHeight,
        }).add(...instructions);

        console.log('📤 Sending withdraw_for_listing transaction...');

        try {
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [keeperKeypair],
                { commitment: 'confirmed' }
            );

            console.log('✅ Transaction confirmed:', signature);
            console.log('🔗 https://solscan.io/tx/' + signature + '?cluster=devnet');

            // Re-read state
            const updatedAccount = await connection.getAccountInfo(battleStatePDA);
            const newStatus = updatedAccount ? updatedAccount.data[90] : -1;

            return NextResponse.json({
                success: true,
                message: '🚀 WITHDRAWAL COMPLETE! Ready for Raydium listing!',
                signature,
                solscanUrl: `https://solscan.io/tx/${signature}?cluster=devnet`,
                withdrawn: {
                    sol: solInAccount,
                    tokens: '206,900,000 (reserved for Raydium)',
                },
                newStatus: ['Created', 'Qualified', 'InBattle', 'VictoryPending', 'Listed', 'PoolCreated'][newStatus] || 'Unknown',
                nextStep: 'Use withdrawn SOL and tokens to create Raydium liquidity pool'
            });

        } catch (txError: any) {
            console.error('Transaction error:', txError);

            const errorMessage = txError.message || String(txError);
            const logs = txError.logs || [];

            // Parse specific errors
            if (errorMessage.includes('NotReadyForListing')) {
                return NextResponse.json({
                    success: false,
                    error: 'Token is not ready for listing',
                    logs
                }, { status: 400 });
            }

            if (errorMessage.includes('NoLiquidityToWithdraw')) {
                return NextResponse.json({
                    success: false,
                    error: 'No liquidity available to withdraw',
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
        console.error('Withdraw for listing API error:', error);
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
            endpoint: 'withdraw-for-listing',
            usage: 'POST with { tokenMint: "..." }',
            description: 'Withdraws SOL and reserved tokens from a Listed token for Raydium pool creation',
            requirements: 'Token must be in Listed status (won a battle and finalized)',
            example: {
                tokenMint: 'GBZf7U9mRzxLfRiZL5hFs7Q397YCvd6C5ckW6kng1Y1'
            }
        });
    }

    // Redirect GET to POST logic
    const response = await POST(new NextRequest(request.url, {
        method: 'POST',
        body: JSON.stringify({ tokenMint: mint }),
    }));

    return response;
}