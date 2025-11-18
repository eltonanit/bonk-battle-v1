import { AccountInfo, PublicKey } from '@solana/web3.js';

// Discriminators from IDL
const TOKEN_LAUNCH_DISCRIMINATOR = Buffer.from([128, 176, 224, 36, 210, 201, 141, 80]);
const BUYER_RECORD_DISCRIMINATOR = Buffer.from([162, 234, 214, 146, 137, 95, 49, 88]);

// Types matching Rust structs
export interface TokenLaunchAccount {
  creator: PublicKey;
  mint: PublicKey;
  tier: number;
  targetSol: bigint;
  deadline: bigint;
  solRaised: bigint;
  status: LaunchStatus;
  createdAt: bigint;
  graduatedAt: bigint | null;
  meteoraPool: PublicKey | null;
  totalBuyers: number;
  totalTokensSold: bigint;
  holdersThawed: number;
  name: string;
  symbol: string;
  uri: string;
  bump: number;
}

export interface BuyerRecordAccount {
  launch: PublicKey;
  buyer: PublicKey;
  solSpent: bigint;
  tokensReceived: bigint;
  refundClaimed: boolean;
  isThawed: boolean;
  firstBuyTimestamp: bigint;
  lastBuyTimestamp: bigint;
  bump: number;
}

export enum LaunchStatus {
  Active = 'Active',
  ReadyToGraduate = 'ReadyToGraduate',
  Graduated = 'Graduated',
  Failed = 'Failed',
  Paused = 'Paused'
}

export function parseTokenLaunchAccount(accountInfo: AccountInfo<Buffer>): TokenLaunchAccount | null {
  try {
    const data = accountInfo.data;

    // Verify discriminator (first 8 bytes)
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(TOKEN_LAUNCH_DISCRIMINATOR)) {
      return null;
    }

    let offset = 8;

    // Parse fields in order (matching Rust struct)
    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const tier = data.readUInt8(offset);
    offset += 1;

    const targetSol = data.readBigUInt64LE(offset);
    offset += 8;

    const deadline = data.readBigInt64LE(offset);
    offset += 8;

    const solRaised = data.readBigUInt64LE(offset);
    offset += 8;

    // Status enum (u8)
    const statusNum = data.readUInt8(offset);
    offset += 1;
    const status = parseStatusEnum(statusNum);

    const createdAt = data.readBigInt64LE(offset);
    offset += 8;

    // Option<i64> for graduatedAt
    const hasGraduatedAt = data.readUInt8(offset) === 1;
    offset += 1;
    const graduatedAt = hasGraduatedAt ? data.readBigInt64LE(offset) : null;
    if (hasGraduatedAt) offset += 8;

    // Option<Pubkey> for meteoraPool
    const hasMeteoraPool = data.readUInt8(offset) === 1;
    offset += 1;
    const meteoraPool = hasMeteoraPool ? new PublicKey(data.slice(offset, offset + 32)) : null;
    if (hasMeteoraPool) offset += 32;

    const totalBuyers = data.readUInt32LE(offset);
    offset += 4;

    const totalTokensSold = data.readBigUInt64LE(offset);
    offset += 8;

    const holdersThawed = data.readUInt32LE(offset);
    offset += 4;

    // Strings (4 bytes length prefix + utf8 data)
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString('utf8');
    offset += nameLen;

    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLen).toString('utf8');
    offset += symbolLen;

    const uriLen = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLen).toString('utf8');
    offset += uriLen;

    const bump = data.readUInt8(offset);

    return {
      creator,
      mint,
      tier,
      targetSol,
      deadline,
      solRaised,
      status,
      createdAt,
      graduatedAt,
      meteoraPool,
      totalBuyers,
      totalTokensSold,
      holdersThawed,
      name,
      symbol,
      uri,
      bump
    };
  } catch (error) {
    console.error('Error parsing TokenLaunch account:', error);
    return null;
  }
}

export function parseBuyerRecordAccount(accountInfo: AccountInfo<Buffer>): BuyerRecordAccount | null {
  try {
    const data = accountInfo.data;

    // Verify discriminator
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(BUYER_RECORD_DISCRIMINATOR)) {
      return null;
    }

    let offset = 8;

    const launch = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const buyer = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const solSpent = data.readBigUInt64LE(offset);
    offset += 8;

    const tokensReceived = data.readBigUInt64LE(offset);
    offset += 8;

    const refundClaimed = data.readUInt8(offset) === 1;
    offset += 1;

    const isThawed = data.readUInt8(offset) === 1;
    offset += 1;

    const firstBuyTimestamp = data.readBigInt64LE(offset);
    offset += 8;

    const lastBuyTimestamp = data.readBigInt64LE(offset);
    offset += 8;

    const bump = data.readUInt8(offset);

    return {
      launch,
      buyer,
      solSpent,
      tokensReceived,
      refundClaimed,
      isThawed,
      firstBuyTimestamp,
      lastBuyTimestamp,
      bump
    };
  } catch (error) {
    console.error('Error parsing BuyerRecord account:', error);
    return null;
  }
}

function parseStatusEnum(statusNum: number): LaunchStatus {
  switch (statusNum) {
    case 0: return LaunchStatus.Active;
    case 1: return LaunchStatus.ReadyToGraduate;
    case 2: return LaunchStatus.Graduated;
    case 3: return LaunchStatus.Failed;
    case 4: return LaunchStatus.Paused;
    default: return LaunchStatus.Active;
  }
}

export function parseStatus(status: LaunchStatus): string {
  return status;
}