# BonkBattle V2 - Architettura Tecnica

> **Documentazione per sviluppatori** - Guida completa all'architettura, database, webhook e configurazione del progetto BonkBattle.

---

## 1. Struttura del Progetto

```
bonk-battle-v1/
├── app/                          # Next.js Application
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   └── api/              # API Routes (33+ endpoints)
│   │   ├── components/           # React Components
│   │   ├── hooks/                # Custom React Hooks (15+)
│   │   ├── lib/                  # Utilities & Services
│   │   │   ├── indexer/          # Token sync services
│   │   │   ├── solana/           # Blockchain interactions
│   │   │   └── bonding-curve/    # Price calculations
│   │   ├── services/             # Backend services
│   │   ├── config/               # App configuration
│   │   ├── types/                # TypeScript types
│   │   └── providers/            # React Context providers
│   ├── prisma/                   # Prisma ORM schema
│   ├── supabase/                 # Supabase config
│   └── supabase-migrations/      # SQL migrations
├── anchor/                       # Solana Smart Contract
└── docs/                         # Documentation
```

---

## 2. Schema Database (Prisma/Supabase)

### 2.1 Tabella `tokens` - Token Battle State

```sql
CREATE TABLE tokens (
    mint                    TEXT PRIMARY KEY,
    sol_collected           BIGINT,
    tokens_sold             BIGINT,
    total_trade_volume      BIGINT,
    is_active               BOOLEAN,
    battle_status           SMALLINT,
    opponent_mint           TEXT,
    creation_timestamp      BIGINT,
    qualification_timestamp BIGINT,
    last_trade_timestamp    BIGINT,
    battle_start_timestamp  BIGINT,
    victory_timestamp       BIGINT,
    listing_timestamp       BIGINT,
    bump                    SMALLINT,
    name                    TEXT,
    symbol                  TEXT,
    uri                     TEXT,
    image                   TEXT,
    tier                    SMALLINT DEFAULT 1,
    virtual_sol_reserves    BIGINT,
    virtual_token_reserves  TEXT,
    real_sol_reserves       BIGINT,
    real_token_reserves     BIGINT,
    creator_wallet          TEXT,
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);
```

**Battle Status Enum:**
- `0` = Created
- `1` = Qualified
- `2` = InBattle
- `3` = VictoryPending
- `4` = Listed
- `5` = Eliminated

### 2.2 Tabella `users` - User Profiles

```sql
CREATE TABLE users (
    wallet_address       TEXT PRIMARY KEY,
    username             TEXT,
    email                TEXT,
    avatar_url           TEXT,
    bio                  TEXT,
    twitter              TEXT,
    website              TEXT,
    points               BIGINT DEFAULT 0,
    tier                 SMALLINT DEFAULT 1,
    welcome_bonus_claimed BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Tabella `user_trades` - Trading History (P/L Tracking)

```sql
CREATE TABLE user_trades (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  TEXT NOT NULL,
    token_mint      TEXT NOT NULL,
    signature       TEXT UNIQUE NOT NULL,
    trade_type      TEXT NOT NULL,  -- 'buy' | 'sell'
    sol_amount      BIGINT NOT NULL,
    token_amount    BIGINT NOT NULL,
    sol_price_usd   REAL,
    token_price_sol REAL,
    trade_value_usd REAL,
    block_time      TIMESTAMPTZ,
    slot            BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_wallet ON user_trades(wallet_address);
CREATE INDEX idx_trades_token ON user_trades(token_mint);
CREATE INDEX idx_trades_signature ON user_trades(signature);
```

### 2.4 Tabella `activity_feed` - Social Activity

```sql
CREATE TABLE activity_feed (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet          TEXT NOT NULL,
    action_type     TEXT NOT NULL,  -- 'create_token' | 'buy' | 'sell' | 'qualify' | 'battle_start' | 'battle_win'
    token_mint      TEXT,
    token_symbol    TEXT,
    token_image     TEXT,
    opponent_mint   TEXT,
    opponent_symbol TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_wallet ON activity_feed(wallet);
CREATE INDEX idx_activity_token ON activity_feed(token_mint);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);
```

### 2.5 Tabella `notifications`

```sql
CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet  TEXT NOT NULL,
    type         TEXT NOT NULL,
    title        TEXT NOT NULL,
    message      TEXT NOT NULL,
    data         JSONB,
    read         BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_wallet ON notifications(user_wallet);
CREATE INDEX idx_notifications_read ON notifications(read);
```

### 2.6 Tabella `price_oracle` - SOL Price

```sql
CREATE TABLE price_oracle (
    id               INTEGER PRIMARY KEY DEFAULT 1,
    sol_price_usd    REAL NOT NULL,
    last_update      BIGINT NOT NULL,
    next_update      BIGINT NOT NULL,
    update_count     BIGINT DEFAULT 0,
    keeper_authority TEXT,
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.7 Tabelle Social

```sql
-- Token Views
CREATE TABLE token_views (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_mint     TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(token_mint, wallet_address)
);

-- Token Holders
CREATE TABLE token_holders (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_mint     TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    balance        BIGINT NOT NULL,
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(token_mint, wallet_address)
);

-- Social Follows
CREATE TABLE social_follows (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_wallet  TEXT NOT NULL,
    following_wallet TEXT NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_wallet, following_wallet)
);

-- Points History
CREATE TABLE points_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet  TEXT NOT NULL,
    amount       INTEGER NOT NULL,
    reason       TEXT NOT NULL,
    metadata     JSONB,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Helius Webhook Handler

### 3.1 Endpoint

```
POST /api/webhooks/helius
```

### 3.2 Flusso di Elaborazione

```
Helius Webhook → Parse Events → Detect Event Type → Log Activity → Save Trade → Sync Token → Auto-complete Victory
```

### 3.3 Struttura Evento Helius

```typescript
interface HeliusWebhookEvent {
    signature: string;
    slot: number;
    timestamp: number;
    type: string;
    source: string;
    fee: number;
    feePayer: string;
    description: string;

    nativeTransfers?: Array<{
        amount: number;           // Lamports
        fromUserAccount: string;
        toUserAccount: string;
    }>;

    tokenTransfers?: Array<{
        mint: string;
        tokenAmount: number;      // In token units (not base)
        fromUserAccount: string;
        toUserAccount: string;
        fromTokenAccount: string;
        toTokenAccount: string;
    }>;

    accountData?: Array<{
        account: string;
        nativeBalanceChange: number;
        tokenBalanceChanges: Array<{
            mint: string;
            rawTokenAmount: { decimals: number; tokenAmount: string };
        }>;
    }>;
}
```

### 3.4 Logica di Detection

```typescript
function detectEventType(event: HeliusWebhookEvent) {
    // 1. Trova il trasferimento token
    const tokenTransfer = event.tokenTransfers?.[0];

    // 2. Trova i trasferimenti SOL (escludendo treasury)
    const solTransfersOut = event.nativeTransfers?.filter(nt =>
        nt.fromUserAccount === event.feePayer &&
        nt.toUserAccount !== TREASURY_WALLET
    );

    const solTransfersIn = event.nativeTransfers?.filter(nt =>
        nt.toUserAccount === event.feePayer
    );

    // 3. Determina il tipo
    if (solTransferOut && tokenTransfer) {
        return 'buy';   // User sent SOL, received tokens
    }
    if (solTransferIn && tokenTransfer) {
        return 'sell';  // User received SOL from selling
    }
    if (tokenTransfer && event.description?.includes('create')) {
        return 'create';
    }

    return 'unknown';
}
```

### 3.5 Pipeline di Elaborazione

```typescript
// Per ogni evento:
1. detectEventType() → Determina buy/sell/create

2. logActivity() → Salva in activity_feed per social feed

3. saveUserTrade() → Salva in user_trades per P/L tracking
   - Fetcha prezzo SOL da CoinGecko
   - Calcola trade_value_usd
   - Usa signature come chiave unica

4. syncSingleToken() → Aggiorna stato token in Supabase
   - Legge on-chain data via RPC
   - Deserializza Rust struct
   - Calcola virtual reserves
   - Upsert in tokens table

5. Auto-complete Victory → Per ogni token tradato
   - POST /api/battles/auto-complete
   - Verifica condizioni vittoria
   - Crea pool Raydium se vinto
```

---

## 4. Configurazione Supabase

### 4.1 Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Client pubblico (browser)
export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        db: { schema: 'public' },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    }
);

// Client server-side (per operazioni admin)
export const createServerSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
};
```

### 4.2 Real-time Subscriptions

```typescript
// Esempio: Notifiche real-time
const channel = supabase
    .channel(`notifications-${walletAddress}`)
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_wallet=eq.${walletAddress}`,
        },
        (payload) => {
            // Handle new notification
            const newNotif = payload.new;
            setNotifications(prev => [newNotif, ...prev]);
        }
    )
    .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

---

## 5. Token Sync Service

### 5.1 Parsing On-Chain Data

```typescript
// lib/indexer/sync-single-token.ts

// Rust struct layout (from smart contract):
// TokenBattleState {
//     mint: Pubkey,              // 32 bytes
//     sol_collected: u64,        // 8 bytes
//     tokens_sold: u64,          // 8 bytes
//     total_trade_volume: u64,   // 8 bytes
//     is_active: bool,           // 1 byte
//     battle_status: u8,         // 1 byte
//     opponent_mint: Pubkey,     // 32 bytes
//     creation_timestamp: i64,   // 8 bytes
//     last_trade_timestamp: i64, // 8 bytes
//     battle_start_timestamp: i64, // 8 bytes
//     victory_timestamp: i64,    // 8 bytes
//     listing_timestamp: i64,    // 8 bytes
//     bump: u8,                  // 1 byte
//     name: String,              // 4 + len bytes
//     symbol: String,            // 4 + len bytes
//     uri: String,               // 4 + len bytes
// }

// Account offset breakdown:
// [0-7]:   Discriminator (8 bytes)
// [8-39]:  mint (32 bytes)
// [40-47]: sol_collected (8 bytes)
// [48-55]: tokens_sold (8 bytes)
// [56-63]: total_trade_volume (8 bytes)
// [64]:    is_active (1 byte)
// [65]:    battle_status (1 byte)
// [66-97]: opponent_mint (32 bytes)
// [98-137]: timestamps (5 x 8 bytes = 40 bytes)
// [138]:   bump (1 byte)
// [139+]:  strings (variable)
```

### 5.2 Calcolo Virtual Reserves

```typescript
// La bonding curve usa xy = k (constant product)
const VIRTUAL_SOL_INIT = 13_300_000_000;  // 13.3 SOL in lamports (Production)
const BONDING_CURVE_SUPPLY = 793_100_000_000_000_000n; // 793.1M tokens

// Calcolo:
const virtualSol = VIRTUAL_SOL_INIT + solCollected;
const virtualTokens = BONDING_CURVE_SUPPLY - BigInt(tokensSold);
```

---

## 6. Hook React Principali

### 6.1 useTokenBattleState

```typescript
// Strategia: Supabase-first, NO RPC reads
// - RPC solo per transazioni (buy/sell/battle)
// - Supabase per tutti i reads

const POLLING_CONFIG = {
    BATTLE_INTERVAL: 10_000,  // 10s per battle attive
    IDLE_INTERVAL: 30_000,    // 30s per stati idle
    STALE_TIME: 5_000,
    GC_TIME: 5 * 60 * 1000,
};

export function useTokenBattleState(mint: PublicKey | null) {
    return useQuery({
        queryKey: ['token', 'battleState', mint?.toString()],
        queryFn: () => fetchFromSupabase(mint),
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.battleStatus === BattleStatus.InBattle) {
                return POLLING_CONFIG.BATTLE_INTERVAL;
            }
            return false;
        },
    });
}
```

### 6.2 useNotifications

```typescript
// Real-time con Supabase subscriptions
export function useNotifications() {
    // Fetch iniziale
    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_wallet', publicKey)
            .order('created_at', { ascending: false })
            .limit(50);
        // ...
    };

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel(`notifications-${publicKey}`)
            .on('postgres_changes', { ... }, handleNewNotif)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [publicKey]);
}
```

---

## 7. API Routes

### 7.1 Token Routes

| Route | Method | Descrizione |
|-------|--------|-------------|
| `/api/tokens` | GET | Lista tutti i token |
| `/api/tokens/set-army` | POST | Assegna army a token |
| `/api/tokens/set-creator` | POST | Set creator wallet |
| `/api/sync-token/[mint]` | POST | Sync singolo token da chain |

### 7.2 Battle Routes

| Route | Method | Descrizione |
|-------|--------|-------------|
| `/api/battles/start` | POST | Avvia battle |
| `/api/battles/find-match` | POST | Trova opponent |
| `/api/battles/status` | GET | Stato battle |
| `/api/battles/check-victory` | POST | Verifica vittoria |
| `/api/battles/auto-complete` | POST | Auto-complete pipeline |
| `/api/battles/finalize-duel` | POST | Finalizza duel |
| `/api/battles/create-pool` | POST | Crea Raydium pool |

### 7.3 User Routes

| Route | Method | Descrizione |
|-------|--------|-------------|
| `/api/user/register` | POST | Registra utente |
| `/api/user/profile` | GET/PUT | Profilo utente |
| `/api/user/profile/avatar` | POST | Upload avatar |
| `/api/user/follow` | POST | Follow/unfollow |

### 7.4 Points & Leaderboard

| Route | Method | Descrizione |
|-------|--------|-------------|
| `/api/points/add` | POST | Aggiungi punti |
| `/api/points/award` | POST | Award punti |
| `/api/points/claim-welcome` | POST | Claim bonus benvenuto |
| `/api/leaderboard` | GET | Classifica |

### 7.5 Webhooks & Cron

| Route | Method | Descrizione |
|-------|--------|-------------|
| `/api/webhooks/helius` | POST | Helius webhook |
| `/api/cron/sync-tokens` | GET | Sync periodico token |
| `/api/cron/update-price` | GET | Aggiorna prezzo SOL |

---

## 8. Tier Configuration

### 8.1 Production Tier (Mainnet)

```typescript
const PRODUCTION = {
    // Bonding Curve
    VIRTUAL_SOL_INIT: 13.3,       // SOL iniziale virtuale
    VIRTUAL_SOL_FINAL: 51,        // SOL finale (13.3 + 37.7)

    // Victory Conditions
    TARGET_SOL: 37.7,             // SOL per riempire curve
    VICTORY_VOLUME_SOL: 41.5,     // 110% del target
    QUALIFICATION_SOL: 0.75,      // Per qualificarsi (~$95)

    // Market Cap (bonding curve formula)
    MC_INIT_SOL: 12.4,            // MC iniziale in SOL
    MC_FINAL_SOL: 182.2,          // MC finale in SOL

    MULTIPLIER: 14.68,            // MC multiplier
};
```

### 8.2 Test Tier (Devnet)

```typescript
const TEST = {
    VIRTUAL_SOL_INIT: 2.05,
    VIRTUAL_SOL_FINAL: 7.86,
    TARGET_SOL: 5.8,
    VICTORY_VOLUME_SOL: 6.4,
    QUALIFICATION_SOL: 0.12,
    MC_INIT_SOL: 1.91,
    MC_FINAL_SOL: 28.08,
    MULTIPLIER: 14.68,
};
```

### 8.3 Formula Market Cap

```typescript
// Constant Product Formula (xy = k)
function calculateMarketCapSol(solCollected: number): number {
    const currentVirtualSol = VIRTUAL_SOL_INIT + solCollected;
    const k = VIRTUAL_SOL_INIT * VIRTUAL_TOKEN_INIT;
    const currentVirtualToken = k / currentVirtualSol;

    // MC = (virtualSol / virtualToken) * totalSupply
    const mcSol = (currentVirtualSol / currentVirtualToken) * TOTAL_SUPPLY;
    return mcSol;
}
```

---

## 9. Variabili d'Ambiente

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Solo server-side!

# Prisma (stessa connessione Supabase)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Solana
NEXT_PUBLIC_PROGRAM_ID=F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# Helius
HELIUS_WEBHOOK_SECRET=your_webhook_secret

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 10. Flusso Dati Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN (Solana)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Smart Contract (Anchor)                                   │   │
│  │ - create_token()                                         │   │
│  │ - buy_token()                                            │   │
│  │ - sell_token()                                           │   │
│  │ - start_battle()                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Helius Webhook
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK HANDLER                              │
│  POST /api/webhooks/helius                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Parse Helius events                                    │   │
│  │ 2. Detect event type (buy/sell/create)                   │   │
│  │ 3. Log to activity_feed                                  │   │
│  │ 4. Save to user_trades                                   │   │
│  │ 5. Sync token state → Supabase                           │   │
│  │ 6. Check victory conditions                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   tokens   │ │   users    │ │user_trades │ │activity_   │   │
│  │            │ │            │ │            │ │   feed     │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│         │                              │               │        │
│         │      Real-time Subscriptions │               │        │
│         └──────────────────────────────┼───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ React Query + Supabase Realtime
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Hooks:                                                    │   │
│  │ - useTokenBattleState() → Polling from Supabase          │   │
│  │ - useNotifications()   → Real-time subscriptions         │   │
│  │ - useFollowers()       → Activity feed                   │   │
│  │ - usePriceOracle()     → SOL price                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Transazioni (via RPC):                                    │   │
│  │ - buy-token.ts         → Chiama smart contract           │   │
│  │ - sell-token.ts        → Chiama smart contract           │   │
│  │ - start-battle.ts      → Chiama smart contract           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Checklist per Setup Nuovo Ambiente

- [ ] Creare progetto Supabase
- [ ] Eseguire migrations SQL (tabelle sopra)
- [ ] Configurare RLS policies se necessario
- [ ] Creare API key Helius
- [ ] Configurare webhook Helius con URL endpoint
- [ ] Settare environment variables
- [ ] Verificare connessione Prisma
- [ ] Test webhook con transazione di prova

---

## 12. Note Importanti

### Sicurezza
- **Mai** esporre `SUPABASE_SERVICE_ROLE_KEY` nel frontend
- **Mai** committare `.env.local` con secrets
- Usare sempre `NEXT_PUBLIC_` prefix solo per variabili pubbliche

### Performance
- Hook `useTokenBattleState` usa Supabase-first (no RPC reads)
- Polling adattivo: 10s per battle attive, 30s per idle
- React Query con stale time 5s e GC time 5 min

### Webhook
- Helius invia array di eventi
- Ogni evento ha signature unica (usata per deduplicazione)
- Treasury wallet filtrato dai calcoli SOL amount

---

*Generato automaticamente - BonkBattle V2*
