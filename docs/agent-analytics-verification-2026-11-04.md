# MCP und Webanalyse: Verifikation

Stand: 4. November 2026. Gilt für Kantiq (SvelteKit), Kantiq Creators und website-starter 1.15.0 (Next.js). Neue Module sind standardmäßig aus; keine Produktivschlüssel oder Statistik-Testdaten werden angelegt.

## Automatische Prüfungen

- Kantiq: 67 Testdateien, 487 Tests erfolgreich; svelte-check ohne Fehler oder Warnungen; Produktionsbuild erfolgreich.
- Starter: 381 Tests erfolgreich; Creators: 139 Tests erfolgreich; beide Produktionsbuilds einschließlich TypeScript erfolgreich.
- Ergänzend acht gezielte MCP-/Statistiktests: offizieller HTTP-MCP-Client, Hash-/Scope-/Ablauf-/Widerrufregeln, unveränderliche Textänderungen, Einwilligungssignaturen, private Pfade, Bots, Retention, Vergleiche und Client-Stopp nach Serverwiderruf.

## Native Abläufe in isolierten Umgebungen

Alle drei Anwendungen wurden mit echten HTTP-Anfragen und dem offiziellen MCP-Client geprüft: Anmeldung, Werkzeugliste, Textentwurf, neue Seite, idempotente Wiederholung, abweichende Wiederholung abgewiesen, vier Hilfethemen, aggregierte Statistik, signierte Einwilligung und Ereignis, anonyme/fremde Herkunft abgewiesen sowie widerrufener Schlüssel abgewiesen. Veröffentlichte Inhalte blieben unverändert. Social-Entwürfe nutzen in Kantiq/Starter das bestehende Modul; Creators bietet keine zweite Social-Speicherung und verwaltet Social zentral in Kantiq.

Next.js-CMS-Kernabläufe wurden zusätzlich mit Anmeldung, Herkunftsschutz, Entwurf, Konflikterkennung, Veröffentlichung/Cache, Anfrage und Export geprüft und im Testbestand zurückgesetzt. Keine echten Nachrichten, Zahlungen oder Social-Beiträge wurden durch diese Prüfung ausgelöst.

## Browser und Bedienung

Desktop 1440 × 1000 und Smartphone 390 × 844: beide neuen Ansichten in allen drei Anwendungen. Zeitraum, Vergleich an/aus, Filter setzen/löschen und Diagramm per Tastatur wurden bedient. Absichtlich erzeugter Versionskonflikt zeigt die Fehlermeldung im offenen Schlüsseldialog und erhält eingegebene Werte. Keine horizontale Überbreite in den geprüften Ansichten.

Einwilligungsablauf: vor Zustimmung keine Statistikkennungen; danach Kennungen/Ereignis; beim Widerruf Kennungen entfernt und Messung gestoppt. Automatischer Datenschutzabsatz liegt im Hauptinhalt vor dem Footer; erneuerter Zweck verlangt neue Zustimmung. Server-Off/Generationswechsel beendet laufende Messfreigaben.

Unabhängige Impeccable-Nachprüfung: alle vier angeforderten UI-Korrekturen als behoben bewertet (Ship für diese vier Korrekturen). Bestehende globale Designsystemdateien bleiben erhalten.

## Grenzen

Es werden nur zustimmende Besucher erfasst. Keine vollständige Besucherzählung oder 1:1-GA4-Replikation. Die technische Kopplung und der dynamische Absatz ersetzen keine individuelle Rechtsprüfung. MCP verwendet bewusst die vorhandenen Entwurfs-/Hilfefähigkeiten; Veröffentlichung, Zahlungen, Kontofreigaben und Geheimnisse sind keine Agentenwerkzeuge. Ein externer Agent benötigt einen HTTP-MCP-Client mit Bearer-Header-Unterstützung.
