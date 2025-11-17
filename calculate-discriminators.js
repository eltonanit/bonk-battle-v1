const crypto = require('crypto');

function getDiscriminator(name) {
    const hash = crypto.createHash('sha256')
        .update(`global:${name}`)
        .digest();
    return hash.slice(0, 8).toString('hex');
}

console.log('📍 DISCRIMINATORS:\n');
console.log('mark_as_failed:', getDiscriminator('mark_as_failed'));
console.log('claim_refund:', getDiscriminator('claim_refund'));
console.log('finalize_graduation_step1:', getDiscriminator('finalize_graduation_step1'));
console.log('finalize_graduation_step2:', getDiscriminator('finalize_graduation_step2'));
