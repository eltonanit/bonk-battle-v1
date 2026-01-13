# BonkBattle - Sistema Share su X (Twitter)

> **Documentazione completa** - Come funziona la condivisione su X con preview card dinamiche e sistema punti.

---

## 1. Overview del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       FLUSSO SHARE SU X                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User clicca "Share on X"                                              │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────┐                                                   │
│  │ Genera Tweet URL│ → twitter.com/intent/tweet?text=...&url=...       │
│  └─────────────────┘                                                   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────┐     ┌──────────────────────────────┐              │
│  │  URL condiviso  │ →   │ Twitter crawler fetcha URL   │              │
│  └─────────────────┘     └──────────────────────────────┘              │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌─────────────────────┐                        │
│                          │ Next.js Metadata    │                        │
│                          │ (generateMetadata)  │                        │
│                          └─────────────────────┘                        │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌─────────────────────┐                        │
│                          │  /api/og/battle     │                        │
│                          │  (Image Generator)  │                        │
│                          └─────────────────────┘                        │
│                                   │                                     │
│                                   ▼                                     │
│                          ┌─────────────────────┐                        │
│                          │  Card Preview 📸    │                        │
│                          │  1200x630px         │                        │
│                          └─────────────────────┘                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. File Coinvolti

| File | Ruolo | Priorità |
|------|-------|----------|
| [api/og/battle/route.tsx](../app/src/app/api/og/battle/route.tsx) | Genera immagine OG dinamica | Alta |
| [battle/[id]/layout.tsx](../app/src/app/battle/[id]/layout.tsx) | Genera metadata per Twitter cards | Alta |
| [components/shared/BattleCard.tsx](../app/src/components/shared/BattleCard.tsx) | Share button in battle cards | Alta |
| [components/token/TokenHero.tsx](../app/src/components/token/TokenHero.tsx) | ShareModal per token page | Media |
| [components/battle/PointsRewardModal.tsx](../app/src/components/battle/PointsRewardModal.tsx) | Share dopo vittoria | Media |
| [components/victory/PointsPopup.tsx](../app/src/components/victory/PointsPopup.tsx) | Share popup piccolo | Bassa |
| [app/layout.tsx](../app/src/app/layout.tsx) | Default OG metadata | Bassa |

---

## 3. Generazione OG Image Dinamica

### 3.1 Endpoint API

```
GET /api/og/battle
```

### 3.2 Parametri Query

| Parametro | Descrizione | Obbligatorio |
|-----------|-------------|--------------|
| `id` | Battle ID (tokenA-tokenB) | Si* |
| `tokenA` | Mint token A | Si* |
| `tokenB` | Mint token B | Si* |
| `symbolA` | Simbolo token A | No |
| `symbolB` | Simbolo token B | No |
| `imageA` | URL immagine token A | No |
| `imageB` | URL immagine token B | No |
| `marketCapA` | Market cap token A | No |
| `marketCapB` | Market cap token B | No |
| `t` | Timestamp (cache bust) | No |

*`id` oppure `tokenA`+`tokenB`

### 3.3 Codice Generatore

```typescript
// src/app/api/og/battle/route.tsx

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parsing parametri
  const tokenAMint = searchParams.get('tokenA');
  const tokenBMint = searchParams.get('tokenB');
  const symbolA = searchParams.get('symbolA') || 'TOKEN A';
  const symbolB = searchParams.get('symbolB') || 'TOKEN B';
  const imageA = searchParams.get('imageA');
  const imageB = searchParams.get('imageB');
  const marketCapA = searchParams.get('marketCapA') || '$0';
  const marketCapB = searchParams.get('marketCapB') || '$0';

  // Fallback immagini con DiceBear
  const tokenAImage = imageA || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenAMint}`;
  const tokenBImage = imageB || `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenBMint}`;

  return new ImageResponse(
    (
      <div style={{ /* Layout Card */ }}>
        {/* Header: "WHICH COIN WILL WIN?" */}
        {/* Battle Section: Rosso vs Blu con VS badge */}
        {/* Bottom: Simboli + Market Cap + Logo */}
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
```

### 3.4 Layout Card Preview

```
┌──────────────────────────────────────────────────────────────┐
│                    WHICH COIN WILL WIN?                       │
├─────────────────────────────┬────────────────────────────────┤
│                             │                                │
│      ┌─────────────┐        │        ┌─────────────┐         │
│      │             │        │        │             │         │
│      │  TOKEN A    │   VS   │        │  TOKEN B    │         │
│      │   IMAGE     │        │        │   IMAGE     │         │
│      │             │        │        │             │         │
│      └─────────────┘        │        └─────────────┘         │
│                             │                                │
│     ROSSO (#dc2626)         │        BLU (#2563eb)           │
├─────────────────────────────┴────────────────────────────────┤
│                                                              │
│  $SYMBOLA                                       $SYMBOLB     │
│  MARKET CAP: $XXK                     MARKET CAP: $XXK       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Winners get 50% liquidity of loser + listed on DEX  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                    [LOGO] BONK BATTLE                        │
└──────────────────────────────────────────────────────────────┘
```

**Dimensioni:** 1200x630px (standard Twitter/OG)

---

## 4. Metadata per Twitter Cards

### 4.1 Layout Dinamico per Battle Page

```typescript
// src/app/battle/[id]/layout.tsx

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [tokenAMint, tokenBMint] = id.split('-');

  // Fetch dati da Supabase
  const [resA, resB] = await Promise.all([
    supabase.from('tokens').select('symbol, image, real_sol_reserves, total_trade_volume').eq('mint', tokenAMint).single(),
    supabase.from('tokens').select('symbol, image, real_sol_reserves, total_trade_volume').eq('mint', tokenBMint).single(),
  ]);

  // Calcola progress
  const progressA = ((tokenA.sol_collected / TARGET_SOL) * 100);
  const progressB = ((tokenB.sol_collected / TARGET_SOL) * 100);

  // Calcola market cap in formato "K"
  const marketCapA = ((tokenA.sol_collected * 137.47) / 1000).toFixed(1) + 'k';
  const marketCapB = ((tokenB.sol_collected * 137.47) / 1000).toFixed(1) + 'k';

  // Costruisci URL immagine OG con cache busting
  const ogParams = new URLSearchParams({
    id: id,
    symbolA: tokenA.symbol,
    symbolB: tokenB.symbol,
    marketCapA: marketCapA,
    marketCapB: marketCapB,
    t: Date.now().toString(),  // Cache invalidation!
  });

  if (tokenA.image) ogParams.set('imageA', tokenA.image);
  if (tokenB.image) ogParams.set('imageB', tokenB.image);

  const ogImageUrl = `https://bonk-battle.vercel.app/api/og/battle?${ogParams.toString()}`;

  return {
    title: `⚔️ $${tokenA.symbol} vs $${tokenB.symbol} | BONK BATTLE`,
    description: `🏆 Who will win? ${tokenA.symbol}: ${progressA.toFixed(1)}% vs ${tokenB.symbol}: ${progressB.toFixed(1)}%`,
    openGraph: {
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogImageUrl],
      creator: '@BonkBattle_',
    },
  };
}
```

### 4.2 Meta Tags Generati

```html
<!-- OpenGraph -->
<meta property="og:title" content="⚔️ $DOGE vs $PEPE | BONK BATTLE" />
<meta property="og:description" content="🏆 Who will win? DOGE: 45.2% vs PEPE: 32.1%" />
<meta property="og:image" content="https://bonk-battle.vercel.app/api/og/battle?id=xxx-yyy&..." />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="⚔️ $DOGE vs $PEPE | BONK BATTLE" />
<meta name="twitter:description" content="🏆 Who will win? ..." />
<meta name="twitter:image" content="https://bonk-battle.vercel.app/api/og/battle?..." />
<meta name="twitter:creator" content="@BonkBattle_" />
```

---

## 5. Share Buttons & Componenti

### 5.1 BattleCard Share (+250 Points)

```typescript
// src/components/shared/BattleCard.tsx

const getShareUrl = () => {
  const battleUrl = `${window.location.origin}/battle/${tokenA.mint}-${tokenB.mint}`;
  const tweetText = `🚨 NEW BONKBATTLE: Will $${tokenA.symbol} defeat $${tokenB.symbol}? | Winner gets Listed on DEX! |

#BonkBattle #Solana #Crypto #Memecoin`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(battleUrl)}`;
};

// Render
<a
  href={getShareUrl()}
  target="_blank"
  rel="noopener noreferrer"
  className="bg-black/80 py-2 px-4 flex items-center justify-center gap-3"
>
  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
  <span className="font-semibold text-sm text-white">Share</span>
  <span className="text-orange-400 font-bold text-sm">+250 Points</span>
</a>
```

### 5.2 TokenHero ShareModal (+500 Points)

```typescript
// src/components/token/TokenHero.tsx

function ShareModal({ isOpen, onClose, tokenMint, tokenSymbol }) {
  const shareUrl = `https://bonk-battle.vercel.app/token/${tokenMint}`;
  const tweetText = `Check out $${tokenSymbol} on BONK BATTLE! `;

  const shareOnX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1f2e] rounded-xl p-6 w-[90%] max-w-md">
        <h3 className="text-xl font-bold text-white">Share coin</h3>

        <button
          onClick={shareOnX}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg"
        >
          <div className="flex items-center gap-2">
            {/* X Logo SVG */}
            <span>Share on X</span>
          </div>
          <span className="text-black text-xs font-bold mt-1">GET +500 POINTS</span>
        </button>

        <button onClick={copyLink} className="w-full py-3 bg-white/10 text-white rounded-lg">
          Copy link
        </button>
      </div>
    </div>
  );
}
```

### 5.3 PointsRewardModal - Victory Share (+2,000 Points)

```typescript
// src/components/battle/PointsRewardModal.tsx

const handleShareOnX = useCallback(async () => {
  const tweetText = `🏆 My token $${tokenSymbol} just WON a battle on @BonkBattle!

💰 Earned +${points.toLocaleString()} bonus points!
🌊 Now trading on Raydium!

Join the arena: https://bonkbattle.fun/token/${tokenMint}

#BonkBattle #Solana #Memecoins`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  window.open(twitterUrl, '_blank', 'width=550,height=420');

  setHasShared(true);

  // Award +2,000 points via API
  if (publicKey && !sharePointsAwarded) {
    setIsAwardingSharePoints(true);

    const response = await fetch('/api/points/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: publicKey.toString(),
        action: 'share_victory',
        points: 2000,
        token_mint: tokenMint,
        token_symbol: tokenSymbol,
      }),
    });

    if (response.ok) {
      setSharePointsAwarded(true);
    }
  }
}, [tokenSymbol, tokenMint, points, publicKey, sharePointsAwarded]);

// Render button
<button
  onClick={handleShareOnX}
  disabled={isAwardingSharePoints}
  className={sharePointsAwarded
    ? 'bg-green-600 text-white'
    : 'bg-black hover:bg-gray-900 text-white border-2 border-green-500/50'}
>
  {isAwardingSharePoints ? (
    <span>Awarding...</span>
  ) : sharePointsAwarded ? (
    <span>✅ +2,000 Points Earned!</span>
  ) : (
    <span>
      {/* X Logo */}
      Share on X
      <span className="text-green-400 font-black">+2,000 pts</span>
    </span>
  )}
</button>
```

---

## 6. Sistema Punti per Share

### 6.1 Tabella Ricompense

| Azione | Punti | Componente |
|--------|-------|------------|
| Share Battle Card | +250 | BattleCard.tsx |
| Share Token Page | +500 | TokenHero.tsx |
| Share Victory | +2,000 | PointsRewardModal.tsx |
| Referral Join | +5,000 | feed-followers/page.tsx |

### 6.2 API Points Award

```typescript
// POST /api/points/award
{
  "wallet_address": "7xYz...",
  "action": "share_victory",  // | "share_token" | "referral"
  "points": 2000,
  "token_mint": "xxx...",
  "token_symbol": "DOGE"
}
```

### 6.3 Tracking State

```typescript
// Stati per evitare doppi award
const [hasShared, setHasShared] = useState(false);
const [sharePointsAwarded, setSharePointsAwarded] = useState(false);
const [isAwardingSharePoints, setIsAwardingSharePoints] = useState(false);
```

---

## 7. Twitter Intent URL Format

### 7.1 Struttura Base

```
https://twitter.com/intent/tweet?text=ENCODED_TEXT&url=ENCODED_URL
```

### 7.2 Esempi

**Battle Share:**
```
https://twitter.com/intent/tweet?text=🚨%20NEW%20BONKBATTLE%3A%20Will%20%24DOGE%20defeat%20%24PEPE%3F%20%7C%20Winner%20gets%20Listed%20on%20DEX%21%20%7C%0A%0A%23BonkBattle%20%23Solana%20%23Crypto%20%23Memecoin&url=https%3A%2F%2Fbonkbattle.fun%2Fbattle%2Fxxx-yyy
```

**Victory Share:**
```
https://twitter.com/intent/tweet?text=🏆%20My%20token%20%24DOGE%20just%20WON%20a%20battle%20on%20%40BonkBattle%21%20%0A%0A💰%20Earned%20%2B10%2C000%20bonus%20points%21%0A🌊%20Now%20trading%20on%20Raydium%21%0A%0AJoin%20the%20arena%3A%20https%3A%2F%2Fbonkbattle.fun%2Ftoken%2Fxxx%0A%0A%23BonkBattle%20%23Solana%20%23Memecoins
```

---

## 8. Cache Invalidation

### 8.1 Problema

Twitter caches le OG images. Quando i dati cambiano (market cap, progress), la preview rimane vecchia.

### 8.2 Soluzione

Aggiungere timestamp ai parametri URL:

```typescript
const ogParams = new URLSearchParams({
  // ... altri parametri
  t: Date.now().toString(),  // Forza refresh cache
});
```

### 8.3 Twitter Card Validator

Per forzare refresh manuale: https://cards-dev.twitter.com/validator

---

## 9. Default OG Image (Fallback)

### 9.1 Root Layout

```typescript
// src/app/layout.tsx

export const metadata: Metadata = {
  title: 'BONK BATTLE',
  description: 'Token battle arena on Solana',
  openGraph: {
    images: ['https://bonkbattle.lol/bonk.og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://bonkbattle.lol/bonk.og.png'],
  },
};
```

### 9.2 Static OG Image

**Path:** `public/bonk.og.png`

---

## 10. Social Links

### 10.1 Twitter Account

| Location | URL |
|----------|-----|
| Header.tsx | https://x.com/bonk_battle?s=20 |
| Sidebar.tsx | https://x.com/bonk_battle?s=20 |
| DesktopHeader.tsx | https://x.com/bonk_battle?s=20 |
| support/page.tsx | https://x.com/BonkBattle_ |

---

## 11. Checklist Implementazione

- [x] Endpoint `/api/og/battle` per generazione immagine dinamica
- [x] Layout con `generateMetadata()` per battle pages
- [x] BattleCard share button con +250 punti
- [x] TokenHero ShareModal con +500 punti
- [x] PointsRewardModal victory share con +2,000 punti
- [x] API `/api/points/award` per tracking punti
- [x] Cache invalidation con timestamp
- [x] Fallback OG image statica
- [ ] Track analytics share (opzionale)
- [ ] Referral tracking completo

---

## 12. Debug & Testing

### 12.1 Test OG Image

```bash
# Browser
https://bonk-battle.vercel.app/api/og/battle?tokenA=xxx&tokenB=yyy&symbolA=DOGE&symbolB=PEPE

# Curl
curl "https://bonk-battle.vercel.app/api/og/battle?..." --output test.png
```

### 12.2 Test Twitter Card

1. Vai su https://cards-dev.twitter.com/validator
2. Inserisci URL: `https://bonk-battle.vercel.app/battle/xxx-yyy`
3. Clicca "Preview card"

### 12.3 Test Share Intent

```bash
# Apri in browser
https://twitter.com/intent/tweet?text=Test&url=https://bonkbattle.fun
```

---

*Generato automaticamente - BonkBattle V2*
