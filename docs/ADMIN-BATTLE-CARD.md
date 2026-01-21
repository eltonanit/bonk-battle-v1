# Admin Battle Card Configuration

## Overview

Sistema per gestire la **Battle Card** mostrata nella home page. L'admin può selezionare quale delle 5 battaglie mostrare come "featured" e personalizzare i contenuti.

---

## Struttura Dati

### Tabella Supabase: `battle_card_config`

```sql
CREATE TABLE battle_card_config (
  id TEXT PRIMARY KEY DEFAULT 'main',

  -- Selezione battaglia
  selected_battle_id TEXT,           -- ID della battaglia selezionata (es: "mintA-mintB")

  -- Contenuti personalizzabili
  question TEXT,                      -- "Which coin deserves to reach a $10B market cap?"
  question_image_url TEXT,            -- Foto vicino alla domanda
  target_text TEXT,                   -- "First to $10B wins."
  context_text TEXT,                  -- "Buy the token you believe will win the battle."

  -- Link sotto i bottoni BUY
  token_a_buy_link TEXT,              -- Link custom per Token A (es: Jupiter, Raydium)
  token_b_buy_link TEXT,              -- Link custom per Token B

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  network TEXT DEFAULT 'mainnet',
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT                     -- Wallet admin che ha fatto l'update
);
```

---

## Funzionalit√† Admin Page

### 1. Selezione Battaglia

```
┌─────────────────────────────────────────────────────────────┐
│  SELECT FEATURED BATTLE                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ○ Battle 1: $DOGE vs $SHIB     [LIVE]                      │
│  ● Battle 2: $PEPE vs $BONK     [LIVE] ← Selected           │
│  ○ Battle 3: $WIF vs $POPCAT    [LIVE]                      │
│  ○ Battle 4: $FLOKI vs $BRETT   [Ended]                     │
│  ○ Battle 5: $MOG vs $TURBO     [Pending]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. Personalizzazione Contenuti

```
┌─────────────────────────────────────────────────────────────┐
│  CUSTOMIZE BATTLE CARD                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question Image:                                             │
│  ┌──────────┐  [Upload] [Remove]                            │
│  │  🖼️     │  Current: /images/battle-question.png         │
│  └──────────┘                                                │
│                                                              │
│  Question Text:                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Which coin deserves to reach a $10B market cap?     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Target Text:                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ First to $10B wins.                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Context Text:                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Buy the token you believe will win the battle.      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Link Personalizzati per Bottoni BUY

```
┌─────────────────────────────────────────────────────────────┐
│  BUY BUTTON LINKS                                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Token A ($PEPE) Buy Link:                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ https://jup.ag/swap/SOL-PEPE                        │    │
│  └─────────────────────────────────────────────────────┘    │
│  □ Use default (bonding curve)                              │
│                                                              │
│  Token B ($BONK) Buy Link:                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ https://raydium.io/swap/?inputMint=SOL&outputMint=  │    │
│  └─────────────────────────────────────────────────────┘    │
│  □ Use default (bonding curve)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Preview e Salvataggio

```
┌─────────────────────────────────────────────────────────────┐
│  PREVIEW                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │   [🖼️]  Which coin deserves to reach $10B?           │  │
│  │                                                        │  │
│  │   ┌─────────┐     VS     ┌─────────┐                  │  │
│  │   │  PEPE   │            │  BONK   │                  │  │
│  │   │  45%    │────────────│  55%    │                  │  │
│  │   └─────────┘            └─────────┘                  │  │
│  │                                                        │  │
│  │   [BUY PEPE]              [BUY BONK]                   │  │
│  │                                                        │  │
│  │   First to $10B wins.                                 │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Cancel]                              [Save Changes]        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### GET `/api/admin/battle-card-config`
Ritorna la configurazione attuale della battle card.

### POST `/api/admin/battle-card-config`
Salva la nuova configurazione.

```typescript
// Request body
{
  selected_battle_id: "mint1-mint2",
  question: "Which coin will moon first?",
  question_image_url: "https://...",
  target_text: "First to $10B wins.",
  context_text: "Buy the token you believe will win.",
  token_a_buy_link: "https://jup.ag/...",
  token_b_buy_link: "https://raydium.io/...",
  is_active: true,
  network: "mainnet"
}
```

### GET `/api/battles/active`
Lista delle 5 battaglie attive per la selezione.

---

## File da Creare

```
app/src/app/admin/battle-card/
├── page.tsx              # Pagina admin principale
└── components/
    ├── BattleSelector.tsx    # Selezione battaglia
    ├── ContentEditor.tsx     # Editor testi e immagine
    ├── LinkEditor.tsx        # Editor link bottoni
    └── CardPreview.tsx       # Preview live della card
```

---

## Workflow Settimanale Admin

1. **Lunedì**: Admin accede a `/admin/battle-card`
2. **Seleziona**: Sceglie la battaglia della settimana
3. **Personalizza**:
   - Carica nuova immagine per la domanda
   - Modifica il testo della domanda
   - Imposta i link per i bottoni BUY (Jupiter, Raydium, etc.)
4. **Preview**: Verifica come apparirà nella home
5. **Pubblica**: Salva le modifiche

---

## Sicurezza

- Solo wallet admin autorizzati possono accedere
- Validazione wallet lato server
- Log di tutte le modifiche con timestamp e wallet

---

## Note Tecniche

- Le 5 battaglie sono fisse (10 token, 5 battaglie)
- I token vengono caricati dal database `tokens` esistente
- L'immagine può essere caricata su Supabase Storage o URL esterno
- La configurazione viene cachata per performance

---

## Domande per te:

1. **Dove preferisci la pagina admin?**
   - `/admin/battle-card`
   - `/sale/battle-card`
   - Altro?

2. **Upload immagini**:
   - Supabase Storage?
   - URL esterno (es. Imgur)?

3. **Quali wallet sono admin autorizzati?**
   - Devo controllare una lista specifica?

4. **I link dei bottoni BUY**:
   - Devono aprire in nuova tab?
   - Vuoi anche un bottone "BUY interno" che usa la bonding curve?
