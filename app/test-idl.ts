import idlJson from './src/idl/stonks_fan.json';

console.log('IDL Address:', idlJson.address);
console.log('IDL has accounts?', !!idlJson.accounts);
console.log('Accounts count:', idlJson.accounts?.length);
console.log('\nAccounts:');
idlJson.accounts?.forEach((acc: any) => {
    console.log(`  - ${acc.name}:`, {
        hasDiscriminator: !!acc.discriminator,
        hasType: !!acc.type,
        hasFields: !!acc.type?.fields
    });
});

console.log('\nFirst account full:', JSON.stringify(idlJson.accounts?.[0], null, 2));
