import idlJson from './src/idl/stonks_fan.json';
console.log('Account names in IDL:', idlJson.accounts.map((a: any) => a.name));
