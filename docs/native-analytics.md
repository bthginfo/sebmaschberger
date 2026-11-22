# Eigene Webanalyse

Neu eingerichtete Starter-Projekte beginnen mit aktiver Webanalyse und einer Aufbewahrung von 90 Tagen. Die Messung startet pro Browser erst nach ausdrücklicher Statistik-Einwilligung. Eine erneute Datenbankeinrichtung übernimmt die bereits gespeicherten Einstellungen. Die Statistik verwendet die eigene Website-Datenbank.

## Einstellungen

**Webanalyse → Einrichten** öffnen. Dort lässt sich die Messung ein- oder ausschalten. Wählen Sie die Aufbewahrung (30, 90, 180 oder 365 Tage) und optional bis zu zwölf öffentliche Zielseiten, etwa die Danke-Seite nach einem Kontaktformular.

Die Statistik-Kategorie wird automatisch in der Datenschutzauswahl erreichbar. Der Absatz auf `/datenschutz` wird automatisch aus dem gespeicherten Modulzustand ergänzt; eine individuelle Datenschutzerklärung bleibt bestehen. Auch nach dem Ausschalten erklärt der Absatz verbleibende Daten. Next.js revalidiert die Datenschutzseite nach Änderungen.

Messung und Statistikkennungen beginnen ausschließlich nach ausdrücklicher Zustimmung. Eine frühere allgemeine Zustimmung erlaubt den neuen Statistik-Zweck nicht automatisch. Aktivierung, erneute Aktivierung und geänderte Aufbewahrung erneuern die Statistik-Auswahl. **Datenschutzeinstellungen** bleiben auf jeder öffentlichen Seite erreichbar. Widerruf stoppt die Messung, bricht Requests ab und entfernt die Kennungen; Änderungen in anderen Tabs werden berücksichtigt.

## Auswertungen

Besucher, Besuche, Seitenaufrufe, aktive Zeit pro Besuch, Absprungrate und Zielrate. Der Verlauf bietet Zeiger-/Tastatur-Auswahl, Datentabelle und CSV-Export. Zeitraum, Gerät, genauer Seitenpfad, Herkunft, Kampagne und Land können gefiltert werden. Listen zeigen Seiten, Quellen, Geräte, Browser, Länder, Kampagnen und Ziele.

Ein Besucher ist eine pseudonyme Browserkennung. Eine Sitzung gilt je Tab und endet nach 30 Minuten Inaktivität oder spätestens 24 Stunden. Ein Aufruf ist eine neue Seitenansicht, nicht jeder Heartbeat. Aktive Zeit zählt nur sichtbare, fokussierte Seiten und ist pro Ansicht auf 30 Minuten begrenzt. Absprung: genau eine passende Seite, unter zehn Sekunden aktive Zeit, kein Ziel. Eine Conversion ist ein Besuch mit definierter Zielseite, kein behaupteter Auftrag oder Umsatz.

Zeitzone: UTC. Der Vergleich verwendet den vorherigen gleich langen Zeitraum. Liegt dieser außerhalb der Aufbewahrungsfrist, wird kein vollständiger Vergleich behauptet. Quellen-/Gerätefilter beziehen sich auf die Sitzung; Seitenfilter auf passende Aufrufe darin. Maximal 366 Tage lassen sich auswählen. Auswertungen über 50.000 Sitzungen müssen in kürzere Zeiträume aufgeteilt werden; kein still abgeschnittener Bericht.

Nur zustimmende Besucher werden erfasst. Browser-Schutz, Ablehnung, Gerätewechsel und gelöschte Kennungen beeinflussen die Werte. Dies ist kein vollständiger Besucherzähler und keine 1:1-Nachbildung von Google Analytics.

## Datenschutz und Betrieb

Zufällige IDs im Browser, HMAC-abgeleitete Kennungen in der Datenbank und kurzlebige signierte Messfreigaben. Keine Fingerprints oder Statistik-Speicherung vollständiger IPs, Referrer, URL-Parameter oder Formularinhalte. Kampagnenangaben werden begrenzt und bereinigt; keine personenbezogenen UTM-Namen verwenden. Länder nutzen den groben Hosting-Ländercode. Hosting-Logs und Missbrauchsschutz sind getrennt.

Aufbewahrung gilt bei jeder Auswertung. Der vorhandene geschützte Cleanup-Job entfernt alte Sitzungen: Next.js täglich unter `/api/internal/cleanup`, Kantiq mit dem Worker-Cron. Cron und Datenbankzugang pro Kundenprojekt prüfen. „Gesammelte Statistik löschen“ erfordert eine ausdrückliche Bestätigung und invalidiert bestehende Messfreigaben.

Die technische Einwilligungskopplung und der automatisch erzeugte Absatz ersetzen keine individuelle Rechtsprüfung der gesamten Website, Hosting-Verträge, tatsächlichen Anbieter oder internationalen Übermittlungen. Die Datenschutzseite muss mit korrektem Verantwortlichen und Hosting-Angaben veröffentlicht sein. Vor Kundenstart Zustimmung, Ablehnung, Widerruf, private Bereiche und tatsächlichen Datenschutztext prüfen.

Quellen: [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html), [DSK-Orientierungshilfe Digitale Dienste](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf).
## Bestätigte Ergebnisse

„Bestätigte Ergebnisse“ zeigt gespeicherte Kontakt- und Kooperationsanfragen, angenommene Vorschläge und bestätigte Käufe bei einer zuordenbaren Browsersitzung mit Einwilligung. Die vorhandenen Filter und der Zeitraum gelten auch für diese Auswertung. Bei Käufen muss der Browser von der Zahlungsseite zurückkehren. Aufträge ohne zugehörige Zustimmung oder Rückkehr finden Sie weiterhin im Bestellbereich.

Die Webstatistik erhält keine Formularinhalte, Adressen, Bestellnummern oder Zahlungsbeträge. Für die Zuordnung werden Ereignisart, Zeitpunkt und eine pseudonyme Kennung verwendet. Ein erfolgreich gesendetes Formular oder eine geöffnete Bestätigung allein macht noch keinen Eintrag. Die Statistik prüft die Einwilligung und den zugehörigen öffentlichen Besuch.
