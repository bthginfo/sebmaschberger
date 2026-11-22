# Admin-Arbeitsbereich

Stand 5. November 2026 · Template 1.18.0.

Die Verwaltung nutzt eine gemeinsame helle Arbeitsoberfläche mit gruppierter Navigation, einer Bereichssuche (Strg/⌘ K), klaren Speicherzuständen und einer mobilen Schnellnavigation. Website-Inhalte, Social-Studio und Planer sind direkt erreichbar. Lange Einrichtungsanleitungen werden erst über Hilfe oder aufklappbare Hinweise angezeigt. Das öffentliche Website-Design bleibt unabhängig.

## Post-Planer im Alltag

1. Die Woche zeigt die echten Beitragsmotive, Kanal, Uhrzeit und Status. „Heute“ springt zurück; Monat und Beitragsliste bieten andere Ansichten. Die zuletzt gewählte Ansicht wird nur lokal im Browser gemerkt.
2. „Beitrag planen“ oder das Plus eines Tages öffnet die Auswahl aus Studio-Design, fertiger Datei und Text/Verweis. Ein Datum aus dem Kalender wird vorbesetzt.
3. Ein Klick auf einen vorhandenen Beitrag öffnet den Editor mit Vorschau und Beitragstext. Design-/Formatdetails, Bildbeschreibungen und Export liegen unter aufklappbaren Punkten. Ungespeicherte Änderungen verlangen vor dem Wechsel eine Entscheidung.
4. „Kanäle“ öffnet die vorhandene eigene Konto- und App-Einrichtung. Die Fünf-Schritt-Anleitung bleibt erreichbar, startet aber geschlossen. Hilfe erklärt die Unterschiede zwischen Planen, Freigeben und Veröffentlichen.

„Manuell geplant“ löst keinen Versand aus. „Freigegeben“ bedeutet eine gespeicherte Zustimmung mit künftigem Queue-Auftrag, nicht bereits veröffentlicht. Plattformbestätigte Veröffentlichungen bleiben von manuell erledigten Beiträgen getrennt. Ein Termin oder eine Vorschau erteilt keine Freigabe.

Vorbereitete Medien kommen ausschließlich aus dem geschützten eigenen Medien-Endpunkt. Bei Studio-Planungen ohne vorbereitete Datei wird beim Sichtbarwerden der eingefrorene Planungsstand geladen und lokal als kleine Vorschau gerendert. Neue Studio-Änderungen ersetzen diesen Stand nicht. Keine Medien von fremden Verweisen laden.

## Modulgrenzen

Der Starter bleibt neutral; Social-Studio und Post-Planer sind weiterhin ausdrücklich zu aktivierende Module. Keine Kantiq-Inhalte, Accounts, Schlüssel, Termine, Datenbank- oder Blob-Zuordnungen werden mitgeliefert. OAuth, Berechtigungen, Medienprüfung, ausdrückliche Versandfreigabe und dauerhafte Queue bleiben unverändert.

## Prüfung dieses Stands

Kalenderarithmetik, Zeitzonen, Statusdarstellung, Filter und unveränderliche Vorschauwahl sind automatisiert geprüft. Der gesamte Starter-Testlauf hat 338 Tests bestanden. In einer getrennten lokalen Next-Instanz mit eigenem Dateispeicher und deaktiviertem SMTP wurde ein Studio-Beitrag tatsächlich angelegt und gespeichert; Schließen nach einer Änderung öffnete den Verwerfen-/Speichern-Dialog. Woche, Monat, Liste und die mobile Tagesauswahl wurden im Browser geprüft. Desktop (1440 px), Tablet (820 px) und Smartphone (390 px) wurden visuell kontrolliert; keine seitlichen Dokumentüberläufe. Eigene Provider-Apps und echte Veröffentlichungen sind damit nicht für neue Kunden vorkonfiguriert oder nachgewiesen.

Ab 1.12.1: Erledigte und abgebrochene Beiträge ohne Termin liegen in einer zunächst eingeklappten historischen Gruppe. Offene Entwürfe und fehlgeschlagene oder zu prüfende Vorgänge bleiben sichtbar. Suche und Erledigt-Filter öffnen passende historische Ergebnisse; die Beitragsliste enthält weiterhin sämtliche Datensätze. Die Gruppierung ändert keine gespeicherten Status oder Freigaben.

## Usability-Korrekturen ab 1.12.2

Die gemeinsamen Dialoge schützen ungespeicherte Eingaben beim Schließen, Escape und entsprechend markiertem Abbrechen. Weiter bearbeiten erhält Eingaben, Scrollstand und Fokus. Neue Seiten, Medien-Metadaten und Linkauswahl nutzen diesen Schutz. Die Bestätigungsansicht verdeckt den bestehenden Formularinhalt, ohne ihn neu anzulegen.

Im mobilen Social-Studio gehört die untere Leiste ausschließlich den Design-Werkzeugen; die globale Schnellnavigation bleibt in allen anderen Ansichten erhalten. Die obere Aktionszeile passt ohne überlagernde zweite Zeile. Zahlenfelder erlauben leere Zwischenstände und negative oder dezimale Eingaben; gültige Werte erscheinen sofort in der Vorschau, Grenzen greifen erst beim Verlassen.

Der aktuelle vollständige Testlauf besteht aus 342 bestandenen Tests. In einer echten getrennten lokalen Next-Instanz wurden der geschützte Neue-Seite-Dialog und die Tastatureingabe einer neuen Schriftgröße bestätigt. Der native Gesamtcheck für Anmeldung, Entwurf, Versionskonflikt, öffentliche Projektion, Veröffentlichung, Anfrage, Export und Wiederherstellung ist ebenfalls bestanden. Die finale Typprüfung und der vollständige isolierte native Next-Build mit Webpack sind erfolgreich. Keine echte Provider-Veröffentlichung oder Zahlung wurde dafür ausgelöst.
## Prüfung vor der Übergabe

- **Inhaber** öffnet den Betriebscheck, sendet eine Testmail an das eingerichtete Postfach und prüft bei aktivem Shop den Bestellablauf im Testkonto. Beim Post-Planer den erwarteten Kanal und die letzte Bestätigung kontrollieren.
- **Redaktion** meldet sich mit dem eigenen Zugang am Handy an, ändert Öffnungszeiten und ein Bild und speichert den Entwurf. Der Inhaber prüft die Änderung und gibt sie frei.
- **Shop-Team** findet eine Testbestellung, öffnet den Beleg und markiert eine bezahlte Testbestellung als ausgeliefert. Zahlungs- und Zugangseinstellungen verwaltet der Inhaber.
- **Creator** lädt im Post-Planer ein fertiges Testmotiv hoch, wählt einen Zeitpunkt und prüft den Eintrag im Kalender. Im Media Kit ergänzt die Person eine echte Kennzahl mit Zeitraum und beantwortet eine Test-Kooperationsanfrage.
- **Projektfreigabe** legt im Anfragepostfach einen Vorschlag an und öffnet den Link in einem getrennten Browserprofil. Die Entscheidung lässt sich anschließend in der Anfrage prüfen. Terminvorschläge werden nach der Annahme im eigenen Kalender eingetragen.
