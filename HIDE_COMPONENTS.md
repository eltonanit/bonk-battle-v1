# POTENTIALS.FUN - Componenti da Nascondere

## Riepilogo Rapido

| Componente | Path | Azione |
|------------|------|--------|
| VictoryModal | `components/battle/VictoryModal.tsx` | HIDE |
| CreatedTicker | `components/feed/CreatedTicker.tsx` | HIDE |
| Battle Page | `app/battle/[id]/page.tsx` | HIDE |
| useTokenBattleState | `hooks/useTokenBattleState.ts` | HIDE |
| Qualification Popup | Da cercare | HIDE |
| finalize-duel API | `api/battles/finalize-duel/route.ts` | HIDE |

---

## 1. VictoryModal.tsx

**Path**: `app/src/components/battle/VictoryModal.tsx`

**Motivo**: Modal di celebrazione vittoria battaglia - non serve senza battaglie

**Come nascondere**:
```tsx
// Nei file che importano VictoryModal, commentare o wrappare:
{false && <VictoryModal ... />}
```

---

## 2. CreatedTicker.tsx

**Path**: `app/src/components/feed/CreatedTicker.tsx`

**Motivo**: Ticker relativo alle battaglie

**Come nascondere**:
```tsx
// Nel layout o page che lo usa:
{false && <CreatedTicker />}
```

---

## 3. Battle Page

**Path**: `app/src/app/battle/[id]/page.tsx`

**Motivo**: Arena battaglia - intera pagina da nascondere

**Come nascondere** (opzione 1 - redirect):
```tsx
// All'inizio del componente:
import { redirect } from 'next/navigation';

export default function BattlePage() {
  redirect('/'); // Redirect a home
}
```

**Come nascondere** (opzione 2 - coming soon):
```tsx
export default function BattlePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Battles Coming Soon</h1>
        <p className="text-gray-400 mt-2">This feature is under development</p>
      </div>
    </div>
  );
}
```

---

## 4. useTokenBattleState Hook

**Path**: `app/src/hooks/useTokenBattleState.ts`

**Motivo**: Hook per stato battaglie - mantenere per futuro

**Come nascondere**:
- NON eliminare il file
- Rimuovere gli import dai componenti che lo usano
- Sostituire con `useTokenState.ts` (versione semplificata)

---

## 5. Qualification Popup

**Path**: Da cercare nel codebase

**Motivo**: Popup qualificazione per battaglie - non serve

**Come trovare**:
```bash
# Cercare nel codebase:
grep -r "qualif" app/src/
grep -r "Qualified" app/src/components/
```

**Come nascondere**:
```tsx
{false && <QualificationPopup ... />}
```

---

## 6. finalize-duel API Route

**Path**: `app/src/app/api/battles/finalize-duel/route.ts`

**Motivo**: API per finalizzare duelli - non serve senza battaglie

**Come nascondere** (return 404):
```typescript
export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'Feature disabled',
    message: 'Battles are not active in this version'
  }, { status: 404 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Feature disabled',
    message: 'Battles are not active in this version'
  }, { status: 404 });
}
```

---

## 7. Vercel Cron da Disabilitare

Se hai configurato cron jobs in `vercel.json`, disabilita:

```json
{
  "crons": [
    // KEEP - serve per graduation singola
    // { "path": "/api/battles/check-victory", "schedule": "*/1 * * * *" },

    // HIDE - no duels
    // { "path": "/api/battles/finalize-duel", "schedule": "*/2 * * * *" }
  ]
}
```

---

## Checklist

- [ ] VictoryModal nascosto
- [ ] CreatedTicker nascosto
- [ ] Battle Page redirect/coming soon
- [ ] useTokenBattleState non importato
- [ ] Qualification popup nascosto
- [ ] finalize-duel API disabilitato
- [ ] Vercel cron per finalize-duel disabilitato

---

## Note

- **NON ELIMINARE** nessun file - solo nascondere
- I file nascosti serviranno per le battaglie in futuro
- Testare che l'app funzioni senza errori dopo aver nascosto

---

*Documento creato: 2026-01-27*
