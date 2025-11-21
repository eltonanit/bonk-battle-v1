import { Connection, PublicKey } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  imageUrl?: string;
  description?: string;
}

export async function fetchTokenMetadata(
  connection: Connection,
  mintAddress: PublicKey
): Promise<TokenMetadata | null> {
  try {
    const metaplex = new Metaplex(connection);

    // Fetch NFT metadata
    const nft = await metaplex.nfts().findByMint({ mintAddress });

    // Parse URI JSON if available
    let imageUrl: string | undefined;
    let description: string | undefined;

    if (nft.uri) {
      try {
        const uriData = JSON.parse(nft.uri);
        imageUrl = uriData.image;
        description = uriData.description;
      } catch {
        // URI is not JSON, might be a URL
        // Try fetching it
        try {
          const res = await fetch(nft.uri);
          const json = await res.json();
          imageUrl = json.image;
          description = json.description;
        } catch {
          console.warn(`Could not parse metadata URI for ${mintAddress.toString()}`);
        }
      }
    }

    return {
      name: nft.name,
      symbol: nft.symbol,
      uri: nft.uri,
      imageUrl,
      description,
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${mintAddress.toString()}:`, error);
    return null;
  }
}
