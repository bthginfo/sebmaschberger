# Einstieg

1. `project/brief.json` lesen, wenn vorhanden. Sonst das Briefing aus dem aktuellen Auftrag in dieser Struktur festhalten; `project/brief.example.json` ist nur ein Beispiel.
2. `template.manifest.json` und `docs/features.md` zeigen Version und tatsächlichen Funktionsumfang.
3. Neue Projekte mit `scripts/create-site.mjs` in einem neuen Ordner erzeugen. Bestehende Kundenprojekte direkt dort bearbeiten.
4. `src/data/content.json` ist ausschließlich der Erstinhalt einer neuen Installation. Laufende CMS-Daten liegen separat. Ein Deploy darf sie nicht überschreiben.
5. `src/lib/types.ts`, `validation.ts` und `section-library.ts` verbinden CMS und Renderer. Bei neuen Abschnitten auch die Capability-Zuordnung ergänzen.
6. Das passende Startprofil wählen und den [Designstandard](skills/website-starter/references/design-and-content.md) auf das Projekt anwenden. Die Richtung unter `style` festhalten. Fertige Hero-Texte können über `hero.heading` und `hero.text` direkt in den Erstentwurf. Die [visuellen Abschnitte](docs/features.md#visuelle-abschnitte) lassen sich im CMS einsetzen. Farben und Bewegung unter **Gestaltung** prüfen.
   [Texte, SEO und KI-Suchen](skills/website-starter/references/search-and-copy.md) für jede Seite anwenden: aus Sicht des Anbieters schreiben, Belege prüfen und Metadaten je URL ausarbeiten.
7. Lokale Einrichtung und eigene Produktionsressourcen nach `docs/setup.md` vornehmen.
8. `npm run typecheck`, `npm test`, `npm run build` und den lokalen CMS-Ablauf prüfen. Neue externe Funktionen separat mit Testdaten überprüfen.
9. Vor Veröffentlichung `docs/launch.md` anwenden und tatsächliche offene Punkte melden.

Wichtige Dateien: `AGENTS.md`, `DESIGN.md`, `docs/architecture.md`, `docs/recipes/README.md`.

Das Creator-Profil nur für Creator-Aufträge wählen. [Einrichtung für Creator und Commerce](docs/creator-modules.md).

[Speisen & Getränke und Tischreservierungen](docs/hospitality.md) sind unabhängige Opt-ins. Nutzen Sie `--features restaurant-menu,reservations` für beide Module oder wählen Sie nur das benötigte Modul. Platzieren Sie die gewünschten Layouts aus **Gastronomie** im Seiteneditor.

Der [Newsletter](docs/newsletter.md) ist optional. Aktivieren Sie ihn nur auf Wunsch des Kunden und platzieren Sie dann die Newsletter-Anmeldung im Seiteneditor.

Das [Social-Studio](docs/social-studio.md) ist ein eigenes optionales Modul für alle fünf Profile. Es bleibt auch im Creator-Profil aus, bis es im Briefing, per `--features social-studio` oder im CMS ausdrücklich aktiviert und gespeichert wird.

Die Standardsprachen für CMS und Website werden getrennt unter **Settings → General** gesetzt. Die [Anleitung für DE und EN](docs/recipes/multilingual.md) zeigt, wie Sprachfassungen miteinander verknüpft werden.

Cookie-Dialog und eigene Webanalyse gehören zur Standardinstallation. Messung startet erst mit Statistik-Einwilligung. CMS-App, Tour, Favicon und CMS-Appsymbol stehen in [App & notifications](docs/workspace-apps.md) bereit.

Die [Vereinsverwaltung](docs/club-management.md) ist ein eigenes Opt-in (`--features club-management`). Sie enthält den privaten Mitgliederbereich mit Login, Rollen, Teams, Terminen, Ergebnissen, Nachrichten, Gestaltung und App-Einstellungen. Coach Studio wird dadurch nicht eingeschaltet.

Das [Coach Studio](docs/coach-studio.md) ist nur für ausdrücklich beauftragte Rugby-Workspaces vorgesehen. Verwenden Sie dafür `--features coach-studio`.

Für [filmische Hero-Szenen](docs/recipes/cinematic-hero.md) gelten die Vorgaben zu Kamerafahrt, Material, Bewegungsprobe und responsiver Auslieferung.

[Interaktive 3D-Scroll-Stories](docs/recipes/3d-scroll-story.md) sind ein ausdrückliches Opt-in über `--features scroll-3d` oder im CMS. Die Aktivierung schaltet den Baustein in der Bibliothek frei. Das Rezept begleitet die Asset-Produktion, die Scroll- und Kollisionsprüfung und auf Wunsch den Reel-Export.

Neue Bausteine nach [Visueller Editor und responsive Vorschau](skills/website-starter/references/visual-editor.md) umsetzen und abnehmen.

Der [CMS-Assistent](docs/ai-assistant.md) ist ein weiteres unabhängiges Opt-in (`--features ai-assistant`). Reale Vorschläge benötigen einen eigenen serverseitigen Anbieterzugang. Öffentliche CMS-Beispiele bleiben sichtbar gekennzeichnete lokale Simulationen ohne KI-Verbindung.

Der [Post-Planer](docs/social-publishing.md) ergänzt das Social-Studio nur bei ausdrücklichem Opt-in (`--features social-publishing`). Private Planung ist auch ohne Zugang nutzbar; automatisches Senden an Instagram, Facebook-Seiten, Threads, LinkedIn, Pinterest, YouTube und Bluesky bleibt bis zur eigenen Konto-, Medien- und Queue-Einrichtung gesperrt. TikTok übergibt Videos zur abschließenden Veröffentlichung in der App.

## Optionale Glasästhetik

[Liquid Glass · iOS](docs/recipes/liquid-glass.md) ist eine eigene Auswahl für die vier Standardprofile: `--aesthetic liquid-glass`. Dunkle Glasflächen, Tiefe, ruhige Lichtnebel oder Sterne und Interaktionsfeedback sind im CMS bearbeitbar. Ohne Auswahl bleiben die bisherigen Entwürfe erhalten.
