---
name: website-starter
description: Erstellt neue Websites mit dem eigenen Next.js-CMS aus bthginfo/website-starter. Für jeden neuen Website-, Landingpage-, Portfolio- oder Vereinswebsite-Auftrag dieses Nutzers automatisch verwenden, außer er wählt eine andere technische Basis. Auch für ausdrückliche Erweiterungen und Upgrades dieses Starters verwenden; bestehende Fremdprojekte in ihrem Stack belassen.
---

# Website Starter

Baue eine eigene Website mit dem gepflegten CMS und einer Gestaltung, die erkennbar zum Auftrag passt. Der Generator liefert die Basis. Die fertige Website entsteht durch konkrete Entscheidungen zu Inhalt, Design und Funktionen.

## Bei jedem neuen Auftrag den aktuellen Starter laden

- Autoritative Quelle: privates Repository [bthginfo/website-starter](https://github.com/bthginfo/website-starter), Standardzweig `main`. Klone es mit dem verbundenen GitHub-Konto oder hole in einer verifizierten Kopie `git fetch --no-tags origin main`. Bei lokalen Änderungen einen sauberen Checkout des abgerufenen Commits verwenden. Niemals den Arbeitsbaum des Nutzers zurücksetzen.
- Lies aus dem ausgewählten Commit `START-HERE.md`, `template.manifest.json` (besonders `activation`) und `docs/features.md`. Wenn diese Skill-Datei aus der lokalen Installation kam, lies auch die aktuelle Fassung von `skills/website-starter/SKILL.md` und die passenden Referenzen aus genau diesem Commit. Beginne danach beim Abschnitt „Auftrag und Funktionen“; der Abruf wird pro Auftrag einmal ausgeführt. So folgen neue Funktionen und Arbeitsweisen dem Template, auch wenn die installierte Startdatei älter ist.
- Verifiziere die neutrale Quelle (kein `project/origin.json`). Notiere Commit und Template-Version im erzeugten Projekt. Nutze bei Ausfall nur einen bekannten lokalen Stand und nenne dessen Alter. Bei explizit gewünschtem Stand den angegebenen Commit benutzen.

## Auftrag und Funktionen

Arbeite bei einer Fortsetzung im vorhandenen Projekt. Erzeuge bei einem neuen Auftrag ein eigenes Verzeichnis aus dem neutralen Starter. Erfasse Zielgruppe, wichtigste Handlung, Inhalte, Layoutidee, Sprachen und notwendige Funktionen in `project/brief.json`. Nutze die vorhandenen Quellen, bevor du Daten erfindest oder nachfragst.

- Verwende die aktuellen Kernfunktionen. Cookie-Dialog, eigene Webanalyse mit Statistik-Einwilligung, visuelles CMS, getrennte Standardsprachen, SEO, CMS-App, Tour und anpassbare Symbole stehen bereit.
- Wähle Zusatzmodule nach `activation` im aktuellen Manifest und [Modulauswahl](references/module-selection.md). Klar erforderliche, passende Funktionen aus dem Briefing aktivieren. Bei unklarer Entscheidung mit spürbaren Folgen eine konkrete Frage stellen und unabhängige Arbeit fortsetzen. Commerce, Rechnungsabläufe und Coach Studio brauchen einen ausdrücklichen Auftrag. Vereinsverwaltung ist eigenständig und kann ohne Coach Studio laufen.
- [Gemeinsame CMS- und Modulabläufe](references/admin-modules.md) bei Bestand und neuen Projekten verwenden. Eine vorhandene Funktion soll auf jeder Website denselben Arbeitsablauf haben. Module nach Bedarf aktivieren und kundenspezifische Daten und Verbindungen separat halten.
- Für Gastronomieaufträge [Karte und Tischreservierungen](references/hospitality.md) lesen. Die Karte bezieht alle Einträge aus dem zentralen CMS-Bereich; mehrere Platzierungen mit eigener Darstellung sind möglich. Reservierungen sind ein unabhängiges Modul.
- Passendes Profil (`services`, `portfolio`, `consulting`, `editorial`; `creator` beim Creator-Auftrag) und die aktuellen Funktionsflags wählen:

```sh
node scripts/create-site.mjs --name "Projektname" --out "../projekt" --profile services --brief /pfad/brief.json --git
```

Danach im erzeugten Projekt arbeiten. Bei einer Template-Verbesserung die neutrale Quelle separat bearbeiten. Kundenbezogene Inhalte und Dienste bleiben im Projekt.

## Gestaltung und Redaktion

Gestalte den Auftakt mit echtem Projektmaterial. Ein freigegebenes Foto lässt sich über `hero.image.file`, `alt` und `position` direkt mit dem Briefing übernehmen. Wähle im ersten Arbeitsbeispiel bewusst einen anderen Maßstab als im Einstieg. Stimme die lokal bereitgestellte Überschriftenschrift, den Ausschnitt und die Aktion auf die Marke ab. Prüfe bei Formularen den laufenden Versand, eine bestätigte Nachricht sowie einen erneuten Versuch mit erhaltenen Eingaben.

Vor dem ersten Entwurf [Design und Inhalte](references/design-and-content.md) lesen und den dort beschriebenen Designstandard anwenden. Orientiere dich an Kantiqs Klarheit, der typografischen und visuellen Eigenständigkeit von Creators und den bildgeführten Mario-Bewerbungsseiten. Leite aus dem Projekt eine eigene Typografie, Bildidee, Farbwelt und Bedienung ab. Trage die Richtung in `project/brief.json` unter `style` ein. Nutze bei bereits freigegebenem Auftakttext `hero.heading` und `hero.text`. Arbeite den Einstieg, den ersten Beleg und mindestens eine Unterseite bis zur visuellen Abnahme im Browser aus. Jede neu gestaltete Section bleibt im CMS inhaltlich und visuell bearbeitbar. Englisch ist die anfängliche Vorgabe für CMS und Website, separat änderbar.

Für eine ausdrücklich gewünschte iOS-artige Glasästhetik mit räumlicher Tiefe steht [Liquid Glass](references/liquid-glass.md) als eigene Option bereit: `--aesthetic liquid-glass` oder `aesthetic` im Briefing. Der Stil ergänzt Panorama für die vier Standardprofile; die übrigen Ausgangslayouts bleiben erhalten. Eigene Bildidee und Farben aus dem Auftrag ableiten. Planeten und 3D sind zusätzliche, projektbezogene Entscheidungen.

Sanfte Einstiege und Interaktionsfeedback gehören bei neuen Seiten zum Standard. Nutze die integrierte Einstellung „Sanft einblenden“ für ausgewählte Texte, Karten und Bildgruppen. Gestalte Tempo und Reihenfolge passend zur Seite. Prüfe einmaliges Einblenden, Hover, Touch, Tastatur und reduzierte Bewegung nach [Design und Inhalte](references/design-and-content.md).

[Texte, SEO und KI-Suchen](references/search-and-copy.md) bei jeder Website anwenden. Öffentliche Texte in der Stimme des Unternehmens oder der Person schreiben, mit konkretem Angebot, belegbaren Details und klarer Handlung. Regieanweisungen, interne Hinweise und KI-Floskeln bleiben aus dem veröffentlichten Text. Jede wichtige URL erhält eigene Inhalte und Metadaten. Prüfe Auffindbarkeit und Performance an der tatsächlichen Domain.

Aktiviere `scroll-3d` ausschließlich bei einer ausdrücklich gewünschten interaktiven 3D-Scroll-Section. Die Seite erhält den Baustein dort, wo der Auftrag ihn vorsieht. Lies [3D-Scroll-Stories](references/3d-scroll-stories.md) für Dramaturgie, einzeln bewegliche Assets, Kollisionsprüfung, eingebettete Scroll-Vorschau und filmgerechte Exporte.

Lies [Visueller Editor und responsive Vorschau](references/visual-editor.md) für neue oder geänderte Bausteine. Prüfe jede gestaltete Section in der Vorschau: Text, Bild, Icon, Buttonbeschriftung und Linkziel sollen ihre eigenen Feldadressen haben. Die Bibliothek ist thematisch gegliedert und durchsuchbar. Stelle Schriften lokal bereit und unterstütze Gestaltung und Rücksetzen auf Abschnitts- und Eintragsebene. Verwende für wiederkehrende Inhalte den gemeinsamen Eintragseditor mit Hinzufügen, Sortieren, Duplizieren und Entfernen. Prüfe das Layout mit unterschiedlichen Anzahlen und die Links nach dem Umbenennen einer Seite oder Sprungmarke.

## Abnahme und Veröffentlichung

[Start und Wartung](references/launch-and-maintenance.md) für Infrastruktur, Prüfungen und Upgrades verwenden. Für jede neue Website ein eigenes privates GitHub-Repository anlegen und den Projektstand dorthin pushen. Ein neues Vercel-Projekt mit diesem Repository verbinden und ein eigenes Neon-Projekt im Free-Tarif mit eigener Datenbank sowie einen eigenen Blob-Store bereitstellen. Den angekommenen GitHub-Commit und die Git-Verbindung in Vercel prüfen. Vor Produktion CMS-Speichern und Veröffentlichung, Desktop- und Mobilablauf, Sprachwechsel und die ausgewählten Module prüfen. Live-Adresse und tatsächlich verifizierte Funktionen nennen. Fehlende Anbieterfreigaben oder Geräteprüfungen klar benennen.
