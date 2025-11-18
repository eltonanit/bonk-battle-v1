import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';
import { deserializeTokenLaunch } from './deserialize';

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
    console.log('📊 FETCHING ALL TOKENS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Program ID:', PROGRAM_ID);

    // ⭐ FIX: Remove dataSize filter to find BOTH v1 (443) and v2 (439)
    const accounts = await connection.getProgramAccounts(
      new PublicKey(PROGRAM_ID),
      {
        // NO FILTERS! Get all accounts from this program
      }
    );

    console.log(`📊 FOUND: ${accounts.length} total accounts`);

    const tokens: TokenLaunchData[] = [];
    let v1Count = 0;
    let v2Count = 0;
    let skippedCount = 0;

    for (const { pubkey, account } of accounts) {
      try {
        const size = account.data.length;

        // ⭐ Validate it's a TokenLaunch (not BuyerRecord or other)
        if (size !== 439 && size !== 443) {
          // Skip non-TokenLaunch accounts (BuyerRecord = 106 bytes, etc.)
          skippedCount++;
          continue;
        }

        // Count versions
        if (size === 443) v1Count++;
        if (size === 439) v2Count++;

        // ⭐ Deserialize using the version-aware deserializer
        const tokenLaunch = deserializeTokenLaunch(account.data, pubkey);

        if (!tokenLaunch) {
          console.warn(`⚠️ Failed to deserialize: ${pubkey.toString()}`);
          continue;
        }

        const progress = (tokenLaunch.solRaised / tokenLaunch.targetSol) * 100;

        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = Math.max(0, tokenLaunch.deadline - now);

        // ⭐ Parse metadata per imageUrl
        let imageUrl: string | undefined;
        try {
          if (tokenLaunch.metadataUri) {
            // ✅ Il metadataUri è GIÀ il JSON, non un URL!
            // Prova a parsarlo direttamente
            try {
              const metadata = JSON.parse(tokenLaunch.metadataUri);
              imageUrl = metadata.image || metadata.imageUrl;
            } catch {
              // Se non è JSON valido, prova a fetchare (potrebbe essere un URL)
              const metadataResponse = await fetch(tokenLaunch.metadataUri);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                imageUrl = metadata.image || metadata.imageUrl;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not parse metadata for ${tokenLaunch.name}`);
        }

        tokens.push({
          pubkey: new PublicKey(tokenLaunch.pubkey),
          creator: new PublicKey(tokenLaunch.creator),  // ⬅️ AGGIUNTO
          mint: new PublicKey(tokenLaunch.mint),
          name: tokenLaunch.name,
          symbol: tokenLaunch.symbol,
          tier: tokenLaunch.tier,
          solRaised: tokenLaunch.solRaised,
          targetSol: tokenLaunch.targetSol,
          virtualSolInit: tokenLaunch.virtualSolInit,
          timeRemaining,
          progress: Math.min(progress, 100),
          totalBuyers: tokenLaunch.totalBuyers,
          metadataUri: tokenLaunch.metadataUri,
          imageUrl,  // ⬅️ AGGIUNTO
          createdAt: tokenLaunch.createdAt,
          status: tokenLaunch.status,
        });

        console.log(`✅ Loaded: ${tokenLaunch.name} ($${tokenLaunch.symbol}) - v${size === 443 ? '1' : '2'}`);
      } catch (error) {
        console.error('❌ Error deserializing token:', pubkey.toString(), error);
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   V1 tokens (443 bytes): ${v1Count}`);
    console.log(`   V2 tokens (439 bytes): ${v2Count}`);
    console.log(`   Total loaded: ${tokens.length}`);
    console.log(`   Skipped (other accounts): ${skippedCount}`);
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