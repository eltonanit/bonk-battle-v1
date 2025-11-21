# 🎯 BONK BATTLE - GUIDA TRANSIZIONE DA STONKS

**Data:** 18/11/2025
**Progetto:** BONK-BATTLE-V1
**Repo:** https://github.com/eltonanit/bonk-battle-v1
**Posizione:** C:\Users\Elton\Desktop\ELTON CODE\BONK-BATTLE-V1

---

## 📊 SITUAZIONE ATTUALE

### ✅ FASE 1 COMPLETATA: Smart Contract Setup

**Cosa abbiamo fatto:**
1. ✅ Forked STONKS-APP (template Next.js funzionante) → BONK-BATTLE-V1
2. ✅ Sostituito smart contract STONKS con BONK
3. ✅ Copiato IDL BONK nel progetto
4. ✅ Aggiornato configurazione Anchor
5. ✅ Committato tutto su GitHub

**Smart Contract BONK (Devnet):**
```
Program ID: 6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq
Treasury: 5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf
Keeper: Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH
```

**File Modificati:**
- `anchor/programs/stonks_fan/` → rinominato `bonk_battle/`
- `anchor/programs/bonk_battle/src/lib.rs` → smart contract BONK completo
- `anchor/target/idl/bonk_battle.json` → IDL BONK (73KB)
- `anchor/Anchor.toml` → aggiornato con Program ID BONK
- `anchor/Cargo.toml` → aggiornato per bonk_battle
- `anchor/programs/bonk_battle/Cargo.toml` → configurazione package

---

## 🔴 FASE 2 DA COMPLETARE: Fix Frontend

**Problema:** Il frontend usa ancora istruzioni STONKS che sono INCOMPATIBILI con BONK.

**Tempo stimato:** 4-6 ore

---

## 📋 COMANDI UTILI PER CAPIRE IL CONTESTO

### **1. Verifica Struttura Progetto**
```powershell
# Root progetto
cd "C:\Users\Elton\Desktop\ELTON CODE\BONK-BATTLE-V1"

# Vedi struttura anchor/
tree /F anchor\programs

# Vedi IDL BONK
type anchor\target\idl\bonk_battle.json | Select-String -Pattern "name" -Context 2,0 | Select-Object -First 20

# Vedi Program ID in Anchor.toml
type anchor\Anchor.toml
```

### **2. Verifica Smart Contract BONK**
```powershell
# Vedi prime righe del contratto
Get-Content "anchor\programs\bonk_battle\src\lib.rs" -Head 50

# Cerca istruzioni disponibili
Get-Content "anchor\programs\bonk_battle\src\lib.rs" | Select-String "pub fn"

# Cerca constants importanti
Get-Content "anchor\programs\bonk_battle\src\lib.rs" | Select-String "const"
```

### **3. Confronta IDL BONK vs STONKS (backup)**
```powershell
# Vedi istruzioni BONK
Get-Content "anchor\target\idl\bonk_battle.json" | Select-String '"name"' | Select-Object -First 30

# Vedi istruzioni STONKS (backup)
Get-Content "anchor\target\idl\stonks_fan.json.backup" | Select-String '"name"' | Select-Object -First 30
```

### **4. Verifica Frontend**
```powershell
# Vai in app/
cd app

# Vedi file che usano createToken (STONKS)
Get-ChildItem -Recurse -Filter "*.ts*" | Select-String "createToken" | Select-Object -Unique Path

# Vedi file che usano buyTokens (STONKS)
Get-ChildItem -Recurse -Filter "*.ts*" | Select-String "buyTokens" | Select-Object -Unique Path

# Vedi file che usano TokenLaunch (STONKS account)
Get-ChildItem -Recurse -Filter "*.ts*" | Select-String "TokenLaunch" | Select-Object -Unique Path
```

### **5. Avvia Dev Server**
```powershell
cd app
npm run dev
# Apri http://localhost:3000
```

---

## 🔍 CONFRONTO STONKS vs BONK

### **Istruzioni Smart Contract**

| Azione | STONKS | BONK |
|--------|--------|------|
| **Crea token** | `createToken(mintSeed, tier, name, symbol, uri)` | `create_battle_token(name, symbol, uri)` |
| **Compra** | `buyTokens(solAmount, minTokensOut)` | `buy_token(solAmount)` |
| **Vendi** | ❌ Non disponibile | `sell_token(tokenAmount)` |
| **Inizia battaglia** | ❌ Non disponibile | `start_battle()` |
| **Verifica vittoria** | ❌ Non disponibile | `check_victory_conditions()` |
| **Finalizza duello** | ❌ Non disponibile | `finalize_duel()` |
| **Withdrawal listing** | `withdrawForPool()` | `withdraw_for_listing()` |

### **Account Strutture**

| Campo | TokenLaunch (STONKS) | TokenBattleState (BONK) |
|-------|---------------------|------------------------|
| mint | ✅ `Pubkey` | ✅ `Pubkey` |
| tier | ✅ `u8` (1-4) | ❌ Non esiste |
| virtualSolInit | ✅ `u64` | ❌ Non esiste |
| constantK | ✅ `u128` | ❌ Non esiste |
| solRaised | ✅ `u64` | ✅ `sol_collected: u64` |
| status | ✅ `LaunchStatus` | ✅ `battle_status: BattleStatus` |
| creator | ✅ `Pubkey` | ❌ Non esiste |
| deadline | ✅ `i64` | ❌ Non esiste |
| totalBuyers | ✅ `u32` | ❌ Non esiste |
| totalTokensSold | ✅ `u64` | ✅ `tokens_sold: u64` |
| opponent_mint | ❌ Non esiste | ✅ `Pubkey` |
| total_trade_volume | ❌ Non esiste | ✅ `u64` |
| battle_start_timestamp | ❌ Non esiste | ✅ `i64` |
| victory_timestamp | ❌ Non esiste | ✅ `i64` |

### **Status Enum**

**STONKS LaunchStatus:**
```rust
enum LaunchStatus {
    Active,
    ReadyToGraduate,
    GraduationInProgress,
    Graduated,
    Failed,
    Paused
}
```

**BONK BattleStatus:**
```rust
enum BattleStatus {
    Created,
    Qualified,
    InBattle,
    VictoryPending,
    Listed
}
```

### **PDA Seeds**

| Account | STONKS | BONK |
|---------|--------|------|
| Main state | `["launch", mint]` | `["battle_state", mint]` |
| Buyer record | `["buyer", launch, buyer]` | ❌ Non esiste |

---

## 📂 FILE DA MODIFICARE (Priorità)

### **PRIORITÀ ALTA - Necessari per funzionamento base**

#### 1. **IDL Type Definitions** ⭐⭐⭐
**File:** `app/src/types/idl.ts` (se esiste) o creare nuovo

**Azione:** Definire tipi TypeScript da IDL BONK
```typescript
// ESEMPIO (da creare/modificare):
export type BonkBattle = {
  // Copiare da anchor/target/idl/bonk_battle.json
  instructions: [...],
  accounts: [...],
  types: [...]
}
```

#### 2. **Anchor Program Instance** ⭐⭐⭐
**File:** `app/src/lib/solana/program.ts` (o simile)

**Problema:** Carica IDL STONKS
```typescript
// PRIMA:
import idl from '@/anchor/target/idl/stonks_fan.json'
const programId = new PublicKey('54zTTRA9QVbGMk86dU7A51f51QjdvwD9gLPFNEt5kdYw')

// DOPO:
import idl from '@/anchor/target/idl/bonk_battle.json'
const programId = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq')
```

#### 3. **Create Token Helper** ⭐⭐⭐
**File:** `app/src/lib/solana/create-token.ts` (o simile)

**Problema:** Usa `createToken` con tier
```typescript
// PRIMA (STONKS):
await program.methods
  .createToken(mintSeed, tier, name, symbol, uri)
  .accounts({ ... })
  .rpc()

// DOPO (BONK):
await program.methods
  .createBattleToken(name, symbol, uri)
  .accounts({
    mint: mintKeypair.publicKey,
    tokenBattleState: battleStatePDA,
    contractTokenAccount: contractTokenAccountPDA,
    priceOracle: priceOraclePDA,
    user: wallet.publicKey,
    // ...
  })
  .signers([mintKeypair])
  .rpc()
```

#### 4. **Buy Token Helper** ⭐⭐⭐
**File:** `app/src/lib/solana/buy-tokens.ts` (o simile)

**Problema:** Usa `buyTokens` con minTokensOut
```typescript
// PRIMA (STONKS):
await program.methods
  .buyTokens(solAmount, minTokensOut)
  .accounts({ ... })
  .rpc()

// DOPO (BONK):
await program.methods
  .buyToken(solAmount)
  .accounts({
    tokenBattleState: battleStatePDA,
    mint: tokenMint,
    contractTokenAccount: contractTokenAccountPDA,
    userTokenAccount: userTokenAccountPDA,
    priceOracle: priceOraclePDA,
    treasuryWallet: TREASURY_WALLET,
    user: wallet.publicKey,
    // ...
  })
  .rpc()
```

#### 5. **Fetch Token State Hook** ⭐⭐⭐
**File:** `app/src/hooks/useTokenLaunch.ts` o simile

**Problema:** Fetcha `tokenLaunch` invece di `tokenBattleState`
```typescript
// PRIMA (STONKS):
const tokenLaunch = await program.account.tokenLaunch.fetch(launchPDA)

// DOPO (BONK):
const [battleStatePDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("battle_state"), mint.toBuffer()],
  program.programId
)
const tokenBattleState = await program.account.tokenBattleState.fetch(battleStatePDA)
```

### **PRIORITÀ MEDIA - UI/UX**

#### 6. **Create Page** ⭐⭐
**File:** `app/src/app/create/page.tsx`

**Azioni:**
- Rimuovere campo/select "tier" dal form
- Aggiornare chiamata da `createToken` → `createBattleToken`
- Rimuovere logica tier (1-4)

#### 7. **Token Detail Page** ⭐⭐
**File:** `app/src/app/token/[mint]/page.tsx`

**Azioni:**
- Cambiare fetch da `TokenLaunch` → `TokenBattleState`
- Mostrare `battle_status` invece di `status`
- Aggiungere sezione "Opponent" se in battaglia
- Mostrare `total_trade_volume`
- Rimuovere informazioni tier-specific

#### 8. **Token Card Component** ⭐⭐
**File:** `app/src/components/TokenCard.tsx` (o simile)

**Azioni:**
- Usare `battle_status` invece di `status`
- Mostrare badge battaglia se `InBattle`
- Aggiornare progress bar per qualificazione ($5,100)

### **PRIORITÀ BASSA - Nuove Feature BONK**

#### 9. **Sell Token Helper** ⭐
**File:** `app/src/lib/solana/sell-token.ts` (NUOVO)

**Azione:** Creare funzione per vendere token
```typescript
export async function sellToken(
  program: Program,
  wallet: WalletContextState,
  mint: PublicKey,
  tokenAmount: number
) {
  // Implementare sell_token instruction
}
```

#### 10. **Battle Pages** ⭐
**Files da creare:**
- `app/src/app/battle/page.tsx` - Lista token qualificati + matchmaking
- `app/src/app/battles/page.tsx` - Lista battaglie attive
- `app/src/components/BattleCard.tsx` - Card battaglia

---

## 💻 ESEMPI CODICE COMPLETI

### **Esempio 1: PDA Derivation BONK**
```typescript
// app/src/lib/solana/pdas.ts
import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey('6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq')

export function getBattleStatePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("battle_state"), mint.toBuffer()],
    PROGRAM_ID
  )
}

export function getPriceOraclePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("price_oracle")],
    PROGRAM_ID
  )
}
```

### **Esempio 2: Create Battle Token**
```typescript
// app/src/lib/solana/create-battle-token.ts
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

export async function createBattleToken(
  program: Program,
  wallet: any,
  name: string,
  symbol: string,
  uri: string
) {
  // Generate mint keypair
  const mintKeypair = Keypair.generate()
  
  // Derive PDAs
  const [battleStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("battle_state"), mintKeypair.publicKey.toBuffer()],
    program.programId
  )
  
  const [contractTokenAccount] = PublicKey.findProgramAddressSync(
    [
      battleStatePDA.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintKeypair.publicKey.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  
  const [priceOraclePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("price_oracle")],
    program.programId
  )
  
  // Send transaction
  const tx = await program.methods
    .createBattleToken(name, symbol, uri)
    .accounts({
      mint: mintKeypair.publicKey,
      tokenBattleState: battleStatePDA,
      contractTokenAccount,
      priceOracle: priceOraclePDA,
      user: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([mintKeypair])
    .rpc()
  
  return {
    signature: tx,
    mint: mintKeypair.publicKey,
    battleState: battleStatePDA
  }
}
```

### **Esempio 3: Buy Token**
```typescript
// app/src/lib/solana/buy-token.ts
import { Program } from '@coral-xyz/anchor'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token'

const TREASURY_WALLET = new PublicKey('5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf')

export async function buyToken(
  program: Program,
  wallet: any,
  mint: PublicKey,
  solAmount: number // in lamports
) {
  // Derive PDAs
  const [battleStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("battle_state"), mint.toBuffer()],
    program.programId
  )
  
  const [contractTokenAccount] = PublicKey.findProgramAddressSync(
    [
      battleStatePDA.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer()
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  
  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    wallet.publicKey
  )
  
  const [priceOraclePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("price_oracle")],
    program.programId
  )
  
  // Send transaction
  const tx = await program.methods
    .buyToken(new BN(solAmount))
    .accounts({
      tokenBattleState: battleStatePDA,
      mint,
      contractTokenAccount,
      userTokenAccount,
      priceOracle: priceOraclePDA,
      treasuryWallet: TREASURY_WALLET,
      user: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc()
  
  return tx
}
```

### **Esempio 4: Fetch Token Battle State**
```typescript
// app/src/hooks/useTokenBattleState.ts
import { useEffect, useState } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import idl from '@/anchor/target/idl/bonk_battle.json'

export interface TokenBattleState {
  mint: PublicKey
  solCollected: number
  tokensSold: number
  totalTradeVolume: number
  isActive: boolean
  battleStatus: 'Created' | 'Qualified' | 'InBattle' | 'VictoryPending' | 'Listed'
  opponentMint: PublicKey
  creationTimestamp: number
  lastTradeTimestamp: number
  battleStartTimestamp: number
  victoryTimestamp: number
  listingTimestamp: number
}

export function useTokenBattleState(mint: PublicKey | null) {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const [state, setState] = useState<TokenBattleState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (!mint || !wallet) return
    
    const fetchState = async () => {
      try {
        setLoading(true)
        
        const provider = new AnchorProvider(connection, wallet, {})
        const program = new Program(idl as any, provider)
        
        const [battleStatePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("battle_state"), mint.toBuffer()],
          program.programId
        )
        
        const battleState = await program.account.tokenBattleState.fetch(battleStatePDA)
        
        setState({
          mint: battleState.mint,
          solCollected: battleState.solCollected.toNumber(),
          tokensSold: battleState.tokensSold.toNumber(),
          totalTradeVolume: battleState.totalTradeVolume.toNumber(),
          isActive: battleState.isActive,
          battleStatus: Object.keys(battleState.battleStatus)[0] as any,
          opponentMint: battleState.opponentMint,
          creationTimestamp: battleState.creationTimestamp.toNumber(),
          lastTradeTimestamp: battleState.lastTradeTimestamp.toNumber(),
          battleStartTimestamp: battleState.battleStartTimestamp.toNumber(),
          victoryTimestamp: battleState.victoryTimestamp.toNumber(),
          listingTimestamp: battleState.listingTimestamp.toNumber(),
        })
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchState()
    
    // Poll every 10s
    const interval = setInterval(fetchState, 10000)
    return () => clearInterval(interval)
  }, [mint, wallet, connection])
  
  return { state, loading, error }
}
```

---

## ✅ CHECKLIST COMPLETA

### **Setup & Verifica (FATTO)**
- [x] Fork STONKS-APP → BONK-BATTLE-V1
- [x] Copia smart contract BONK (`lib.rs`)
- [x] Copia IDL BONK (`bonk_battle.json`)
- [x] Aggiorna `Anchor.toml` con Program ID BONK
- [x] Aggiorna `Cargo.toml` per bonk_battle
- [x] Commit su GitHub

### **Core Functions (DA FARE)**
- [ ] Creare/aggiornare `app/src/types/idl.ts` con tipi BONK
- [ ] Aggiornare program instance per usare IDL BONK
- [ ] Creare `getBattleStatePDA()` helper
- [ ] Creare `getPriceOraclePDA()` helper
- [ ] Implementare `createBattleToken()` 
- [ ] Implementare `buyToken()`
- [ ] Implementare `sellToken()` (nuovo)
- [ ] Creare hook `useTokenBattleState()`

### **UI Pages (DA FARE)**
- [ ] Fix `/create` page (rimuovi tier, usa createBattleToken)
- [ ] Fix `/token/[mint]` page (usa TokenBattleState)
- [ ] Update `TokenCard` component (battle_status)
- [ ] Create `/battle` page (matchmaking)
- [ ] Create `/battles` page (active battles)
- [ ] Create `BattleCard` component

### **Battle Features (DA FARE)**
- [ ] Implementare `startBattle()`
- [ ] Implementare `checkVictoryConditions()`
- [ ] Implementare `finalizeDuel()`
- [ ] Implementare `withdrawForListing()`
- [ ] UI per "Find Match" button
- [ ] UI per real-time battle updates
- [ ] UI per victory modal

### **Testing (DA FARE)**
- [ ] Test create token on devnet
- [ ] Test buy token on devnet
- [ ] Test sell token on devnet
- [ ] Verify transactions on Solscan
- [ ] Test qualification flow
- [ ] Test battle flow (requires 2 tokens)
- [ ] Test victory conditions

### **Database Sync (DA FARE - FASE 3)**
- [ ] Setup Prisma schema per BONK
- [ ] Create tables: tokens, battles, transactions
- [ ] Setup Helius webhooks
- [ ] Implement webhook handlers
- [ ] Test sync create token → DB
- [ ] Test sync buy/sell → DB
- [ ] Test sync battles → DB

---

## 🚨 NOTE CRITICHE

### **Differenze Architetturali Importanti**

1. **BONK non ha Tier System**
   - Tutti i token partono con MC virtuale $5,000
   - Nessun tier 1-4 come STONKS

2. **BONK ha Price Oracle**
   - Usa `PriceOracle` account per prezzo SOL/USD
   - Aggiornato daily da keeper
   - Necessario per calcoli MC in USD

3. **BONK non traccia BuyerRecord**
   - STONKS salvava ogni buyer in account separato
   - BONK traccia solo stato totale del token

4. **BONK ha Sell**
   - STONKS non permetteva sell sulla bonding curve
   - BONK permette sell con burn tokens

5. **Victory Conditions**
   - Test values: $5,500 MC + $100 volume
   - Production values: $60k MC + $70k volume
   - Configurabili nel contract

### **Wallet Hardcoded (Importante!)**

Il contract BONK ha wallet hardcoded:
```rust
const TREASURY_WALLET: &str = "5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf";
const KEEPER_AUTHORITY: &str = "Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH";
```

Se questi wallet non sono tuoi, NON puoi:
- ❌ Ricevere platform fees
- ❌ Fare update price oracle
- ❌ Chiamare keeper functions

**Azione:** Verificare ownership di questi wallet!

### **Devnet vs Mainnet**

Attualmente tutto è su DEVNET:
- Smart contract deployato su devnet
- `Anchor.toml` usa `cluster = "Devnet"`
- Per mainnet serve re-deploy e nuovi wallet

---

## 📞 CONTATTI & RISORSE

**Repo BONK Contract Originale:**
```
C:\Users\Elton\bonk-battle-contract
```

**Repo STONKS (Template Originale):**
```
C:\Users\Elton\Desktop\ELTON CODE\STONKS-APP
```

**Solscan Devnet:**
- Program: https://solscan.io/account/6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq?cluster=devnet
- Treasury: https://solscan.io/account/5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf?cluster=devnet

**Documentazione:**
- Anchor: https://www.anchor-lang.com/
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
- SPL Token: https://spl.solana.com/token

---

## 🎯 PROSSIMI PASSI IMMEDIATI

1. **Leggi questo documento completamente**
2. **Esplora il progetto con i comandi forniti**
3. **Confronta I
DL STONKS vs BONK** (vedi sezione Confronto)
4. **Inizia con PRIORITÀ ALTA** (file 1-5)
5. **Testa ogni funzione su devnet**
6. **Verifica su Solscan che tutto sia on-chain**

**Tempo stimato totale:** 8-12 ore per completare FASE 2 + 3

---

**Buon lavoro! 🚀**
