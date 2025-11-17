#!/bin/bash
set -e

echo " Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

echo "🔧 Installing Anchor..."
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

echo " Setup completato!"
solana --version
anchor --version
