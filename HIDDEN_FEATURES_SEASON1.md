# 🔒 Pagine e Funzionalità Nascoste - Season 1

## Panoramica

Questo documento descrive tutte le pagine e funzionalità della piattaforma **Bonk Battle** che sono state temporaneamente nascoste nella **Season 1** attraverso il sistema di feature flags configurabile.

Le funzionalità nascoste sono completamente implementate nel codice ma disabilitate per gli utenti. Saranno riattivate nella **Season 2** cambiando semplicemente la configurazione in `/app/src/config/features.ts`.

---

## 📋 Sistema di Feature Flags

**File di configurazione:** [`app/src/config/features.ts`](app/src/config/features.ts)

**Season Corrente:** Season 1
```typescript
export const FEATURES = {
  SEASON: 1,  // Cambiare a 2 per abilitare tutte le feature
  // ... altre configurazioni
}
```

**Come funziona:**
- Ogni feature ha un flag `boolean` (`true` = visibile, `false` = nascosta)
- I componenti React controllano questi flag prima di renderizzare elementi UI
- Cambiando `SEASON: 2` si abilitano automaticamente tutte le feature della Season 2

---

## 🚫 Funzionalità Nascoste nella Season 1

### 1. **Create Coin** (Token Creation)
**Flag:** `SHOW_CREATE_COIN: false`

**Descrizione:**
- Pagina per creare nuovi token personalizzati
- Nella Season 1 solo la piattaforma può creare battaglie
- Nella Season 2 tutti gli utenti potranno creare token

**URL:** `/create`
- La pagina esiste ed è funzionante
- Il bottone "Create Token" è nascosto dalla navigazione (eccetto nell'admin dashboard)

**Impatto:**
- Link "Create Token" nascosto nel menu mobile
- Bottone di creazione rimosso dalla home page
- Flusso completo di creazione token disabilitato

**Motivo:**
> Season 1 è focalizzata su 5 battaglie curate dalla piattaforma. La creazione community-driven sarà abilitata in Season 2.

---

### 2. **Armies System** (Sistema Eserciti)
**Flag:** `SHOW_ARMIES: false`

**Descrizione:**
- Sistema di gruppi/clan dove gli utenti possono unirsi ad "eserciti"
- Ogni esercito supporta un token specifico
- Competizione tra eserciti per dominare la piattaforma

**URL:** `/armies`
- Pagina completa implementata ma nascosta
- Include classifiche eserciti, membri, statistiche

**Componenti nascosti:**
- Lista eserciti disponibili
- Bottone "Join ARMY"
- Stats eserciti nel profilo
- Tab "My Army" nel profilo utente

**Motivo:**
> Con solo 5 battaglie curate, il sistema di eserciti non è necessario. Verrà attivato quando ci saranno molti token creati dalla community.

---

### 3. **Join ARMY Button**
**Flag:** `SHOW_JOIN_ARMY: false`

**Descrizione:**
- Bottone giallo/oro animato "Join ARMY" nella header
- Permette l'iscrizione rapida a un esercito

**Posizioni nascoste:**
- Desktop Header (top-right)
- Mobile Header (dopo il login)
- Menu hamburger mobile

**Codice:**
```typescript
{FEATURES.SHOW_JOIN_ARMY && <JoinArmyButton size="lg" />}
```

**Motivo:**
> Collegato al sistema Armies. Verrà mostrato quando gli eserciti saranno attivi.

---

### 4. **New Coins Tab** (Homepage)
**Flag:** `SHOW_NEW_COINS_TAB: false`

**Descrizione:**
- Tab nella home page che mostra i token creati di recente
- Ordinamento per data di creazione

**Dove apparirà:**
- Home page tabs: `Battle | New Coins | About to Win | Winners`

**Motivo:**
> Con sole 5 battaglie curate, non ha senso mostrare una tab "New Coins". Sarà utile quando la community creerà migliaia di token.

---

### 5. **New Coins** (Pagina dedicata)
**Flag:** `SHOW_NEW_COINS: false`

**Descrizione:**
- Pagina completa che mostra tutti i token creati recentemente
- Filtri, ordinamento, ricerca
- Cards dettagliate per ogni nuovo token

**URL:** `/new-coins` (potenziale)

**Motivo:**
> Non implementata/necessaria nella Season 1 con battaglie curate.

---

### 6. **Burned Page**
**Flag:** `SHOW_BURNED: false`

**Descrizione:**
- Pagina che mostra tutti i token sconfitti/bruciati
- Memorial dei token eliminati dalle battaglie
- Statistiche di burn, SOL persi, ecc.

**URL:** `/burned`
- Pagina implementata e funzionante
- Nascosta dalla navigazione principale

**Contenuto:**
- Lista token bruciati
- Quantità di SOL bruciati
- Data di eliminazione
- Storia del token

**Motivo:**
> Nella Season 1 con battaglie eterne ($10B target), nessun token verrà bruciato. La pagina sarà rilevante in Season 2 con battaglie più competitive.

---

### 7. **Created Ticker**
**Flag:** `SHOW_CREATED_TICKER: false`

**Descrizione:**
- Ticker scorrevole in alto che mostra "X CREATED $Y"
- Notifiche real-time di nuovi token creati
- Visibile solo nella Desktop Header

**Posizione:**
- Desktop Header, affianco al FOMO Ticker

**Codice:**
```typescript
<div className="flex items-center gap-3">
  <FOMOTicker />
  {FEATURES.SHOW_CREATED_TICKER && <CreatedTicker />}
</div>
```

**Motivo:**
> Non rilevante con sole 5 battaglie curate. Sarà attivo quando la community creerà token continuamente.

---

### 8. **Battle Tab** (Homepage)
**Flag:** `SHOW_BATTLE_TAB: false`

**Descrizione:**
- Tab separata per le battaglie attive
- Nella Season 1 le battaglie sono direttamente sulla home

**Motivo:**
> Con 5 battaglie, non serve una tab dedicata. Tutto è visibile sulla home.

---

### 9. **About to Win Tab** (Homepage)
**Flag:** `SHOW_ABOUT_TO_WIN_TAB: false`

**Descrizione:**
- Tab che mostra token vicini alla vittoria
- Percentuale di completamento, tempo stimato

**Motivo:**
> Con target di $10B, nessun token è "about to win" nella Season 1.

---

### 10. **Winners Tab** (Homepage)
**Flag:** `SHOW_WINNERS_TAB: false`

**Descrizione:**
- Tab homepage dedicata ai vincitori
- Nella Season 1 i vincitori sono visibili in `/winners`

**Motivo:**
> Con pochi vincitori attesi, una pagina dedicata è sufficiente.

---

### 11. **Profile Coins Tab**
**Flag:** `SHOW_PROFILE_COINS_TAB: false`

**Descrizione:**
- Tab nel profilo utente "My Coins"
- Mostra tutti i token creati dall'utente
- Stats creazioni, performance, ecc.

**URL:** `/profile?tab=coins`

**Motivo:**
> Gli utenti non possono creare token nella Season 1, quindi questa tab è inutile.

---

### 12. **Profile Army Tab**
**Flag:** `SHOW_PROFILE_ARMY_TAB: false`

**Descrizione:**
- Tab nel profilo "My Army"
- Stats esercito, membri, ranking
- Azioni esercito (leave, invite, etc.)

**URL:** `/profile?tab=army`

**Motivo:**
> Collegato al sistema Armies disabilitato in Season 1.

---

### 13. **Battles Page**
**Flag:** `SHOW_BATTLES: false`

**Descrizione:**
- Pagina separata con tutte le battaglie
- Verrà sostituita da un sistema di Categorie in Season 2

**URL:** `/battle` o `/battlestart`

**Motivo:**
> Le battaglie sono sulla home page. Una pagina separata non è necessaria con solo 5 battaglie.

---

## ✅ Funzionalità Sempre Visibili

Queste pagine/funzionalità sono **SEMPRE attive** in entrambe le season:

### Core Navigation
- ✅ **Home** (`SHOW_HOME: true`) - `/`
- ✅ **Leaderboard** (`SHOW_LEADERBOARD: true`) - `/leaderboard`
- ✅ **Profile** (`SHOW_PROFILE: true`) - `/profile`
- ✅ **Notifications** (`SHOW_NOTIFICATIONS: true`) - `/notifications`
- ✅ **Support** (`SHOW_SUPPORT: true`) - `/support`
- ✅ **How It Works** (`SHOW_HOW_IT_WORKS: true`) - `/how-it-works`

### Funzionalità Speciali
- ✅ **Holders/Potential** (`SHOW_POTENTIAL: true`) - `/holders`
  - Pagina chiave per la viralità
  - Mostra holder del token e potenziale guadagno
  - Sempre visibile anche in Season 1

---

## 🚀 Come Abilitare le Feature Nascoste

### Metodo 1: Attivare Season 2 (consigliato)
```typescript
// app/src/config/features.ts
export const FEATURES = {
  SEASON: 2,  // ⬅️ Cambia da 1 a 2
  // Tutte le feature false diventeranno automaticamente true
}
```

### Metodo 2: Abilitare Feature Singole
```typescript
export const FEATURES = {
  SEASON: 1,

  // Abilita solo Create Coin
  SHOW_CREATE_COIN: true,

  // Abilita solo Armies
  SHOW_ARMIES: true,
  SHOW_JOIN_ARMY: true,

  // ...altre rimangono false
}
```

### Metodo 3: Feature Graduale
Abilitare feature progressivamente per testing:

**Step 1:** Abilita creazione token
```typescript
SHOW_CREATE_COIN: true
```

**Step 2:** Dopo 1 settimana, abilita Armies
```typescript
SHOW_ARMIES: true
SHOW_JOIN_ARMY: true
```

**Step 3:** Abilita tutte le tab
```typescript
SHOW_NEW_COINS_TAB: true
SHOW_BATTLE_TAB: true
SHOW_ABOUT_TO_WIN_TAB: true
```

---

## 📊 Impatto delle Feature Nascoste

### Navigazione Mobile
**Attualmente visibile:**
```
🏠 Live Battles
➕ Create Token → NASCOSTO, solo via admin
👥 Leaderboard
📰 News Feed
👤 Profile
📊 Points
🆘 Support
```

**Con Season 2:**
```
🏠 Live Battles
➕ Create Token → VISIBILE
⚔️ Battles
🆕 New Coins
🪙 My Coins (profile)
🛡️ Join ARMY
👥 My Army (profile)
💀 Burned
📰 News Feed
👤 Profile
📊 Points
🆘 Support
```

### Homepage
**Season 1:**
- Solo battaglie live (5 curate)
- FOMO Ticker visibile
- Created Ticker nascosto

**Season 2:**
- Tab multiple: Battle | New Coins | About to Win | Winners
- Entrambi i ticker visibili
- Filtri e ricerca avanzata

---

## 🎯 Strategia di Rollout Season 2

### Fase 1: Soft Launch (Week 1)
```typescript
SHOW_CREATE_COIN: true  // Permetti creazione token
SHOW_NEW_COINS_TAB: true  // Mostra nuovi token
SHOW_CREATED_TICKER: true  // Notifiche creazione
```
**Obiettivo:** Testare la creazione community con early adopters

### Fase 2: Community Growth (Week 2-3)
```typescript
SHOW_ARMIES: true  // Attiva sistema eserciti
SHOW_JOIN_ARMY: true  // Mostra bottone Join
SHOW_PROFILE_ARMY_TAB: true  // Tab esercito in profilo
```
**Obiettivo:** Costruire community e competizione tra eserciti

### Fase 3: Full Launch (Week 4)
```typescript
SEASON: 2  // Attiva tutto
```
**Obiettivo:** Piattaforma completamente decentralizzata

---

## 🔍 Come Verificare le Feature Nascoste

### 1. Ispeziona il Codice
Cerca nei componenti:
```typescript
{FEATURES.SHOW_XXX && <Component />}
```

### 2. Controlla la Navigazione
- Menu mobile: `/app/src/components/layout/Header.tsx`
- Menu desktop: `/app/src/components/layout/DesktopHeader.tsx`
- Sidebar: `/app/src/components/layout/Sidebar.tsx`

### 3. Test Locale
Cambia `SEASON: 2` in locale e verifica:
```bash
cd app
npm run dev
# Controlla http://localhost:3000
```

---

## 📝 Pagine Implementate ma Nascoste

| Pagina | URL | Status | Season |
|--------|-----|--------|--------|
| **Create Token** | `/create` | ✅ Implementata | Season 2 |
| **Armies** | `/armies` | ✅ Implementata | Season 2 |
| **Burned** | `/burned` | ✅ Implementata | Season 2 |
| **Emperor** | `/emperor` | ✅ Implementata | Sempre |
| **Winners** | `/winners` | ✅ Implementata | Sempre |
| **Holders** | `/holders` | ✅ Implementata | Sempre |
| **Admin Dashboard** | `/sale/admin.html` | ✅ Implementata | Sempre (nascosta) |
| **Security** | `/sale/security.html` | ✅ Implementata | Sempre (nascosta) |

---

## ⚡ Performance Impact

### Bundle Size
Le feature nascoste **NON riducono** la dimensione del bundle JavaScript:
- Tutto il codice è incluso nel bundle
- I flag controllano solo la renderizzazione
- Per ridurre il bundle, usare dynamic imports:

```typescript
// Esempio ottimizzazione futura
const ArmiesPage = dynamic(() => import('@/app/armies/page'))
if (FEATURES.SHOW_ARMIES) {
  return <ArmiesPage />
}
```

### Database Impact
Le tabelle per le feature nascoste **esistono già**:
- `tokens` - Pronto per token community
- `armies` - Sistema eserciti attivo
- `burned_tokens` - Traccia token eliminati
- `user_profiles` - Include army_id

---

## 🛠️ Manutenzione

### Quando Abilitare Season 2?
**Indicatori chiave:**
1. ✅ Almeno 1 token ha raggiunto $1B+ market cap
2. ✅ Community di 10,000+ holder attivi
3. ✅ Sistema di moderazione pronto per token community
4. ✅ Smart contracts testati e auditati
5. ✅ Liquidity pool sufficiente per supportare molti token

### Checklist Pre-Launch Season 2
- [ ] Test creazione token su devnet
- [ ] Verifica sistema anti-spam
- [ ] Implementa moderazione contenuti
- [ ] Aggiorna documentazione utente
- [ ] Prepara announcement e marketing
- [ ] Configura analytics per nuove feature
- [ ] Test carico su infrastruttura
- [ ] Backup database pre-switch

---

## 📞 Support

Per domande sulla configurazione delle feature flags:
1. Leggi la documentazione in [`app/src/config/features.ts`](app/src/config/features.ts)
2. Controlla esempi d'uso nei componenti esistenti
3. Testa modifiche in ambiente locale prima del deploy

---

**Ultimo Aggiornamento:** 14 Gennaio 2026
**Season Corrente:** Season 1
**Prossimo Milestone:** Season 2 (Q2 2026)
**Versione Documento:** 1.0
