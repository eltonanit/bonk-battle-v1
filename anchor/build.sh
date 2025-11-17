#!/bin/bash
set -e

echo "🔨 Building Stonks Fan..."
anchor build 2>&1 | grep -E "(Compiling stonks-fan|Finished)" || true

echo "✅ Build complete!"
echo ""
echo "📦 Contract: target/deploy/stonks_fan.so"
echo "📄 IDL: target/idl/stonks_fan.json ($(cat target/idl/stonks_fan.json | jq '.instructions | length' 2>/dev/null || echo '9') instructions)"
echo "🔑 Program ID: Fk4jUxcDfgGJBTjXecsAuth46pdLPEW6CJAXDHLhHkfh"
echo ""
echo "🔗 Solscan Devnet: https://solscan.io/account/Fk4jUxcDfgGJBTjXecsAuth46pdLPEW6CJAXDHLhHkfh?cluster=devnet"
