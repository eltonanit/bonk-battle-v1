# Battle Card Design Documentation

**Data: 30 Gennaio 2026**

---

## Panoramica

La Battle Card e il componente visuale principale di Bonk Battle. Mostra due token in battaglia con animazioni dinamiche che si attivano in base al movimento dei token.

---

## Struttura Layout

```
+----------------------------------------------------------+
|  HEADER (border-b #2a3544)                               |
|  +----------+     VS + Prezzi     +----------+           |
|  | Token A  |    $62 - $4         | Token B  |           |
|  | img 24px |                     | img 24px |           |
|  +----------+                     +----------+           |
+----------------------------------------------------------+
|  CONTENT (bg #232a36)                                    |
|  +--------+    +---------+    +--------+                 |
|  | $TESTA |    | TARGET  |    | $TESTB |                 |
|  | MC $62 |    | MC $58K |    | MC $4  |                 |
|  | by USER|    |         |    | by USER|                 |
|  +--------+    +---------+    +--------+                 |
|                                                          |
|  [Buy winner 100%]            [Buy winner 0%]            |
|                                                          |
|  [X Share]  [+250 Points]                                |
+----------------------------------------------------------+
```

### Dimensioni

| Elemento | Mobile | Desktop (lg) | XL |
|---|---|---|---|
| Token Image | 24x24 px | 20x20 px | 24x24 px |
| Header padding | px-2 py-2 | px-4 py-3 | px-4 py-3 |
| Content padding | px-2 py-1.5 | px-3 py-2 | px-3 py-2 |
| Card max-width | 100% | auto | auto |
| Font simbolo | text-xs | text-sm | text-sm |
| Font MC | text-xs | text-xs | text-sm |

### Spaziatura

- Card border: `border border-[#2a3544]`
- Card hover: `hover:border-orange-500`
- Sezione centro TARGET: `min-w-[70px]` mobile, `min-w-[120px]` desktop
- Separatori interni: `border-x border-[#3b415a]`

---

## Colori

### Background

| Zona | Colore | Hex |
|---|---|---|
| Card principale | Dark navy | `#1d2531` |
| Content area | Dark gray | `#232a36` |
| Header (normale) | Solid dark (no pattern) | `#1d2531` |
| Header (epic battle) | Deep purple | `#2D1065` |
| Input fields | Darker navy | `#1a1f2e` |
| Border principale | Slate | `#2a3544` |
| Border interni | Gray | `#3b415a` |

### Colori Token A (Sinistra - BLU)

| Stato | Colore | Hex |
|---|---|---|
| Attack strip background | Blu | `#386BFD` |
| Attack glow (box-shadow) | Blu translucido | `rgba(56, 107, 253, 0.6)` |
| Epic attack background | Viola | `#9333ea` |
| Epic attack glow | Viola translucido | `rgba(147, 51, 234, 0.6)` |

### Colori Token B (Destra - ROSA)

| Stato | Colore | Hex |
|---|---|---|
| Attack strip background | Hot pink | `#FD1F6F` |
| Attack glow (box-shadow) | Pink translucido | `rgba(253, 31, 111, 0.6)` |
| Epic attack background | Viola chiaro | `#a855f7` |
| Epic attack glow | Viola translucido | `rgba(168, 85, 247, 0.6)` |

### Colore CLASH (Giallo)

| Stato | Colore | Hex |
|---|---|---|
| Clash background (entrambi attaccano) | Giallo brillante | `#EFFE16` |

Quando entrambi i token "attaccano" simultaneamente, le strip di entrambi diventano giallo `#EFFE16`.

### Colori Winner Card (Dorato)

| Elemento | Colore |
|---|---|
| Background gradient | `from-yellow-900/40 via-orange-900/30 to-yellow-900/40` |
| Border | `border-yellow-500`, hover `border-yellow-400` |
| Header gradient | `from-yellow-600 via-orange-500 to-yellow-600` |
| Testo principale | `yellow-400` |

### Colori Buy Mode

| Elemento | Colore | Hex |
|---|---|---|
| Pulsante Buy (green) | Emerald | `#22C55E` |
| Pulsante Buy (orange) | Orange | `#F97316` |
| Slider fill | Green gradient | `linear-gradient(to right, #22C55E ...)` |
| Buy glow | Green shadow | `rgba(34, 197, 94, 0.3)` |

### Testo

| Tipo | Colore |
|---|---|
| Primario | `white` |
| Secondario | `gray-400` / `gray-500` |
| Simbolo token | `orange-400` |
| Importi/valori | `yellow-400` |
| Army badge | `cyan-400` su `bg-cyan` |

---

## Animazioni

### 1. Attack Bounce (Blu e Rosa)

Si attiva **automaticamente ogni 1-2.6 secondi** in modo casuale. Simula un token che "attacca" l'altro.

**Token A attacca (destra):** `battle-attack-bounce-right`
- Durata: 0.35s
- Easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Movimento: Il token A si sposta verso il centro con effetto bounce
- La strip BLU `#386BFD` appare con glow `box-shadow: 0 0 30px rgba(56, 107, 253, 0.6)`
- z-index: 10

**Token B attacca (sinistra):** `battle-attack-bounce-left`
- Stessa durata e easing
- Movimento: Token B si sposta verso il centro
- La strip ROSA `#FD1F6F` appare con glow `box-shadow: 0 0 30px rgba(253, 31, 111, 0.6)`

### 2. Clash (Giallo)

Si attiva quando **entrambi i token attaccano nello stesso momento**.

**Animazioni:** `battle-clash-bounce-right` + `battle-clash-bounce-left`
- Durata: 0.35s
- z-index: 15 (sopra l'attack)
- Entrambe le strip diventano **GIALLO** `#EFFE16`
- Effetto shake violento con entrambi i token che rimbalzano

### 3. Epic Battle Glow (Viola)

Per le battle "epic" (speciali):

**Radiate Glow:** `radiate-glow`
- Durata: 0.5s
- Box-shadow pulsante viola: `rgba(192, 132, 252)` -> `rgba(126, 34, 206)`

**Radiate Rays:** `radiate-rays`
- Conic gradient raggi viola rotanti
- Scale: 1 -> 1.3 -> 1
- Rotazione: 0 -> 8deg

**Epic Glow Pulse:** `epic-glow-pulse`
- Durata: 2s, infinito
- 4 livelli di box-shadow inset che pulsano
- Gamma viola con cambi di opacita

### 4. Progress Bar Transition

- Durata: 500ms (`duration-500`)
- Sotto 100%: gradient verde `from-green-400 to-green-600`
- Al 100%+: gradient giallo/arancione `from-yellow-400 to-orange-500`
- Altezza: 1.5-2.5px responsive

---

## Sequenza Animazione Attack

```
Stato inizale: Entrambe le strip opacity-0
     |
     v
[Random timer 1000-2600ms]
     |
     v
Scelta casuale: attackA / attackB / clash
     |
     +---> attackA: strip BLU appare (opacity-1), Token A bounce verso destra
     |
     +---> attackB: strip ROSA appare (opacity-1), Token B bounce verso sinistra
     |
     +---> clash: ENTRAMBE strip GIALLO, entrambi token bounce + shake
     |
     v
[350ms animazione]
     |
     v
Reset: strip tornano opacity-0
     |
     v
[Ripeti]
```

---

## Componenti File

| File | Descrizione |
|---|---|
| `app/src/components/shared/BattleCard.tsx` | Card principale (full battle view) |
| `app/src/components/shared/KalshiBattleCard.tsx` | Card compatta per grid |
| `app/src/components/home/BattleGrid.tsx` | Griglia di battle cards |
| `app/src/app/battle/[id]/page.tsx` | Pagina singola battle |
| `app/src/app/globals.css` | Animazioni attack/clash |
| `app/src/styles/animations.css` | Animazioni shake/flash |

---

## Note

- Il pattern a scacchi blu (checkerboard `#0d4280`/`#104d96`) e stato **rimosso** il 30/01/2026
- Il pattern diamante SVG viola per epic battles e stato **rimosso** il 30/01/2026
- I background ora sono colori solidi senza pattern
- Il layout della battle card sara modificato per supportare solo token grid card
