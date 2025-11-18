import { Connection, PublicKey } from '@solana/web3.js';
import { PrismaClient } from '@prisma/client';
import { parseTokenLaunchAccount, parseBuyerRecordAccount, parseStatus, TokenLaunchAccount, BuyerRecordAccount } from '@/lib/blockchain/parser';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';

const prisma = new PrismaClient();

export class BlockchainListener {
    private connection: Connection;
    private programId: PublicKey;
    private subscriptionIds: number[] = [];

    constructor() {
        this.connection = new Connection(RPC_ENDPOINT, {
            commitment: 'confirmed',
            wsEndpoint: RPC_ENDPOINT.replace('https', 'wss'),
        });
        this.programId = new PublicKey(PROGRAM_ID);
    }

    async start() {
        console.log('🚀 Starting blockchain listener...');
        console.log('📡 RPC:', RPC_ENDPOINT);
        console.log('🔗 Program ID:', PROGRAM_ID);

        // Listen to all program accounts
        await this.listenToProgramAccounts();

        // Initial sync of existing accounts
        await this.syncExistingAccounts();

        console.log('✅ Blockchain listener started!');
    }

    async listenToProgramAccounts() {
        const subscriptionId = this.connection.onProgramAccountChange(
            this.programId,
            async (accountInfo, context) => {
                console.log('📬 Account changed:', context.slot);

                try {
                    // Try parsing as TokenLaunch
                    const launch = parseTokenLaunchAccount(accountInfo.accountInfo);
                    if (launch) {
                        await this.handleTokenLaunchUpdate(accountInfo.accountId, launch);
                        return;
                    }

                    // Try parsing as BuyerRecord
                    const buyer = parseBuyerRecordAccount(accountInfo.accountInfo);
                    if (buyer) {
                        await this.handleBuyerRecordUpdate(accountInfo.accountId, buyer);
                        return;
                    }

                    console.log('⚠️ Unknown account type');
                } catch (error) {
                    console.error('Error processing account change:', error);
                }
            },
            'confirmed'
        );

        this.subscriptionIds.push(subscriptionId);
        console.log('👂 Listening to program account changes...');
    }

    async syncExistingAccounts() {
        console.log('🔄 Syncing existing accounts...');

        try {
            const accounts = await this.connection.getProgramAccounts(this.programId);
            console.log(`📦 Found ${accounts.length} accounts`);

            for (const account of accounts) {
                // Try parsing as TokenLaunch
                const launch = parseTokenLaunchAccount(account.account);
                if (launch) {
                    await this.handleTokenLaunchUpdate(account.pubkey, launch);
                    continue;
                }

                // Try parsing as BuyerRecord
                const buyer = parseBuyerRecordAccount(account.account);
                if (buyer) {
                    await this.handleBuyerRecordUpdate(account.pubkey, buyer);
                    continue;
                }
            }

            console.log('✅ Sync completed!');
        } catch (error) {
            console.error('❌ Error syncing accounts:', error);
        }
    }

    async handleTokenLaunchUpdate(pubkey: PublicKey, launch: TokenLaunchAccount) {
        console.log('🪙 Token Launch update:', pubkey.toString());

        try {
            const status = parseStatus(launch.status);
            const deadline = new Date(Number(launch.deadline) * 1000);

            // Upsert in database
            await prisma.launch.upsert({
                where: { mintAddress: launch.mint.toString() },
                create: {
                    mintAddress: launch.mint.toString(),
                    creatorAddress: launch.creator.toString(),
                    name: 'Unknown', // Will be updated from metadata
                    symbol: 'UNKNOWN',
                    tier: launch.tier,
                    targetMarketcap: Number(launch.targetSol),
                    deadline: deadline,
                    status: status,
                    solRaised: Number(launch.solRaised),
                    totalBuyers: launch.totalBuyers,
                    totalTokensSold: Number(launch.totalTokensSold),
                },
                update: {
                    status: status,
                    solRaised: Number(launch.solRaised),
                    totalBuyers: launch.totalBuyers,
                    totalTokensSold: Number(launch.totalTokensSold),
                    updatedAt: new Date(),
                },
            });

            console.log('✅ Token launch saved to database');
        } catch (error) {
            console.error('❌ Error saving token launch:', error);
        }
    }

    async handleBuyerRecordUpdate(pubkey: PublicKey, buyer: BuyerRecordAccount) {
        console.log('💰 Buyer Record update:', pubkey.toString());

        try {
            // Create transaction record
            await prisma.transaction.create({
                data: {
                    signature: pubkey.toString(), // Using pubkey as signature for now
                    launchId: buyer.launch.toString(),
                    buyerAddress: buyer.buyer.toString(),
                    type: 'buy',
                    solAmount: Number(buyer.solSpent),
                    tokensAmount: Number(buyer.tokensReceived),
                    timestamp: new Date(Number(buyer.lastBuyTimestamp) * 1000),
                    blockTime: new Date(Number(buyer.lastBuyTimestamp) * 1000),
                },
            });

            // Update holder record
            await prisma.holder.upsert({
                where: {
                    launchId_walletAddress: {
                        launchId: buyer.launch.toString(),
                        walletAddress: buyer.buyer.toString(),
                    },
                },
                create: {
                    launchId: buyer.launch.toString(),
                    walletAddress: buyer.buyer.toString(),
                    tokensHeld: Number(buyer.tokensReceived),
                    solSpent: Number(buyer.solSpent),
                    firstBuyAt: new Date(Number(buyer.firstBuyTimestamp) * 1000),
                    lastBuyAt: new Date(Number(buyer.lastBuyTimestamp) * 1000),
                },
                update: {
                    tokensHeld: { increment: Number(buyer.tokensReceived) },
                    solSpent: { increment: Number(buyer.solSpent) },
                    lastBuyAt: new Date(Number(buyer.lastBuyTimestamp) * 1000),
                },
            });

            console.log('✅ Buyer record saved to database');
        } catch (error) {
            console.error('❌ Error saving buyer record:', error);
        }
    }

    async stop() {
        console.log('🛑 Stopping blockchain listener...');

        for (const id of this.subscriptionIds) {
            await this.connection.removeProgramAccountChangeListener(id);
        }

        await prisma.$disconnect();
        console.log('✅ Listener stopped');
    }
}

// Main function per avviare il listener
export async function startListener() {
    const listener = new BlockchainListener();

    await listener.start();

    // Graceful shutdown
    process.on('SIGINT', async () => {
        await listener.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await listener.stop();
        process.exit(0);
    });

    return listener;
}