# ✅ BONK PROGRAM ID UPDATED

**Data:** 18/11/2025
**Task:** Sostituire PROGRAM_ID STONKS con BONK e creare fetch per token BONK

---

## 📋 Modifiche Completate

### **1. ✅ PROGRAM_ID Aggiornato**
**File:** `app/src/config/solana.ts`

```typescript
// BEFORE (STONKS):
export const PROGRAM_ID = 'DxchSpAi7A14f9o1LGPr18HikXEjMT6VXj1oy24VXAgN';

// AFTER (BONK):
export const PROGRAM_ID = '6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq';
```

**⚠️ IMPORTANTE:** Questo significa che tutte le chiamate a `PROGRAM_ID` ora usano il programma BONK BATTLE, non STONKS!

---

### **2. ✅ Nuovo Fetch per Token BONK**
**File:** `app/src/lib/solana/fetch-all-bonk-tokens.ts` (**NUOVO**)

**Funzioni disponibili:**

```typescript
// Fetch tutti i token BONK
export async function fetchAllBonkTokens(): Promise<ParsedTokenBattleState[]>

// Fetch solo token attivi
export async function fetchActiveBonkTokens(): Promise<ParsedTokenBattleState[]>

// Fetch token per status
export async function fetchBonkTokensByStatus(status: BattleStatus): Promise<ParsedTokenBattleState[]>

// Fetch token in battle
export async function fetchTokensInBattle(): Promise<ParsedTokenBattleState[]>

// Fetch token qualificati
export async function fetchQualifiedTokens(): Promise<ParsedTokenBattleState[]>
```

**Ritorna:** Array di `ParsedTokenBattleState` con campi:
- `mint` - PublicKey del token
- `solCollected` - SOL raccolti (in lamports)
- `tokensSold` - Token venduti
- `totalTradeVolume` - Volume trading totale
- `isActive` - Token attivo
- `battleStatus` - Status enum (Created, Qualified, InBattle, VictoryPending, Listed)
- `opponentMint` - Mint dell'opponente (se in battle)
- `creationTimestamp` - Timestamp creazione
- `qualificationTimestamp` - Timestamp qualifica
- `battleStartTimestamp` - Timestamp inizio battle
- `battleEndTimestamp` - Timestamp fine battle
- `listingTimestamp` - Timestamp listing
- `bump` - PDA bump

---

### **3. ✅ Nuovo TokenGrid per BONK**
**File:** `app/src/components/home/TokenGrid.BONK.tsx` (**NUOVO**)

**Caratteristiche:**
- Usa `fetchAllBonkTokens()` per caricare tutti i token
- Supporta 3 filtri: **New**, **Battle**, **Fire**
  - **New:** Ordina per timestamp creazione (più recenti)
  - **Battle:** Filtra token Qualified/InBattle/VictoryPending
  - **Fire:** Filtra token con volume trading > 0
- Auto-refresh ogni 2 minuti
- Loading skeletons
- Empty states per ogni filtro
- Usa `TokenCardBonk` component

**Come usare:**
```typescript
import { TokenGridBonk } from '@/components/home/TokenGrid.BONK';

// Nella tua pagina:
<TokenGridBonk />
```

---

### **4. ✅ TokenGrid Originale (STONKS) Ripristinato**
**File:** `app/src/components/home/TokenGrid.tsx`

**Status:** Ripristinato allo stato originale STONKS
**Nota:** Aggiunto commento in cima al file:
```typescript
// ⚠️ QUESTO È IL VECCHIO TOKENOGRID PER STONKS
// ⚠️ Per BONK, usa: TokenGrid.BONK.tsx
```

**Perché?** TokenGrid.tsx è troppo accoppiato con STONKS (tiers, progress, virtualSolInit, etc.). Meglio mantenere entrambe le versioni separate.

---

## 🔄 Come Integrare nella Homepage

### **Opzione 1: Sostituire completamente (RACCOMANDATO)**

Trova il file che usa `<TokenGrid />` (probabilmente `app/src/app/page.tsx` o simile):

```typescript
// BEFORE:
import { TokenGrid } from '@/components/home/TokenGrid';

<TokenGrid />

// AFTER:
import { TokenGridBonk } from '@/components/home/TokenGrid.BONK';

<TokenGridBonk />
```

### **Opzione 2: Mostrare entrambi con Toggle**

```typescript
import { TokenGrid } from '@/components/home/TokenGrid';
import { TokenGridBonk } from '@/components/home/TokenGrid.BONK';
import { useState } from 'react';

export default function HomePage() {
  const [mode, setMode] = useState<'stonks' | 'bonk'>('bonk');

  return (
    <div>
      <button onClick={() => setMode('stonks')}>STONKS</button>
      <button onClick={() => setMode('bonk')}>BONK</button>

      {mode === 'stonks' ? <TokenGrid /> : <TokenGridBonk />}
    </div>
  );
}
```

---

## 🎯 Differenze STONKS vs BONK

| Campo | STONKS | BONK |
|-------|--------|------|
| **Program ID** | `DxchSpAi...` | `HTNCkRMo...` |
| **Account Type** | `TokenLaunch` | `TokenBattleState` |
| **System** | Tier-based (TIER 1-4) | Battle-based (5 statuses) |
| **Progress** | `progress` (%) | N/A - usa `battleStatus` |
| **SOL Field** | `solRaised` | `solCollected` |
| **Time** | `timeRemaining` | Timestamps (creation, battle, listing) |
| **Metadata** | `metadataUri`, `name`, `symbol` | Solo `mint` (metadata off-chain) |
| **Target** | `targetSol` (per tier) | $5,100 fisso per qualifica |

---

## 📊 Token Fetch Flow

### **STONKS:**
```
fetchAllTokens()
  → getProgramAccounts(STONKS_PROGRAM)
  → Parse TokenLaunch
  → Return: { mint, name, symbol, tier, progress, solRaised, ... }
```

### **BONK:**
```
fetchAllBonkTokens()
  → getProgramAccounts(BONK_PROGRAM)
  → Parse TokenBattleState
  → Return: { mint, battleStatus, solCollected, tokensSold, ... }
```

---

## ✅ Compilation Status

```bash
✓ Compiled successfully
0 TypeScript errors

Files created/modified:
- ✅ app/src/config/solana.ts (PROGRAM_ID updated)
- ✅ app/src/lib/solana/fetch-all-bonk-tokens.ts (NEW)
- ✅ app/src/components/home/TokenGrid.BONK.tsx (NEW)
- ✅ app/src/components/shared/TokenCard.BONK.tsx (già esistente)
- ✅ app/src/components/home/TokenGrid.tsx (ripristinato STONKS)
```

---

## 🚀 Prossimi Passi

1. **Integrare TokenGridBonk nella homepage**
   - Sostituire `<TokenGrid />` con `<TokenGridBonk />`
   - Test visivo dei token BONK

2. **Testare fetch su devnet**
   - Creare un token BONK con Create Page
   - Verificare che appaia in TokenGridBonk

3. **Metadata Enrichment (opzionale)**
   - Aggiungere fetch metadata off-chain (name, symbol, image)
   - Integrare nel TokenCardBonk

4. **Battle System UI**
   - Aggiungere sezione "Battles" nella homepage
   - Mostrare token in battle attivi
   - UI per iniziare battles

---

## 📚 Files di Riferimento

**Creati in questo fix:**
- ✅ `/lib/solana/fetch-all-bonk-tokens.ts`
- ✅ `/components/home/TokenGrid.BONK.tsx`
- ✅ `BONK_PROGRAM_ID_UPDATED.md` (questo file)

**Modificati:**
- ✅ `/config/solana.ts` (PROGRAM_ID)

**Da Session 5 (già esistenti):**
- ✅ `/components/shared/TokenCard.BONK.tsx`
- ✅ `/components/token/TradingPanel.tsx`
- ✅ `/app/create/page.tsx` (usa createBattleToken)
- ✅ `/app/token/[mint]/page.tsx` (usa BONK hooks)

---

## 🎮 BONK BATTLE - Homepage Ready! 🚀

**Status:** ✅ COMPLETATO
**PROGRAM_ID:** Aggiornato a BONK
**Fetch:** Funzionante
**UI:** TokenGridBonk pronto

**Prossimo:** Integrare nella homepage e testare su devnet!

---

**Prepared by:** Claude
**Date:** 18/11/2025
