# POTENTIALS.FUN - Roadmap di Implementazione

## Overview

Trasformazione da BONK-BATTLE a POTENTIALS.FUN in 5 fasi.

---

## FASE 1: NASCONDERE BATTLE FEATURES (Priorità: ALTA)

**Obiettivo**: Disabilitare tutte le funzionalità battle senza eliminare codice

### Task 1.1 - Nascondere Componenti UI
- [ ] `VictoryModal.tsx` - wrappare con `{false && ...}`
- [ ] `CreatedTicker.tsx` - wrappare con `{false && ...}`
- [ ] Qualification Popup - trovare e nascondere

### Task 1.2 - Nascondere Pagina Battle
- [ ] `/battle/[id]/page.tsx` - redirect a home o "Coming Soon"

### Task 1.3 - Disabilitare API Routes
- [ ] `finalize-duel/route.ts` - return 404 "Feature disabled"

### Task 1.4 - Disabilitare Vercel Cron
- [ ] Commentare cron `finalize-duel` in `vercel.json`

---

## FASE 2: ADATTARE GRADUATION (Priorità: ALTA)

**Obiettivo**: Token graduano singolarmente senza battaglia

### Task 2.1 - Modificare check-victory
- [ ] Rinominare logica interna (opzionale)
- [ ] Rimuovere controllo opponent/battle
- [ ] Graduation quando `sol_collected >= TARGET_SOL`
- [ ] Status: `Active → Listed` (salta InBattle/VictoryPending)

### Task 2.2 - Aggiornare create-pool
- [ ] Rimuovere logica winner/loser
- [ ] Processare qualsiasi token `Listed`

### Task 2.3 - Database
- [ ] Aggiornare significato `battle_status`:
  - 0: Created
  - 1: Active (era Qualified)
  - 4: Listed (graduated)
  - 5: PoolCreated

---

## FASE 3: AGGIUNGERE MULTIPLIER (Priorità: MEDIA)

**Obiettivo**: Sistema lottery per multiplier token

### Task 3.1 - Database
- [ ] `ALTER TABLE tokens ADD COLUMN multiplier INTEGER DEFAULT 1;`

### Task 3.2 - Token Creation
- [ ] Aggiungere `generateMultiplier()` function
- [ ] Salvare multiplier nel DB alla creazione token

```typescript
function generateMultiplier(): number {
  const rand = Math.random() * 100;
  if (rand < 0.5) return 50;   // 0.5%
  if (rand < 2) return 30;     // 1.5%
  if (rand < 5) return 20;     // 3%
  if (rand < 10) return 10;    // 5%
  return 1;                     // 90%
}
```

### Task 3.3 - UI Components
- [ ] Creare `MultiplierBadge.tsx`
- [ ] Mostrare badge su token cards
- [ ] Animazioni per multiplier alti (10x+)

---

## FASE 4: AGGIUNGERE POTENTIAL (Priorità: MEDIA)

**Obiettivo**: Mostrare metrica POTENTIAL su ogni token

### Task 4.1 - Calcolo POTENTIAL
```typescript
const calculatePotential = (percentBought: number, multiplier: number) => {
  return Math.pow(100 / (100 - percentBought), 2) * multiplier;
};
```

### Task 4.2 - UI Components
- [ ] Creare `PotentialDisplay.tsx`
- [ ] Aggiungere a `TradingPanel.tsx`
- [ ] Aggiungere a token cards nella home

### Task 4.3 - Potential Ticker (opzionale)
- [ ] Creare `PotentialTicker.tsx` - mostra token con POTENTIAL più alto

---

## FASE 5: SMART CONTRACT (Priorità: BASSA per ora)

**Obiettivo**: Nuova struttura fee con creator fee

### Task 5.1 - Nuove Fee
- Trading Fee totale: 1.5%
  - Creator: 0.4%
  - Platform: 1.1%

### Task 5.2 - Modifiche Contract
- [ ] Aggiungere `creator_wallet` a TokenBattleState
- [ ] Aggiungere `multiplier` a TokenBattleState
- [ ] Modificare `buy_token` per split fee
- [ ] Modificare `sell_token` per split fee
- [ ] Rimuovere requisito battaglia per graduation

### Task 5.3 - Deploy
- [ ] Test su devnet
- [ ] Deploy su mainnet

---

## ORDINE DI ESECUZIONE

```
OGGI:
├── FASE 1: Nascondere (1-2 ore)
│   ├── 1.1 VictoryModal
│   ├── 1.2 CreatedTicker
│   ├── 1.3 Battle Page
│   └── 1.4 finalize-duel API

DOMANI:
├── FASE 2: Graduation (2-3 ore)
│   ├── 2.1 check-victory logic
│   └── 2.2 create-pool logic

QUESTA SETTIMANA:
├── FASE 3: Multiplier (3-4 ore)
│   ├── 3.1 Database column
│   ├── 3.2 Token creation
│   └── 3.3 UI badge

├── FASE 4: Potential (2-3 ore)
│   ├── 4.1 Calcolo
│   └── 4.2 UI display

PROSSIMA SETTIMANA:
└── FASE 5: Smart Contract (1-2 giorni)
    ├── 5.1 Fee structure
    ├── 5.2 Contract update
    └── 5.3 Deploy
```

---

## INIZIAMO - FASE 1

**Primo task**: Nascondere VictoryModal

Vuoi che inizi ora con la FASE 1?

Dimmi:
1. **"vai"** - Inizio a nascondere tutti i componenti della Fase 1
2. **"solo X"** - Nascondo solo un componente specifico
3. **"mostrami prima"** - Ti mostro il codice prima di modificarlo

---

*Roadmap creata: 2026-01-27*
