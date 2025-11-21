# BONK BATTLE - Instruction Discriminators

> **Program ID:** `6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq`
>
> Questo documento contiene tutti i discriminator corretti estratti dall'IDL del contratto BONK BATTLE.
> I discriminator sono identificatori di 8 byte usati da Anchor per identificare le istruzioni del programma.

---

## 📋 Instructions

### 1. buy_token
```typescript
const discriminator = Buffer.from([138, 127, 14, 91, 38, 87, 115, 105]);
```
**Hex:** `8a7f0e5b26577369`

---

### 2. check_victory_conditions
```typescript
const discriminator = Buffer.from([176, 199, 31, 103, 154, 28, 170, 98]);
```
**Hex:** `b0c71f679a1caa62`

---

### 3. create_battle_token
```typescript
const discriminator = Buffer.from([251, 0, 33, 123, 229, 128, 151, 242]);
```
**Hex:** `fb00217be58097f2`

---

### 4. finalize_duel
```typescript
const discriminator = Buffer.from([57, 165, 69, 195, 50, 206, 212, 134]);
```
**Hex:** `39a545c332ced486`

---

### 5. initialize_price_oracle ⚠️
```typescript
const discriminator = Buffer.from([61, 200, 206, 137, 205, 74, 242, 172]);
```
**Hex:** `3dc8ce89cd4af2ac`

**Usato in:**
- `app/src/app/admin/page.tsx` ✅ (CORRETTO)

---

### 6. sell_token
```typescript
const discriminator = Buffer.from([109, 61, 40, 187, 230, 176, 135, 174]);
```
**Hex:** `6d3d28bbe6b087ae`

---

### 7. start_battle
```typescript
const discriminator = Buffer.from([87, 12, 31, 196, 33, 191, 140, 147]);
```
**Hex:** `570c1fc421bf8c93`

---

### 8. update_sol_price ⚠️
```typescript
const discriminator = Buffer.from([166, 98, 183, 175, 125, 81, 109, 119]);
```
**Hex:** `a662b7af7d516d77`

**Usato in:**
- `app/src/app/api/cron/update-price/route.ts` ✅ (CORRETTO)

---

### 9. withdraw_for_listing
```typescript
const discriminator = Buffer.from([127, 237, 151, 214, 106, 20, 93, 33]);
```
**Hex:** `7fed97d66a145d21`

---

## 🔐 Account Discriminators

### PriceOracle
```typescript
const discriminator = Buffer.from([57, 140, 120, 176, 191, 65, 52, 89]);
```
**Hex:** `398c78b0bf413459`

---

### TokenBattleState
```typescript
const discriminator = Buffer.from([54, 102, 185, 22, 231, 3, 228, 117]);
```
**Hex:** `3666b916e703e475`

---

## 📡 Event Discriminators

### BattleStarted
```typescript
const discriminator = Buffer.from([235, 52, 57, 175, 248, 203, 38, 226]);
```
**Hex:** `eb3439aff8cb26e2`

---

### DuelFinalized
```typescript
const discriminator = Buffer.from([118, 72, 55, 15, 42, 25, 171, 34]);
```
**Hex:** `7648370f2a19ab22`

---

### GladiatorForged
```typescript
const discriminator = Buffer.from([45, 249, 73, 163, 71, 77, 158, 214]);
```
**Hex:** `2df949a3474d9ed6`

---

### GladiatorQualified
```typescript
const discriminator = Buffer.from([127, 235, 12, 11, 173, 185, 133, 23]);
```
**Hex:** `7feb0c0badb98517`

---

### ListingWithdrawal
```typescript
const discriminator = Buffer.from([72, 110, 224, 229, 140, 29, 164, 214]);
```
**Hex:** `486ee0e58c1da4d6`

---

### PriceUpdated
```typescript
const discriminator = Buffer.from([154, 72, 87, 150, 246, 230, 23, 217]);
```
**Hex:** `9a485796f6e617d9`

---

### TokenPurchased
```typescript
const discriminator = Buffer.from([3, 73, 186, 50, 15, 181, 213, 37]);
```
**Hex:** `0349ba320fb5d525`

---

### TokenSold
```typescript
const discriminator = Buffer.from([88, 61, 1, 247, 185, 6, 252, 86]);
```
**Hex:** `583d01f7b906fc56`

---

### VictoryAchieved
```typescript
const discriminator = Buffer.from([172, 221, 65, 15, 142, 218, 83, 227]);
```
**Hex:** `acdd410f8eda53e3`

---

## 📝 Note Importanti

1. **Formato TypeScript/JavaScript:**
   ```typescript
   const discriminator = Buffer.from([byte1, byte2, ..., byte8]);
   ```

2. **Formato Rust:**
   ```rust
   const DISCRIMINATOR: [u8; 8] = [byte1, byte2, ..., byte8];
   ```

3. **Verifica sempre l'IDL:**
   - File: `app/src/idl/bonk_battle.json`
   - I discriminator sono generati automaticamente da Anchor basandosi sui nomi delle istruzioni
   - NON modificare manualmente i discriminator - devono corrispondere all'IDL

4. **Debugging:**
   - Se ricevi `InstructionFallbackNotFound`, il discriminator è sbagliato
   - Controlla sempre questo file per il discriminator corretto
   - Assicurati che il Program ID sia: `6LdnckDuYxXn4UkyyD5YB7w9j2k49AsuZCNmQ3GhR2Eq`

---

**Generato da:** Claude Code
**Data:** 2025-11-21
**Versione IDL:** 0.1.0
