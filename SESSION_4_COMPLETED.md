# ✅ SESSION 4 COMPLETED: React Hooks for Token State

**Data:** 18/11/2025
**Task:** Implementare React hooks per fetch on-chain data
**Status:** ✅ COMPLETATO

---

## 📦 File Creati

### **New Files (Sessione 4):**
- ✅ [`app/src/hooks/useTokenBattleState.ts`](app/src/hooks/useTokenBattleState.ts) - **Hook TokenBattleState** ⭐
- ✅ [`app/src/hooks/usePriceOracle.ts`](app/src/hooks/usePriceOracle.ts) - **Hook PriceOracle** ⭐
- ✅ [`app/src/hooks/useUserTokenBalance.ts`](app/src/hooks/useUserTokenBalance.ts) - **Hook User Balance** ⭐
- ✅ [`app/src/hooks/hooks.example.tsx`](app/src/hooks/hooks.example.tsx) - Esempi completi

---

## 🎯 Hooks Implementati

### **1. `useTokenBattleState()` - Token Battle State**

**Signature:**
```typescript
function useTokenBattleState(
  mint: PublicKey | null
): {
  state: ParsedTokenBattleState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Funzionalità:**
- ✅ Fetcha `TokenBattleState` account on-chain
- ✅ Deriva Battle State PDA da mint
- ✅ Parse completo tutti i campi (BN → number)
- ✅ Parse `BattleStatus` enum correttamente
- ✅ Auto-refetch ogni 10s se `InBattle` o `VictoryPending`
- ✅ Auto-refetch ogni 30s per altri status
- ✅ Handle account non esistente (return null, no error)
- ✅ Manual refetch disponibile

**Parsed State Fields:**
```typescript
interface ParsedTokenBattleState {
  mint: PublicKey;
  solCollected: number;        // in lamports
  tokensSold: number;           // raw with decimals
  totalTradeVolume: number;     // in lamports
  isActive: boolean;
  battleStatus: BattleStatus;   // Created | Qualified | InBattle | VictoryPending | Listed
  opponentMint: PublicKey;
  creationTimestamp: number;    // unix seconds
  lastTradeTimestamp: number;
  battleStartTimestamp: number;
  victoryTimestamp: number;
  listingTimestamp: number;
  bump: number;
}
```

**Helper Hooks:**
- `useIsTokenInBattle(mint)` - True se in battle
- `useCanTokenBattle(mint)` - True se qualified

**Example:**
```typescript
const { state, loading, error } = useTokenBattleState(mint);

if (state) {
  console.log('Status:', BattleStatus[state.battleStatus]);
  console.log('MC:', state.solCollected / 1e9, 'SOL');
}
```

---

### **2. `usePriceOracle()` - SOL/USD Price Oracle**

**Signature:**
```typescript
function usePriceOracle(): {
  solPriceUsd: number | null;     // e.g., 196.50
  lastUpdate: number | null;       // unix seconds
  nextUpdate: number | null;       // unix seconds
  updateCount: number | null;
  keeperAuthority: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Funzionalità:**
- ✅ Fetcha `PriceOracle` account on-chain
- ✅ Deriva Price Oracle PDA
- ✅ Parse prezzo con 6 decimals (100_000_000 = $100.00)
- ✅ Parse timestamps (i64 → number)
- ✅ Auto-refetch ogni 60 secondi
- ✅ Throws error se oracle non inizializzato
- ✅ Manual refetch disponibile

**Helper Hooks:**
- `usePriceOracleNeedsUpdate()` - True se past nextUpdate
- `useCalculateMarketCapUsd(solAmount)` - Calcola MC in USD

**Example:**
```typescript
const { solPriceUsd, lastUpdate } = usePriceOracle();
const marketCapUsd = useCalculateMarketCapUsd(solCollected);

console.log('SOL:', `$${solPriceUsd?.toFixed(2)}`);
console.log('MC:', `$${marketCapUsd?.toFixed(2)}`);
```

---

### **3. `useUserTokenBalance()` - User Token Balance**

**Signature:**
```typescript
function useUserTokenBalance(
  mint: PublicKey | null,
  decimals?: number  // default: 6
): {
  balance: number | null;          // raw amount
  balanceFormatted: number | null; // divided by decimals
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Funzionalità:**
- ✅ Fetcha user's Associated Token Account (ATA)
- ✅ Parse balance (u64 at offset 64)
- ✅ Returns raw e formatted balance
- ✅ Auto-refetch quando wallet cambia
- ✅ Handle account non esistente (balance = 0)
- ✅ Requires wallet connesso
- ✅ Manual refetch disponibile

**Helper Hooks:**
- `useHasSufficientBalance(mint, amount)` - Balance check
- `useMultipleTokenBalances(mints[])` - Multi-token balances
- `useFormatTokenAmount(raw, decimals)` - Format helper

**Example:**
```typescript
const { balance, balanceFormatted, loading } = useUserTokenBalance(mint);

if (loading) return <div>Loading...</div>;

return (
  <div>
    <p>Balance: {balanceFormatted?.toFixed(6)} tokens</p>
    <p>Raw: {balance}</p>
  </div>
);
```

---

## 🔧 Implementazione Dettagliata

### **Account Parsing**

Tutti gli hooks implementano parsing manuale dei raw account data:

#### **TokenBattleState Parsing:**
```typescript
// Layout (after 8-byte discriminator):
offset = 8;
mint = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
solCollected = parseU64(offset); offset += 8;
tokensSold = parseU64(offset); offset += 8;
totalTradeVolume = parseU64(offset); offset += 8;
isActive = data[offset] !== 0; offset += 1;
battleStatus = battleStatusMap[data[offset]]; offset += 1;
opponentMint = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
creationTimestamp = parseI64(offset); offset += 8;
// ... altri timestamps
bump = data[offset];
```

#### **PriceOracle Parsing:**
```typescript
// Layout (after 8-byte discriminator):
offset = 8;
solPriceUsd = parseU64(offset) / 1_000_000; offset += 8; // 6 decimals
lastUpdateTimestamp = parseI64(offset); offset += 8;
nextUpdateTimestamp = parseI64(offset); offset += 8;
keeperAuthority = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
updateCount = parseU64(offset);
```

#### **SPL Token Account Parsing:**
```typescript
// Standard SPL Token Account layout:
// 0-32: mint
// 32-64: owner
// 64-72: amount (u64)
amount = parseU64(64); // Little-endian u64 at offset 64
```

### **Parse Helpers:**

```typescript
// Parse u64 (unsigned 64-bit, little-endian)
function parseU64(offset: number): number {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(data[offset + i]) << BigInt(i * 8);
  }
  return Number(value);
}

// Parse i64 (signed 64-bit, little-endian)
function parseI64(offset: number): number {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(data[offset + i]) << BigInt(i * 8);
  }
  // Handle signed
  if (value > 0x7fffffffffffffffn) {
    value = value - 0x10000000000000000n;
  }
  return Number(value);
}
```

---

## 🎨 Esempi di Utilizzo

### **Example 1: Token Detail Page**
```typescript
function TokenPage({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const { state, loading, error } = useTokenBattleState(mint);
  const { solPriceUsd } = usePriceOracle();
  const { balanceFormatted } = useUserTokenBalance(mint);
  const marketCapUsd = useCalculateMarketCapUsd(state?.solCollected ?? 0);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!state) return <div>Token not found</div>;

  return (
    <div>
      <h1>Token Details</h1>
      <p>Status: {BattleStatus[state.battleStatus]}</p>
      <p>Market Cap: ${marketCapUsd?.toFixed(2)}</p>
      <p>SOL Collected: {(state.solCollected / 1e9).toFixed(4)} SOL</p>
      <p>Your Balance: {balanceFormatted?.toFixed(6)}</p>
    </div>
  );
}
```

### **Example 2: Battle Status Indicator**
```typescript
function BattleIndicator({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const isInBattle = useIsTokenInBattle(mint);
  const canBattle = useCanTokenBattle(mint);

  if (isInBattle) {
    return <span className="badge battle">⚔️ In Battle</span>;
  }

  if (canBattle) {
    return <span className="badge qualified">✅ Qualified</span>;
  }

  return <span className="badge">📈 Growing</span>;
}
```

### **Example 3: Trading Panel with Balance**
```typescript
function TradingPanel({ mintAddress }: { mintAddress: string }) {
  const mint = new PublicKey(mintAddress);
  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const hasSufficientBalance = useHasSufficientBalance(mint, 1_000_000);

  return (
    <div>
      <p>Balance: {balanceFormatted?.toFixed(6)} tokens</p>
      <button>Buy</button>
      <button disabled={!hasSufficientBalance}>
        Sell {!hasSufficientBalance && '(Insufficient balance)'}
      </button>
    </div>
  );
}
```

### **Example 4: Price Display**
```typescript
function PriceDisplay() {
  const { solPriceUsd, lastUpdate } = usePriceOracle();

  return (
    <div>
      <h3>SOL Price: ${solPriceUsd?.toFixed(2)}</h3>
      <small>
        Updated: {lastUpdate ? new Date(lastUpdate * 1000).toLocaleString() : 'Never'}
      </small>
    </div>
  );
}
```

### **Example 5: Portfolio View**
```typescript
function Portfolio({ mints }: { mints: string[] }) {
  const mintKeys = mints.map(m => new PublicKey(m));
  const balances = useMultipleTokenBalances(mintKeys);

  return (
    <table>
      {mints.map(mint => (
        <tr key={mint}>
          <td>{mint.substring(0, 8)}...</td>
          <td>{balances[mint]?.toFixed(6) ?? '0'}</td>
        </tr>
      ))}
    </table>
  );
}
```

Vedi [`hooks.example.tsx`](app/src/hooks/hooks.example.tsx) per **7 esempi completi**!

---

## 🚨 Error Handling

### **Account Non Esistente:**

**useTokenBattleState:**
- Account not found → `state = null`, `error = null`
- Questo è OK (token non ancora creato)

**usePriceOracle:**
- Account not found → **THROWS ERROR**
- Oracle MUST essere inizializzato da keeper

**useUserTokenBalance:**
- Account not found → `balance = 0`, `error = null`
- Questo è OK (user non ha tokens)

### **Connection Errors:**

Tutti gli hooks gestiscono connection errors:
```typescript
try {
  // fetch data
} catch (err) {
  console.error('Error:', err);
  setError(err instanceof Error ? err : new Error('Unknown error'));
  setState(null); // or appropriate default
}
```

### **Wallet Not Connected:**

**useUserTokenBalance** gestisce wallet non connesso:
```typescript
if (!publicKey) {
  setBalance(null);
  setError(null);
  setLoading(false);
  return;
}
```

---

## 📊 Polling & Performance

### **Polling Intervals:**

| Hook | Interval | Condition |
|------|----------|-----------|
| useTokenBattleState | **10s** | If InBattle or VictoryPending |
| useTokenBattleState | **30s** | Other statuses |
| usePriceOracle | **60s** | Always |
| useUserTokenBalance | **On wallet change** | No polling |

### **Optimization:**

1. **Memoization:**
   ```typescript
   const fetchState = useCallback(async () => {
     // fetch logic
   }, [mint, connection]);
   ```

2. **Cleanup:**
   ```typescript
   useEffect(() => {
     const interval = setInterval(fetchState, 10_000);
     return () => clearInterval(interval);
   }, [fetchState]);
   ```

3. **Conditional Polling:**
   ```typescript
   const shouldPollFast =
     state?.battleStatus === BattleStatus.InBattle ||
     state?.battleStatus === BattleStatus.VictoryPending;
   const interval = shouldPollFast ? 10_000 : 30_000;
   ```

---

## 🧪 Testing Checklist

### **useTokenBattleState:**
- [ ] Fetch esistente token
- [ ] Fetch token non esistente (return null)
- [ ] Parse tutti i campi correttamente
- [ ] BattleStatus enum mapping
- [ ] Timestamps in secondi (non millisecondi)
- [ ] Auto-refetch funziona
- [ ] Manual refetch funziona
- [ ] Helper hooks (useIsTokenInBattle, useCanTokenBattle)

### **usePriceOracle:**
- [ ] Fetch price oracle
- [ ] Parse prezzo con 6 decimals
- [ ] Parse timestamps
- [ ] Error se oracle non inizializzato
- [ ] Auto-refetch ogni 60s
- [ ] Manual refetch
- [ ] Helper: usePriceOracleNeedsUpdate
- [ ] Helper: useCalculateMarketCapUsd

### **useUserTokenBalance:**
- [ ] Fetch balance quando wallet connesso
- [ ] Return null quando wallet disconnesso
- [ ] Handle token account non esistente (balance = 0)
- [ ] Parse balance correttamente
- [ ] Formatted balance con decimals
- [ ] Refetch quando wallet cambia
- [ ] Helper: useHasSufficientBalance
- [ ] Helper: useMultipleTokenBalances

### **Integration Tests:**
- [ ] Use all hooks together in same component
- [ ] Verify no re-render loops
- [ ] Check memory leaks (cleanup intervals)
- [ ] Test with multiple tokens
- [ ] Test with wallet connect/disconnect

---

## 🔗 Integration con Altri Componenti

### **Token Detail Page:**
```typescript
// Combina tutti gli hooks per display completo
const { state } = useTokenBattleState(mint);
const { solPriceUsd } = usePriceOracle();
const { balance } = useUserTokenBalance(mint);
const marketCapUsd = useCalculateMarketCapUsd(state?.solCollected ?? 0);
```

### **Trading Components:**
```typescript
// Usa balance per enable/disable sell button
const hasSufficient = useHasSufficientBalance(mint, sellAmount);
<button disabled={!hasSufficient}>Sell</button>
```

### **Battle Monitor:**
```typescript
// Auto-refetch quando in battle
const isInBattle = useIsTokenInBattle(mint);
useEffect(() => {
  if (!isInBattle) return;
  const interval = setInterval(refetch, 5000);
  return () => clearInterval(interval);
}, [isInBattle]);
```

### **Portfolio Tracker:**
```typescript
// Fetch multiple balances at once
const balances = useMultipleTokenBalances(userTokenMints);
```

---

## 📈 Next Steps (Session 5)

### **Priorità Alta:**
1. [ ] Creare `TradingPanel` component usando hooks
2. [ ] Aggiornare `/token/[mint]` page con hooks
3. [ ] Creare `TokenCard` component
4. [ ] Implementare bonding curve calculator
5. [ ] Testing completo tutti gli hooks

### **Priorità Media:**
6. [ ] Implementare `startBattle()` function
7. [ ] Creare `/battle` page con matchmaking
8. [ ] Implementare `BattleCard` component
9. [ ] Real-time battle updates UI
10. [ ] Victory notification system

### **Priorità Bassa:**
11. [ ] Advanced filtering/sorting tokens
12. [ ] Historical data charts
13. [ ] Leaderboard integration
14. [ ] Analytics dashboard

---

## 📝 Notes Importanti

### **TypeScript Types:**

Tutti gli hooks sono fully typed:
```typescript
interface UseTokenBattleStateResult {
  state: ParsedTokenBattleState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

### **Wallet Adapter:**

Gli hooks usano wallet adapter hooks:
```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const { connection } = useConnection();
const { publicKey } = useWallet();
```

### **PDA Derivation:**

Gli hooks importano helpers da pdas.ts:
```typescript
import { getBattleStatePDA, getPriceOraclePDA } from '@/lib/solana/pdas';

const [battleStatePDA] = getBattleStatePDA(mint);
const [priceOraclePDA] = getPriceOraclePDA();
```

### **No Mock Data:**

**TUTTO è fetched on-chain reale:**
- No hardcoded data
- No mock responses
- Real blockchain queries
- Actual account parsing

### **Decimals:**

**BONK tokens hanno 6 decimals:**
- Raw: 1,000,000 = 1 token
- Display: `balance / 1e6`
- SOL ha 9 decimals: `lamports / 1e9`

---

## ✅ Checklist Completamento

- [x] Hook `useTokenBattleState` implementato
- [x] Hook `usePriceOracle` implementato
- [x] Hook `useUserTokenBalance` implementato
- [x] Helper hooks implementati (6 helpers)
- [x] Account parsing manuale completo
- [x] BN → number conversions
- [x] Timestamp parsing (i64 → number)
- [x] Auto-refetch con polling
- [x] Manual refetch functions
- [x] Error handling completo
- [x] Wallet integration
- [x] TypeScript types completi
- [x] JSDoc documentation
- [x] File esempi completo (7 examples)
- [x] Documentazione completa

---

## 🔗 Riferimenti

**File Correlati:**
- [useTokenBattleState.ts](app/src/hooks/useTokenBattleState.ts)
- [usePriceOracle.ts](app/src/hooks/usePriceOracle.ts)
- [useUserTokenBalance.ts](app/src/hooks/useUserTokenBalance.ts)
- [hooks.example.tsx](app/src/hooks/hooks.example.tsx)
- [types/bonk.ts](app/src/types/bonk.ts) - ParsedTokenBattleState, BattleStatus
- [lib/solana/pdas.ts](app/src/lib/solana/pdas.ts) - PDA helpers

**Dependencies:**
- `@solana/web3.js` - PublicKey, Connection
- `@solana/wallet-adapter-react` - useConnection, useWallet
- `@solana/spl-token` - getAssociatedTokenAddressSync
- `react` - useState, useEffect, useCallback

---

**Status:** ✅ READY FOR UI INTEGRATION
**Next:** Creare UI components usando questi hooks (Session 5)

🎮 **BONK BATTLE - State Management Complete!** 🚀
