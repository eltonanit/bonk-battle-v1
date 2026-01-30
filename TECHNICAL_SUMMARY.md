# BONK BATTLE V1 - Technical Summary

## 1. Project Structure

```
BONK-BATTLE-V1/
├── anchor/                          # Smart Contract (Solana/Anchor)
│   ├── programs/
│   │   └── bonk_battle/
│   │       └── src/
│   │           └── lib.rs           # Main contract code
│   ├── Anchor.toml
│   └── Cargo.toml
│
├── app/                             # Frontend (Next.js)
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── api/                 # API Routes
│   │   │   │   ├── battles/
│   │   │   │   │   ├── check-victory/route.ts
│   │   │   │   │   ├── finalize-duel/route.ts
│   │   │   │   │   ├── create-pool/route.ts
│   │   │   │   │   └── withdraw-for-listing/route.ts
│   │   │   │   ├── sync-token/[mint]/route.ts
│   │   │   │   └── tokens/
│   │   │   ├── battle/[id]/page.tsx  # Battle page
│   │   │   ├── token/[mint]/page.tsx # Token detail page
│   │   │   └── create/page.tsx       # Create token page
│   │   │
│   │   ├── components/
│   │   │   ├── token/
│   │   │   │   ├── TradingPanel.tsx  # Buy/Sell UI
│   │   │   │   └── PriceChart.tsx
│   │   │   ├── battle/
│   │   │   │   └── VictoryModal.tsx
│   │   │   ├── feed/
│   │   │   │   └── BattleActivityFeed.tsx
│   │   │   └── layout/
│   │   │
│   │   ├── hooks/
│   │   │   ├── useTokenBattleState.ts
│   │   │   ├── useActivityFeed.ts
│   │   │   └── useUserTokenBalance.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── solana/
│   │   │   │   ├── buy-token.ts
│   │   │   │   └── sell-token.ts
│   │   │   └── supabase.ts
│   │   │
│   │   └── config/
│   │       ├── network.ts            # Network switching logic
│   │       └── tier-config.ts        # Victory thresholds
│   │
│   ├── .env.local                    # Environment variables
│   └── package.json
│
└── docs/                             # Documentation
```

---

## 2. Smart Contract (Anchor/Rust)

### Program ID
```
F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD
```

### Core Mechanics

#### Bonding Curve (xy=k)
```rust
// Constants (Devnet/Test Tier)
VIRTUAL_SOL_INIT = 3,266 lamports
VIRTUAL_TOKEN_INIT = 10^18 (1B tokens * 10^9 decimals)
CONSTANT_K = 3,266 * 10^21
TARGET_SOL = 103,276,434 lamports (~0.103 SOL)
VICTORY_VOLUME_SOL = 113,604,077 lamports (~0.114 SOL)

// Token Supply
TOTAL_SUPPLY = 1,000,000,000 * 10^9 = 10^18
BONDING_CURVE_SUPPLY = 999,968,377 * 10^9 (99.997%)
RAYDIUM_RESERVED = 31,623 * 10^9 (0.003%)
```

#### Buy Token Logic
```rust
pub fn buy_token(ctx: Context<BuyToken>, sol_amount: u64) -> Result<()> {
    // 1. Calculate tokens using xy=k curve
    let tokens_to_give = calculate_buy_amount_optimized(sol_amount, sol_collected, tokens_sold);

    // 2. Deduct 2% fee
    let fee = sol_amount * 200 / 10000;
    let amount_to_collect = sol_amount - fee;

    // 3. Transfer SOL to battle_state PDA
    // 4. Transfer fee to treasury
    // 5. Transfer tokens to user

    // 6. Update state
    battle_state.sol_collected += amount_to_collect;
    battle_state.tokens_sold += tokens_to_give;
    battle_state.total_trade_volume += sol_amount;

    // 7. Auto-victory check (V4.1 security)
    if victory_conditions_met {
        battle_state.battle_status = VictoryPending;
        battle_state.is_active = false; // Lock trading
    }
}
```

#### Sell Token Logic
```rust
pub fn sell_token(ctx: Context<SellToken>, token_amount: u64) -> Result<()> {
    // Security: Block if VictoryPending or Listed

    // 1. Calculate SOL to return using xy=k
    let sol_to_return = calculate_sell_amount_optimized(token_amount, sol_collected, tokens_sold);

    // 2. Transfer tokens back to contract
    // 3. Deduct 2% fee, send to treasury
    // 4. Send remaining SOL to user

    // 5. Update state
    battle_state.sol_collected -= sol_to_return;
    battle_state.tokens_sold -= token_amount;
    battle_state.total_trade_volume += sol_to_return;
}
```

### Battle Flow

```
1. CREATE TOKEN
   └─ Status: Created
   └─ Mint 1B tokens to contract PDA

2. QUALIFICATION (auto on first buy)
   └─ Status: Created → Qualified
   └─ Requires: sol_collected >= 1 lamport

3. START BATTLE (Keeper only)
   └─ Match 2 Qualified tokens
   └─ Status: Qualified → InBattle
   └─ Set opponent_mint on both

4. TRADING CONTINUES
   └─ Users buy/sell
   └─ Victory check on each trade

5. VICTORY (auto-triggered)
   └─ Conditions: sol_collected >= 99.99% TARGET_SOL AND total_volume >= VICTORY_VOLUME
   └─ Status: InBattle → VictoryPending
   └─ is_active = false (trading locked)

6. FINALIZE DUEL (Keeper only)
   └─ Winner: VictoryPending → Listed
   └─ Loser: InBattle → Qualified (can battle again)
   └─ Spoils: Winner gets 50% of loser's SOL
   └─ Platform fee: 5% of winner's total

7. WITHDRAW FOR LISTING (Keeper only)
   └─ Transfer SOL + reserved tokens to Keeper wallet
   └─ Status remains: Listed

8. CREATE RAYDIUM POOL (Keeper only)
   └─ Create CPMM pool on Raydium
   └─ Status: Listed → PoolCreated
```

### Fee Structure
```
Trading Fee: 2% (goes to Treasury)
Platform Fee: 5% (on finalize_duel, split 80% Keeper / 20% Treasury)
```

### Key Accounts
```
Treasury: 5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf
Keeper:   65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea
```

---

## 3. Frontend Technologies

### Stack
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS",
  "state": "React Query (@tanstack/react-query)",
  "wallet": "@solana/wallet-adapter-react",
  "blockchain": "@solana/web3.js, @solana/spl-token",
  "database": "Supabase (PostgreSQL)",
  "raydium": "@raydium-io/raydium-sdk-v2"
}
```

### Key Components

| Component | Purpose |
|-----------|---------|
| `TradingPanel.tsx` | Buy/Sell UI with progress bars |
| `BattleActivityFeed.tsx` | Real-time trade feed |
| `VictoryModal.tsx` | Victory celebration popup |
| `FOMOTicker.tsx` | Live trade ticker at top |

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useTokenBattleState` | Fetch token data from Supabase |
| `useActivityFeed` | Real-time trades with Supabase subscription |
| `useUserTokenBalance` | User's token balance |

### Network Switching
```typescript
// config/network.ts
export function getCurrentNetwork(): 'devnet' | 'mainnet' {
  const saved = localStorage.getItem('bonk-network');
  return saved === 'devnet' ? 'devnet' : 'mainnet';
}
```

---

## 4. Database (Supabase/PostgreSQL)

### Tables

#### `tokens`
```sql
mint              TEXT PRIMARY KEY
name              TEXT
symbol            TEXT
image             TEXT
creator_wallet    TEXT
battle_status     INTEGER  -- 0-5 (Created to PoolCreated)
sol_collected     BIGINT
tokens_sold       BIGINT
total_trade_volume BIGINT
opponent_mint     TEXT
raydium_pool_id   TEXT
network           TEXT     -- 'devnet' or 'mainnet'
```

#### `user_trades`
```sql
id                UUID PRIMARY KEY
signature         TEXT
token_mint        TEXT
wallet_address    TEXT
trade_type        TEXT     -- 'buy' or 'sell'
sol_amount        BIGINT
token_amount      BIGINT
block_time        TIMESTAMP
network           TEXT
```

#### `battles`
```sql
id                UUID PRIMARY KEY
token_a_mint      TEXT
token_b_mint      TEXT
status            TEXT     -- 'active', 'completed'
winner_mint       TEXT
started_at        TIMESTAMP
ended_at          TIMESTAMP
```

#### `winners`
```sql
mint              TEXT PRIMARY KEY
symbol            TEXT
pool_id           TEXT
raydium_url       TEXT
loser_mint        TEXT
victory_timestamp TIMESTAMP
```

---

## 5. API Routes (CRON Jobs)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/battles/check-victory` | Every 1 min | Check InBattle tokens for victory |
| `/api/battles/finalize-duel` | Every 2 min | Finalize VictoryPending → Listed |
| `/api/battles/create-pool` | Every 2 min | Create Raydium pool for Listed tokens |
| `/api/sync-token/[mint]` | On-demand | Sync blockchain state to database |

---

## 6. Known Issues (Current State)

### BUG: Bonding Curve Token Calculation
```
Problem: Contract gives ~50% more tokens than expected
Cause: Asymmetry between token calculation (uses GROSS sol_amount)
       and sol_collected update (uses NET amount after fee)
Effect: At graduation, only ~15,962 tokens remain instead of ~31,623
```

### Fixed Issues
- [x] Program ID mismatch in .env.local
- [x] Network parameter not passed to sync API
- [x] Activity feed using wrong network
- [x] Victory detection using local progress instead of on-chain status
- [x] TradingPanel blocking based on local progress

---

## 7. Local Development

### Prerequisites
```bash
# Solana CLI
solana --version  # 1.18+

# Anchor CLI
anchor --version  # 0.29+

# Node.js
node --version    # 18+
```

### Setup
```bash
# 1. Install dependencies
cd app && npm install

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Run development server
npm run dev

# 4. Open browser
http://localhost:3000
```

### Testing on Devnet
```bash
# Switch to devnet in Solana CLI
solana config set --url devnet

# Airdrop SOL for testing
solana airdrop 2

# Check balance
solana balance
```

---

## 8. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ TradingPanel│  │ BattlePage  │  │ ActivityFeed            │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         ▼                ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Hooks (useTokenBattleState, etc)               ││
│  └──────────────────────────┬──────────────────────────────────┘│
└─────────────────────────────┼───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Solana RPC     │  │   Supabase      │  │   API Routes    │
│  (Helius)       │  │   (PostgreSQL)  │  │   (CRON Jobs)   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         │                    │                    │
         ▼                    │                    │
┌─────────────────────────────┴────────────────────┴──────────────┐
│                    SMART CONTRACT (Anchor)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    bonk_battle program                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │ buy_token   │  │ sell_token  │  │ finalize_duel   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │           TokenBattleState (PDA)                    │ │   │
│  │  │  - sol_collected, tokens_sold, battle_status        │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. What Can Be Reused

### Reusable (90%+)
- Frontend components and styling
- Wallet connection logic
- Supabase integration
- API route structure
- Hooks and state management

### Needs Fix
- Smart contract bonding curve calculation (50% token bug)
- Victory detection logic (already fixed in frontend)

### May Need Modification
- Tier configuration values for mainnet
- Fee percentages
- Raydium pool creation (currently devnet only)

---

*Document generated: 2026-01-27*
*Version: V4.1 (Security Fix: Auto-Victory + Sell Block)*
