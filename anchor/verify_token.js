const data = Buffer.from('XPLk5tbYCJRTAkr+r/ijyloa/NRcsOnY8RKu+quuYd5irXJsH+rkuM/XAOjOY1QvcRCoW/OTXHeciTtJGTyQiPVqm+ppN8QHAVB8XAQAAAAAAIBbsQRBSEAEAAAAAAAAAADKmjsAAAAA4vb5aAAAAACA+UBAAAAAAAEu9vloAAAAAAAAAQAAAGWmK6zpAAAAAwAAAHF3MQMAAABRVzGRAAAAeyJuYW1lIjoicXcxIiwic3ltYm9sIjoiUVcxIiwiZGVzY3JpcHRpb24iOiIiLCJpbWFnZSI6Imh0dHBzOi8vcHViLWNmZGQ5ZGExNGRkOTQ1YTJiZjFlYTRlNWI5YjBjZTJjLnIyLmRldi90b2tlbnMvMTc2MTIxMTkzNzcwOS1oZWU0MWI1eWM0cy5wbmciff4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');

console.log('Data length:', data.length);
console.log('Expected for V2:', 439);

// Version detection
const isV2 = data.length === 439;
console.log('Is V2:', isV2);

// Try to find totalTokensSold manually
// In V2, dopo meteoraPool (offset ~153), c'è totalBuyers (4 bytes) poi totalTokensSold (8 bytes)
console.log('\n🔍 Searching for totalTokensSold...');

// Let's dump the data around offset 150-170 as hex
for (let i = 150; i < 170; i++) {
  if (i % 8 === 0) process.stdout.write('\n' + i + ': ');
  process.stdout.write(data[i].toString(16).padStart(2, '0') + ' ');
}
console.log('\n');
