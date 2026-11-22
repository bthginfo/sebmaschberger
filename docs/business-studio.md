# Vorlagen, Sortiment und Belege

Stand: 4. November 2026. Die Module verwenden weiterhin die getrennten Ressourcen und Zugänge der jeweiligen Website.

## Im CMS

- **Vorlagen → Dokumente:** eigenes PNG-, JPEG- oder WebP-Logo bis 2 MB hochladen, Layout, Schrift, Farben und Abschlusstext bearbeiten. Die Vorschau rendert dieselben PDF-Bytes wie der Download; auf dem Handy zwischen Vorschau und Bearbeiten wechseln.
- **Vorlagen → E-Mails:** Bestellbestätigung, vollständige/teilweise Erstattung und Anfrage-Benachrichtigung auswählen. Betreff und Nachricht mit den erklärten Platzhaltern anpassen. Die Vorschau sendet keine Mail. SMTP bleibt separat in Einstellungen → E-Mail.
- **Vorlagen → Absender:** rechtlichen Anbieter und Steuerprofil pflegen. Rechnungen erst nach vollständigen Angaben ausdrücklich einschalten. Es werden keine Steuer- oder Bankdaten erfunden.
- **Shop → Produkte:** Versandprodukte, private Downloads und Dienstleistungen erstellen. Ein Produkt auswählen statt alle Formulare gleichzeitig zu öffnen. Mit Produktgruppen wächst das Sortiment übersichtlich; Kommapreise sind möglich. Speichern und Veröffentlichen bleiben getrennt.
- **Shop → Steuern:** benannte feste Umsatzsteuerregeln mit bis zu zwei Nachkommastellen. Shop-Preise sind Endpreise, die Umsatzsteuer ist enthalten. Sobald Regeln eingerichtet sind, braucht jedes aktive Produkt eine ausdrückliche Auswahl.
- **Shop → Versand:** aktive Ländergebiete mit Pauschale und optionaler Freigrenze. Ein Land gehört höchstens zu einem aktiven Gebiet. Bei konfigurierten Gebieten wählt die Kundschaft das Land vor dem Checkout; Stripe wird auf genau dieses Land begrenzt. Digitale Produkte und Dienstleistungen erhalten keine Versandkosten.

Die gewählten Steuerregeln ersetzen keine automatische internationale Steuerbestimmung, OSS-Logik oder steuerliche Einordnung. Für neue Shop-Rechnungen sind explizite Regeln erforderlich; ein Kleinunternehmerprofil akzeptiert keinen positiven Steuersatz.

## Zuverlässigkeit und Zugriff

Beträge werden in Cent mit exakter Mengen-/Steuerberechnung verarbeitet. Die Serverpreise sind maßgeblich. Lieferland und Warenkorb gehören zur Checkout-Identität: Änderungen beenden zunächst die vorherige offene Kasse, statt doppelte Zahlungen zu erzeugen. Bestätigter Betrag, Währung, Sitzung und gegebenenfalls Lieferland werden abgeglichen. Nur ein geprüftes Zahlungsereignis gibt den Beleg frei.

Anbieter, Käuferadresse, Positionen, Preise und Gestaltung werden eingefroren. Nummern werden atomar bei der ersten bestätigten Zahlung vergeben und bei Wiederholungen nicht erneut verbraucht. Der erste berechtigte PDF-Abruf speichert das Original privat mit Prüfsumme. Spätere Gestaltung oder Erstattungen überschreiben es nicht. Eine Teilrückerstattung erfindet keine steuerliche Positionsaufteilung; entsprechende Korrekturbelege müssen fachlich passend erstellt werden.

Beleglinks sind signiert und persönlich; geänderte Schlüssel werden abgewiesen. Private Einstellungen benötigen die Admin-Sitzung. Änderungen prüfen Herkunft, Größe, Inhalt und Revision. Logos werden serverseitig dekodiert, verkleinert und als PNG ohne Metadaten neu erzeugt. Bearbeitbare Mailtexte werden HTML-escaped, Logos beim tatsächlichen Versand per CID eingebettet. Es gibt keinen frei ausführbaren HTML-Editor und keine externen Logo-Downloads.

## Social-Formate

Das Studio exportiert Hochformat-Reels mit 1080 × 1920 Pixeln. Die optionale Abstandshilfe reserviert mehr Raum für Videobeschreibung und App-Controls. Sie ist ein konservativer Gestaltungsrichtwert, keine pixelgenaue Garantie für jede App-Version. Exportierte Medien enthalten keine Hilfslinien.

Instagram und weitere freigegebene Plattformen können über den eingerichteten Connector und die Warteschlange veröffentlichen. TikTok verwendet **video.upload zur Inbox**: Der letzte Veröffentlichungs-Schritt erfolgt in TikTok. Fotoposts bleiben dort manuell. Ein für das eigene Team gebautes Tool wird nicht über einen unzulässigen Direct-Post-Weg geschaltet.

Quellen: [TikTok Upload](https://developers.tiktok.com/docs/en/content-posting-api-reference-upload-video), [TikTok Richtlinien](https://developers.tiktok.com/docs/en/content-sharing-guidelines), [YouTube Upload](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert).

## Prüfgrenzen

Die isolierten Prüfungen verwenden eigene lokale Daten bzw. eine ausdrücklich getrennte Entwicklungsdatenbank. Keine realen Kundendaten, Zahlungen, Mails oder Social-Veröffentlichungen wurden für diese Überarbeitung ausgelöst. Provider-Freigaben, ein echter Händler-Testkauf und die Zustellung in unterschiedlichen E-Mail-Clients müssen mit den jeweiligen eingerichteten Konten abgenommen werden. Ein bestandener technischer Test ist kein umfassendes Penetrationstest-Zertifikat.

Ein Shop lässt sich auch in einem normalen KMU-Profil vorbereiten. Einstellungen → Shop vorbereiten legt ausschließlich das ausgeschaltete Shop-Modul an. Creator-Layout, Creator-Bausteine und neue Verkäufe werden dadurch nicht aktiviert. Der Shop-Baustein und die eigenen Shop-Seiten stehen danach separat bereit.
