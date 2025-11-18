/**
 * EXAMPLE USAGE: createBattleToken()
 *
 * This file demonstrates how to use the createBattleToken function
 * in a React component with Solana wallet adapter.
 */

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { createBattleToken } from './create-battle-token';
import { useState } from 'react';

export function CreateTokenExample() {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleCreateToken = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Token metadata
      const name = 'My Battle Token';
      const symbol = 'BATTLE';
      const uri = 'https://arweave.net/your-metadata-json';

      console.log('Creating battle token...');

      // Call createBattleToken
      const result = await createBattleToken(
        publicKey,
        name,
        symbol,
        uri,
        signTransaction
      );

      console.log('Success!', result);
      setResult(result);

      // You can now use result.mint, result.signature, result.battleState
      // For example, navigate to token page:
      // router.push(`/token/${result.mint.toString()}`);

    } catch (err) {
      console.error('Error creating token:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCreateToken}
        disabled={!publicKey || loading}
      >
        {loading ? 'Creating...' : 'Create Battle Token'}
      </button>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="success">
          <h3>Token Created!</h3>
          <p>Mint: {result.mint.toString()}</p>
          <p>Battle State: {result.battleState.toString()}</p>
          <p>Signature: {result.signature}</p>
          <a
            href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Solscan
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * ALTERNATIVE: Using with form data
 */
export async function createTokenFromForm(formData: {
  name: string;
  symbol: string;
  image: File;
  description: string;
}) {
  // 1. Upload image to Arweave/IPFS
  const imageUrl = await uploadImage(formData.image);

  // 2. Create metadata JSON
  const metadata = {
    name: formData.name,
    symbol: formData.symbol,
    description: formData.description,
    image: imageUrl,
  };

  // 3. Upload metadata JSON
  const metadataUri = await uploadMetadata(metadata);

  // 4. Create token
  const result = await createBattleToken(
    wallet.publicKey,
    formData.name,
    formData.symbol,
    metadataUri,
    wallet.signTransaction
  );

  return result;
}

// Placeholder functions (implement these based on your storage solution)
async function uploadImage(file: File): Promise<string> {
  // Upload to Arweave, IPFS, or other storage
  // Return URL
  return 'https://arweave.net/...';
}

async function uploadMetadata(metadata: any): Promise<string> {
  // Upload JSON to Arweave, IPFS, or other storage
  // Return URL
  return 'https://arweave.net/...';
}

/**
 * EXPECTED TRANSACTION FLOW:
 *
 * 1. User fills form (name, symbol, image, description)
 * 2. Upload image → get imageUrl
 * 3. Create metadata JSON → upload → get metadataUri
 * 4. Call createBattleToken(wallet, name, symbol, metadataUri, signTransaction)
 * 5. Transaction is built with:
 *    - Mint keypair (generated)
 *    - Battle State PDA (derived from mint)
 *    - Contract Token Account (ATA of battle_state)
 *    - Price Oracle PDA (global)
 * 6. User signs transaction (mint + wallet signatures)
 * 7. Transaction sent to Solana
 * 8. Return { signature, mint, battleState, mintKeypair }
 * 9. Navigate to /token/[mint] page or show success message
 *
 * IMPORTANT NOTES:
 *
 * - The function handles both mint and wallet signing
 * - Battle State PDA is automatically derived
 * - Contract Token Account is created by the smart contract
 * - Price Oracle must already be initialized (one-time keeper operation)
 * - Token starts in BattleStatus::Created
 * - Initial virtual market cap is ~$5,000
 * - Users need enough SOL for transaction fees + rent (~0.01 SOL)
 *
 * ERROR HANDLING:
 *
 * The function throws specific errors for:
 * - Invalid name (must be 1-50 characters)
 * - Invalid symbol (must be 1-10 characters)
 * - Invalid URI (must be <= 200 characters)
 * - Insufficient funds
 * - User cancelled transaction
 * - Program errors (check Solscan logs)
 *
 * TESTING ON DEVNET:
 *
 * 1. Get devnet SOL from faucet: https://solfaucet.com/
 * 2. Create test token with createBattleToken()
 * 3. Check transaction on Solscan devnet
 * 4. Verify Battle State PDA was created
 * 5. Check token appears in your app's token list
 */
