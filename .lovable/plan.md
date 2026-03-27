

## A probléma

1. **Hibás cron URL**: A péntek 20:00-ás háttérfolyamat URL-je elgépelt (`vzrdqafqvpbzenqewtygxm` vs `vzrdqafqvpbzqewtygxm`), ezért a heti archiválás soha nem futott le → a régi alkalmi vállalások `aktiv=true` maradnak.

2. **Számláló logika hibás**: A `coveredCount` minden aktív vállalást figyelembe vesz, még a múlt heti alkalmit is. Csak az állandó és a jövőbeli/aktuális heti alkalmi vállalásokat kellene számolnia.

## Javítási terv

### 1. Azonnali adattisztítás
- A 2026-03-20-as (múlt heti) egyszeri vállalásokat deaktiválom (`aktiv=false`), hiszen azok már lejártak.
- Érintett: Borsó utca (2db), Karikás Frigyes (1db), Keleti Károly (1db).

### 2. Számláló logika javítása (`StoreGrid.tsx`)
- A `coveredCount` és a kártya "Betelt/Szabad" jelzője csak azokat az aktív vállalásokat vegye figyelembe, amelyek:
  - **állandó** típusúak, VAGY
  - **alkalmi** típusúak ÉS a `datum` >= aktuális/következő péntek
- Így a lejárt alkalmi vállalások nem torzítják a számlálót.

### 3. Cron job URL javítása
- A jelenlegi hibás cron job törlése és újra létrehozása a helyes URL-lel (`vzrdqafqvpbzqewtygxm`).
- Ütemezés marad: `0 18 * * 5` (péntek 18:00 UTC = 20:00 Budapest).

### Érintett fájlok
- `src/components/StoreGrid.tsx` — `coveredCount` + `StoreCard` aktív vállalás szűrés
- Adatbázis — deaktiválás + cron fix

