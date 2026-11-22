# Instagram Unified Login · Prüfung am 02.11.2026

Neue Meta-Apps benötigen Unified Login. Die Implementierung erhält bestehende Instagram-Login-Verbindungen und ergänzt eine explizite Auswahl mit Meta App-ID/-Secret und Konfigurations-ID. App-/Konfigurationsänderungen invalidieren alte lokale Kontoverbindungen und offene Anmeldungen.

Die offiziellen angemeldeten Meta-Dokumente und das reale App-Dashboard wurden abgeglichen: Systemnutzer-Token, client_business_id, assigned_instagram_accounts, graph.facebook.com/v26.0 und unterstützte IG-Nutzerfelder. account_type gehört nicht zum Unified-IG-Nutzervertrag und wird dort nicht abgefragt. Keine zusätzlichen Werbe- oder Nachrichtenrechte sind für diesen Publishing-Connector erforderlich.

## Automatisierte Prüfung

- Neutraler Starter: vollständiger Lauf 300/300 Tests erfolgreich. Nach dem finalen Feldabgleich zusätzlich 12/12 Unified-Protokolltests erfolgreich.
- Kantiq: vollständiger Lauf 421 erfolgreich, drei Zeitüberschreitungen in unveränderten Export-/Startschutztests bei gleichzeitigen Compilerläufen. Die beiden betroffenen Dateien danach separat mit 15/15 Tests erfolgreich. Nach finalem Feldabgleich alle 51 betroffenen Connector-Tests erfolgreich.
- Typprüfung: Svelte 0 Fehler/0 Warnungen; Starter TypeScript erfolgreich.
- Produktionsbuilds für beide Frameworks mit gesperrtem externem Netzwerk und entfernten Anbieter-/Datenbankzugängen; Kantiq verwendet ausschließlich den direkten lokalen Vite-Build, ohne Migrationen, Seed oder Owner-Provisionierung.
- UI: echte Svelte-Komponente mit injiziertem, rein lesendem Workspace; Desktop und Smartphone geprüft. Keine horizontale Überbreite. Bildhilfe wechselt zwischen Vorbereitung, Anmeldung und Zielwahl; die Skizzen enthalten nur Beispielwerte. Mechanischer Design-Check ohne Befunde.

## Grenzen

Lokale Protokolltests ersetzen keine tatsächliche Meta-Autorisierung oder Veröffentlichungsbestätigung. Die reale eigene Verbindung und die ausdrücklich beauftragten Instagram-Inhalte werden separat im Konto eingerichtet und geprüft. Externe Kunden benötigen Metas passende Live-/Advanced-Access-Freigaben und Review. Jeder Kunde autorisiert separat. Kein Plattform-Secret und keine Token- oder Kundendaten gehören in das Template.
