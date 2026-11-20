# Helyszínek és mentéstörténet betöltésének helyreállítása

## Ellenőrzött ok
- A Lovable Cloud állapotellenőrzése szerint az adatbázis szünetel. Az adatlekérdezés jelenleg elérhetetlenségi hibával megszakad.
- A helyszínlista nem jelzi a lekérdezési hibákat; a mentéstörténet sikertelen lekérdezéskor is üres listát állít be. Ezért az oldal úgy tűnik, mintha nem lennének adatai.
- Az adatok meglétét és darabszámát csak az adatbázis újraindítása után lehet ellenőrizni; jelenleg adatvesztés nem állapítható meg.

## Javítás
1. **Az adatbázis működésének folytatása:** a Lovable Cloud újraaktiválása, majd az elérhető állapot ellenőrzése. Ha ez külön felhasználói műveletet igényel, annak pontos jelzése.
2. **Valós adatok ellenőrzése:** helyszínek, profilok, vállalások és mentéstörténet visszaolvasása. Semmilyen adatot nem törlünk, és nem pótoljuk őket kitalált sorokkal.
3. **Betöltési hibák helyes megjelenítése:** a helyszíneknél és a mentéstörténetnél külön betöltési, hiba- és valóban üres állapot; hiba esetén „Újrapróbálás” gomb. Sikertelen frissítés nem törli a már betöltött adatokat, és nem mutat megtévesztő nulla összesítést.
4. **Ellenőrzés:** a nyilvános főoldalon a helyszínek, térképpontok és történeti sorok tényleges megjelenésének ellenőrzése telefonon és számítógépen; bejelentkezve a saját előzmények visszaolvasása. A kiesést és az újrapróbálást célzott teszttel is ellenőrizzük.

## Technikai részletek
- Érintett felület: `StoreGrid`, `RescueHistorySection`; a profil betöltését is ellenőrizzük.
- Jogosultságokat csak akkor módosítunk, ha az újraaktiválás utáni ellenőrzés konkrét hozzáférési hibát igazol; a szüneteltetés önmagában nem indokol jogosultságváltoztatást.
- Megmarad az alapértelmezett térképnézet és a javított nézetváltó ikonok.
- Megvalósításkor az új feladat bekerül a feladatlistába; a korábbi nyitott feladatokat nem töröljük.

