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
- **EKG-Trainer** mit 10 Rhythmen und Hilfeknopf
- **Verschlechterung** (Schalter, standardmäßig an): unbehandelte Probleme werden mit der Zeit schlimmer
- **Maßnahmen im Detail** (Schalter): BZ, RR, SpO₂, EKG, 12-Kanal, Zugang, O₂, Tourniquet und Bodycheck Schritt für Schritt, inkl. Aufklärung und Einwilligung
- **Menschliche Patienten:** Name, Stimmung, Reaktionen, Gesprächsmomente mit Auswahl und Nachfragen, die sich aus Antworten ergeben
- **Wechselnde Einsatzmeldungen**, auch irreführende (nicht jeder Bauchschmerz ist der Bauch)
- **Auswertung** mit Punkten, vergessenen Maßnahmen, Fehlern und Merksätzen

Kein Login, nichts wird gespeichert.

## Technik

Reines HTML, CSS und JavaScript ohne Build-Schritt. `index.html` direkt im Browser öffnen funktioniert auch lokal.

- `js/cases.js`: die Fälle (Vitalwerte, Befunde, Antworten, Wirkungen, Pflichtmaßnahmen, Quizfragen)
- `js/cases_extra.js`: Einsatzmeldungen, Namen, Stimmung, Gesprächsmomente, Nachfragen
- `js/procedures.js`: Maßnahmen als Schritte
- `js/actions.js`: alle Untersuchungen, Fragen und Maßnahmen mit xABCDE-Buchstabe und Zeitbedarf
- `js/ecg.js`: EKG- und Pleth-Simulation
- `js/game.js`: Spiellogik, Reanimation, Auswertung, EKG-Trainer

## Hinweis

Lernspiel. Ersetzt keine Ausbildung, Leitlinie oder SOP. Im Zweifel gilt der Unterricht.
