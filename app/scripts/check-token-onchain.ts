// scripts/check-token-onchain.ts
/**
 * Script per verificare i dati on-chain di un token
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Connection, PublicKey } from '@solana/web3.js';

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://devnet.helius-rpc.com/?api-key=01b6f8ea-2179-42c8-aac8-b3b6eb2a1d5f';
const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq');

function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('battle_state'), mint.toBuffer()],
    PROGRAM_ID
  );
}

async function checkTokenOnChain(mintAddress: string) {
  console.log('🔍 Checking on-chain data for token:', mintAddress);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const mint = new PublicKey(mintAddress);

    // Get PDA
    const [battleStatePDA, bump] = getBattleStatePDA(mint);
    console.log('📍 Battle State PDA:', battleStatePDA.toString());
    console.log('📍 Bump:', bump);

    // Fetch account
    const accountInfo = await connection.getAccountInfo(battleStatePDA);

    if (!accountInfo) {
      console.log('❌ No battle state found for this token!');
      return;
    }

    console.log('\n✅ Account found!');
    console.log('📦 Data length:', accountInfo.data.length, 'bytes');
    console.log('👤 Owner:', accountInfo.owner.toString());
    console.log('💰 Lamports:', accountInfo.lamports);

    // Parse data
    const data = accountInfo.data;
    let offset = 8; // Skip discriminator

    // Helper functions
    const readU64 = (): bigint => {
      const bytes = data.slice(offset, offset + 8);
      let value = 0n;
      for (let i = 0; i < 8; i++) {
        value |= BigInt(bytes[i]) << BigInt(i * 8);
      }
      offset += 8;
      return value;
    };

    const readI64 = (): number => {
      const bytes = data.slice(offset, offset + 8);
      let value = 0n;
      for (let i = 0; i < 8; i++) {
        value |= BigInt(bytes[i]) << BigInt(i * 8);
      }
      offset += 8;

      if (value >= 0x8000000000000000n) {
        value = value - 0x10000000000000000n;
      }

      return Number(value);
    };

    const readString = (): string => {
      if (offset + 4 > data.length) return '';
      const len = data.readUInt32LE(offset);
      offset += 4;
      if (len === 0 || len > 500 || offset + len > data.length) return '';
      const str = data.slice(offset, offset + len).toString('utf8').replace(/\0/g, '').trim();
      offset += len;
      return str;
    };

    // Parse fields
    const mintFromData = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const creator = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const solCollected = readU64();
    const tokensSold = readU64();
    const totalTradeVolume = readU64();

    const isActive = data[offset] !== 0;
    offset += 1;

    const battleStatus = data[offset];
    offset += 1;

    const opponentMint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const creationTimestamp = readI64();
    const lastTradeTimestamp = readI64();
    const battleStartTimestamp = readI64();
    const victoryTimestamp = readI64();
    const listingTimestamp = readI64();
    const qualificationTimestamp = readI64();

    const bumpFromData = data[offset];
    offset += 1;

    const name = readString();
    const symbol = readString();
    const uri = readString();

    // Display parsed data
    console.log('\n📊 PARSED DATA:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Mint:', mintFromData.toString());
    console.log('Creator:', creator.toString());
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('URI:', uri.slice(0, 100) + (uri.length > 100 ? '...' : ''));
    console.log('\n💰 ECONOMICS:');
    console.log('SOL Collected:', Number(solCollected) / 1e9, 'SOL');
    console.log('Tokens Sold:', tokensSold.toString());
    console.log('Total Trade Volume:', Number(totalTradeVolume) / 1e9, 'SOL');
    console.log('\n⚙️ STATUS:');
    console.log('Is Active:', isActive);
    console.log('Battle Status:', battleStatus, getBattleStatusName(battleStatus));
    console.log('Opponent Mint:', opponentMint.toString());
    console.log('\n⏰ TIMESTAMPS:');
    console.log('Creation:', creationTimestamp, '→', new Date(creationTimestamp * 1000).toISOString());
    console.log('Last Trade:', lastTradeTimestamp, '→', lastTradeTimestamp ? new Date(lastTradeTimestamp * 1000).toISOString() : 'N/A');
    console.log('Battle Start:', battleStartTimestamp, '→', battleStartTimestamp ? new Date(battleStartTimestamp * 1000).toISOString() : 'N/A');
    console.log('Victory:', victoryTimestamp, '→', victoryTimestamp ? new Date(victoryTimestamp * 1000).toISOString() : 'N/A');
    console.log('Listing:', listingTimestamp, '→', listingTimestamp ? new Date(listingTimestamp * 1000).toISOString() : 'N/A');
    console.log('Qualification:', qualificationTimestamp, '→', qualificationTimestamp ? new Date(qualificationTimestamp * 1000).toISOString() : 'N/A');
    console.log('\n🔧 TECH:');
    console.log('Bump:', bumpFromData);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function getBattleStatusName(status: number): string {
  const statuses = [
    'Funding',
    'Qualified',
    'InBattle',
    'Victory',
    'Listed'
  ];
  return statuses[status] || 'Unknown';
}

// Run
const mintToCheck = process.argv[2] || 'EsavhZJepP3234XkWvhMn1wkBxrHnwuLwTPERiE1Lg8C';
checkTokenOnChain(mintToCheck);
