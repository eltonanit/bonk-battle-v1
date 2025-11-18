# ✅ SESSION 2 COMPLETED: createBattleToken() Implementation

**Data:** 18/11/2025
**Task:** Implementare funzione createBattleToken per BONK BATTLE
**Status:** ✅ COMPLETATO

---

## 📦 File Creati

### 1. **Core Files (Sessione 1)**
- ✅ [`app/src/lib/solana/constants.ts`](app/src/lib/solana/constants.ts) - Costanti e Program ID BONK
- ✅ [`app/src/lib/solana/pdas.ts`](app/src/lib/solana/pdas.ts) - Funzioni derivazione PDA
- ✅ [`app/src/types/bonk.ts`](app/src/types/bonk.ts) - TypeScript types da IDL

### 2. **New Files (Sessione 2)**
- ✅ [`app/src/lib/solana/create-battle-token.ts`](app/src/lib/solana/create-battle-token.ts) - **Implementazione principale**
- ✅ [`app/src/lib/solana/create-battle-token.example.ts`](app/src/lib/solana/create-battle-token.example.ts) - Esempi di utilizzo

---

## 🎯 Funzione Implementata

### **`createBattleToken()`**

**Signature:**
```typescript
async function createBattleToken(
  wallet: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>
): Promise<CreateBattleTokenResult>
```

**Returns:**
```typescript
interface CreateBattleTokenResult {
  signature: string;        // Transaction signature
  mint: PublicKey;          // Token mint address
  battleState: PublicKey;   // Battle State PDA
  mintKeypair: Keypair;     // Mint keypair (for further operations)
}
```

---

## 🔧 Implementazione Dettagliata

### **Step 1: Validazione Input**
```typescript
function validateTokenMetadata(name: string, symbol: string, uri: string): void {
  if (!name || name.length < 1 || name.length > 50) {
    throw new Error('InvalidTokenName: must be 1-50 characters');
  }
  if (!symbol || symbol.length < 1 || symbol.length > 10) {
    throw new Error('InvalidTokenSymbol: must be 1-10 characters');
  }
  if (!uri || uri.length > 200) {
    throw new Error('InvalidTokenUri: must be <= 200 characters');
  }
}
```

### **Step 2: Generazione Mint Keypair**
```typescript
const mintKeypair = Keypair.generate();
```

### **Step 3: Derivazione PDAs**
```typescript
// Battle State PDA: ["battle_state", mint]
const [battleStatePDA, bump] = getBattleStatePDA(mintKeypair.publicKey);

// Contract Token Account (ATA del battle_state)
const [contractTokenAccount] = PublicKey.findProgramAddressSync(
  [
    battleStatePDA.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mintKeypair.publicKey.toBuffer(),
  ],
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// Price Oracle PDA: ["price_oracle"]
const [priceOraclePDA, bump] = getPriceOraclePDA();
```

### **Step 4: Build Instruction Data**
```typescript
const CREATE_BATTLE_TOKEN_DISCRIMINATOR = Buffer.from([
  251, 0, 33, 123, 229, 128, 151, 242
]);

const instructionData = Buffer.concat([
  CREATE_BATTLE_TOKEN_DISCRIMINATOR,
  serializeString(name),     // 4-byte length + UTF-8 bytes
  serializeString(symbol),   // 4-byte length + UTF-8 bytes
  serializeString(uri),      // 4-byte length + UTF-8 bytes
]);
```

### **Step 5: Build Accounts Array (Ordine da IDL)**
```typescript
const keys = [
  { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
  { pubkey: battleStatePDA, isSigner: false, isWritable: true },
  { pubkey: contractTokenAccount, isSigner: false, isWritable: true },
  { pubkey: priceOraclePDA, isSigner: false, isWritable: false },
  { pubkey: wallet, isSigner: true, isWritable: true },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
];
```

### **Step 6: Firma e Invio**
```typescript
// 1. Sign with mint keypair
transaction.sign([mintKeypair]);

// 2. Sign with wallet (via wallet adapter)
const signedTx = await signTransaction(transaction);

// 3. Send to RPC
const signature = await connection.sendRawTransaction(signedTx.serialize());

// 4. Confirm
await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight });
```

---

## 🎨 Esempio di Utilizzo

### **In un React Component**
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
import { createBattleToken } from '@/lib/solana/create-battle-token';

export function CreateTokenButton() {
  const { publicKey, signTransaction } = useWallet();

  const handleCreate = async () => {
    if (!publicKey || !signTransaction) return;

    try {
      const result = await createBattleToken(
        publicKey,
        'My Battle Token',
        'BATTLE',
        'https://arweave.net/metadata.json',
        signTransaction
      );

      console.log('Token created!');
      console.log('Mint:', result.mint.toString());
      console.log('Signature:', result.signature);

      // Navigate to token page
      router.push(`/token/${result.mint.toString()}`);

    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  };

  return (
    <button onClick={handleCreate}>
      Create Battle Token
    </button>
  );
}
```

---

## 🧪 Testing Checklist

### **Pre-requisiti:**
- [ ] Wallet connesso (Phantom, Solflare, etc.)
- [ ] Devnet SOL disponibile (>0.01 SOL)
- [ ] Price Oracle inizializzato on-chain (keeper operation)

### **Test Flow:**
1. [ ] **Test validazione:**
   - [ ] Nome troppo corto (< 1 char) → error
   - [ ] Nome troppo lungo (> 50 char) → error
   - [ ] Symbol troppo corto (< 1 char) → error
   - [ ] Symbol troppo lungo (> 10 char) → error
   - [ ] URI troppo lungo (> 200 char) → error

2. [ ] **Test creazione normale:**
   - [ ] Chiama `createBattleToken()` con dati validi
   - [ ] Verifica firma richiesta da wallet
   - [ ] Conferma transazione
   - [ ] Verifica ritorno `{ signature, mint, battleState }`

3. [ ] **Verifica on-chain:**
   - [ ] Apri Solscan: `https://solscan.io/tx/{signature}?cluster=devnet`
   - [ ] Verifica transaction success
   - [ ] Verifica token mint creato
   - [ ] Verifica Battle State PDA creato
   - [ ] Verifica Contract Token Account creato

4. [ ] **Verifica stato iniziale:**
   - [ ] Fetch Battle State PDA
   - [ ] Check `battle_status` = Created (0)
   - [ ] Check `is_active` = true
   - [ ] Check `sol_collected` = 0
   - [ ] Check `tokens_sold` = 0

---

## 🚨 Error Handling

### **Errori Gestiti:**

| Error Code | Hex | Messaggio |
|-----------|-----|-----------|
| 6000 | 0x1770 | Invalid token name: must be 1-50 characters |
| 6001 | 0x1771 | Invalid token symbol: must be 1-10 characters |
| 6002 | 0x1772 | Invalid token URI: must be <= 200 characters |
| 6018 | 0x1782 | Unauthorized: invalid keeper authority |

### **Altri Errori:**
- User rejected → "Transaction cancelled by user"
- Already processed → "Transaction already processed"
- Insufficient funds → Error dal RPC
- Custom program error → "Program error {code}. Check Solscan for details."

---

## 📊 Transaction Details

### **Compute Units:**
- Budget: 500,000 units
- Tipico utilizzo: ~200,000-300,000 units

### **Costo Stimato:**
- Transaction fee: ~0.000005 SOL
- Rent exemption (Battle State): ~0.002 SOL
- Mint account: ~0.002 SOL
- ATA creation: ~0.002 SOL
- **Totale: ~0.006-0.01 SOL**

### **Accounts Creati:**
1. **Mint Account** (82 bytes)
   - Authority: Battle State PDA
   - Decimals: 6

2. **Battle State PDA** (~210 bytes)
   - Seeds: ["battle_state", mint]
   - Stores: sol_collected, tokens_sold, status, timestamps, etc.

3. **Contract Token Account** (165 bytes)
   - ATA owned by Battle State PDA
   - Holds initial token supply for bonding curve

---

## 🔗 Integration con Altri Componenti

### **Dopo la creazione, il token può:**

1. **Essere comprato** → `buyToken()` (da implementare)
2. **Essere venduto** → `sellToken()` (da implementare)
3. **Qualificarsi per battaglia** → quando raggiunge $5,100 MC
4. **Entrare in battaglia** → `startBattle()` (da implementare)
5. **Vincere** → `checkVictoryConditions()` + `finalizeDuel()`
6. **Essere listato** → `withdrawForListing()`

### **Frontend Integration:**

```typescript
// 1. Create page form
const handleSubmit = async (formData) => {
  // Upload image + metadata
  const metadataUri = await uploadMetadata(formData);

  // Create token
  const result = await createBattleToken(
    wallet.publicKey,
    formData.name,
    formData.symbol,
    metadataUri,
    wallet.signTransaction
  );

  // Save to database
  await fetch('/api/tokens', {
    method: 'POST',
    body: JSON.stringify({
      mint: result.mint.toString(),
      battleState: result.battleState.toString(),
      signature: result.signature,
      name: formData.name,
      symbol: formData.symbol,
      uri: metadataUri,
      creator: wallet.publicKey.toString(),
    })
  });

  // Navigate
  router.push(`/token/${result.mint.toString()}`);
};
```

---

## 📈 Next Steps (Session 3)

### **Priorità Alta:**
1. [ ] Implementare `buyToken()` function
2. [ ] Implementare `sellToken()` function
3. [ ] Creare hook `useTokenBattleState(mint)`
4. [ ] Aggiornare `/create` page per usare `createBattleToken()`
5. [ ] Aggiornare `/token/[mint]` page per fetchare Battle State

### **Priorità Media:**
6. [ ] Implementare `startBattle()` function
7. [ ] Implementare `checkVictoryConditions()` function
8. [ ] Implementare `finalizeDuel()` function
9. [ ] Creare `/battle` page (matchmaking)
10. [ ] Creare `BattleCard` component

### **Priorità Bassa:**
11. [ ] Setup Helius webhooks per sync DB
12. [ ] Implementare real-time updates
13. [ ] Creare notification system
14. [ ] Testing su mainnet

---

## 📝 Notes Importanti

### **Price Oracle:**
- **MUST** essere inizializzato prima di creare token
- Keeper operation: `initializePriceOracle(initial_sol_price)`
- Seed: ["price_oracle"]
- Aggiornato daily da keeper authority

### **Battle State PDA:**
- Unique per token (deriva da mint)
- Stores tutto lo stato del token
- Authority sul mint e contract token account

### **Contract Token Account:**
- ATA di Battle State PDA
- Contiene tokens per bonding curve
- Gestito automaticamente dal contract

### **Discriminators:**
- Generati da Anchor da nomi instruction
- MUST match esattamente (preso da IDL)
- `create_battle_token` → `[251, 0, 33, 123, 229, 128, 151, 242]`

---

## ✅ Checklist Completamento

- [x] Funzione `createBattleToken()` implementata
- [x] Validazione input (name, symbol, uri)
- [x] Generazione mint keypair
- [x] Derivazione tutti i PDA necessari
- [x] Build instruction data con serializzazione corretta
- [x] Ordine accounts corretto da IDL
- [x] Firma doppia (mint + wallet)
- [x] Error handling completo
- [x] Logging dettagliato per debugging
- [x] Return type ben definito
- [x] JSDoc documentation
- [x] File di esempio creato
- [x] Documentazione completa (questo file)

---

## 🔗 Riferimenti

**File Correlati:**
- [TRANSITION_GUIDE.md](../../../TRANSITION_GUIDE.md) - Guida completa STONKS → BONK
- [constants.ts](./constants.ts) - Costanti BONK BATTLE
- [pdas.ts](./pdas.ts) - PDA derivation helpers
- [types/bonk.ts](../../types/bonk.ts) - TypeScript types
- [anchor/target/idl/bonk_battle.json](../../../anchor/target/idl/bonk_battle.json) - IDL completo

**Smart Contract:**
- Program ID: `HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9`
- Network: Devnet
- Treasury: `5t46DVegMLyVQ2nstgPPUNDn5WCEFwgQCXfbSx1nHrdf`
- Keeper: `Akw7GSQ8uyk4DeT3wtNddRXJrMDg3Nx8tGwtEmfKDPaH`

**Solscan:**
- Program: https://solscan.io/account/HTNCkRMo8A8NFxDS8ANspLC16dgb1WpCSznsfb7BDdK9?cluster=devnet

---

**Status:** ✅ READY FOR TESTING
**Next:** Implementare `buyToken()` e `sellToken()` (Session 3)

🎮 **BONK BATTLE - Let the games begin!** 🚀
