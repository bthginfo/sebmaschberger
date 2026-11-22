# Einrichtung je Website

## Lokal

1. Neues Projekt mit dem Generator erstellen und `npm ci` ausführen.
2. `npm run setup` fragt ein verborgenes Erstpasswort ab und erzeugt unabhängige Schlüssel in `.env.local`. Für eine Agenten-Testumgebung kann `node scripts/configure-auth.mjs --generate` einen zufälligen Erstzugang in der ignorierten Datei `.data/admin-access.json` ablegen.
3. `npm run dev` starten und `/admin` öffnen. Die lokale Datei wird bei Bedarf angelegt. Auch eine vorhandene `DATABASE_URL` wird bei Entwicklung/Tests ohne `WS_USE_REMOTE_DATABASE=1` nicht benutzt.
4. Inhalte und Gestaltung entwickeln, CMS-Funktionen prüfen. Lokale Dateien und Erstzugänge nie committen oder veröffentlichen.

## Eigenständige Produktionsressourcen

Jede neue Website erhält **ein eigenes privates GitHub-Repository, ein eigenes Vercel-Projekt, ein eigenes Neon-Projekt im Free-Tarif mit eigener Datenbank und einen eigenen Vercel-Blob-Store**. Der lokale Generator kopiert den Code. Der Website-Starter-Workflow legt die Ressourcen mit den verfügbaren Provider-Werkzeugen an und verbindet sie für diese Website.

1. Im vorgesehenen GitHub-Konto ein neues privates Repository für genau diese Website anlegen. Den Projektstand committen, GitHub als `origin` einrichten und den vorgesehenen Produktionsbranch pushen. Den angekommenen Commit auf GitHub prüfen.
2. Das eindeutige Vercel-Team bestimmen und ein eigenes Vercel-Projekt für die Website anlegen.
3. Ein neues Neon-Projekt im Free-Tarif anlegen, die eigene Datenbank und Zugangsdaten einrichten und den tatsächlich bestätigten Tarif prüfen. Eine weitere Datenbank, ein Schema oder eigene Tabellen im Neon-Projekt einer anderen Website ersetzen diese Trennung nicht.
4. Einen neuen öffentlichen Vercel-Blob-Store anlegen und mit diesem Vercel-Projekt verbinden. Kein Store einer anderen Website und kein bloßes Pfadpräfix als Ersatz. Für private Dokumente bei Bedarf einen zusätzlichen eigenen privaten Store verwenden.
5. GitHub-Repository im Format `owner/name`, Produktionsbranch und Ressourcen-IDs nach `project/infrastructure.example.json` in `project/infrastructure.json` dokumentieren. Verbindungs-URLs mit Passwort, Tokens und andere Geheimnisse gehören ausschließlich in die eigene Umgebung.
6. Die folgenden Umgebungsvariablen im neuen Vercel-Projekt einrichten und die tatsächlichen Verbindungen prüfen. Frankfurt bleibt die bevorzugte Region.

Eine Fortsetzung verwendet die bereits für genau diese Website angelegten Ressourcen. Nach einem Timeout zuerst deren Existenz prüfen, bevor eine Anlage wiederholt wird. Ist eine neue Neon-Free-Ressource wegen Kontingent oder Verfügbarkeit nicht möglich, den konkreten Engpass melden; keinen kostenpflichtigen Neon-Tarif, kein automatisches Upgrade und keine gemeinsame Kundendatenbank als Ersatz wählen. Einen ausdrücklich lokalen Auftrag ohne Hosting respektieren.

| Variable | Einrichtung |
| --- | --- |
| `DATABASE_URL` | Gepoolte URL einer neuen Postgres-/Neon-Datenbank |
| `BLOB_READ_WRITE_TOKEN` | Token des eigenen öffentlichen Vercel-Blob-Stores |
| `AUTH_SECRET` | Unabhängiger zufälliger Schlüssel mit mindestens 32 Zeichen; für verschlüsselte Daten dauerhaft sichern |
| `ADMIN_INITIAL_PASSWORD_HASH` | Scrypt-Ersthash; niemals das Klartextpasswort |
| `CRON_SECRET` | Unabhängiger Zufallsschlüssel für `/api/internal/cleanup` |
| `NEXT_PUBLIC_SITE_URL` | Endgültige kanonische HTTPS-Domain |
| `NEXT_PUBLIC_DESIGN_REVIEW` | Während Entwurf `true`, nach Freigabe `false` |
| `NEXT_PUBLIC_SITE_VARIANT` | Anfänglicher Entwurf 1–5; anschließend im CMS wählbar |
| `WS_USE_REMOTE_DATABASE` | Nur für bewusst entfernte Entwicklungs-/Wartungsläufe `1` |
| `WS_DB_METRICS` | Bei Bedarf sichere Abfragediagnose ohne Inhalte/Zugangsdaten |

Produktionsvariablen im neuen Hostingprojekt einrichten. Vor dem ersten datenbankgestützten Build einmal explizit `npm run db:setup` gegen die neue, dafür bestimmte Datenbank ausführen. Dafür eine eigene ignorierte Umgebungsdatei oder die neue Vercel-Projektverknüpfung verwenden. Keine Umgebung aus einem bestehenden Kundenprojekt kopieren.

Nach Einrichtung der Datenbank das eigene Vercel-Projekt mit dem privaten GitHub-Repository verbinden. Die Zuordnung von Repository, Produktionsbranch und Build-Verzeichnis in Vercel prüfen. Den ersten Git-Build in einer Vorschau abnehmen und den geprüften Stand nach Freigabe aus dem Produktionsbranch veröffentlichen. Die neutrale Vorlage enthält keine `.vercel/project.json` und keine vorhandene Ressourcen-ID. Preview muss eine separate Datenbank und separate Schlüssel verwenden; dafür ist beispielsweise ein eigener Preview-Branch innerhalb des neuen, ausschließlich dieser Website gehörenden Neon-Projekts geeignet. Ein Build führt keine Migration oder Neuimporte aus.

SMTP ist anfangs deaktiviert. Im CMS zunächst den tatsächlichen Mailanbieter einrichten, eine gezielte Testnachricht prüfen und erst dann Benachrichtigungen aktivieren. Der Starter versendet durch die Ersteinrichtung keine E-Mails.

Eine spätere Änderung der Seed-Datei verändert keine veröffentlichten Inhalte. Für eine laufende Website die CMS-API oder eine explizite, versionierte Inhaltsmigration verwenden. `AUTH_SECRET` nicht unbedacht neu erzeugen: bestehende SMTP-Geheimnisse benötigen den bisherigen Schlüssel.

## Sicherheit im Betrieb

Unter **Verwaltung → Sicherheit** sehen Inhaber die geprüften Versionen aus dem Lockfile, den Zeitpunkt und bekannte Hinweise aus der Open Source Vulnerability Database. Die Abfrage enthält Paketnamen und Versionen. Ein nicht erreichbarer Prüfdienst wird ausdrücklich angezeigt.

GitHub Actions muss für das eigene Repository aktiviert sein. Der mitgelieferte Workflow prüft Pull Requests, Änderungen auf `main` und den Standardbranch wöchentlich. Hohe und kritische Befunde machen den Lauf fehlerhaft. Die Ergebnisse stehen im Repository unter **Actions → Dependency security**. Vor dem Start einmal den Workflow ausführen und die Auslieferung der Admin- und Medienrouten ohne Sitzung kontrollieren.
