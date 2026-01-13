# BonkBattle - Ottimizzazione Chiamate RPC

> **Problema:** 30-50k chiamate RPC/giorno anche quando il sito non è in uso
> **Obiettivo:** Ridurre a <5k chiamate/giorno seguendo strategia "Supabase-first"

---

## Strategia Corretta (già definita nel progetto)

```
SUPABASE: Unlimited, fast, free → Usare per TUTTI i reads
RPC: Solo per transazioni (buy/sell/battle)
HELIUS WEBHOOK: Mantiene Supabase sincronizzato con blockchain
```

---

## File da Correggere

### 1. `app/src/lib/solana/fetch-all-tokens.ts`

**Problema:** Usa `getProgramAccounts()` che è una chiamata RPC molto costosa (conta come multiple chiamate)

**Cosa fa:** Fetcha TUTTI i token on-chain ogni volta

**Dove viene usato:** `HotTokensCarousel.tsx`

**Correzione:** Eliminare completamente. Usare Supabase `SELECT * FROM tokens` invece

---

### 2. `app/src/components/home/HotTokensCarousel.tsx`

**Problemi multipli:**

| Problema | Dettaglio |
|----------|-----------|
| `fetchAllTokens()` | Chiamato ogni 120 secondi |
| `connection.onLogs()` | WebSocket subscription SEMPRE attiva |
| Nessun check `document.hidden` | Continua a fetchare anche con tab nascosta |

**Correzione:**
- Rimuovere `fetchAllTokens()`
- Usare query Supabase per hot tokens
- Rimuovere `connection.onLogs()` (i dati arrivano già via webhook)
- Aggiungere check per tab visibility

---

### 3. `app/src/lib/solana/fetch-token-holders.ts`

**Problema:** Usa `getProgramAccounts()` per OGNI token singolarmente

**Impatto:** Se ci sono 100 token, genera 100+ chiamate costose

**Dove viene usato:** Probabilmente in token pages e battle cards

**Correzione:**
- I holders dovrebbero essere salvati in Supabase dalla webhook Helius
- Aggiungere tabella `token_holders` se non esiste
- Webhook salva holders ad ogni trade
- Frontend legge da Supabase

---

### 4. `app/src/services/blockchain-listener.ts`

**Problema:** Usa `connection.onProgramAccountChange()` - WebSocket persistente

**Impatto:** Mantiene connessione attiva 24/7 anche senza utenti

**Nota:** Questo potrebbe essere intenzionale per il backend, ma se gira lato client è un problema

**Correzione:**
- Se è client-side: rimuovere completamente (usare Supabase real-time)
- Se è server-side/worker: verificare che sia un solo processo

---

### 5. `app/src/hooks/useTokenMetadata.ts`

**Problema:** Ha fallback a RPC quando Supabase non ha dati

**Quando accade:** Per token nuovi non ancora sincronizzati

**Correzione:**
- Rimuovere fallback RPC
- Se token non in Supabase, chiamare `/api/sync-token/[mint]` che usa il webhook pattern
- Mostrare "Loading..." invece di fare chiamata RPC diretta

---

### 6. `app/src/app/winners/page.tsx`

**Problema:** `setInterval` ogni 10 secondi per pool data Raydium

**Impatto:** 8,640 chiamate/giorno solo da questa pagina

**Correzione:**
- Aumentare intervallo a 60+ secondi
- Aggiungere check `document.hidden`
- Considerare di cachare pool data in Supabase

---

### 7. `app/src/components/token/TradesList.tsx`

**Problema:** `setInterval` ogni 10 secondi solo per forzare re-render

**Impatto:** Inutile e potenzialmente triggera altri fetch

**Correzione:**
- Rimuovere setInterval
- Usare Supabase real-time subscription per nuovi trades
- Re-render automatico quando arrivano nuovi dati

---

## Priorità di Correzione

| Priorità | File | Motivo |
|----------|------|--------|
| **CRITICA** | `fetch-all-tokens.ts` | getProgramAccounts è costosissimo |
| **CRITICA** | `HotTokensCarousel.tsx` | Chiama fetch-all-tokens + WebSocket |
| **ALTA** | `fetch-token-holders.ts` | getProgramAccounts per ogni token |
| **ALTA** | `blockchain-listener.ts` | WebSocket persistente |
| **MEDIA** | `useTokenMetadata.ts` | Fallback RPC non necessario |
| **MEDIA** | `winners/page.tsx` | Polling troppo frequente |
| **BASSA** | `TradesList.tsx` | Interval inutile |

---

## Pattern Corretto da Seguire

### Esempio: `useTokenBattleState.ts` (GIÀ CORRETTO)

Questo hook segue già il pattern giusto:

1. Legge SOLO da Supabase
2. Polling adattivo (10s battle, 30s idle)
3. Check `document.hidden` per fermare polling con tab nascosta
4. Nessuna chiamata RPC diretta

**Tutti gli altri hook/componenti dovrebbero seguire questo pattern.**

---

## Checklist Correzioni

- [ ] Eliminare `fetch-all-tokens.ts` o convertirlo a Supabase
- [ ] Rifattorizzare `HotTokensCarousel.tsx` per usare Supabase
- [ ] Rimuovere `connection.onLogs()` da HotTokensCarousel
- [ ] Convertire `fetch-token-holders.ts` a Supabase
- [ ] Verificare `blockchain-listener.ts` non giri client-side
- [ ] Rimuovere fallback RPC da `useTokenMetadata.ts`
- [ ] Aumentare intervallo in `winners/page.tsx`
- [ ] Rimuovere setInterval da `TradesList.tsx`
- [ ] Aggiungere `document.hidden` check ovunque ci sia polling

---

## Risultato Atteso

| Metrica | Prima | Dopo |
|---------|-------|------|
| Chiamate RPC/giorno | 30-50k | <5k |
| getProgramAccounts | Ogni 120s | Mai (solo sync manuale) |
| WebSocket attive | 2-3 persistenti | 0 (usa Supabase real-time) |
| Costo Helius | Alto | Minimo |

---

## Note Importanti

1. **Helius Webhook è già configurato** - Tutti i dati blockchain arrivano già in Supabase via webhook. Non serve leggere da RPC.

2. **Supabase Real-time è gratis** - Usa `supabase.channel().on('postgres_changes')` invece di WebSocket Solana.

3. **RPC solo per SCRIVERE** - Le uniche chiamate RPC dovrebbero essere per:
   - `buy_token()`
   - `sell_token()`
   - `start_battle()`
   - `check_victory()`
   - Altre transazioni on-chain

4. **Sync manuale se necessario** - Se un token non è in Supabase, chiamare l'endpoint `/api/sync-token/[mint]` invece di fare RPC diretto dal client.

---

*Documento generato per ottimizzazione RPC - BonkBattle V2*
