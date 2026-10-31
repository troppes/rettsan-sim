# RettSan Sim

Ein Lernspiel für die Rettungssanitäter-Ausbildung, das im Browser läuft (iPhone und Mac).
Du fährst Einsätze: Patienten untersuchen, befragen, behandeln und am Ende eine Verdachtsdiagnose stellen.
Die Inhalte folgen der NAW-Schulmeinung, gespielt wird in der Rolle als RettSan.

**Spielen:** https://troppes.github.io/rettsan-sim/

## Was drin ist

- **11 Einsätze:** ACS/STEMI, Hypoglykämie, Asthma, Anaphylaxie, Schlaganfall, Krampfanfall, Polytrauma, Reanimation, Fieberkrampf, Exsikkose beim älteren Menschen, Hitzschlag
- **xABCDE-Prüfung:** Wer bei einem offenen x-, A-, B- oder C-Problem schon Späteres macht (z. B. BZ messen, während es spritzt), bekommt Abzug
- **Quizfragen zur Abfolge**, sobald du mit Maßnahmen anfängst
- **Simulierter Monitor** mit EKG, Pleth-Kurve, HF, SpO₂, RR und AF
- **Reanimation** mit 2-Minuten-Blöcken, Rhythmusanalyse, Schock-Entscheidung, Adrenalin-Timing und NEF-Nachalarm; der Rhythmusverlauf ist jedes Mal zufällig (VF, pVT, Asystolie oder PEA)
- **EKG-Trainer Basis** mit 10 Rhythmen und Hilfeknopf
- **EKG-Trainer Profi:** 19 Rhythmen (u. a. AV-Blöcke I–III, Wenckebach, Mobitz II, Vorhofflattern, SVT, VES-Bigeminus, Torsade de pointes, Schrittmacher) auf EKG-Papier zum Auszählen, systematische Analyse in 6 Schritten (Frequenz, Regelmäßigkeit, QRS, P-Wellen, Diagnose, Konsequenz), Fallvignetten, Puls prüfen, Themenauswahl
- **Verschlechterung** (Schalter, standardmäßig an): unbehandelte Probleme werden mit der Zeit schlimmer
- **Maßnahmen im Detail** (Schalter): BZ, RR, SpO₂, EKG, 12-Kanal, Zugang, O₂, Tourniquet und Bodycheck Schritt für Schritt, inkl. Aufklärung und Einwilligung
- **Menschliche Patienten:** Name, Stimmung, Reaktionen, Gesprächsmomente mit Auswahl und Nachfragen, die sich aus Antworten ergeben
- **Wechselnde Einsatzmeldungen**, auch irreführende (nicht jeder Bauchschmerz ist der Bauch)
- **Auswertung** mit Punkten, vergessenen Maßnahmen, Fehlern und Merksätzen

**Konto (freiwillig):** Wer sich anmeldet, speichert Einsätze und EKG-Ergebnisse und sieht unter „Mein Fortschritt“ Schnitt pro Fall, häufige Fehler und schwache Rhythmen, mit Knöpfen zum gezielten Üben. Ohne Anmeldung bleibt alles spielbar.

## Technik

Svelte 5 + TypeScript + Vite. Die Spielinhalte sind **reine Daten (JSON)**, die Engine interpretiert sie. Neue Fälle oder Rhythmen brauchen keinen Code.

```
src/data/            Spielinhalte (JSON)
  cases/*.json       ein Fall pro Datei, Reihenfolge in cases/index.json
  actions.json       Untersuchungen, Fragen, Maßnahmen (xABCDE-Buchstabe, Zeitbedarf)
  procedures.json    Maßnahmen Schritt für Schritt
  rules.json         Standardbefunde, Fehlmaßnahmen, Punkte, Texte der Engine
  rea.json           Reanimation: Rhythmuspfade, Pflichtpunkte, Texte
  ecg.json           19 Rhythmen: Analyse-Eigenschaften, Erzeugungsmuster, Wellenformen, Trainer-Einstellungen
  backend.json       öffentliche Supabase-URL und publishable key
src/lib/types.ts     Datenmodell (Typen für alle JSON-Dateien)
src/lib/engine/      Spiellogik ohne Oberfläche: Bedingungen, Einsatz, Abläufe, Reanimation, Auswertung
src/lib/ecg/         EKG-Signal aus den Daten, Monitor (Sweep), EKG-Papier
src/lib/account/     Login und Fortschritt über Supabase (Auth und REST ohne SDK)
src/screens/, src/components/   Oberfläche
tests/               Datenprüfung und Durchspielen aller Fälle (Vitest)
```

### Fälle als Daten

Statt Funktionen nutzen Fälle **Bedingungen**, z. B. `{"vital": "gcs", "op": ">=", "value": 14}`, `{"flag": "postiktal"}`, `{"fixed": "atemweg"}`, `{"done": "d_bz"}`, `{"time": 360}`, kombinierbar mit `all`, `any`, `not`.

- Befunde und Wirkungen können **Varianten** sein: Liste mit `if`, die erste passende gilt.
- **Regeln** (`rules`) feuern einmal, sobald ihre Bedingung erfüllt ist, und ändern Vitalwerte, Flags und Status.
- **Verläufe** (`trends`) verändern Werte stetig pro Minute.
- `penalties` an einer Maßnahme ziehen Punkte ab, wenn eine Bedingung zutrifft (z. B. Glucose ohne vorherige BZ-Messung).

### Entwickeln

```
npm install
npm run dev      # lokal starten
npm test         # Datenprüfung + alle Fälle durchspielen
npm run check    # Typprüfung
```

### Versionen und Releases

Semantic Versioning: **Major** bei grundlegenden Änderungen, **Minor** bei neuen Fällen oder Funktionen, **Patch** bei Korrekturen.

```
npm version minor        # erhöht die Version, legt Commit und Tag an (z. B. v2.1.0)
git push --follow-tags
```

Der Tag startet `.github/workflows/release.yml`: prüfen, testen, bauen, GitHub-Release mit automatischen Notizen und ZIP anlegen, auf GitHub Pages veröffentlichen. Tags mit Bindestrich (z. B. `v2.1.0-beta.1`) werden als Vorabversion veröffentlicht, aber nicht auf Pages ausgerollt. Die Version steht unten auf der Startseite.

Das Konto-Schema liegt in `supabase.sql`.

## Hinweis

Lernspiel. Ersetzt keine Ausbildung, Leitlinie oder SOP. Im Zweifel gilt der Unterricht.
