# 🔥 RPC Optimization Guide - Ridurre Chiamate Helius

## 🚨 Problema Identificato

**Situazione Attuale:**
- **22,000+ chiamate RPC al giorno** anche senza utenti attivi
- **36% delle chiamate** sono `getAccountInfo` (8,000+)
- **23% delle chiamate** sono `getTransaction` (5,000+)
- Consumo crediti Helius inutile quando il sito è inattivo

**Obiettivo:**
> ✅ **Ridurre le chiamate RPC a quasi ZERO quando nessuno usa il sito**

Le uniche chiamate legittime dovrebbero essere:
1. `sendTransaction` - Quando qualcuno fa un trade
2. `getLatestBlockhash` - Prima di una transazione
3. Webhook Helius - NON contano come RPC calls nostre

---

## 🔍 Diagnostica - Trova i Colpevoli

### Step 1: Identifica Polling e setInterval

```bash
# Trova tutti i setInterval nel codice
grep -rn "setInterval" app/src/ --include="*.ts" --include="*.tsx"

# Trova polling espliciti
grep -rn "polling" app/src/ --include="*.ts" --include="*.tsx" -i

# Trova useEffect con dipendenze che potrebbero causare loop
grep -rn "useEffect.*\[\]" app/src/ --include="*.tsx" -A 5 | grep -E "(setInterval|setTimeout)"
```

**Colpevoli Comuni:**
```typescript
// ❌ BAD: Polling continuo
useEffect(() => {
  const interval = setInterval(() => {
    fetchBalance(); // Chiama RPC ogni X secondi
  }, 5000);
  return () => clearInterval(interval);
}, []);

// ❌ BAD: Polling su ogni componente montato
useEffect(() => {
  const poll = setInterval(updateData, 3000);
  return () => clearInterval(poll);
}, []);
```

---

### Step 2: Trova Chiamate getAccountInfo

```bash
# Cerca tutte le chiamate getAccountInfo
grep -rn "getAccountInfo" app/src/ --include="*.ts" --include="*.tsx"

# Cerca connection.getAccountInfo
grep -rn "connection\.getAccountInfo" app/src/ --include="*.ts" --include="*.tsx"

# Cerca wrapper functions
grep -rn "getAccount" app/src/ --include="*.ts" --include="*.tsx" | grep -v "getAccountBalance"
```

**Pattern Problematici:**
```typescript
// ❌ BAD: Chiamata in loop
const checkAccount = async () => {
  const account = await connection.getAccountInfo(address);
  // ...
};
setInterval(checkAccount, 5000); // 17,280 chiamate/giorno!

// ❌ BAD: Chiamata su ogni render
useEffect(() => {
  connection.getAccountInfo(wallet);
}, [wallet]); // Se wallet cambia spesso
```

---

### Step 3: Trova Chiamate getTransaction

```bash
# Cerca tutte le chiamate getTransaction
grep -rn "getTransaction" app/src/ --include="*.ts" --include="*.tsx"

# Cerca pattern di verifica transazioni
grep -rn "confirmTransaction\|getConfirmedTransaction" app/src/ --include="*.ts" --include="*.tsx"
```

**Pattern Problematici:**
```typescript
// ❌ BAD: Polling per confermare transazioni
const waitForConfirmation = async (signature: string) => {
  let confirmed = false;
  while (!confirmed) {
    const tx = await connection.getTransaction(signature);
    if (tx?.meta?.err === null) confirmed = true;
    await sleep(1000); // 86,400 chiamate potenziali!
  }
};
```

---

### Step 4: Trova Chiamate getBalance

```bash
# Cerca tutte le chiamate getBalance
grep -rn "getBalance" app/src/ --include="*.ts" --include="*.tsx"

# Cerca pattern di monitoraggio balance
grep -rn "balance.*connection\|connection.*balance" app/src/ --include="*.ts" --include="*.tsx" -i
```

**Pattern Problematici:**
```typescript
// ❌ BAD: Aggiornamento balance continuo
useEffect(() => {
  const updateBalance = async () => {
    const balance = await connection.getBalance(publicKey);
    setBalance(balance);
  };

  const interval = setInterval(updateBalance, 2000);
  return () => clearInterval(interval);
}, [publicKey]); // 43,200 chiamate/giorno!
```

---

### Step 5: Controlla API Routes

```bash
# Lista tutte le API routes
find app/src/app/api -name "*.ts" -o -name "route.ts"

# Controlla quali usano RPC
grep -r "connection\." app/src/app/api/ --include="*.ts"

# Controlla cron jobs o scheduled tasks
cat vercel.json | grep -A 10 "cron"
```

**Route Sospette:**
- `/api/tokens/*` - Potrebbe fare polling dei token
- `/api/battles/*` - Potrebbe verificare status battaglie
- `/api/user/*` - Potrebbe controllare wallet balance

---

### Step 6: Controlla Cron Jobs Vercel

```bash
# Visualizza configurazione cron
cat vercel.json

# Controlla quale codice viene eseguito dai cron
ls -la app/src/app/api/cron/
cat app/src/app/api/cron/*.ts
```

**Esempio Cron che Consuma:**
```json
{
  "crons": [
    {
      "path": "/api/battles/auto-complete",
      "schedule": "*/2 * * * *"  // ⚠️ Ogni 2 minuti = 720 volte/giorno!
    }
  ]
}
```

Se ogni chiamata fa 3-5 RPC calls = **2,160-3,600 chiamate/giorno solo dal cron!**

---

## 🎯 Soluzioni per Ridurre le Chiamate

### 1. **Elimina Polling Client-Side**

#### ❌ PRIMA (Bad):
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const balance = await connection.getBalance(publicKey);
    setBalance(balance);
  }, 5000); // 17,280 chiamate/giorno

  return () => clearInterval(interval);
}, [publicKey]);
```

#### ✅ DOPO (Good):
```typescript
// Usa Helius Webhooks invece di polling
// O aggiorna solo su azione utente
const refreshBalance = async () => {
  const balance = await connection.getBalance(publicKey);
  setBalance(balance);
};

// Chiamata solo su click manuale
<button onClick={refreshBalance}>Refresh Balance</button>
```

---

### 2. **Cache Aggressiva**

#### ✅ Implementa Cache per Account Info:
```typescript
// Cache con TTL (Time To Live)
const accountCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 secondi

async function getCachedAccountInfo(address: PublicKey) {
  const key = address.toString();
  const cached = accountCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data; // ✅ Nessuna RPC call
  }

  const account = await connection.getAccountInfo(address);
  accountCache.set(key, { data: account, timestamp: Date.now() });
  return account;
}
```

---

### 3. **Usa Helius Webhooks (GRATIS)**

#### ✅ Setup Webhook per Transazioni:
```typescript
// Invece di polling per verificare transazioni:
// ❌ while (!confirmed) { await connection.getTransaction(...) }

// ✅ Registra webhook Helius
const webhook = await fetch('https://api.helius.xyz/v0/webhooks', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${HELIUS_API_KEY}` },
  body: JSON.stringify({
    webhookURL: 'https://bonk-battle.vercel.app/api/webhooks/helius',
    transactionTypes: ['Any'],
    accountAddresses: [TREASURY_WALLET, KEEPER_WALLET],
  })
});
```

**Vantaggi:**
- ✅ ZERO chiamate RPC per monitorare transazioni
- ✅ Notifiche real-time
- ✅ Non conta nel rate limit

---

### 4. **Ottimizza Cron Jobs**

#### ❌ PRIMA:
```typescript
// Cron: */2 * * * * (ogni 2 minuti = 720/giorno)
export async function GET() {
  // Controlla tutti i token
  for (const token of tokens) {
    const account = await connection.getAccountInfo(token.mint); // 720+ calls
  }
}
```

#### ✅ DOPO:
```typescript
// Cron: */10 * * * * (ogni 10 minuti = 144/giorno)
export async function GET() {
  // Batch le chiamate
  const addresses = tokens.map(t => new PublicKey(t.mint));
  const accounts = await connection.getMultipleAccountsInfo(addresses); // 1 chiamata invece di 100!

  // O usa Helius Enhanced APIs
  const response = await fetch(`https://api.helius.xyz/v0/addresses/${addresses}/balances`, {
    headers: { 'Authorization': `Bearer ${HELIUS_API_KEY}` }
  }); // Chiamata API Helius, non RPC
}
```

---

### 5. **Sostituisci getTransaction con Helius API**

#### ❌ PRIMA:
```typescript
// Verifica se transazione è confermata
const checkTx = async (signature: string) => {
  let attempts = 0;
  while (attempts < 30) {
    const tx = await connection.getTransaction(signature); // 30 chiamate RPC
    if (tx?.meta?.err === null) return true;
    await sleep(1000);
    attempts++;
  }
};
```

#### ✅ DOPO:
```typescript
// Usa Helius Enhanced Transaction API
const checkTx = async (signature: string) => {
  const response = await fetch(
    `https://api.helius.xyz/v0/transactions/?api-key=${HELIUS_API_KEY}`,
    {
      method: 'POST',
      body: JSON.stringify({ transactions: [signature] })
    }
  ); // 1 chiamata API Helius (non conta come RPC)

  const data = await response.json();
  return data[0]?.meta?.err === null;
};
```

---

### 6. **Lazy Loading - Carica Solo su Richiesta**

#### ❌ PRIMA:
```typescript
// Carica dati di tutti i token all'apertura pagina
useEffect(() => {
  tokens.forEach(async token => {
    const account = await connection.getAccountInfo(token.mint); // 100+ chiamate
  });
}, []); // Anche se l'utente non scorre fino a quel token!
```

#### ✅ DOPO:
```typescript
// Carica solo i token visibili
import { useInView } from 'react-intersection-observer';

function TokenCard({ token }) {
  const { ref, inView } = useInView();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (inView && !data) {
      // Carica SOLO quando il token è visibile
      fetchTokenData(token.mint).then(setData);
    }
  }, [inView]);

  return <div ref={ref}>{/* ... */}</div>;
}
```

---

## 📊 Benchmark Obiettivi

### Situazione Attuale (BAD ❌)
```
📈 22,000+ chiamate RPC/giorno
├─ getAccountInfo: 8,000+ (36%)
├─ getTransaction: 5,000+ (23%)
├─ getBalance: 3,000+ (14%)
└─ Altri: 6,000+ (27%)

💸 Costo: ~$X/mese in crediti Helius
⚠️ Problema: Chiamate anche con 0 utenti!
```

### Obiettivo (GOOD ✅)
```
📉 <100 chiamate RPC/giorno (senza utenti attivi)
├─ getAccountInfo: <10
├─ getTransaction: 0 (usa webhooks)
├─ getBalance: <5 (solo cron necessari)
└─ sendTransaction: 0 (solo quando utenti fanno trade)

💰 Risparmio: 99% riduzione chiamate
✅ Zero chiamate quando nessuno usa il sito
```

---

## 🔧 Action Plan - Checklist

### Fase 1: Diagnostica (Oggi)
- [ ] Esegui tutti i comandi grep per trovare polling
- [ ] Identifica tutti i `setInterval` nel codice
- [ ] Lista tutte le API routes che usano `connection.`
- [ ] Controlla configurazione cron in `vercel.json`
- [ ] Analizza quali componenti fanno chiamate RPC

### Fase 2: Quick Wins (Week 1)
- [ ] Rimuovi tutti i `setInterval` non necessari
- [ ] Implementa cache con TTL per `getAccountInfo`
- [ ] Sostituisci polling transazioni con webhook Helius
- [ ] Riduci frequenza cron jobs (es: da 2min a 10min)
- [ ] Usa `getMultipleAccountsInfo` invece di loop

### Fase 3: Refactoring (Week 2)
- [ ] Migra tutte le verifiche transazioni a Helius API
- [ ] Implementa lazy loading per liste token
- [ ] Aggiungi refresh manuale invece di auto-refresh
- [ ] Setup webhooks Helius per tutti i wallet importanti
- [ ] Implementa caching Redis/Upstash per dati frequenti

### Fase 4: Monitoring (Ongoing)
- [ ] Setup alert Helius quando chiamate > 1000/giorno
- [ ] Dashboard per monitorare chiamate RPC per endpoint
- [ ] Log ogni chiamata RPC in development
- [ ] Review settimanale delle metriche Helius

---

## 🛠️ Tools per Debugging

### 1. **RPC Call Logger**
```typescript
// app/src/lib/rpc-logger.ts
const originalGetAccountInfo = connection.getAccountInfo.bind(connection);

connection.getAccountInfo = async (...args) => {
  console.log('🔍 RPC CALL: getAccountInfo', args[0].toString());
  console.trace(); // Mostra da dove viene chiamato
  return originalGetAccountInfo(...args);
};
```

### 2. **Helius Dashboard**
Vai a: https://dashboard.helius.dev/
- Visualizza chiamate in real-time
- Breakdown per tipo di chiamata
- Top endpoints che consumano

### 3. **Vercel Analytics**
```bash
# Visualizza logs API routes
vercel logs bonk-battle --since 1h

# Filtra per RPC calls
vercel logs bonk-battle | grep "getAccountInfo\|getTransaction"
```

---

## 📝 Pattern Anti-Patterns

### ❌ Anti-Patterns da Evitare

#### 1. Polling Infinito
```typescript
// ❌ NEVER DO THIS
setInterval(() => {
  connection.getAccountInfo(address);
}, 1000); // 86,400 chiamate/giorno!
```

#### 2. Fetch su Ogni Render
```typescript
// ❌ NEVER DO THIS
useEffect(() => {
  connection.getBalance(publicKey);
}, [someState]); // Re-fetch ogni volta che someState cambia
```

#### 3. Loop di Verifiche
```typescript
// ❌ NEVER DO THIS
while (!confirmed) {
  await connection.getTransaction(sig);
  await sleep(500);
}
```

#### 4. Fetch Preventivo
```typescript
// ❌ NEVER DO THIS
// Carica dati di TUTTI i token appena apri la pagina
tokens.forEach(t => connection.getAccountInfo(t.mint));
```

---

### ✅ Best Practices

#### 1. Cache con TTL
```typescript
// ✅ GOOD
const cache = new Map();
const TTL = 30000;

async function getCached(key, fetchFn) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) {
    return cached.data;
  }
  const data = await fetchFn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}
```

#### 2. Webhook per Notifiche
```typescript
// ✅ GOOD
// Setup una volta, ricevi notifiche per sempre
await setupHeliusWebhook({
  url: '/api/webhooks/transaction',
  addresses: [TREASURY_WALLET]
});
```

#### 3. Batch API Calls
```typescript
// ✅ GOOD
// Invece di 100 chiamate separate
const accounts = await connection.getMultipleAccountsInfo(addresses);
```

#### 4. Lazy Loading
```typescript
// ✅ GOOD
// Carica solo quando necessario
const { ref, inView } = useInView();
useEffect(() => {
  if (inView) loadData();
}, [inView]);
```

---

## 🎯 Success Metrics

### Obiettivi Finali
- ✅ **<100 RPC calls/giorno** senza utenti attivi
- ✅ **Zero polling** nel client-side
- ✅ **100% webhook** per monitoring transazioni
- ✅ **Cache hit rate** > 80%
- ✅ **Cron jobs** < 150 chiamate/giorno totali

### Come Misurare
1. **Helius Dashboard**: Controlla daily calls
2. **Log Analysis**: Grep logs per RPC calls
3. **Load Test**: Spegni il sito per 1 ora, verifica chiamate
4. **User Test**: Con 1 utente attivo, max 50 chiamate/ora

---

## 📞 Risorse Utili

### Helius Documentation
- [Webhooks Guide](https://docs.helius.dev/webhooks-and-websockets/webhooks)
- [Enhanced APIs](https://docs.helius.dev/api-reference/enhanced-apis)
- [Rate Limits](https://docs.helius.dev/getting-started/rate-limits)

### Solana Best Practices
- [Optimizing RPC Calls](https://docs.solana.com/developing/clients/jsonrpc-api#rate-limiting)
- [Confirmation Strategies](https://docs.solana.com/developing/guides/confirmation)

---

## ⚠️ WARNING: Common Mistakes

### Mistake #1: "Real-time" Updates
❌ **Non serve polling ogni secondo per mostrare balance aggiornato**
✅ **Update on user action + webhook per incoming transactions**

### Mistake #2: "Verifica Transazione"
❌ **Non serve chiamare getTransaction in loop**
✅ **Usa confirmTransaction() o webhook Helius**

### Mistake #3: "Dashboard Admin Auto-refresh"
❌ **Non serve refresh automatico ogni 30 secondi**
✅ **Bottone "Refresh" manuale**

### Mistake #4: "Token Monitoring"
❌ **Non serve controllare tutti i token ogni 2 minuti**
✅ **Webhook per token activity + cache 10 minuti**

---

## 🚀 Deploy Checklist

Prima di deployare ottimizzazioni:

1. **Test Locale**
   ```bash
   # Abilita RPC logging
   DEBUG=rpc:* npm run dev

   # Verifica quante chiamate fa l'app
   # Obiettivo: <10 chiamate al primo caricamento
   ```

2. **Test Staging**
   ```bash
   # Deploy su staging
   vercel --prod=false

   # Monitora chiamate per 1 ora
   # Verifica: <50 chiamate/ora senza utenti
   ```

3. **Production Deploy**
   ```bash
   # Deploy finale
   vercel --prod

   # Monitora Helius dashboard per 24h
   # Alert se chiamate > 1000/giorno
   ```

---

**Ultimo Aggiornamento:** 14 Gennaio 2026
**Target:** <100 RPC calls/giorno (0 utenti)
**Deadline:** 2 settimane
**Versione Documento:** 1.0
