# FOMO System Documentation

## Overview

The FOMO system consists of ticker components that show live trading activity and timing opportunities to users in the header area.

---

## Components

### 1. FOMO Ticker (`FOMOTicker.tsx`)

**Location:** `app/src/components/global/FOMOTicker.tsx`

**Purpose:** Shows real-time buy/sell activity across all tokens.

**Display:**
- **Mobile:** Top of page, alongside NowMomentTicker
- **Desktop:** Left side of header, alongside other tickers

**Data Source:**
- Fetches recent `user_trades` with `trade_type = 'buy'` or `'sell'`
- Shows ticker scrolling through recent trades
- Network filtered (mainnet only)

**UI Elements:**
- Trade type indicator (bought/sold)
- Token symbol
- Amount
- Wallet address (truncated)

---

### 2. NOW Moment Ticker (`NowMomentTicker.tsx`)

**Location:** `app/src/components/global/NowMomentTicker.tsx`

**Purpose:** Shows the token with the most active buyers in last 5 minutes.

**Display:**
- **Mobile:** Top of page, next to FOMOTicker
- **Desktop:** Header, between FOMOTicker and CreatedTicker

**Cycle:**
1. **Countdown Phase (15 seconds):** Shows "NOW 15s" with pulsing indicator
2. **Showing Phase (10 seconds):** Shows token with buyer count

**Data Source:**
- Fetches tokens with `battle_status = 2` (InBattle) on mainnet
- Counts **unique wallet addresses** that bought in last 5 minutes
- Shows the token with the most unique buyers

**UI Elements:**
- Live pulsing indicator (green when showing data)
- "NOW" label
- Countdown timer during countdown phase
- Buyer count + token symbol during showing phase
- Token image
- Remaining time indicator

**States:**
1. **Loading:** "Loading..." with orange background
2. **Countdown:** "NOW 15s" with pulsing dot
3. **No buyers:** "NOW - No active buyers"
4. **Active:** "NOW 3 buying $TOKEN" with image

---

### 3. Created Ticker (`CreatedTicker.tsx`)

**Location:** `app/src/components/global/CreatedTicker.tsx`

**Purpose:** Shows recently created tokens.

**Display:**
- **Mobile:** Second row (sm+ screens)
- **Desktop:** Right side of header tickers

---

### 4. NOW Moment Card (`NowMomentCard.tsx`) - LEGACY

**Location:** `app/src/components/global/NowMomentCard.tsx`

**Purpose:** Card version showing underbought tokens (< 40% of battle reserves).

**Note:** This has been replaced by NowMomentTicker for header display but may still be used in other contexts.

---

## Layout

```
MOBILE (< lg):
┌────────────────────────────────────────────┐
│  [FOMOTicker] [NowMomentTicker]            │  <- Row 1
│  [CreatedTicker]                           │  <- Row 2 (sm+)
├────────────────────────────────────────────┤
│                 Header                      │
└────────────────────────────────────────────┘

DESKTOP (>= lg):
┌───────────────────────────────────────────────────────────┐
│ [FOMOTicker] [NowMomentTicker] [CreatedTicker] | buttons  │
└───────────────────────────────────────────────────────────┘
```

---

## Safe Copy Guidelines

**ALWAYS use:**
- "activity"
- "buyers"
- "timing"
- "entry"

**NEVER use:**
- "ROI"
- "profit"
- "x-multipliers"
- "guaranteed"
- "returns"

---

## NOW Moment Ticker Logic

### Phase Management

```typescript
type TickerPhase = 'countdown' | 'showing';

// Phase cycle:
// countdown (15s) -> fetch data -> showing (10s) -> countdown (15s) -> ...

useEffect(() => {
  const timer = setInterval(() => {
    if (phase === 'countdown') {
      if (countdown > 1) {
        setCountdown(prev => prev - 1);
      } else {
        fetchMostBoughtToken();
        setPhase('showing');
        setShowTimer(10);
      }
    } else if (phase === 'showing') {
      if (showTimer > 1) {
        setShowTimer(prev => prev - 1);
      } else {
        setPhase('countdown');
        setCountdown(15);
      }
    }
  }, 1000);

  return () => clearInterval(timer);
}, [phase, countdown, showTimer, fetchMostBoughtToken]);
```

### Unique Buyer Counting

```typescript
// Count UNIQUE buyers (distinct wallet addresses)
const { data: trades } = await supabase
  .from('user_trades')
  .select('wallet_address')
  .eq('token_mint', token.mint)
  .eq('trade_type', 'buy')
  .gte('block_time', fiveMinutesAgo);

// Use Set to count unique wallets
const uniqueWallets = new Set(trades?.map(t => t.wallet_address) || []);
const buyerCount = uniqueWallets.size;
```

---

## Files

| File | Description |
|------|-------------|
| `FOMOTicker.tsx` | Top ticker bar showing buy/sell activity |
| `NowMomentTicker.tsx` | Ticker showing most-bought token with buyer count |
| `NowMomentCard.tsx` | Card version of NOW moment (legacy) |
| `CreatedTicker.tsx` | Ticker showing recently created tokens |

---

## Database Tables Used

- `tokens` - Token info, battle status, reserves
- `user_trades` - Trade history for buyer counts

---

## Timing Configuration

| Component | Refresh Rate |
|-----------|-------------|
| FOMOTicker | Continuous scroll |
| NowMomentTicker | 15s countdown + 10s display cycle |
| CreatedTicker | Continuous scroll |

---

## Future Improvements

1. **Real-time updates:** Use Supabase realtime subscriptions instead of polling
2. **Historical data:** Show trend of buyer activity over time
3. **Personalization:** Highlight tokens user has interacted with before
4. **Sound alerts:** Optional sound when high buyer activity detected
