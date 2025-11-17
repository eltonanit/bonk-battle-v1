echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 STONKS.FAN - PROGRAM ID MIGRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "OLD Program: Fk4jUxcDfgGJBTjXecsAuth46pdLPEW6CJAXDHLhHkfh"
echo "NEW Program: 54zTTRA9QVbGMk86dU7A51f51QjdvwD9gLPFNEt5kdYw"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

NEW_PROGRAM_ID="54zTTRA9QVbGMk86dU7A51f51QjdvwD9gLPFNEt5kdYw"
OLD_PROGRAM_ID="Fk4jUxcDfgGJBTjXecsAuth46pdLPEW6CJAXDHLhHkfh"

echo "💰 STEP 1: Getting SOL for operations..."
solana airdrop 2 --url devnet
sleep 5

BALANCE=$(solana balance --url devnet)
echo "✅ Current balance: $BALANCE"
echo ""

echo "🔍 STEP 2: Verifying new program on-chain..."
solana program show $NEW_PROGRAM_ID --url devnet

if [ $? -eq 0 ]; then
    echo "✅ New program verified on-chain"
    NEW_SLOT=$(solana program show $NEW_PROGRAM_ID --url devnet | grep "Last Deployed In Slot" | awk '{print $NF}')
    echo "📊 Deployment slot: $NEW_SLOT"
else
    echo "❌ ERROR: New program not found on-chain!"
    exit 1
fi
echo ""

echo "📝 STEP 3: Updating IDL with new address..."
cp target/idl/stonks_fan.json target/idl/stonks_fan.json.backup
jq ".address = \"$NEW_PROGRAM_ID\"" target/idl/stonks_fan.json > target/idl/stonks_fan.json.tmp
mv target/idl/stonks_fan.json.tmp target/idl/stonks_fan.json

IDL_ADDRESS=$(cat target/idl/stonks_fan.json | jq -r '.address')
if [ "$IDL_ADDRESS" = "$NEW_PROGRAM_ID" ]; then
    echo "✅ IDL updated successfully"
    echo "   Address: $IDL_ADDRESS"
else
    echo "❌ ERROR: IDL update failed!"
    exit 1
fi
echo ""

echo "📝 STEP 4: Updating Anchor.toml..."
cp Anchor.toml Anchor.toml.backup
sed -i "s/$OLD_PROGRAM_ID/$NEW_PROGRAM_ID/g" Anchor.toml

if grep -q "$NEW_PROGRAM_ID" Anchor.toml; then
    echo "✅ Anchor.toml updated"
    echo "   $(grep stonks_fan Anchor.toml | grep -v "^#")"
else
    echo "❌ ERROR: Anchor.toml update failed!"
    exit 1
fi
echo ""

echo "📝 STEP 5: Updating frontend config..."
cp ../app/src/config/solana.ts ../app/src/config/solana.ts.backup
sed -i "s/$OLD_PROGRAM_ID/$NEW_PROGRAM_ID/g" ../app/src/config/solana.ts

if grep -q "$NEW_PROGRAM_ID" ../app/src/config/solana.ts; then
    echo "✅ Frontend config updated"
    echo "   $(grep PROGRAM_ID ../app/src/config/solana.ts | head -1)"
else
    echo "❌ ERROR: Frontend config update failed!"
    exit 1
fi
echo ""

echo "📦 STEP 6: Copying updated IDL to frontend..."
cp target/idl/stonks_fan.json ../app/src/idl/stonks_fan.json

FRONTEND_IDL_ADDRESS=$(cat ../app/src/idl/stonks_fan.json | jq -r '.address')
if [ "$FRONTEND_IDL_ADDRESS" = "$NEW_PROGRAM_ID" ]; then
    echo "✅ IDL copied to frontend"
    echo "   Address: $FRONTEND_IDL_ADDRESS"
else
    echo "❌ ERROR: Frontend IDL address mismatch!"
    exit 1
fi
echo ""

echo "🔢 STEP 7: Calculating function discriminators..."
echo ""
echo "Function discriminators:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "create_token:        $(echo -n 'global:create_token' | sha256sum | head -c 16)"
echo "buy_tokens:          $(echo -n 'global:buy_tokens' | sha256sum | head -c 16)"
echo "buy_more_tokens:     $(echo -n 'global:buy_more_tokens' | sha256sum | head -c 16)"
echo "batch_thaw_holders:  $(echo -n 'global:batch_thaw_holders' | sha256sum | head -c 16)"
echo "finalize_graduation: $(echo -n 'global:finalize_graduation' | sha256sum | head -c 16)"
echo "mark_as_failed:      $(echo -n 'global:mark_as_failed' | sha256sum | head -c 16)"
echo "claim_refund:        $(echo -n 'global:claim_refund' | sha256sum | head -c 16)"
echo "emergency_pause:     $(echo -n 'global:emergency_pause' | sha256sum | head -c 16)"
echo "emergency_resume:    $(echo -n 'global:emergency_resume' | sha256sum | head -c 16)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🔍 STEP 8: Final verification..."
echo ""
echo "Configuration Check:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Anchor.toml:      $(grep -o "$NEW_PROGRAM_ID" Anchor.toml | head -1)"
echo "✅ IDL (anchor):     $(cat target/idl/stonks_fan.json | jq -r '.address')"
echo "✅ IDL (frontend):   $(cat ../app/src/idl/stonks_fan.json | jq -r '.address')"
echo "✅ Config (frontend): $(grep PROGRAM_ID ../app/src/config/solana.ts | grep -o "$NEW_PROGRAM_ID" | head -1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📤 STEP 9: Committing to git..."

git add .

git commit -m "feat: migrate to new program ID $NEW_PROGRAM_ID

OLD: $OLD_PROGRAM_ID
NEW: $NEW_PROGRAM_ID

- Updated Anchor.toml
- Updated IDL address
- Updated frontend config
- Verified on-chain at slot $NEW_SLOT
- Solscan: https://solscan.io/account/$NEW_PROGRAM_ID?cluster=devnet"

echo "Pushing to GitHub..."
git push origin main

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ MIGRATION COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 New Program ID: $NEW_PROGRAM_ID"
echo "🔗 Solscan: https://solscan.io/account/$NEW_PROGRAM_ID?cluster=devnet"
echo ""
echo "📋 NEXT: Pull on Windows and test!"
echo ""
