const crypto = require("crypto");

// Anchor calculates discriminator as first 8 bytes of sha256("global:<function_name>")
const functionName = "start_battle";
const preimage = `global:${functionName}`;
const hash = crypto.createHash("sha256").update(preimage).digest();
const discriminator = hash.slice(0, 8);

console.log(`Function: ${functionName}`);
console.log(`Preimage: ${preimage}`);
console.log(`Discriminator (hex): ${discriminator.toString("hex")}`);
console.log(`Discriminator (array): [${Array.from(discriminator).join(", ")}]`);
