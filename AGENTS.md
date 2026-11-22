# Projektregeln

Dieses Projekt ist ein eigenständiger Website-/CMS-Starter. Verbindlich sind der aktuelle Nutzerauftrag und `project/brief.json`, wenn vorhanden.

- Next.js App Router, React, TypeScript, Node 24 und npm beibehalten, sofern kein Stackwechsel beauftragt wird.
- Inhalte, Design und Infrastruktur pro Website trennen. Keine Datenbanken, Blob-Stores, Passwörter, Bilder, Firmenangaben oder Rechtstexte anderer Projekte übernehmen.
- Für jede neue Website ein eigenes privates GitHub-Repository anlegen und den Projektstand dorthin pushen. Ein eigenes Vercel-Projekt mit diesem Repository verbinden. Ein eigenes Neon-Projekt im Free-Tarif mit eigener Datenbank und einen eigenen Vercel-Blob-Store für diese Website anlegen und verknüpfen. Gemeinsame Neon-Projekte, getrennte Tabellen oder Blob-Pfadpräfixe erfüllen diesen Standard nicht. Bereits für genau diese Website angelegte Ressourcen bei einer Fortsetzung wiederverwenden; keine Doppelanlagen erzeugen. GitHub-Repository, Produktionsbranch, Ressourcen-IDs und den bestätigten Free-Tarif ohne Geheimnisse in `project/infrastructure.json` dokumentieren. Ist keine neue Free-Neon-Ressource verfügbar, den konkreten Engpass melden und keinen kostenpflichtigen Tarif oder fremden Kundenspeicher als Ersatz wählen.
- Lokal standardmäßig `.data/` verwenden. `DATABASE_URL` allein darf Entwicklungs- und Testläufe nicht auf eine Kundendatenbank lenken; dafür ist `WS_USE_REMOTE_DATABASE=1` ausdrücklich erforderlich.
- `src/data/content.json` ist ein Erstimport. Schemaaufbau/Seed nur explizit über `npm run db:setup`; niemals beim normalen Request oder Build bestehende Daten ersetzen.
- Öffentliche Darstellung und Metadaten lesen nur die veröffentlichte Fassung. Entwürfe und private Einstellungen dürfen nicht im öffentlichen Cache landen.
- Browseränderungen bleiben bis zum Speichern lokal. Veröffentlichung invalidiert Inhaltscache und betroffene Routen; keine Datenbankabfrage pro Tastendruck, kein Admin-Polling.
- Neue Abschnitte durchgehend in Typen, Schema, Registry, `section-capabilities.ts` und Renderer unterstützen. Direkte Bearbeitung und Mobilvorschau erhalten.
- Für jeden neuen oder individuell gebauten Abschnitt alle redaktionellen Texte, Medien und Alternativtexte, Links, Reihenfolgen sowie verwendeten Abschnittsfarben im CMS erfassen. Feldnamen und Vorschau müssen dem sichtbaren Abschnitt entsprechen. Explizite Farben gehen vor Farbvorgaben. Vorschau und öffentliche Seite verwenden dieselbe Auswertung. Entwurf, Speichern und Veröffentlichung auf Smartphone und Desktop prüfen.
- Bei neuen Websites ein zum Auftrag passendes Profil wählen und die Startkomposition auf die Marke zuschneiden. Bildbühne, Fotogeschichte und Projektgalerie für Inhalte einsetzen, die von ihrer Darstellung profitieren. Eigene Motive, klarer nächster Schritt und eine erkennbare visuelle Idee pro Seite gehören in die Vorschau. Bewegung beim Scrollen, auf schmalen Bildschirmen und mit reduzierter Bewegung prüfen.
- Die Sicherheitsübersicht und den wöchentlichen Dependency-Workflow bei jedem neuen Projekt mit übernehmen. Hohe und kritische Befunde zeitnah prüfen und mit einem gezielten Versionsupdate beheben. Produktions-CMS und private Medien mit Sitzungs-, Origin- und Cache-Prüfungen abnehmen.
- Liquid Glass ist eine ausdrückliche, zusätzliche Gestaltungswahl (`--aesthetic liquid-glass`) für die Standardprofile. `docs/recipes/liquid-glass.md` anwenden; bisherige Profile und Standardfarben nicht pauschal ersetzen.
- Bei filmischen Heros und animierten Produktbeispielen `docs/recipes/cinematic-hero.md` anwenden. Den wichtigsten Übergang im Browser prüfen, bevor die ganze Sequenz gerendert wird.
- `scroll-3d` nur auf ausdrücklichen Wunsch aktivieren. Für Story, Assets, Motion, CMS und Abnahme `docs/recipes/3d-scroll-story.md` anwenden.
- Schreibzugriffe validieren Eingaben, Herkunft, Sitzung und Revision. SMTP-Geheimnisse bleiben verschlüsselt auf dem Server; Nachrichten zuerst speichern, dann Versand versuchen.
- Bei weiteren Geschäftsfunktionen Modulgrenzen einhalten. Portal, CRM, Rechnungen, Podcast oder Buchung sind Erweiterungen; ihre Bauanleitungen sind kein fertiger Funktionsnachweis.
- Die Aktivierungsrichtlinien im aktuellen `template.manifest.json` und die passenden Anleitungen gemeinsam mit neuen Funktionen pflegen. Vereinsverwaltung und Coach Studio getrennt testen. Die installierbare CMS-App und die native Webanalyse gehören zum Kern; Push und Analytics beginnen erst nach ihrer jeweiligen Einwilligung.
- Neue Projekte behalten den Entwurfsmodus, bis tatsächliche Inhalte, Kontaktangaben, Rechtstexte und Dienste geprüft sind. Keine erfundenen Referenzen oder Ergebnisse verwenden.
- Für öffentliche Texte, SEO und KI-Suchen `skills/website-starter/references/search-and-copy.md` anwenden. Texte kommen aus Sicht des Anbieters und enthalten keine Regieanweisungen oder KI-Floskeln. Jede wichtige URL bekommt eigene, sichtbare Inhalte und geprüfte Metadaten. Prüfe Indexierbarkeit, Linkziele und mobile Leistung an der Live-Domain.
- Bei neuen Websites `skills/website-starter/references/design-and-content.md` als Designstandard verwenden. Der Einstieg zeigt Angebot, Hauptaktion und ein eigenes Hauptmotiv. Die ersten Abschnitte liefern sichtbare Belege. Eine Unterseite, die wichtigste Aktion und der responsive Einstieg werden im Browser mit den Projektinhalten abgenommen.

Zur Prüfung: `npm run typecheck`, `npm test`, `npm run build`. Der CMS-Ablauf wird mit `npm run verify:local -- http://localhost:3000` in einer lokalen Umgebung mit deaktiviertem SMTP geprüft. Echte Neon-/Blob-/SMTP-Verbindungen nur gegen getrennte Testressourcen prüfen.

Die zum installierten Next.js gehörenden Dokumente unter `node_modules/next/dist/docs/` vor Änderungen an Framework-APIs konsultieren. Der Starter behält derzeit das getestete `unstable_cache`-Modell bei; ein Wechsel zu Cache Components benötigt eine gemeinsame Anpassung von Abruf und Invalidierung.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
