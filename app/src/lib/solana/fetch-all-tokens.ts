import { Connection, PublicKey } from '@solana/web3.js';
import { BONK_BATTLE_PROGRAM_ID, RPC_ENDPOINT } from './constants';
import { BattleStatus } from './constants';

export interface TokenLaunchData {
  pubkey: PublicKey;
  creator: PublicKey;    // ⬅️ AGGIUNTO
  mint: PublicKey;
  name: string;
  symbol: string;
  tier: number;
  solRaised: number;
  targetSol: number;
  virtualSolInit: number;
  timeRemaining: number;
  progress: number;
  totalBuyers: number;
  metadataUri: string;
  imageUrl?: string;     // ⬅️ AGGIUNTO (opzionale, dalla metadata)
  createdAt: number;
  status: number;
}

export async function fetchAllTokens(): Promise<TokenLaunchData[]> {
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FETCHING ALL BONK BATTLE TOKENS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Program ID:', BONK_BATTLE_PROGRAM_ID.toString());

    // ⭐ Get all TokenBattleState accounts (NO dataSize filter to find all accounts)
    const accounts = await connection.getProgramAccounts(
      BONK_BATTLE_PROGRAM_ID
    );

    console.log(`📊 FOUND: ${accounts.length} total accounts from program`);

    // Debug: show account sizes
    if (accounts.length > 0) {
      console.log(`📏 Account sizes found:`);
      const sizes = new Set(accounts.map(a => a.account.data.length));
      sizes.forEach(size => {
        const count = accounts.filter(a => a.account.data.length === size).length;
        console.log(`   - ${size} bytes: ${count} account(s)`);
      });
    }

    const tokens: TokenLaunchData[] = [];

    // TokenBattleState discriminator from IDL: [54, 102, 185, 22, 231, 3, 228, 117]
    const TOKEN_BATTLE_STATE_DISCRIMINATOR = Buffer.from([54, 102, 185, 22, 231, 3, 228, 117]);

    for (const { pubkey, account } of accounts) {
      try {
        const data = account.data;

        // Check if this is a TokenBattleState account by discriminator
        const accountDiscriminator = data.slice(0, 8);
        if (!accountDiscriminator.equals(TOKEN_BATTLE_STATE_DISCRIMINATOR)) {
          console.log(`⏭️  Skipping account ${pubkey.toString()} - not a TokenBattleState (size: ${data.length} bytes)`);
          continue;
        }

        let offset = 8; // Skip discriminator

        // Parse TokenBattleState (208 bytes)
        const mint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const solCollected = Number(data.readBigUInt64LE(offset)) / 1e9;
        offset += 8;

        const tokensSold = Number(data.readBigUInt64LE(offset)) / 1e6;
        offset += 8;

        const totalTradeVolume = Number(data.readBigUInt64LE(offset)) / 1e9;
        offset += 8;

        const isActive = data[offset] !== 0;
        offset += 1;

        const battleStatusRaw = data[offset];
        offset += 1;

        const opponentMint = new PublicKey(data.slice(offset, offset + 32));
        offset += 32;

        const creationTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8;

        const qualificationTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8;

        const battleStartTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8;

        const battleEndTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8;

        const listingTimestamp = Number(data.readBigInt64LE(offset));
        offset += 8;

        const bump = data[offset];

        // ⭐ For now, create fake data to match old interface
        // TODO: Fetch token metadata from mint address
        tokens.push({
          pubkey,
          creator: PublicKey.default, // TODO: Get from token metadata
          mint,
          name: mint.toString().slice(0, 8), // Temp: use mint prefix
          symbol: 'TKN', // Temp
          tier: 1, // Temp
          solRaised: solCollected,
          targetSol: 1, // Temp
          virtualSolInit: 30,
          timeRemaining: 0, // Temp
          progress: Math.min((solCollected / 1) * 100, 100),
          totalBuyers: 0, // Temp
          metadataUri: '', // Temp
          imageUrl: undefined,
          createdAt: creationTimestamp,
          status: battleStatusRaw,
        });

        console.log(`✅ Loaded token: ${mint.toString()}`);
      } catch (error) {
        console.error('❌ Error parsing token:', pubkey.toString(), error);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   Total tokens loaded: ${tokens.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return tokens;
  } catch (error) {
    console.error('❌ Error fetching tokens:', error);
    return [];
  }
}

export async function fetchTrendingTokens(limit = 10): Promise<TokenLaunchData[]> {
  const all = await fetchAllTokens();

  // Sort by solRaised (descending)
  const sorted = all.sort((a, b) => b.solRaised - a.solRaised);

  return sorted.slice(0, limit);
}