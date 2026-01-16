# 🌐 Network Switching Implementation Guide

## Panoramica

Questo documento descrive la strategia completa per implementare il sistema di switch tra **Devnet** e **Mainnet** nella piattaforma Bonk Battle.

**Obiettivo:** Permettere agli utenti di scegliere su quale rete Solana operare (testing su Devnet o produzione su Mainnet) tramite il toggle nella pagina `/net`.

---

## 📋 Stato Attuale

### Configurazione RPC Corrente

**Mainnet (Attuale):**
- RPC Endpoint: `https://mainnet.helius-rpc.com/?api-key=...`
- Smart Contract Program ID: `F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD`
- Treasury Wallet: `5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf`
- Keeper Wallet: `65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea`

**Devnet (Da configurare):**
- RPC Endpoint: `https://devnet.helius-rpc.com/?api-key=...`
- Smart Contract Program ID: (stesso o diverso?)
- Treasury Wallet: (stesso o separato?)
- Keeper Wallet: (stesso o separato?)

---

## 🎯 Architettura Proposta

### 1. **Network Context Provider** (NUOVO)

Creare un Context React per gestire lo stato della rete globalmente.

**File da creare:** `app/src/providers/NetworkProvider.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Network = 'mainnet' | 'devnet';

interface NetworkContextType {
  network: Network;
  setNetwork: (network: Network) => void;
  rpcEndpoint: string;
  isMainnet: boolean;
  isDevnet: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Leggi da localStorage (default: mainnet)
  const [network, setNetworkState] = useState<Network>('mainnet');

  useEffect(() => {
    const savedNetwork = localStorage.getItem('solana-network') as Network | null;
    if (savedNetwork === 'devnet' || savedNetwork === 'mainnet') {
      setNetworkState(savedNetwork);
    }
  }, []);

  const setNetwork = (newNetwork: Network) => {
    setNetworkState(newNetwork);
    localStorage.setItem('solana-network', newNetwork);

    // ⚠️ Refresh della pagina per ricaricare tutti i componenti
    window.location.reload();
  };

  const rpcEndpoint = network === 'mainnet'
    ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL!
    : process.env.NEXT_PUBLIC_DEVNET_RPC_URL!;

  return (
    <NetworkContext.Provider
      value={{
        network,
        setNetwork,
        rpcEndpoint,
        isMainnet: network === 'mainnet',
        isDevnet: network === 'devnet',
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
```

**Perché serve:**
- Gestisce lo stato globale della rete selezionata
- Salva la scelta in localStorage (persiste tra sessioni)
- Fornisce l'RPC endpoint corretto a tutta l'app
- Forza un refresh quando cambia rete (necessario per wallet adapter)

---

### 2. **Environment Variables** (AGGIORNARE)

**File da modificare:** `app/.env.local`

```env
# ════════════════════════════════════════════════════════════
# MAINNET CONFIGURATION
# ════════════════════════════════════════════════════════════
NEXT_PUBLIC_MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=54911811-93e0-430b-a296-c18efa362e01
NEXT_PUBLIC_MAINNET_PROGRAM_ID=F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD
NEXT_PUBLIC_MAINNET_TREASURY=5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf
NEXT_PUBLIC_MAINNET_KEEPER=65UHQMfEmBjuAhN1Hg4bWC1jkdHC9eWMsaB1MC58Jgea

# ════════════════════════════════════════════════════════════
# DEVNET CONFIGURATION
# ════════════════════════════════════════════════════════════
NEXT_PUBLIC_DEVNET_RPC_URL=https://devnet.helius-rpc.com/?api-key=54911811-93e0-430b-a296-c18efa362e01
NEXT_PUBLIC_DEVNET_PROGRAM_ID=F2iP4tpfg5fLnxNQ2pA2odf7V9kq4uS9pV3MpARJT5eD
NEXT_PUBLIC_DEVNET_TREASURY=<DEVNET_TREASURY_ADDRESS>
NEXT_PUBLIC_DEVNET_KEEPER=<DEVNET_KEEPER_ADDRESS>

# ⚠️ BACKWARD COMPATIBILITY (deprecato ma necessario per ora)
NEXT_PUBLIC_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=54911811-93e0-430b-a296-c18efa362e01
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=54911811-93e0-430b-a296-c18efa362e01
```

**Note:**
- Separare chiaramente Mainnet e Devnet
- Mantenere le vecchie env vars per backward compatibility
- I wallet Devnet devono essere diversi (non usare quelli Mainnet!)

---

### 3. **Network Config Helper** (NUOVO)

**File da creare:** `app/src/config/network.ts`

```typescript
export type Network = 'mainnet' | 'devnet';

export interface NetworkConfig {
  rpcEndpoint: string;
  programId: string;
  treasuryWallet: string;
  keeperWallet: string;
  name: string;
  explorerUrl: string;
}

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  mainnet: {
    rpcEndpoint: process.env.NEXT_PUBLIC_MAINNET_RPC_URL!,
    programId: process.env.NEXT_PUBLIC_MAINNET_PROGRAM_ID!,
    treasuryWallet: process.env.NEXT_PUBLIC_MAINNET_TREASURY!,
    keeperWallet: process.env.NEXT_PUBLIC_MAINNET_KEEPER!,
    name: 'Mainnet',
    explorerUrl: 'https://solscan.io',
  },
  devnet: {
    rpcEndpoint: process.env.NEXT_PUBLIC_DEVNET_RPC_URL!,
    programId: process.env.NEXT_PUBLIC_DEVNET_PROGRAM_ID!,
    treasuryWallet: process.env.NEXT_PUBLIC_DEVNET_TREASURY!,
    keeperWallet: process.env.NEXT_PUBLIC_DEVNET_KEEPER!,
    name: 'Devnet',
    explorerUrl: 'https://solscan.io?cluster=devnet',
  },
};

export function getNetworkConfig(network: Network): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

export function getCurrentNetwork(): Network {
  if (typeof window === 'undefined') return 'mainnet';
  const saved = localStorage.getItem('solana-network');
  return (saved === 'devnet' || saved === 'mainnet') ? saved : 'mainnet';
}
```

**Perché serve:**
- Centralizza tutte le configurazioni di rete
- Facile da mantenere e aggiornare
- Type-safe con TypeScript

---

### 4. **Wallet Provider** (MODIFICARE)

**File da modificare:** `app/src/app/layout.tsx` o dove è definito `WalletContextProvider`

```typescript
'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useNetwork } from '@/providers/NetworkProvider';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const { rpcEndpoint, network } = useNetwork();

  // ⚠️ IMPORTANTE: Wallet adapter network deve matchare
  const walletNetwork = network === 'mainnet'
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet;

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    [walletNetwork] // Re-crea wallet quando cambia network
  );

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

**Perché serve:**
- Il wallet adapter deve sapere su quale rete operare
- Phantom e altri wallet devono collegarsi alla rete corretta
- Auto-connect deve usare la rete giusta

---

### 5. **Pagina /net** (MODIFICARE)

**File da modificare:** `app/src/app/net/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useNetwork } from '@/providers/NetworkProvider';
// ... altri import

export default function NetPage() {
  const { network, setNetwork } = useNetwork();
  const [selectedNetwork, setSelectedNetwork] = useState(network);

  const handleConfirm = () => {
    if (selectedNetwork !== network) {
      // Mostra warning se ci sono operazioni pending
      const confirmed = confirm(
        `Switch to ${selectedNetwork.toUpperCase()}?\n\n` +
        `This will reload the page and disconnect your wallet.\n` +
        `Make sure you have no pending transactions.`
      );

      if (confirmed) {
        setNetwork(selectedNetwork);
        // Il reload avviene automaticamente nel NetworkProvider
      }
    }
  };

  return (
    // ... UI esistente
    <button onClick={handleConfirm}>
      Confirm Selection
    </button>
  );
}
```

**Perché serve:**
- Connette il toggle UI con il NetworkProvider
- Gestisce il cambio di rete con conferma utente
- Warning per operazioni pending

---

### 6. **Badge Network nel Header** (MODIFICARE)

**File da modificare:**
- `app/src/components/layout/DesktopHeader.tsx`
- `app/src/components/layout/Header.tsx`

```typescript
import { useNetwork } from '@/providers/NetworkProvider';

export function DesktopHeader() {
  const { isMainnet, isDevnet } = useNetwork();

  return (
    // ...
    <Link href="/net">NET</Link>

    {/* Badge dinamico basato su network */}
    {isMainnet ? (
      <div className="bg-green-400 text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-lg shadow-green-400/50 transform rotate-12">
        MAINNET
      </div>
    ) : (
      <div className="bg-purple-400 text-black px-2 py-0.5 rounded text-[10px] font-bold shadow-lg shadow-purple-400/50 transform rotate-12">
        DEVNET
      </div>
    )}
  );
}
```

**Perché serve:**
- Mostra sempre la rete corrente
- Visual feedback immediato
- Badge diverso per Mainnet (verde) e Devnet (viola)

---

### 7. **Trading Components** (MODIFICARE)

**File da modificare:**
- `app/src/components/token/TradingPanel.tsx`
- Tutti i componenti che fanno transazioni on-chain

```typescript
import { useNetwork } from '@/providers/NetworkProvider';
import { getNetworkConfig } from '@/config/network';

export function TradingPanel() {
  const { network } = useNetwork();
  const config = getNetworkConfig(network);

  // Usa config.programId invece di hardcoded
  const programId = new PublicKey(config.programId);
  const treasuryWallet = new PublicKey(config.treasuryWallet);

  // ... resto del codice
}
```

**Perché serve:**
- Le transazioni devono andare al program ID corretto
- I wallet treasury/keeper dipendono dalla rete

---

### 8. **API Routes** (MODIFICARE)

**File da modificare:** Tutte le API routes che interagiscono con Solana

**Problema:** Le API routes girano server-side, non hanno accesso a localStorage.

**Soluzione:** Passare il network come query parameter o header

```typescript
// app/src/app/api/tokens/[mint]/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const network = url.searchParams.get('network') || 'mainnet';

  const config = getNetworkConfig(network as Network);
  const connection = new Connection(config.rpcEndpoint);

  // ... resto del codice
}
```

**Client-side fetch:**
```typescript
const { network } = useNetwork();
const response = await fetch(`/api/tokens/${mint}?network=${network}`);
```

---

### 9. **Database Considerations** (IMPORTANTE)

**Problema:** Tokens su Mainnet e Devnet sono DIVERSI

**Soluzioni possibili:**

#### Opzione A: Database Separati
```sql
-- Mainnet
CREATE TABLE tokens_mainnet (...)
CREATE TABLE battles_mainnet (...)

-- Devnet
CREATE TABLE tokens_devnet (...)
CREATE TABLE battles_devnet (...)
```

#### Opzione B: Network Column (CONSIGLIATO)
```sql
ALTER TABLE tokens ADD COLUMN network VARCHAR(10) DEFAULT 'mainnet';
ALTER TABLE battles ADD COLUMN network VARCHAR(10) DEFAULT 'mainnet';
ALTER TABLE winners ADD COLUMN network VARCHAR(10) DEFAULT 'mainnet';

-- Index per performance
CREATE INDEX idx_tokens_network ON tokens(network);
CREATE INDEX idx_battles_network ON battles(network);
```

**Query modificate:**
```typescript
const { data } = await supabase
  .from('tokens')
  .select('*')
  .eq('network', network) // ⭐ Filtra per network
  .eq('battle_status', 2);
```

---

### 10. **Smart Contract Deployment** (ANCHOR)

**File da controllare:** `anchor/programs/bonk_battle/src/lib.rs`

**Opzioni:**

#### Opzione A: Stesso Program ID
- Deploy lo stesso program su Mainnet E Devnet
- Program ID identico su entrambe le reti
- Più semplice da gestire

#### Opzione B: Program ID Diversi
- Program separati per Mainnet e Devnet
- Più flessibilità per testing
- Configurazione più complessa

**Deploy su Devnet:**
```bash
# 1. Cambia cluster in Anchor.toml
[provider]
cluster = "devnet"

# 2. Deploy
anchor build
anchor deploy

# 3. Salva il program ID
anchor keys list
```

---

## 📂 File da Creare/Modificare - Checklist

### ✅ File da CREARE

- [ ] `app/src/providers/NetworkProvider.tsx` - Context per network state
- [ ] `app/src/config/network.ts` - Configurazioni network
- [ ] `app/src/hooks/useNetworkConfig.ts` - Hook helper (opzionale)

### 🔧 File da MODIFICARE

#### Frontend
- [ ] `app/src/app/layout.tsx` - Wrappa con NetworkProvider
- [ ] `app/src/app/net/page.tsx` - Connetti toggle a NetworkProvider
- [ ] `app/src/components/layout/DesktopHeader.tsx` - Badge dinamico
- [ ] `app/src/components/layout/Header.tsx` - Badge dinamico mobile
- [ ] `app/src/components/token/TradingPanel.tsx` - Usa network config
- [ ] `app/src/components/token/MobileTradingDrawer.tsx` - Usa network config

#### API Routes
- [ ] `app/src/app/api/tokens/[mint]/route.ts` - Accetta network param
- [ ] `app/src/app/api/battles/start/route.ts` - Accetta network param
- [ ] `app/src/app/api/battles/auto-complete/route.ts` - Multi-network
- [ ] Tutte le altre API routes che usano RPC

#### Database
- [ ] Migration SQL per aggiungere `network` column
- [ ] Update tutti i query Supabase per filtrare per network

#### Config
- [ ] `app/.env.local` - Aggiungi env vars per Devnet
- [ ] `app/.env.example` - Documenta nuove env vars

---

## ⚠️ Considerazioni Critiche

### 1. **Wallet Separation**
- ❌ **NON usare** gli stessi wallet Mainnet su Devnet
- ✅ **Crea** wallet dedicati per Devnet (test SOL, no valore reale)

### 2. **Database Isolation**
- ❌ **NON mescolare** tokens Mainnet e Devnet nello stesso database senza flag
- ✅ **Aggiungi** colonna `network` a tutte le tabelle rilevanti

### 3. **Testing Environment**
- ✅ **Test** tutte le funzionalità su Devnet prima di usare Mainnet
- ✅ **Deploy** prima su Devnet, poi su Mainnet

### 4. **User Experience**
- ⚠️ **Warning chiaro** quando si switcha rete
- ⚠️ **Disconnetti wallet** automaticamente al cambio rete
- ⚠️ **Reload pagina** per evitare stati inconsistenti

### 5. **Security**
- 🔒 **Wallet privates keys** diversi per Mainnet/Devnet
- 🔒 **API keys** separate se possibile
- 🔒 **Admin panel** deve mostrare chiaramente la rete attiva

---

## 🚀 Piano di Implementazione

### Fase 1: Setup Base (1-2 ore)
1. Creare `NetworkProvider.tsx`
2. Creare `network.ts` config
3. Aggiungere env vars per Devnet
4. Wrappare app con NetworkProvider

### Fase 2: UI Components (1 ora)
1. Modificare `/net/page.tsx` per usare NetworkProvider
2. Modificare header per badge dinamico
3. Testare il toggle (ancora senza effetti reali)

### Fase 3: Database (1-2 ore)
1. Migration: aggiungere colonna `network`
2. Update seed data con network='mainnet'
3. Modificare tutti i query per filtrare per network

### Fase 4: Smart Contract Devnet (2-3 ore)
1. Deploy program su Devnet
2. Creare wallet Devnet (Treasury + Keeper)
3. Inizializzare price oracle su Devnet
4. Testare creazione token su Devnet

### Fase 5: API Routes (2-3 ore)
1. Modificare API routes per accettare network param
2. Update Connection() con RPC corretto
3. Testare tutte le API su entrambe le reti

### Fase 6: Testing (2-4 ore)
1. Test completo su Devnet:
   - Creazione token
   - Trading (buy/sell)
   - Battaglie
   - Vittoria e listing
2. Verificare isolamento database
3. Test switch rete durante operazioni

### Fase 7: Production Deploy
1. Deploy su Vercel staging
2. Test smoke test su Mainnet
3. Deploy production
4. Monitoring per 24h

**Tempo totale stimato:** 10-15 ore

---

## 🧪 Testing Checklist

### Pre-Deploy Testing

#### Devnet Testing
- [ ] Connessione wallet Phantom su Devnet
- [ ] Creazione nuovo token su Devnet
- [ ] Buy tokens con test SOL
- [ ] Sell tokens
- [ ] Start battle tra 2 token Devnet
- [ ] Victory detection
- [ ] Pool Raydium su Devnet
- [ ] Database correttamente separato

#### Network Switching
- [ ] Switch da Mainnet a Devnet
- [ ] Switch da Devnet a Mainnet
- [ ] Wallet disconnette correttamente
- [ ] Badge aggiorna colore
- [ ] RPC endpoint cambia
- [ ] Transactions vanno alla rete corretta

#### Edge Cases
- [ ] Switch durante pending transaction
- [ ] Switch con wallet non connesso
- [ ] Reload pagina mantiene network selection
- [ ] API routes con network param mancante
- [ ] Tokens Mainnet non visibili su Devnet

---

## 📝 Note Finali

### Vantaggi del Network Switching

1. **Testing Sicuro:** Test su Devnet senza rischi finanziari
2. **Development:** Sviluppo feature senza toccare Mainnet
3. **User Choice:** Power users possono testare in anticipo
4. **Debugging:** Più facile debuggare su Devnet

### Svantaggi da Gestire

1. **Complessità:** Codebase più complesso
2. **Maintenance:** Due reti da mantenere
3. **Database:** Dati duplicati o separati
4. **User Confusion:** Rischio di confondere le reti

### Alternative al Network Switching

**Opzione 1:** No network switching, solo Mainnet
- PRO: Più semplice, meno bug
- CON: No testing per users

**Opzione 2:** Subdomains separati
- `mainnet.bonkbattle.com`
- `devnet.bonkbattle.com`
- PRO: Isolamento totale
- CON: Deploy doppio, URL diversi

**Opzione 3:** Network switching (QUESTO DOCUMENTO)
- PRO: Flessibilità massima
- CON: Complessità media

---

## 🔗 Riferimenti Utili

- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Helius RPC Docs](https://docs.helius.dev/)
- [Anchor Framework](https://www.anchor-lang.com/)

---

**Versione:** 1.0
**Ultimo Aggiornamento:** 16 Gennaio 2026
**Status:** Documentazione Strategica - Implementazione Pending
