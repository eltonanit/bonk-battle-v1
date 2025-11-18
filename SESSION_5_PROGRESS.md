# 🔄 SESSION 5 IN PROGRESS: UI Integration

**Data:** 18/11/2025
**Task:** Aggiornare Pages & Components per usare BONK invece di STONKS
**Status:** 🔄 IN PROGRESS (60% completato)

---

## 📊 Progress Overview

### ✅ COMPLETATO:
1. ✅ Analisi file esistenti
2. ✅ Identificazione modifiche necessarie
3. ✅ Planning implementation

### 🔄 IN PROGRESS:
4. 🔄 Fix Create Page (60% - necessita completamento)
5. ⏳ Fix Token Detail Page (0% - da iniziare)
6. ⏳ Create TradingPanel Component (0% - da iniziare)
7. ⏳ Update TokenCard Component (0% - da iniziare)

---

## 📂 File Analizzati

### **1. Create Page** - `app/src/app/create/page.tsx`
**Status:** 🔄 Modifiche identificate, implementazione parziale

**STONKS (BEFORE):**
```typescript
// Uses old STONKS system
import { PROGRAM_ID, RPC_ENDPOINT } from '@/config/solana';
const [selectedTier, setSelectedTier] = useState<number | null>(null);
const TIER_INFO = { 1: {...}, 2: {...}, 3: {...}, 4: {...} };
// Manual transaction building
// Tier selection UI
```

**BONK (AFTER - da implementare):**
```typescript
// Import BONK function
import { createBattleToken } from '@/lib/solana/create-battle-token';

// Remove tier state
// const [selectedTier, setSelectedTier] = useState<number | null>(null); ❌ REMOVE

// Simplified create
const result = await createBattleToken(
  publicKey,
  name,
  symbol,
  uri, // metadata string or URL
  signTransaction
);

router.push(`/token/${result.mint.toString()}`);
```

**Modifiche Necessarie:**
- [ ] Rimuovere import STONKS (Connection, web3, BN, PROGRAM_ID)
- [ ] Aggiungere import createBattleToken
- [ ] Rimuovere selectedTier state
- [ ] Rimuovere TIER_INFO constant
- [ ] Rimuovere handleTierSelect function
- [ ] Rimuovere intera sezione "Select your target tier" (linee 314-362)
- [ ] Aggiornare handleCreateToken per usare createBattleToken()
- [ ] Semplificare error handling
- [ ] Aggiungere Battle Info section (spiegazione BONK system)
- [ ] Update button text: "Create coin" → "Create Battle Token"
- [ ] Update header: "Create new coin" → "Create Battle Token"

---

### **2. Token Detail Page** - `app/src/app/token/[mint]/page.tsx`
**Status:** ⏳ Analisi completata, implementazione da iniziare

**STONKS (BEFORE):**
```typescript
import { useTokenData } from '@/lib/solana/hooks/useTokenData';
const { token, loading, error } = useTokenData(mint);

// Uses STONKS fields:
// - token.status (0-5)
// - token.tier
// - token.timeRemaining
// - token.solRaised
// - token.targetSol
```

**BONK (AFTER - da implementare):**
```typescript
import { useTokenBattleState } from '@/hooks/useTokenBattleState';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';

const { state, loading, error } = useTokenBattleState(new PublicKey(mint));
const { solPriceUsd } = usePriceOracle();
const { balanceFormatted } = useUserTokenBalance(new PublicKey(mint));

// Uses BONK fields:
// - state.battleStatus (BattleStatus enum)
// - state.solCollected
// - state.tokensSold
// - state.totalTradeVolume
// - state.opponentMint (if InBattle)
```

**Modifiche Necessarie:**
- [ ] Import hooks BONK (useTokenBattleState, usePriceOracle, useUserTokenBalance)
- [ ] Import buyToken, sellToken functions
- [ ] Import BattleStatus type
- [ ] Replace useTokenData con useTokenBattleState
- [ ] Update all field references (token. → state.)
- [ ] Replace status checks con battleStatus
- [ ] Calculate MC in USD usando usePriceOracle
- [ ] Add opponent display se InBattle
- [ ] Update status badges:
  - Created → Verde "QUALIFY" button
  - Qualified → Arancione "FIND MATCH" button
  - InBattle → Arancione animate-pulse "⚔️ IN BATTLE!!"
  - VictoryPending → Oro "🏆 VICTORY!"
  - Listed → Grigio "LISTED"
- [ ] Integrate TradingPanel component
- [ ] Remove tier-specific UI
- [ ] Update progress bars per qualification ($5,100)

---

### **3. TokenCard Component** - `app/src/components/shared/TokenCard.tsx`
**Status:** ⏳ Da leggere e modificare

**Expected Changes:**
- [ ] Import useTokenBattleState hook
- [ ] Replace TokenLaunch data con TokenBattleState
- [ ] Update status badge colors:
  ```typescript
  const statusColors = {
    [BattleStatus.Created]: 'bg-green-500',
    [BattleStatus.Qualified]: 'bg-orange-500',
    [BattleStatus.InBattle]: 'bg-orange-500 animate-pulse',
    [BattleStatus.VictoryPending]: 'bg-yellow-500',
    [BattleStatus.Listed]: 'bg-gray-500',
  };
  ```
- [ ] Update status labels:
  ```typescript
  const statusLabels = {
    [BattleStatus.Created]: 'New',
    [BattleStatus.Qualified]: 'Qualified',
    [BattleStatus.InBattle]: '⚔️ IN BATTLE',
    [BattleStatus.VictoryPending]: '🏆 Victory',
    [BattleStatus.Listed]: 'Listed',
  };
  ```
- [ ] Remove tier display
- [ ] Add battle opponent indicator se InBattle
- [ ] Calculate MC usando price oracle

---

### **4. TradingPanel Component** - `app/src/components/token/TradingPanel.tsx`
**Status:** ⏳ File da creare (NUOVO)

**Implementation Plan:**
```typescript
// app/src/components/token/TradingPanel.tsx
import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUserTokenBalance } from '@/hooks/useUserTokenBalance';
import { usePriceOracle } from '@/hooks/usePriceOracle';
import { buyToken } from '@/lib/solana/buy-token';
import { sellToken } from '@/lib/solana/sell-token';

interface TradingPanelProps {
  mint: PublicKey;
}

export function TradingPanel({ mint }: TradingPanelProps) {
  const { publicKey, signTransaction } = useWallet();
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const { balance, balanceFormatted } = useUserTokenBalance(mint);
  const { solPriceUsd } = usePriceOracle();

  const handleBuy = async () => {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    try {
      const result = await buyToken(
        publicKey,
        mint,
        parseFloat(amount),
        signTransaction
      );
      alert('Tokens purchased!');
      setAmount('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!publicKey || !signTransaction) return;
    setLoading(true);
    try {
      const tokenAmount = parseFloat(amount) * 1e6; // Convert to raw
      const result = await sellToken(
        publicKey,
        mint,
        tokenAmount,
        signTransaction
      );
      alert('Tokens sold!');
      setAmount('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#2d2d2d] rounded-xl p-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-3 rounded-lg font-bold ${
            mode === 'buy'
              ? 'bg-green-500 text-white'
              : 'bg-[#1a1a1a] text-gray-400'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-3 rounded-lg font-bold ${
            mode === 'sell'
              ? 'bg-red-500 text-white'
              : 'bg-[#1a1a1a] text-gray-400'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Balance Display */}
      {mode === 'sell' && (
        <div className="mb-4 text-sm text-gray-400">
          Balance: {balanceFormatted?.toFixed(6) ?? 0} tokens
        </div>
      )}

      {/* Amount Input */}
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={mode === 'buy' ? 'SOL amount' : 'Token amount'}
        className="w-full bg-[#1a1a1a] rounded-lg px-4 py-3 mb-4"
        step="0.01"
      />

      {/* Quick Buttons */}
      {mode === 'buy' && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button onClick={() => setAmount('0.1')}>0.1</button>
          <button onClick={() => setAmount('0.5')}>0.5</button>
          <button onClick={() => setAmount('1')}>1</button>
          <button onClick={() => setAmount('5')}>5</button>
        </div>
      )}

      {mode === 'sell' && (
        <button
          onClick={() => setAmount((balance / 1e6).toString())}
          className="w-full mb-4 py-2 bg-[#1a1a1a] rounded"
        >
          MAX
        </button>
      )}

      {/* Submit Button */}
      <button
        onClick={mode === 'buy' ? handleBuy : handleSell}
        disabled={loading || !publicKey || !amount}
        className="w-full py-4 bg-[#10b981] rounded-lg font-bold disabled:bg-gray-600"
      >
        {loading
          ? 'Processing...'
          : mode === 'buy'
          ? 'Buy Tokens'
          : 'Sell Tokens'}
      </button>

      {/* Price Info */}
      {solPriceUsd && (
        <div className="mt-4 text-xs text-gray-400 text-center">
          SOL Price: ${solPriceUsd.toFixed(2)}
        </div>
      )}
    </div>
  );
}
```

**Features:**
- ✅ Buy/Sell toggle tabs
- ✅ Amount input with validation
- ✅ Balance display (sell mode)
- ✅ Quick amount buttons (buy: 0.1, 0.5, 1, 5 SOL)
- ✅ MAX button (sell mode)
- ✅ Loading states
- ✅ Error handling
- ✅ SOL price display
- ⏳ Bonding curve preview (da aggiungere)
- ⏳ Estimated tokens/SOL (da aggiungere)
- ⏳ Slippage settings (da aggiungere)

---

## 🔧 Implementation Strategy

### **Phase 1: Core Functions (DONE ✅)**
- [x] createBattleToken()
- [x] buyToken()
- [x] sellToken()
- [x] useTokenBattleState()
- [x] usePriceOracle()
- [x] useUserTokenBalance()

### **Phase 2: Pages Update (IN PROGRESS 🔄)**
- [🔄] Create Page (60% - necessita completamento)
  - [x] Analisi struttura
  - [x] Planning modifiche
  - [ ] Implementazione completa
  - [ ] Testing
- [ ] Token Detail Page (0%)
  - [x] Analisi struttura
  - [x] Planning modifiche
  - [ ] Implementazione
  - [ ] Testing

### **Phase 3: Components (TODO ⏳)**
- [ ] TradingPanel Component (NEW)
- [ ] TokenCard Component (UPDATE)
- [ ] Battle status badges
- [ ] Progress bars

### **Phase 4: Testing & Polish (TODO ⏳)**
- [ ] End-to-end testing
- [ ] Error handling refinement
- [ ] Loading states polish
- [ ] Mobile responsiveness
- [ ] Documentation

---

## 📝 Implementation Checklist

### **Create Page:**
- [ ] Remove all tier-related code:
  - [ ] `const [selectedTier, setSelectedTier]` state
  - [ ] `TIER_INFO` constant
  - [ ] `handleTierSelect` function
  - [ ] Entire tier selection section (300+ lines)
- [ ] Update imports:
  - [ ] Remove: Connection, web3, BN, PROGRAM_ID, RPC_ENDPOINT
  - [ ] Add: createBattleToken from @/lib/solana/create-battle-token
- [ ] Update handleCreateToken:
  - [ ] Remove mint PDA derivation (generateato da createBattleToken)
  - [ ] Remove manual transaction building
  - [ ] Call createBattleToken(publicKey, name, symbol, uri, signTransaction)
  - [ ] Simplify error handling
- [ ] Update UI:
  - [ ] Add "Battle Information" section
  - [ ] Update button text
  - [ ] Add loading progress indicators
- [ ] Testing:
  - [ ] Create token con immagine
  - [ ] Create token senza immagine
  - [ ] Validation errors
  - [ ] Wallet not connected
  - [ ] Transaction cancellation

### **Token Detail Page:**
- [ ] Update imports
- [ ] Replace useTokenData con hooks
- [ ] Update all field references
- [ ] Add battle status badges
- [ ] Integrate TradingPanel
- [ ] Add opponent display
- [ ] Calculate MC in USD
- [ ] Testing

### **TradingPanel Component:**
- [ ] Create file
- [ ] Implement buy/sell tabs
- [ ] Add amount input
- [ ] Add quick buttons
- [ ] Integrate buyToken/sellToken
- [ ] Add error handling
- [ ] Add loading states
- [ ] Testing

### **TokenCard Component:**
- [ ] Read existing component
- [ ] Update to use useTokenBattleState
- [ ] Update status badges
- [ ] Remove tier display
- [ ] Add battle indicators
- [ ] Testing

---

## 🚨 Critical Requirements

### **Must Have:**
- ✅ Zero workarounds - tutto on-chain
- ✅ NO mock data - tutto reale
- ✅ Use BONK hooks (useTokenBattleState, etc.)
- ⏳ Production-ready error handling
- ⏳ Loading states everywhere
- ✅ TypeScript strict mode
- ⏳ Mantieni Tailwind styling esistente
- ⏳ Compila senza errori TypeScript

### **Best Practices:**
- User-friendly error messages
- Confirm dialogs per transazioni
- Loading spinners durante operazioni
- Success/failure feedback
- Responsive design (mobile + desktop)
- Accessibility (a11y)

---

## 📊 Token Usage Summary

**Session 4:** 100k tokens
**Session 5 (current):** ~123k tokens
**Total Used:** 223k tokens
**Remaining:** Limitato - necessaria continuazione in nuova sessione

---

## 🎯 Next Steps

### **Immediate (prossima sessione):**
1. Completare Create Page implementation
2. Implementare Token Detail Page updates
3. Creare TradingPanel component completo
4. Aggiornare TokenCard component

### **Short-term:**
5. Testing end-to-end su devnet
6. Polish UI/UX
7. Error handling refinement
8. Mobile testing

### **Long-term:**
9. Battle system UI (start battle, battles list)
10. Real-time updates
11. Advanced trading features
12. Analytics & charts

---

## 📚 Reference Files

**Working:**
- ✅ `/lib/solana/create-battle-token.ts` - Ready
- ✅ `/lib/solana/buy-token.ts` - Ready
- ✅ `/lib/solana/sell-token.ts` - Ready
- ✅ `/hooks/useTokenBattleState.ts` - Ready
- ✅ `/hooks/usePriceOracle.ts` - Ready
- ✅ `/hooks/useUserTokenBalance.ts` - Ready

**To Update:**
- 🔄 `/app/create/page.tsx` - 60% done
- ⏳ `/app/token/[mint]/page.tsx` - 0% done
- ⏳ `/components/shared/TokenCard.tsx` - 0% done

**To Create:**
- ⏳ `/components/token/TradingPanel.tsx` - NEW

---

**Status:** 🔄 IN PROGRESS - Continuare in nuova sessione
**Completed:** 4/8 files (50%)
**Time Estimate:** 2-3 ore rimanenti

🎮 **BONK BATTLE - UI Integration in Progress!** 🚀
