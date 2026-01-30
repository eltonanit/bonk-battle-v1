# POTENTIALS.FUN - Transformation Document

## Overview

Transform **BONK-BATTLE** into **POTENTIALS.FUN** - a memecoin launchpad where each token is independent (no battles). Key new features include a POTENTIAL metric showing theoretical upside and a MULTIPLIER lottery system.

---

## 1. Components to HIDE

These components should be hidden (not removed) for future battle functionality:

| Component | File Path | Reason |
|-----------|-----------|--------|
| VictoryModal | `app/src/components/battle/VictoryModal.tsx` | Battle victory celebration - not needed |
| CreatedTicker | `app/src/components/feed/CreatedTicker.tsx` | Battle-related ticker |
| Battle Page | `app/src/app/battle/[id]/page.tsx` | Battle arena - hide entire page |
| useTokenBattleState | `app/src/hooks/useTokenBattleState.ts` | Battle state hook - keep for future |
| Qualification Popup | Search for qualification modal/popup | No battles = no qualification needed |

### API Routes to HIDE

| Route | File Path | Reason |
|-------|-----------|--------|
| Finalize Duel | `app/src/app/api/battles/finalize-duel/route.ts` | No duels for now |

### How to Hide

1. **Pages**: Add redirect or "Coming Soon" component
2. **Components**: Wrap with conditional render `{false && <Component />}`
3. **API Routes**: Return 404 or "Feature disabled" response
4. **Hooks**: Keep file but don't import/use

---

## 2. Components to KEEP

These components remain active and visible:

| Component | File Path | Notes |
|-----------|-----------|-------|
| FOMOTicker | `app/src/components/feed/FOMOTicker.tsx` | Keep - will add POTENTIAL ticker |
| Create Token Page | `app/src/app/create/page.tsx` | Keep - everyone can create tokens |
| Token Page | `app/src/app/token/[mint]/page.tsx` | Keep - main token trading page |
| TradingPanel | `app/src/components/token/TradingPanel.tsx` | Keep - core trading functionality |
| ActivityFeed | `app/src/components/feed/BattleActivityFeed.tsx` | Keep - rename to ActivityFeed |

---

## 3. Components to ADAPT

### 3.1 Check Victory Route → Graduation Check

**File**: `app/src/app/api/battles/check-victory/route.ts`

**Changes**:
- Rename to `/api/tokens/check-graduation/route.ts`
- Remove battle/opponent logic
- Check single token graduation:
  - `sol_collected >= TARGET_SOL` (bonding curve complete)
- On graduation:
  - Status: `Qualified → Listed` (skip InBattle/VictoryPending)
  - Trigger pool creation

### 3.2 Create Pool Route

**File**: `app/src/app/api/battles/create-pool/route.ts`

**Changes**:
- Move to `/api/tokens/create-pool/route.ts`
- Remove battle winner/loser logic
- Process any `Listed` token for Raydium pool creation

### 3.3 TradingPanel - Add POTENTIAL Display

**File**: `app/src/components/token/TradingPanel.tsx`

**Add**:
```tsx
// POTENTIAL Calculation
const calculatePotential = (percentBought: number, multiplier: number) => {
  const base = 100 / (100 - percentBought);
  return Math.pow(base, 2) * multiplier;
};

// Display POTENTIAL value
<div className="potential-display">
  <span className="label">POTENTIAL</span>
  <span className="value">{potential.toFixed(2)}x</span>
</div>
```

### 3.4 Database Tables

**tokens table** - Add columns:
```sql
ALTER TABLE tokens ADD COLUMN multiplier INTEGER DEFAULT 1;
ALTER TABLE tokens ADD COLUMN creator_wallet TEXT;
ALTER TABLE tokens ADD COLUMN creator_fee_collected BIGINT DEFAULT 0;
```

---

## 4. New Features to Add

### 4.1 POTENTIAL Metric

**Formula**:
```
POTENTIAL = (100 / (100 - % supply bought))² × MULTIPLIER
```

**Example**:
- 0% bought, 1x multiplier → POTENTIAL = 1x
- 50% bought, 1x multiplier → POTENTIAL = 4x
- 90% bought, 1x multiplier → POTENTIAL = 100x
- 50% bought, 10x multiplier → POTENTIAL = 40x

**Implementation**:
1. Calculate `percentBought = (tokens_sold / TOTAL_SUPPLY) * 100`
2. Apply formula with token's multiplier
3. Display in UI with animation on change

### 4.2 MULTIPLIER Lottery System

**Distribution**:
| Probability | Multiplier |
|-------------|------------|
| 90% | 1x |
| 5% | 10x |
| 3% | 20x |
| 1.5% | 30x |
| 0.5% | 50x |

**Implementation**:
1. On token creation, generate random multiplier
2. Store in `tokens.multiplier` column
3. Display multiplier badge on token card
4. Special visual effects for high multipliers (10x+)

**Code Example**:
```typescript
function generateMultiplier(): number {
  const rand = Math.random() * 100;
  if (rand < 0.5) return 50;      // 0.5%
  if (rand < 2) return 30;        // 1.5%
  if (rand < 5) return 20;        // 3%
  if (rand < 10) return 10;       // 5%
  return 1;                        // 90%
}
```

### 4.3 New UI Components

#### PotentialDisplay Component
```tsx
// app/src/components/token/PotentialDisplay.tsx
interface PotentialDisplayProps {
  percentBought: number;
  multiplier: number;
}

export function PotentialDisplay({ percentBought, multiplier }: PotentialDisplayProps) {
  const potential = Math.pow(100 / (100 - percentBought), 2) * multiplier;

  return (
    <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3">
      <span className="text-sm text-gray-400">POTENTIAL</span>
      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
        {potential.toFixed(1)}x
      </span>
      {multiplier > 1 && (
        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
          {multiplier}x BOOST
        </span>
      )}
    </div>
  );
}
```

#### MultiplierBadge Component
```tsx
// app/src/components/token/MultiplierBadge.tsx
interface MultiplierBadgeProps {
  multiplier: number;
}

export function MultiplierBadge({ multiplier }: MultiplierBadgeProps) {
  if (multiplier === 1) return null;

  const colors = {
    10: 'from-blue-500 to-cyan-500',
    20: 'from-green-500 to-emerald-500',
    30: 'from-orange-500 to-yellow-500',
    50: 'from-red-500 to-pink-500',
  };

  return (
    <div className={`absolute top-2 right-2 px-2 py-1 rounded-full bg-gradient-to-r ${colors[multiplier]} animate-pulse`}>
      <span className="text-xs font-bold text-white">{multiplier}x</span>
    </div>
  );
}
```

---

## 5. Smart Contract Changes

### 5.1 New Fee Structure

**Current**:
- Trading Fee: 2% (100% to Treasury)
- Platform Fee: 5% on finalize_duel

**New**:
- Trading Fee: 1.5% total
  - Creator Fee: 0.4% (to token creator wallet)
  - Platform Fee: 1.1% (to Treasury)

### 5.2 Contract Modifications

**In `lib.rs`**:

```rust
// New constants
pub const CREATOR_FEE_BPS: u64 = 40;   // 0.4%
pub const PLATFORM_FEE_BPS: u64 = 110; // 1.1%
pub const TOTAL_FEE_BPS: u64 = 150;    // 1.5%

// In buy_token function
pub fn buy_token(ctx: Context<BuyToken>, sol_amount: u64) -> Result<()> {
    // Calculate fees
    let total_fee = sol_amount * TOTAL_FEE_BPS / 10000;
    let creator_fee = sol_amount * CREATOR_FEE_BPS / 10000;
    let platform_fee = total_fee - creator_fee;

    let amount_to_collect = sol_amount - total_fee;

    // Transfer creator fee to creator wallet
    // Transfer platform fee to treasury
    // ... rest of logic
}

// In sell_token function - same fee structure
```

### 5.3 New Account: TokenBattleState

Add field for creator wallet:
```rust
pub struct TokenBattleState {
    // ... existing fields
    pub creator_wallet: Pubkey,      // NEW: Creator's wallet for fee distribution
    pub multiplier: u8,              // NEW: Token multiplier (1, 10, 20, 30, 50)
    pub creator_fees_earned: u64,    // NEW: Total creator fees collected
}
```

### 5.4 Graduation Without Battle

Remove battle requirement from graduation:
```rust
// OLD: Required InBattle status and opponent
// NEW: Graduate when bonding curve complete

pub fn check_graduation(ctx: Context<CheckGraduation>) -> Result<()> {
    let battle_state = &mut ctx.accounts.battle_state;

    // Check if bonding curve is complete
    if battle_state.sol_collected >= TARGET_SOL {
        battle_state.battle_status = BattleStatus::Listed;
        battle_state.is_active = false;
        emit!(GraduationEvent { mint: battle_state.mint });
    }

    Ok(())
}
```

---

## 6. Database Schema Updates

### 6.1 Alter tokens table

```sql
-- Add new columns for POTENTIALS.FUN
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS multiplier INTEGER DEFAULT 1;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS creator_fees_earned BIGINT DEFAULT 0;

-- Update battle_status enum meaning
-- 0: Created
-- 1: Active (was Qualified - renamed)
-- 2: Reserved (was InBattle - not used)
-- 3: Reserved (was VictoryPending - not used)
-- 4: Listed (graduated, ready for pool)
-- 5: PoolCreated
```

### 6.2 New view: token_potentials

```sql
CREATE OR REPLACE VIEW token_potentials AS
SELECT
  mint,
  symbol,
  name,
  image,
  multiplier,
  tokens_sold,
  (tokens_sold::float / 1e18 * 100) as percent_bought,
  POWER(100.0 / NULLIF(100 - (tokens_sold::float / 1e18 * 100), 0), 2) * multiplier as potential
FROM tokens
WHERE battle_status IN (0, 1) -- Created or Active only
ORDER BY potential DESC;
```

---

## 7. Implementation Phases

### Phase 1: Hide Battle Features (Day 1)
- [ ] Hide VictoryModal component
- [ ] Hide CreatedTicker component
- [ ] Hide /battle/[id] page (redirect to home)
- [ ] Disable finalize-duel API
- [ ] Hide qualification popup

### Phase 2: Adapt Existing Features (Day 2-3)
- [ ] Rename check-victory to check-graduation
- [ ] Update graduation logic (no battle required)
- [ ] Update create-pool for single tokens
- [ ] Rename BattleActivityFeed to ActivityFeed

### Phase 3: Add POTENTIAL Feature (Day 4-5)
- [ ] Add multiplier column to database
- [ ] Update token creation to generate multiplier
- [ ] Create PotentialDisplay component
- [ ] Create MultiplierBadge component
- [ ] Add POTENTIAL to token cards

### Phase 4: Smart Contract Update (Day 6-7)
- [ ] Update fee structure (Creator 0.4%, Platform 1.1%)
- [ ] Add creator_wallet to TokenBattleState
- [ ] Add multiplier to TokenBattleState
- [ ] Update graduation logic
- [ ] Deploy and test on devnet

### Phase 5: UI Polish (Day 8-10)
- [ ] Update branding to POTENTIALS.FUN
- [ ] Add animations for high multipliers
- [ ] Create POTENTIAL ticker (replace battle ticker)
- [ ] Update home page layout
- [ ] Mobile responsiveness

---

## 8. File Structure After Transformation

```
app/src/
├── app/
│   ├── api/
│   │   ├── tokens/
│   │   │   ├── check-graduation/route.ts  (renamed from battles/check-victory)
│   │   │   └── create-pool/route.ts       (moved from battles/)
│   │   ├── battles/                       (HIDDEN - keep for future)
│   │   │   ├── finalize-duel/route.ts
│   │   │   └── check-victory/route.ts
│   │   └── sync-token/[mint]/route.ts
│   ├── token/[mint]/page.tsx              (ACTIVE)
│   ├── create/page.tsx                    (ACTIVE)
│   └── battle/[id]/page.tsx               (HIDDEN)
│
├── components/
│   ├── token/
│   │   ├── TradingPanel.tsx               (ACTIVE + POTENTIAL)
│   │   ├── PotentialDisplay.tsx           (NEW)
│   │   └── MultiplierBadge.tsx            (NEW)
│   ├── feed/
│   │   ├── ActivityFeed.tsx               (renamed from BattleActivityFeed)
│   │   ├── FOMOTicker.tsx                 (ACTIVE)
│   │   ├── PotentialTicker.tsx            (NEW)
│   │   └── CreatedTicker.tsx              (HIDDEN)
│   └── battle/
│       └── VictoryModal.tsx               (HIDDEN)
│
└── hooks/
    ├── useActivityFeed.ts                 (ACTIVE)
    ├── useTokenBattleState.ts             (HIDDEN)
    └── useTokenState.ts                   (NEW - simplified version)
```

---

## 9. Quick Reference

### What Changes for Users

| Before (BONK-BATTLE) | After (POTENTIALS.FUN) |
|---------------------|------------------------|
| Create token → Qualify → Battle → Win → Graduate | Create token → Trade → Graduate |
| Battle opponent to graduate | Automatic graduation at bonding curve completion |
| Winner takes loser's SOL | No battles, no spoils |
| 2% trading fee (platform) | 1.5% fee (0.4% creator + 1.1% platform) |
| No multiplier | MULTIPLIER lottery (1x-50x) |
| No potential metric | POTENTIAL shows theoretical upside |

### Key Formulas

```
POTENTIAL = (100 / (100 - % bought))² × MULTIPLIER

% bought = (tokens_sold / 1,000,000,000) × 100

Creator Fee = sol_amount × 0.004
Platform Fee = sol_amount × 0.011
Total Fee = sol_amount × 0.015 (1.5%)
```

---

*Document created: 2026-01-27*
*Version: POTENTIALS.FUN v1.0*
