
Cél: az önkéntes profil valóban ugyanabból a központi mentéstörténet-adatbázisból dolgozzon, mint a publikus táblázat, és minden érintett önkéntes (pl. Dzsida Gergely) azonnal lássa/szerkeszthesse a saját múltbeli mentéseit.

1) Hibaforrás javítása (adatkapcsolás)
- Feltárt ok: több régi mentés/foglalás placeholder `user_id`-vel van mentve (pl. `0000...0001`), miközben a most belépett valós profil más `user_id`-t használ, ezért a profilpanel `eq("user_id", user.id)` lekérdezése üres.
- Megoldás:
  - Készítek egy biztonságos adat-konszolidációs lépést (adatmódosítás, nem séma): a régi placeholder azonosítókról átvezetem a rekordokat a megfelelő valós profil `user_id`-jára.
  - Ahol egyértelmű az egyezés (név + telefon / egyedi névegyezés), automatikus összekötés.
  - Ahol nem egyértelmű, nem törlök semmit; külön listázom és csak jóváhagyás után kötöm össze.
- Ezzel megmarad minden eddigi adat, csak a tulajdonos-kapcsolat lesz helyes.

2) Profilpanel adatmodell újrakötése (egységes adatforrás)
- `src/components/VolunteerProfilePanel.tsx` fejlesztése:
  - A “Saját mentéstörténet” lekérdezés a konszolidált `user_id`-kat használja.
  - A meglévő mentések képe + kg mindig betöltődik, és ugyanott szerkeszthető.
  - A mentések mentése/fotófeltöltése közvetlenül a `rescue_history` táblát frissíti (nincs külön tároló logika).
  - Megjelenítem külön blokkban:
    - jövőbeli/aktív vállalások (`rescue_commitments`)
    - korábbi mentések (`rescue_history`)
- Üres állapot csak akkor jelenjen meg, ha ténylegesen nincs rekord (ne legyen hamis “Nincs mentéstörténetem”).

3) Publikus mentéstörténet továbbfejlesztése (több önkéntes egy helyen)
- `src/components/RescueHistorySection.tsx` módosítás:
  - Sorok csoportosítása hét + üzlet szerint (így egy sorban több önkéntes név is látszik).
  - A csoport sorban látszik:
    - önkéntesek listája (telefon linkekkel),
    - típus (állandó/alkalmi),
    - összesített kg (és szükség esetén bontás),
    - képek (thumb + nagyítás).
  - Sorvégi ceruza:
    - ha a belépett user a csoport egyik önkéntese, tudja szerkeszteni a saját hozzájárulását;
    - a meglévő mesterjelszavas útvonal kompatibilisen megmaradhat.
- Fontos: továbbra is ugyanaz a központi adat változik, ezért a profil és publikus nézet automatikusan szinkronban marad.

4) Belépéskori popup megbízható működés
- `src/pages/Index.tsx` finomhangolás:
  - popup nyitás csak akkor fusson, ha auth/profile betöltés kész;
  - új belépéskor automatikusan nyisson;
  - névre kattintva bármikor újranyitható maradjon.
- Cél: ne legyen “nem működik a popup” állapot lassú profilbetöltésnél sem.

5) Heti frissülés stabilizálása (adatvesztés nélkül)
- A heti archiváló háttérfolyamatot ellenőrzöm és javítom:
  - péntek 20:00 időzítés,
  - helyes végpont hívása,
  - duplikáció elleni védelem.
- Ez biztosítja, hogy a múlt heti mentések mindig átkerüljenek a mentéstörténetbe, ne “tűnjenek el”.

6) Ellenőrzési terv (end-to-end)
- Belépés Dzsida Gergely felhasználóval:
  - profil popup automatikusan nyílik,
  - korábbi mentések listázódnak (kép + kg),
  - szerkesztés után azonnal frissül a publikus mentéstörténet.
- Több önkénteses helyszín:
  - egy sorban több név látszik,
  - érintett önkéntesek szerkesztése működik.
- Realtime:
  - egyik nézetben mentett módosítás a másik nézetben megjelenik újratöltés nélkül vagy minimális késéssel.
- Adatmegőrzés:
  - sem korábbi rekord, sem kép nem vész el a konszolidáció során.

Technikai részletek (implementációs fókusz)
- Fájlok:
  - `src/components/VolunteerProfilePanel.tsx`
  - `src/components/RescueHistorySection.tsx`
  - `src/pages/Index.tsx`
  - (szükség szerint) `supabase/functions/update-rescue-entry/index.ts`
- Adatmódosítás:
  - történeti `user_id` összekötés `rescue_history` + `rescue_commitments` táblákban.
- Séma csak akkor bővül, ha szükséges (pl. index/segédnézet teljesítményhez), különben minimális, adatmegőrző beavatkozás.
