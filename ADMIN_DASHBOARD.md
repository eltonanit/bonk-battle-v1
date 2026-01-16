# 🔐 Admin Dashboard - Documentazione Completa

## Panoramica

Questa documentazione descrive le pagine amministrative nascoste della piattaforma **Token Arena**, accessibili solo tramite URL diretti e protette da autenticazione.

---

## 📍 Pagine Amministrative

### 1. **Login Admin** (`/sale/login.html`)
**URL Completo:** `https://bonk-battle.vercel.app/sale/login.html`

**Funzionalità:**
- Pagina di autenticazione per accedere alla dashboard admin
- Sistema di login protetto con password

**Credenziali di Accesso:**
- **Password:** `BONK2025!`

**Note di Sicurezza:**
- La password è hardcoded nel codice frontend
- L'autenticazione viene salvata in `localStorage` con chiave `adminAuth`
- Dopo il login, l'utente viene reindirizzato automaticamente a `/sale/admin.html`

---

### 2. **Dashboard Admin** (`/sale/admin.html`)
**URL Completo:** `https://bonk-battle.vercel.app/sale/admin.html`

**Funzionalità Principali:**

#### 📊 Monitoraggio Wallet
- **Treasury Wallet:** `5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf`
  - Visualizzazione saldo in tempo reale (SOL)
  - Link diretto a Solscan Mainnet

- **Keeper Wallet:** `65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea`
  - Visualizzazione saldo in tempo reale (SOL)
  - Link diretto a Solscan Mainnet

#### 📈 Statistiche Live
1. **Total Tokens:** Numero totale di token creati sulla piattaforma
   - Mostra anche quanti token sono "qualified, waiting" per entrare in battaglia

2. **Active Battles:** Battaglie attualmente in corso (status = 2)
   - Mostra lo stato "Active now"

3. **Winners:** Token vincitori totali (status = 4 - Listed)
   - Visualizza il totale SOL distribuito come spoils

4. **Total Users:** Profili utente registrati nel database

#### 🔄 Quick Actions
- **Run Auto-Complete:** Esegue manualmente il controllo per determinare i vincitori delle battaglie
- **Update SOL Price:** Aggiorna manualmente il prezzo di SOL (richiede CRON_SECRET)
- **View Cron Logs:** Link diretto ai log Vercel

#### 📋 Recent Token Activity
Tabella che mostra gli ultimi 5 token con:
- Nome e simbolo
- SOL raccolti
- Stato battaglia (Created, Qualified, In Battle, Victory Pending, Listed)
- Ultimo aggiornamento

#### 🔗 Platform Links
- Link diretto alla piattaforma live
- Accesso ai Vercel Cron Jobs
- Dashboard Supabase
- Solscan Explorer (Mainnet)

#### ⚙️ System Status
Monitoraggio in tempo reale:
- **Auto-Complete Cron:** Ogni 2 minuti
- **Price Oracle Cron:** Ogni 12 ore
- **RPC Connection:** Helius Mainnet
- **Database:** Status connessione Supabase

**Configurazione Tecnica:**
```javascript
const SUPABASE_URL = 'https://jfpuluquxjnamvyzocad.supabase.co'
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=54911811-93e0-430b-a296-c18efa362e01'
const API_BASE = 'https://bonk-battle.vercel.app'
```

**Auto-Refresh:** La dashboard si aggiorna automaticamente ogni 30 secondi

---

### 3. **Security Dashboard** (`/sale/security.html`)
**URL Completo:** `https://bonk-battle.vercel.app/sale/security.html`

**Funzionalità:**

#### 🔑 Gestione Chiavi Private
- **Treasury Private Key:** Visualizzazione sicura con toggle show/hide
- **Keeper Private Key:** Visualizzazione sicura con toggle show/hide
- Entrambe le chiavi sono criptate in Supabase

#### 🗄️ Accesso Database
Connessione diretta a Supabase:
- URL: `https://jfpuluquxjnamvyzocad.supabase.co`
- Visualizzazione di tutte le tabelle principali:
  - `tokens`: 96 record
  - `battles`: 49 record
  - `user_profiles`: 12 record
  - `winners`: 28 record

#### 🔐 Configurazioni di Sicurezza
- **CRON_SECRET:** Chiave per eseguire cron job protetti
- **HELIUS_API_KEY:** Chiave API per RPC Helius
- **SUPABASE_SERVICE_KEY:** Chiave di servizio Supabase con privilegi elevati

#### 🛡️ Sistema di Protezione
- Tutte le chiavi sono visualizzate con `type="password"`
- Toggle per mostrare/nascondere le chiavi sensibili
- Warning visivo sulla pagina con sfondo giallo/nero
- Reminder sulla necessità di protezione della pagina

**Warning Importante:**
> ⚠️ **ATTENZIONE:** Questa pagina contiene informazioni sensibili. Non condividere l'URL o screenshot di questa pagina.

---

### 4. **Index Page** (`/sale/index.html`)
**URL Completo:** `https://bonk-battle.vercel.app/sale/`

**Funzionalità:**
- Landing page per l'area admin
- Bottone per accedere alla dashboard admin
- Bottone per gestire la sicurezza
- Link rapido alla piattaforma principale

---

## 🚀 Accesso Rapido

### Per Amministratori

1. **Prima volta:**
   ```
   https://bonk-battle.vercel.app/sale/login.html
   Password: BONK2025!
   ```

2. **Accesso diretto alla dashboard:**
   ```
   https://bonk-battle.vercel.app/sale/admin.html
   (se già autenticati)
   ```

3. **Gestione sicurezza:**
   ```
   https://bonk-battle.vercel.app/sale/security.html
   (solo se necessario accedere alle chiavi)
   ```

---

## 🔒 Note di Sicurezza Importanti

### ⚠️ CRITICO
1. **NON condividere** questi URL pubblicamente
2. **NON fare screenshot** della pagina security.html
3. **NON committare** credenziali nel codice
4. Le chiavi private sono criptate in Supabase ma accessibili via browser
5. Considerare l'implementazione di IP whitelisting per queste pagine
6. La password di login è hardcoded - considerare un sistema più sicuro per produzione

### 🛡️ Raccomandazioni
- Cambiare la password di accesso regolarmente
- Monitorare gli accessi tramite Vercel Analytics
- Implementare 2FA per accessi critici
- Limitare l'accesso alle pagine `/sale/*` via middleware
- Utilizzare variabili d'ambiente server-side per chiavi sensibili invece di esporle nel frontend

---

## 📊 Stato Attuale del Sistema

**Ambiente:** Mainnet Solana
**RPC Provider:** Helius Mainnet
**Database:** Supabase (Postgres)
**Hosting:** Vercel

### Wallet Addresses
- **Treasury:** `5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf`
- **Keeper:** `65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea`

### Cron Jobs Attivi
- **Auto-Complete Battles:** Ogni 2 minuti (`*/2 * * * *`)
- **Update SOL Price:** Ogni 12 ore (`0 */12 * * *`)

---

## 🔧 Manutenzione

### Operazioni Comuni

1. **Verificare vincitori battaglia:**
   - Dashboard Admin → Quick Actions → "Run Auto-Complete"

2. **Aggiornare prezzo SOL:**
   - Dashboard Admin → Quick Actions → "Update SOL Price"
   - Richiede CRON_SECRET

3. **Controllare stato sistema:**
   - Dashboard Admin → System Status (sezione in basso a destra)

4. **Visualizzare log errori:**
   - Quick Actions → "View Cron Logs" → Vercel Dashboard

---

## 📝 Changelog

**Versione Corrente (2026-01-14):**
- ✅ Migrazione da Devnet a Mainnet completata
- ✅ Aggiunto bottone "Create Token" giallo nella sidebar
- ✅ Tutti i link Solscan aggiornati per Mainnet
- ✅ RPC Helius configurato su Mainnet
- ✅ Dashboard funzionante con dati live

---

## 💡 Tips per Amministratori

1. **Bookmark rapidi:** Salva `/sale/admin.html` nei preferiti per accesso veloce
2. **Auto-refresh:** La dashboard si aggiorna da sola, non serve ricaricare manualmente
3. **Solscan:** Usa i link "View ↗" per verificare transazioni on-chain
4. **Database:** Accedi direttamente a Supabase per query personalizzate
5. **Logs:** In caso di problemi, controlla sempre i Vercel logs prima

---

## 🆘 Supporto e Troubleshooting

### Problema: "Non riesco ad accedere alla dashboard"
**Soluzione:**
- Verifica di usare la password corretta: `BONK2025!`
- Controlla che localStorage non sia bloccato dal browser
- Prova in modalità incognito

### Problema: "I saldi dei wallet non si aggiornano"
**Soluzione:**
- Clicca sul bottone "🔄 Refresh" in alto a destra
- Verifica la connessione RPC Helius nel System Status
- Controlla che gli indirizzi wallet siano corretti su Mainnet

### Problema: "Database Connection Error"
**Soluzione:**
- Verifica lo stato di Supabase Dashboard
- Controlla che la SUPABASE_ANON_KEY sia valida
- Verifica le policy RLS su Supabase

---

**Ultimo Aggiornamento:** 14 Gennaio 2026
**Maintainer:** Admin Team
**Versione Documento:** 1.0
