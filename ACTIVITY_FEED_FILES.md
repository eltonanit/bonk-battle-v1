# 📁 Activity Feed - Lista File da Creare

## ✅ Checklist Implementazione

### 🗄️ Database

- [ ] `supabase/migrations/20260117_activity_feed.sql`
  - Tabella `activity_events`
  - Tabella `activity_stats`
  - Indexes
  - Enable Realtime

---

### 🔧 Backend API

- [ ] `app/src/app/api/webhook/helius/route.ts`
  - Riceve webhooks da Helius
  - Valida signature
  - Salva in DB
  - Broadcast WebSocket

- [ ] `app/src/app/api/activity/recent/route.ts`
  - GET ultimi 50 eventi
  - Filtri: type, whales, token
  - Paginazione

- [ ] `app/src/app/api/activity/stats/route.ts`
  - GET stats ultima ora/giorno
  - Total txs, volume, users

---

### 🎨 Frontend Components

- [ ] `app/src/components/feed/ActivityFeed.tsx`
  - Componente principale
  - Layout + header + filtri + lista + stats

- [ ] `app/src/components/feed/ActivityItem.tsx`
  - Singolo evento
  - Icon (🐋/🟢/🔴)
  - User + action + token + amount
  - Badges (WHALE, NOW MOMENT)
  - Timestamp

- [ ] `app/src/components/feed/ActivityFilters.tsx`
  - Tabs: ALL, BUYS, SELLS, WHALES, NOW MOMENTS
  - Active state

- [ ] `app/src/components/feed/ActivityStats.tsx`
  - Footer con stats
  - Last hour: txs | volume | users

- [ ] `app/src/components/feed/useActivityFeed.ts`
  - Hook per WebSocket
  - Fetch initial events
  - Subscribe to real-time
  - Apply filters
  - Update stats

- [ ] `app/src/components/ui/LiveBadge.tsx`
  - Badge "● LIVE" animato
  - Pulsating animation
  - Red quando connesso

---

### 🔌 WebSocket Setup

- [ ] `app/src/lib/websocket/client.ts`
  - Setup Pusher o Supabase Realtime
  - Connection handling
  - Reconnect logic

- [ ] `app/src/lib/websocket/types.ts`
  - TypeScript interfaces:
    - `ActivityEvent`
    - `MilestoneEvent`
    - `ActivityStats`

---

### 🛠️ Utils & Helpers

- [ ] `app/src/lib/formatters/activity.ts`
  - `formatActivityEvent()` - Formatta per UI
  - `formatAmount()` - USD formatting
  - `shortenWallet()` - Wallet address

- [ ] `app/src/lib/formatters/timeAgo.ts`
  - ✅ GIÀ ESISTE (verificare)
  - Formatta timestamp: "2s ago", "5m ago"

- [ ] `app/src/lib/parsers/helius.ts`
  - `parseHeliusTransaction()` - Parse webhook
  - Extract: signature, type, user, token, amount

---

### 🎯 Integrazioni nelle Pagine

- [ ] `app/src/app/page.tsx` (Homepage)
  - Aggiungere `<ActivityFeed />` nella sidebar destra
  - Mostra feed globale

- [ ] `app/src/app/battle/[id]/page.tsx` (Battle Page)
  - Aggiungere `<ActivityFeed tokenMint={tokenA} />` sotto le card
  - Mostra solo transazioni dei 2 token

- [ ] `app/src/app/token/[mint]/page.tsx` (Token Detail)
  - Tab "Activity" con `<ActivityFeed tokenMint={mint} />`

- [ ] `app/src/app/leaderboard/page.tsx` (Leaderboard)
  - Mini feed sidebar con solo WHALES

---

## 📋 Priorità di Implementazione

### 🥇 Fase 1 - Core (Giorno 1)
1. Database schema + migrations
2. Webhook Helius endpoint
3. API `/activity/recent`
4. Componente `ActivityFeed` base (senza WebSocket)

### 🥈 Fase 2 - Real-Time (Giorno 2)
5. Setup WebSocket (Pusher/Supabase)
6. Hook `useActivityFeed` con WebSocket
7. Test real-time updates

### 🥉 Fase 3 - Polish (Giorno 3)
8. Filtri funzionanti
9. Stats footer
10. Animazioni e transizioni
11. Integrare in tutte le pagine

---

## 🔗 Dipendenze tra File

```
DATABASE
  ↓
WEBHOOK → API RECENT
  ↓           ↓
WEBSOCKET ← HOOK
  ↓
COMPONENTS
  ↓
PAGES
```

**Ordine di creazione consigliato**:
1. Database schema
2. Webhook endpoint
3. API recent
4. Types & Utils
5. WebSocket client
6. Hook useActivityFeed
7. Components UI
8. Integrazioni pagine

---

## 🧪 File di Test (Opzionale)

- [ ] `app/src/app/api/webhook/helius/__tests__/route.test.ts`
  - Test webhook parsing
  - Test signature validation

- [ ] `app/src/components/feed/__tests__/ActivityFeed.test.tsx`
  - Test rendering
  - Test filtri
  - Test WebSocket mock

---

## 📦 Package da Installare

```bash
# WebSocket
npm install pusher pusher-js

# Formatting
npm install date-fns numeral

# Testing (opzionale)
npm install -D @testing-library/react vitest
```

---

## 🔧 Config Files da Modificare

- [ ] `.env.local`
  ```env
  NEXT_PUBLIC_PUSHER_KEY=...
  NEXT_PUBLIC_PUSHER_CLUSTER=eu
  PUSHER_APP_ID=...
  PUSHER_SECRET=...
  HELIUS_WEBHOOK_SECRET=...
  ```

- [ ] `tailwind.config.ts`
  - Aggiungere animazione pulse per LiveBadge

- [ ] `package.json`
  - Verificare dipendenze installate

---

## 🎯 File Totali da Creare

| Categoria | Numero File |
|-----------|-------------|
| Database | 1 |
| Backend API | 3 |
| Frontend Components | 5 |
| Hooks & Utils | 4 |
| WebSocket | 2 |
| Integrazioni | 4 |
| **TOTALE** | **19 file** |

---

## ⏱️ Tempo Stimato

| Fase | File | Tempo |
|------|------|-------|
| Database + Backend | 4 | 4-6 ore |
| WebSocket Setup | 2 | 2-3 ore |
| Components UI | 5 | 4-5 ore |
| Utils & Formatters | 4 | 1-2 ore |
| Integrazioni | 4 | 2-3 ore |
| Testing & Debug | - | 2-3 ore |
| **TOTALE** | **19** | **15-22 ore** |

---

## 🚀 Quick Start

### Passo 1: Database
```bash
cd supabase
# Crea file migration
touch migrations/20260117_activity_feed.sql
# Copia schema da ACTIVITY_FEED_LIVE.md
```

### Passo 2: Backend
```bash
mkdir -p src/app/api/webhook/helius
mkdir -p src/app/api/activity/recent
# Copia codice da ACTIVITY_FEED_LIVE.md
```

### Passo 3: Frontend
```bash
mkdir -p src/components/feed
# Crea tutti i component files
```

### Passo 4: Test
```bash
# Testa webhook con Postman
# Verifica DB
# Testa frontend
```

---

✅ **Ready!** Segui l'ordine e completa checkbox man mano che implementi.
