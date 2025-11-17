const data = Buffer.from('XPLk5tbYCJRTAkr+r/ijyloa/NRcsOnY8RKu+quuYd5irXJsH+rkuM/XAOjOY1QvcRCoW/OTXHeciTtJGTyQiPVqm+ppN8QHAVB8XAQAAAAAAIBbsQRBSEAEAAAAAAAAAADKmjsAAAAA4vb5aAAAAACA+UBAAAAAAAEu9vloAAAAAAAAAQAAAGWmK6zpAAAAAwAAAHF3MQMAAABRVzGRAAAAeyJuYW1lIjoicXcxIiwic3ltYm9sIjoiUVcxIiwiZGVzY3JpcHRpb24iOiIiLCJpbWFnZSI6Imh0dHBzOi8vcHViLWNmZGQ5ZGExNGRkOTQ1YTJiZjFlYTRlNWI5YjBjZTJjLnIyLmRldi90b2tlbnMvMTc2MTIxMTkzNzcwOS1oZWU0MWI1eWM0cy5wbmciff4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');

let offset = 8; // Skip discriminator

// creator (32 bytes)
offset += 32;

// mint (32 bytes)
offset += 32;

// tier (1 byte)
const tier = data.readUInt8(offset);
offset += 1;

// virtualSolInit (8 bytes)
const virtualSolInit = data.readBigUInt64LE(offset);
offset += 8;

// constantK (16 bytes)
const constantK = data.readBigUInt64LE(offset); // Solo primi 8 bytes
offset += 16;

// targetSol (8 bytes)
const targetSol = data.readBigUInt64LE(offset);
offset += 8;

// deadline (8 bytes)
offset += 8;

// solRaised (8 bytes)
const solRaised = data.readBigUInt64LE(offset);
offset += 8;

// status (1 byte)
const status = data.readUInt8(offset);
offset += 1;

// createdAt (8 bytes)
offset += 8;

// graduatedAt (9 bytes - Option<i64>)
offset += 9;

// meteoraPool (33 bytes - Option<Pubkey>)
offset += 33;

// totalBuyers (4 bytes)
const totalBuyers = data.readUInt32LE(offset);
offset += 4;

// totalTokensSold (8 bytes) ⭐
const totalTokensSold = data.readBigUInt64LE(offset);
offset += 8;

console.log('📊 TOKEN LAUNCH DATA:');
console.log('  Tier:', tier);
console.log('  Virtual SOL Init:', Number(virtualSolInit) / 1e9, 'SOL');
console.log('  Target SOL:', Number(targetSol) / 1e9, 'SOL');
console.log('  SOL Raised:', Number(solRaised) / 1e9, 'SOL');
console.log('  Status:', status, status === 1 ? '(ReadyToGraduate)' : '');
console.log('  Total Buyers:', totalBuyers);
console.log('  Total Tokens Sold:', totalTokensSold.toString());
console.log('  Total Tokens Sold (with decimals):', Number(totalTokensSold) / 1e6, 'M tokens');
