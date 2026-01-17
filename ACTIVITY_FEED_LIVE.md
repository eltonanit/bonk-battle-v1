# 🔴 ACTIVITY FEED LIVE - Implementation Guide

## 📋 Overview

Feed in tempo reale che mostra OGNI transazione mentre accade, creando **social proof** e **FOMO**.

### Effetto Psicologico

| Senza Activity Feed | Con Activity Feed |
|---------------------|-------------------|
| Utente arriva | Utente arriva |
| Vede pagina statica | Vede transazioni ogni 2 sec |
| "È morto? C'è qualcuno?" | "Wow qui succede qualcosa!" |
| Non si fida | FOMO: "Tutti comprano!" |
| **ESCE** ❌ | **COMPRA** ✅ |

---

## 🏗️ Architettura Tecnica

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  BLOCKCHAIN (Solana)                                        │
│                                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Transaction occurs
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  HELIUS WEBHOOK                                             │
│  POST /api/webhook/helius                                   │
│                                                             │
│  - Riceve transaction data                                 │
│  - Valida signature                                         │
│  - Estrae info rilevanti                                    │
│                                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Formatted event
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  WEBSOCKET SERVER                                           │
│  (Pusher / Socket.io / Supabase Realtime)                  │
│                                                             │
│  - Broadcast event to all connected clients                │
│  - Channel: "activity-feed"                                 │
│                                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Real-time stream
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  FRONTEND (React)                                           │
│  components/feed/ActivityFeed.tsx                           │
│                                                             │
│  - Sottoscrizione a WebSocket                              │
│  - Visualizza eventi in real-time                          │
│  - Animazioni & filtri                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Struttura Dati

### Event Type

```typescript
interface ActivityEvent {
  id: string;                    // Unique event ID
  type: 'buy' | 'sell' | 'milestone';
  user: string;                  // Wallet address or @username
  token: {
    mint: string;
    symbol: string;
    name: string;
    image?: string;
  };
  amount: {
    lamports: number;            // Amount in lamports
    usd: number;                 // USD value
    tokens: number;              // Number of tokens
  };
  timestamp: number;             // Unix timestamp
  signature: string;             // Transaction signature
  isWhale: boolean;              // true if > $1000
  isNowMoment: boolean;          // true if during NOW MOMENT
  battleStatus?: 'qualified' | 'inbattle' | 'victory';
}
```

### Milestone Event

```typescript
interface MilestoneEvent {
  id: string;
  type: 'milestone';
  token: {
    mint: string;
    symbol: string;
    name: string;
  };
  milestone: {
    type: 'market_cap' | 'volume' | 'holders';
    value: number;
    label: string;              // "$2.5B Market Cap"
  };
  timestamp: number;
}
```

---

## 📁 File Importanti

### Backend (API Routes)

```
app/src/app/api/
├── webhook/
│   └── helius/
│       └── route.ts              ⭐ NUOVO - Riceve transazioni da Helius
│
├── activity/
│   ├── recent/
│   │   └── route.ts              ⭐ NUOVO - GET ultimi 50 eventi
│   └── stats/
│       └── route.ts              ⭐ NUOVO - Stats ora/giorno
│
└── socket/
    └── route.ts                  ⭐ NUOVO - WebSocket endpoint (se non usi Supabase)
```

### Frontend (Components)

```
app/src/components/
├── feed/
│   ├── ActivityFeed.tsx          ⭐ NUOVO - Componente principale
│   ├── ActivityItem.tsx          ⭐ NUOVO - Singolo evento
│   ├── ActivityFilters.tsx       ⭐ NUOVO - Filtri (ALL/BUYS/SELLS/WHALES)
│   ├── ActivityStats.tsx         ⭐ NUOVO - Stats bottom (txs/vol/users)
│   └── useActivityFeed.ts        ⭐ NUOVO - Hook per WebSocket
│
└── ui/
    └── LiveBadge.tsx             ⭐ NUOVO - Badge "LIVE" animato
```

### Utils & Hooks

```
app/src/lib/
├── websocket/
│   ├── client.ts                 ⭐ NUOVO - WebSocket client setup
│   └── types.ts                  ⭐ NUOVO - TypeScript types
│
└── formatters/
    ├── activity.ts               ⭐ NUOVO - Formatta eventi per UI
    └── timeAgo.ts                ✅ ESISTE - Formatta timestamp ("2s ago")
```

### Database (Supabase)

```
supabase/migrations/
└── YYYYMMDD_activity_feed.sql    ⭐ NUOVO - Tabella per eventi
```

---

## 🗄️ Database Schema

### Tabella `activity_events`

```sql
CREATE TABLE activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event Info
  type text NOT NULL CHECK (type IN ('buy', 'sell', 'milestone')),
  signature text UNIQUE NOT NULL,

  -- User
  user_wallet text NOT NULL,

  -- Token
  token_mint text NOT NULL,
  token_symbol text NOT NULL,
  token_name text,
  token_image text,

  -- Amounts
  lamports bigint NOT NULL,
  usd_value decimal(18, 2),
  token_amount decimal(18, 8),

  -- Flags
  is_whale boolean DEFAULT false,
  is_now_moment boolean DEFAULT false,

  -- Battle Context
  battle_status text CHECK (battle_status IN ('qualified', 'inbattle', 'victory')),

  -- Timestamp
  created_at timestamptz DEFAULT now(),

  -- Indexes
  CONSTRAINT fk_token FOREIGN KEY (token_mint) REFERENCES tokens(mint) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_activity_created_at ON activity_events(created_at DESC);
CREATE INDEX idx_activity_type ON activity_events(type);
CREATE INDEX idx_activity_token ON activity_events(token_mint);
CREATE INDEX idx_activity_whale ON activity_events(is_whale) WHERE is_whale = true;
CREATE INDEX idx_activity_now ON activity_events(is_now_moment) WHERE is_now_moment = true;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
```

### Tabella `activity_stats`

```sql
CREATE TABLE activity_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time Window
  time_window text NOT NULL, -- 'hour' | 'day'
  window_start timestamptz NOT NULL,

  -- Stats
  total_transactions integer DEFAULT 0,
  total_volume_usd decimal(18, 2) DEFAULT 0,
  unique_users integer DEFAULT 0,
  whale_count integer DEFAULT 0,

  -- Metadata
  updated_at timestamptz DEFAULT now(),

  UNIQUE(time_window, window_start)
);

CREATE INDEX idx_stats_window ON activity_stats(time_window, window_start DESC);
```

---

## 🔧 Implementazione Step-by-Step

### Step 1: Setup Helius Webhook

**File: `app/src/app/api/webhook/helius/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pusher } from 'pusher'; // O Supabase Realtime

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

export async function POST(req: NextRequest) {
  try {
    // 1. Validate Helius signature
    const signature = req.headers.get('helius-signature');
    // ... validate signature logic

    // 2. Parse webhook data
    const events = await req.json();

    for (const event of events) {
      // 3. Extract transaction info
      const { signature, type, accounts, amount } = parseTransaction(event);

      // 4. Get token info from DB
      const { data: token } = await supabase
        .from('tokens')
        .select('mint, symbol, name, image')
        .eq('mint', accounts.tokenMint)
        .single();

      if (!token) continue;

      // 5. Calculate USD value
      const usdValue = await calculateUSDValue(amount);

      // 6. Create activity event
      const activityEvent = {
        type: type === 'transfer_in' ? 'buy' : 'sell',
        signature,
        user_wallet: accounts.user,
        token_mint: token.mint,
        token_symbol: token.symbol,
        token_name: token.name,
        token_image: token.image,
        lamports: amount,
        usd_value: usdValue,
        is_whale: usdValue > 1000,
        is_now_moment: await checkNowMoment(token.mint),
      };

      // 7. Save to DB
      const { data: savedEvent } = await supabase
        .from('activity_events')
        .insert(activityEvent)
        .select()
        .single();

      // 8. Broadcast via WebSocket
      await pusher.trigger('activity-feed', 'new-event', {
        ...savedEvent,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

// Helper functions
function parseTransaction(event: any) {
  // Parse Helius transaction format
  // Extract: signature, type, accounts, amount
  return {
    signature: event.signature,
    type: event.type,
    accounts: {
      user: event.feePayer,
      tokenMint: event.tokenTransfers[0]?.mint,
    },
    amount: event.tokenTransfers[0]?.tokenAmount,
  };
}

async function calculateUSDValue(lamports: number): Promise<number> {
  // Fetch SOL price
  const solPrice = await fetch('/api/price/sol').then(r => r.json());
  return (lamports / 1e9) * solPrice.price;
}

async function checkNowMoment(tokenMint: string): Promise<boolean> {
  // Check if token is in NOW MOMENT (last 10 minutes has high activity)
  const { data: recentEvents } = await supabase
    .from('activity_events')
    .select('id')
    .eq('token_mint', tokenMint)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(10);

  return (recentEvents?.length || 0) >= 10;
}
```

---

### Step 2: API Endpoint per Eventi Recenti

**File: `app/src/app/api/activity/recent/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');
  const type = searchParams.get('type'); // 'buy' | 'sell' | null
  const whalesOnly = searchParams.get('whales') === 'true';
  const tokenMint = searchParams.get('token');

  try {
    let query = supabase
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (type) query = query.eq('type', type);
    if (whalesOnly) query = query.eq('is_whale', true);
    if (tokenMint) query = query.eq('token_mint', tokenMint);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ events: data });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

---

### Step 3: Frontend Component - ActivityFeed

**File: `app/src/components/feed/ActivityFeed.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useActivityFeed } from './useActivityFeed';
import { ActivityItem } from './ActivityItem';
import { ActivityFilters } from './ActivityFilters';
import { ActivityStats } from './ActivityStats';
import { LiveBadge } from '@/components/ui/LiveBadge';

export function ActivityFeed() {
  const [filter, setFilter] = useState<'all' | 'buys' | 'sells' | 'whales' | 'now'>('all');
  const { events, stats, isConnected } = useActivityFeed(filter);

  return (
    <div className="bg-[#1a1a24] border border-[#2a2a3a] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">🔴 LIVE ACTIVITY</h2>
          <LiveBadge isLive={isConnected} />
        </div>
      </div>

      {/* Filters */}
      <ActivityFilters
        currentFilter={filter}
        onFilterChange={setFilter}
      />

      {/* Events List */}
      <div className="space-y-3 mt-4 max-h-[600px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Waiting for transactions...</p>
          </div>
        ) : (
          events.map((event) => (
            <ActivityItem key={event.id} event={event} />
          ))
        )}
      </div>

      {/* Stats Footer */}
      <ActivityStats stats={stats} />
    </div>
  );
}
```

---

### Step 4: WebSocket Hook

**File: `app/src/components/feed/useActivityFeed.ts`**

```typescript
import { useState, useEffect } from 'react';
import Pusher from 'pusher-js'; // O usa Supabase Realtime
import { ActivityEvent } from '@/lib/websocket/types';

export function useActivityFeed(filter: string) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState({ txs: 0, volume: 0, users: 0 });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Fetch initial events
    fetchRecentEvents();

    // 2. Setup WebSocket (Pusher example)
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe('activity-feed');

    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true);
    });

    channel.bind('new-event', (newEvent: ActivityEvent) => {
      // Apply filter
      if (shouldShowEvent(newEvent, filter)) {
        setEvents((prev) => [newEvent, ...prev].slice(0, 50));
      }

      // Update stats
      setStats((prev) => ({
        txs: prev.txs + 1,
        volume: prev.volume + newEvent.amount.usd,
        users: prev.users, // Recalculate from DB
      }));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [filter]);

  async function fetchRecentEvents() {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('type', filter);

    const response = await fetch(`/api/activity/recent?${params}`);
    const { events } = await response.json();
    setEvents(events);
  }

  function shouldShowEvent(event: ActivityEvent, filter: string): boolean {
    switch (filter) {
      case 'buys': return event.type === 'buy';
      case 'sells': return event.type === 'sell';
      case 'whales': return event.isWhale;
      case 'now': return event.isNowMoment;
      default: return true;
    }
  }

  return { events, stats, isConnected };
}
```

---

### Step 5: Activity Item Component

**File: `app/src/components/feed/ActivityItem.tsx`**

```typescript
import { ActivityEvent } from '@/lib/websocket/types';
import { timeAgo } from '@/lib/formatters/timeAgo';

interface Props {
  event: ActivityEvent;
}

export function ActivityItem({ event }: Props) {
  const isBuy = event.type === 'buy';

  return (
    <div className="flex items-center gap-3 p-3 bg-[#12121a] rounded-lg hover:bg-[#1a1a24] transition-all">
      {/* Icon */}
      <div className={`text-2xl ${event.isWhale ? '🐋' : isBuy ? '🟢' : '🔴'}`}>
        {event.isWhale ? '🐋' : isBuy ? '🟢' : '🔴'}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {event.user.slice(0, 6)}...{event.user.slice(-4)}
          </span>
          <span className="text-sm font-medium">
            {isBuy ? 'bought' : 'sold'}
          </span>
          <span className="text-sm font-bold text-[#00ff88]">
            ${event.amount.usd.toLocaleString()}
          </span>
          <span className="text-sm">of</span>
          <span className="text-sm font-semibold">{event.token.symbol}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mt-1">
          {event.isWhale && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-bold rounded">
              WHALE
            </span>
          )}
          {event.isNowMoment && (
            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded">
              NOW MOMENT
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500">
        {timeAgo(event.timestamp)}
      </div>
    </div>
  );
}
```

---

## 🎯 Filtri Strategici

| Filtro | Mostra | Effetto Psicologico |
|--------|--------|---------------------|
| **ALL** | Tutti gli eventi | Overview completo |
| **BUYS** | Solo acquisti | "Tutti stanno comprando!" |
| **SELLS** | Solo vendite | "Opportunità per comprare basso" |
| **WHALES** | Solo > $1000 | "I ricchi sanno qualcosa" |
| **NOW MOMENTS** | Solo durante NOW | "Funziona, la gente lo usa" |

---

## 📦 Dipendenze da Installare

```bash
# WebSocket (scegli uno)
npm install pusher-js pusher          # Opzione 1: Pusher
# oppure usa Supabase Realtime (già incluso)

# Formatting
npm install date-fns                  # Time formatting
npm install numeral                   # Number formatting

# Optional: Framer Motion per animazioni
npm install framer-motion
```

---

## 🔐 Environment Variables

```env
# Pusher (se usi Pusher)
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=eu
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_pusher_secret

# Helius Webhook
HELIUS_WEBHOOK_SECRET=your_webhook_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🚀 Deployment Checklist

### 1. Database Setup
- [ ] Creare tabella `activity_events`
- [ ] Creare tabella `activity_stats`
- [ ] Abilitare Supabase Realtime
- [ ] Creare indexes

### 2. Backend
- [ ] Implementare webhook Helius
- [ ] Implementare API `/api/activity/recent`
- [ ] Setup WebSocket server (Pusher o Supabase)
- [ ] Test webhook con Helius dashboard

### 3. Frontend
- [ ] Creare componente `ActivityFeed`
- [ ] Implementare hook `useActivityFeed`
- [ ] Aggiungere filtri
- [ ] Aggiungere animazioni

### 4. Helius Configuration
- [ ] Registrare webhook URL su Helius dashboard
- [ ] Configurare eventi da tracciare:
  - `TRANSFER` (token transfers)
  - `SWAP` (DEX swaps)
- [ ] Test con transazioni reali

### 5. Performance
- [ ] Limite eventi in memoria (max 50)
- [ ] Database cleanup job (elimina eventi > 7 giorni)
- [ ] Rate limiting su webhook
- [ ] Caching stats

---

## 📊 UI Mockup

```
┌─────────────────────────────────────────────────┐
│  🔴 LIVE ACTIVITY                    ● LIVE     │
├─────────────────────────────────────────────────┤
│ [ALL] [BUYS] [SELLS] [WHALES] [NOW MOMENTS]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🐋 @whale bought $5,000 of USA         2s ago  │
│    ■ WHALE                                      │
│                                                 │
│ 🟢 @degen99 bought $200 of FOOTBALL    5s ago  │
│    ■ During NOW MOMENT                          │
│                                                 │
│ 🔴 @paper sold $500 of TV             12s ago  │
│                                                 │
│ 🟢 @hodler bought $1,000 of AI        18s ago  │
│                                                 │
│ 🎯 MILESTONE: USA hit $2.5B!          45s ago  │
│                                                 │
├─────────────────────────────────────────────────┤
│ Last hour: 847 txs | $2.4M vol | 234 users     │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Dove Mostrare l'Activity Feed

### 1. Homepage
- Sidebar destra
- Mostra feed globale (tutti i token)
- Filtro default: BUYS (per FOMO)

### 2. Battle Page
- Sotto le card dei token
- Mostra solo transazioni dei 2 token in battle
- Highlight quando qualcuno compra durante NOW MOMENT

### 3. Token Detail Page
- Tab dedicato "Activity"
- Mostra solo transazioni di quel token
- Include milestones (MC raggiunto, ecc.)

### 4. Leaderboard Page
- Mini feed in sidebar
- Mostra solo WHALES
- Effetto "I ricchi lo stanno facendo"

---

## ⚡ Performance Tips

1. **Limit eventi in memoria**: Max 50 eventi nel state
2. **Virtualized list**: Usa `react-window` se > 100 eventi
3. **Debounce updates**: Non aggiornare UI più di 1 volta al secondo
4. **Cleanup vecchi eventi**: Database job che elimina eventi > 7 giorni
5. **WebSocket reconnect**: Auto-reconnect se connessione cade

---

## 🧪 Testing

### Test Webhook Helius

1. Vai su Helius Dashboard
2. Configura webhook per il tuo program
3. Fai una transazione test
4. Verifica che arrivi al tuo endpoint
5. Controlla che venga salvato in DB
6. Verifica broadcast WebSocket

### Test Frontend

1. Apri browser console
2. Verifica connessione WebSocket
3. Fai transazione test
4. Controlla che appaia nel feed
5. Testa tutti i filtri

---

## 🎯 Success Metrics

Una volta implementato, monitora:

| Metric | Target | Perché |
|--------|--------|--------|
| **Average Session Time** | +40% | Più engagement |
| **Bounce Rate** | -25% | Più interessante |
| **Conversion Rate** | +15% | Più FOMO = più comprano |
| **Return Visitors** | +30% | Vogliono vedere activity |

---

## 🚨 Troubleshooting

### WebSocket non si connette
- Verifica CORS settings
- Controlla Pusher credentials
- Testa con Pusher debug console

### Eventi non arrivano
- Verifica Helius webhook URL
- Controlla signature validation
- Testa con Postman

### Performance lenta
- Riduci limite eventi
- Aggiungi indexes DB
- Usa CDN per assets

---

## 📚 Riferimenti

- [Helius Webhooks Docs](https://docs.helius.dev/webhooks-and-websockets/webhooks)
- [Pusher Docs](https://pusher.com/docs/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Query](https://tanstack.com/query/latest)

---

## ✅ Next Steps

1. **Fase 1**: Implementare backend (webhook + DB)
2. **Fase 2**: Implementare frontend base (senza WebSocket)
3. **Fase 3**: Aggiungere WebSocket per real-time
4. **Fase 4**: Aggiungere filtri e animazioni
5. **Fase 5**: Deploy e test con transazioni reali

**Estimated Time**: 2-3 giorni per developer esperto

---

🚀 **Ready to implement?** Inizia con Step 1 (Database Schema)!
