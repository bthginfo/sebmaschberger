# Module passend zum Auftrag wählen

Die aktuelle Wahrheit ist `template.manifest.json` → `activation` und `docs/features.md` aus dem ausgewählten neutralen Commit. Diese Datei erklärt die Auswahl. Generator-Flags stehen auch in `node scripts/create-site.mjs --help`.

[Gemeinsame CMS- und Modulabläufe](admin-modules.md) bei der Auswahl und Abnahme anwenden. Funktionen in neuen und bestehenden Websites auf dieselben Bedienmuster bringen.

**Gastronomie:** `restaurant-menu` für eine zentral gepflegte Speisen- und Getränkekarte mit wiederverwendbaren Abschnitten. `reservations` für den tatsächlichen Tischbuchungsablauf mit Tischen, Buchungsfenstern, Schließtagen und Entscheidungen im CMS. Die Module sind unabhängig. Siehe [Gastronomie](hospitality.md).

1. Beginne beim Nutzerablauf: etwa „jemand findet das nächste Heimspiel“ oder „ein Trainer teilt eine Taktik mit seinem Kader“. Verein, Creator oder Beratung allein ist kein Auftrag für alle Module des Profils.
2. Übernimm die Kernfunktionen und den zum Inhalt passenden Startaufbau. Schalte Zusatzmodule an, wenn der Auftrag den Ablauf tatsächlich braucht und die Manifest-Richtlinie das zulässt. Hinterlege die Entscheidung kurz in `project/brief.json`.
3. Bei mehreren plausiblen Ausprägungen frage zielgerichtet. Beispiel: „Soll der Spielplan öffentlich sein, oder sollen Mitglieder sich zusätzlich anmelden und auf Trainings antworten können?“ Beginne währenddessen mit öffentlichen Inhalten und Gestaltung. Eine unbeantwortete optionale Frage ist kein Opt-in für Abrechnung, externe Veröffentlichung oder zusätzliche personenbezogene Daten.
4. Unterscheide Code, Konfiguration und Live-Betrieb. Eine Rezeptdatei ist kein fertiges Modul. Eine Oberfläche ist keine eingerichtete Provider-Verbindung. Stelle Kauf, Versand, verbundenen Account oder KI-Ausgabe erst als getestet dar, nachdem der vollständige Ablauf in der jeweiligen Umgebung geprüft wurde.

| Auftrag | Entscheidung |
| --- | --- |
| Praxis, Handwerk, Portfolio oder kleine Firmenwebsite | Kern und passende Inhaltsabschnitte. Keine Konten, Zahlungen oder Rechnungen allein wegen des Branchennamens. |
| Vereinsseite mit Spielplan und News | Mit redaktionellen Abschnitten starten. Vereinsverwaltung bei backendgestützter Planung oder privaten Konten aus dem Briefing wählen. |
| Interne Teams, Trainings-RSVP, Ergebnisse, private News, Profile und Posteingang | `club-management`. Rollen, geschützte Medien, Gestaltung, Nachrichten und optionale Gerätebenachrichtigungen prüfen. |
| Interaktive Rugby-Spielzüge, Taktikeditor oder Coaching-Whiteboard | `coach-studio` bei ausdrücklichem Auftrag. Mit Club-Modul kombinieren, wenn Personen oder Teams Freigaben brauchen. Modellzugriff erfordert eigenen Anbieter. |
| Interaktive 3D-Produktstory mit scrollgesteuerter Verwandlung | `scroll-3d` bei ausdrücklichem Auftrag. Den Baustein auf der gewünschten Seite einfügen und die [3D-Scroll-Abnahme](3d-scroll-stories.md) durchführen. |
| Newsletter, Post-Design oder Social-Versand | Newsletter, Social Studio und Post-Planer getrennt wählen. Eigene autorisierte Konten, SMTP und Queue sind Voraussetzungen für realen Versand. |
| Shop oder Rechnungen | Ausdrücklicher Auftrag. Shop und Finanzworkflow getrennt beurteilen; Anbieter-Testmodus, Belege und Rechte prüfen. |

**Kern am Start:** visueller Editor, Seiten und Abschnitte, Medien, Entwürfe, Versionen, SEO, Anfragen, Consent, eigene Webanalyse, DE/EN und CMS-App. Analyse zählt erst nach Statistik-Einwilligung. Keine fremden Skripte standardmäßig laden. Push braucht Freigabe des Geräts.

**Bei optionaler Vereinsverwaltung:** getrennter Login und eigenes App-Manifest. Trainer verwalten zugeordnete Teams; Vorstand und Admin erhalten die weiteren berechtigten Ansichten. Der CMS-Inhaber sieht das Vereinsbüro-Postfach. Persönliche Nachrichten bleiben bei ihren Beteiligten. Öffentliche Ergebnisse nur aus ausdrücklich freigegebenen Spielzeilen.

Das Spielmodell ist für Begegnungen zwischen zwei Teams mit Heim-/Auswärts-Status und zwei Punktwerten ausgelegt. Rennen, Turnierstände oder Wertungen für mehrere Teilnehmende brauchen eine passende eigene Darstellung oder ein eigenes Modell. Die privaten Vereinsfunktionen bleiben dabei nutzbar.

**Template aktualisieren:** Standardfunktionen, Modulgrenzen, Flags und Voraussetzungen in Manifest, Anleitung und Generator gemeinsam pflegen. Die nächste Skill-Ausführung liest diese Dateien aus dem aktuellen Repo. Zugangsdaten, SMTP-Verbindungen, Geräteabonnements, Rollen und Kundendaten bleiben in der zugehörigen Installation.
