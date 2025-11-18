import { PublicKey } from '@solana/web3.js';

// ⭐ Detect account version by size
function getAccountVersion(dataLength: number): 'v1' | 'v2' {
  if (dataLength === 443) return 'v1'; // Old: with holders_thawed
  if (dataLength === 439) return 'v2'; // New: without holders_thawed

  console.warn(`⚠️ Unexpected account size: ${dataLength}`);
  return 'v1'; // Fallback to v1 (safer)
}

export function deserializeTokenLaunch(data: Buffer, pubkey?: PublicKey) {
  try {
    if (!pubkey) {
      console.error('❌ pubkey undefined!');
      return null;
    }

    const version = getAccountVersion(data.length);
    console.log(`📊 Deserializing version: ${version} (${data.length} bytes)`);

    let offset = 8; // Skip discriminator

    // Creator: 32 bytes
    const creator = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // Mint: 32 bytes
    const mint = new PublicKey(data.slice(offset, offset + 32)).toString();
    offset += 32;

    // Tier: 1 byte
    const tier = data.readUInt8(offset);
    offset += 1;

    // virtualSolInit: 8 bytes
    const virtualSolInit = Number(data.readBigUInt64LE(offset)) / 1e9;
    offset += 8;

    // constantK: 16 bytes (u128)
    const constantKLow = data.readBigUInt64LE(offset);
    offset += 8;
    const constantKHigh = data.readBigUInt64LE(offset);
    offset += 8;
    const constantK = (constantKHigh << 64n) | constantKLow;

    // targetSol: 8 bytes
    const targetSol = Number(data.readBigUInt64LE(offset)) / 1e9;
    offset += 8;

    // deadline: 8 bytes
    const deadline = Number(data.readBigInt64LE(offset));
    offset += 8;

    // solRaised: 8 bytes
    const solRaised = Number(data.readBigUInt64LE(offset)) / 1e9;
    offset += 8;

    // status: 1 byte
    const status = data.readUInt8(offset);
    offset += 1;

    // createdAt: 8 bytes
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    // graduatedAt: Option<i64>
    const hasGraduatedAt = data.readUInt8(offset) === 1;
    offset += 1;
    let graduatedAt = null;
    if (hasGraduatedAt) {
      graduatedAt = Number(data.readBigInt64LE(offset));
      offset += 8;
    }

    // meteoraPool: Option<Pubkey>
    const hasMeteora = data.readUInt8(offset) === 1;
    offset += 1;
    let meteoraPool = null;
    if (hasMeteora) {
      meteoraPool = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;
    }

    // totalBuyers: 4 bytes
    const totalBuyers = data.readUInt32LE(offset);
    offset += 4;

    // totalTokensSold: 8 bytes
    const totalTokensSold = Number(data.readBigUInt64LE(offset)) / 1e6;
    offset += 8;

    // ⭐ CONDITIONAL: holders_thawed (only in v1)
    let holdersThawed = 0;
    if (version === 'v1') {
      holdersThawed = data.readUInt32LE(offset);
      offset += 4;
      console.log(`  📌 V1 token - holders_thawed: ${holdersThawed}`);
    } else {
      console.log(`  ✅ V2 token - no holders_thawed field`);
    }

    // name: String
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').trim();
    offset += nameLength;

    // symbol: String
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').trim();
    offset += symbolLength;

    // uri: String
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const metadataUri = data.slice(offset, offset + uriLength).toString('utf8').trim();
    offset += uriLength;

    // bump: 1 byte
    const bump = data.readUInt8(offset);

    console.log(`✅ Deserialized: ${name} (${symbol})`);

    return {
      pubkey: pubkey.toString(),
      creator,
      mint,
      tier,
      virtualSolInit,
      constantK: constantK.toString(),
      targetSol,
      deadline,
      solRaised,
      status,
      createdAt,
      graduatedAt,
      meteoraPool,
      totalBuyers,
      totalTokensSold,
      // holdersThawed NOT returned (deprecated, only for v1 compatibility)
      name,
      symbol,
      metadataUri,
      bump
    };
  } catch (error: unknown) {
    console.error('❌ Deserialize error:', error);
    console.error('  Data length:', data.length);
    return null;
  }
}

export interface TokenLaunchData {
  pubkey: string;
  creator: string;
  mint: string;
  tier: number;
  virtualSolInit: number;
  constantK: string;
  targetSol: number;
  deadline: number;
  solRaised: number;
  status: number;
  createdAt: number;
  graduatedAt: number | null;
  meteoraPool: string | null;
  totalBuyers: number;
  totalTokensSold: number;
  // holdersThawed removed (deprecated)
  name: string;
  symbol: string;
  metadataUri: string;
  bump: number;
} 