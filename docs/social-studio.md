# Optionales Social-Studio

Das Social-Studio ist ein privater Gestaltungsbereich im CMS für Beiträge, Bildfolgen und kurze Reels. Es ist für alle fünf Website-Profile verfügbar und standardmäßig ausgeschaltet. Das Creator-Profil, öffentliche Social-Feeds und der Shop sind unabhängig davon.

## Aktivieren

Bei einem neuen Projekt kann das Modul zusätzlich zum gewünschten Profil angefordert werden:

```sh
node scripts/create-site.mjs --name "Eigenes Studio" --out "../eigenes-studio" --profile services --features social-studio
```

`--social-studio` ist ein Alias. Alternativ das strukturierte Briefing verwenden:

```json
{
  "projectName": "Eigenes Studio",
  "modules": {
    "socialStudio": { "enabled": true }
  }
}
```

Die Briefing-Kurzform `"socialStudio": true` wird ebenfalls normalisiert. Fehlende Angaben bedeuten aus; `enabled: false` bleibt erhalten. Ein ausdrücklich gesetztes positives CLI-Flag überschreibt den Briefing-Wert. Andere Funktionsnamen oder zusätzliche private Felder im Aktivierungsobjekt werden abgelehnt.

In einer bestehenden Website unter **Einstellungen → Allgemein → Social-Studio aktivieren** einschalten und **Entwurf speichern** wählen. Erst der gespeicherte Website-Entwurf gibt Menü und API frei. Eine Veröffentlichung der Website ist dafür nicht erforderlich. Nach dem Abschalten bleiben die gespeicherten Studio-Entwürfe erhalten, sind aber erst nach erneutem Einschalten erreichbar.

Das Menü öffnet den Editor in der bestehenden Verwaltung. `/admin/social` ist der direkte Einstieg. Ohne Sitzung führt er zur Anmeldung, bei ausgeschaltetem Modul zu einer nicht verfügbaren Seite. Editor, Studio-Schriften und Exportwerkzeuge werden erst beim tatsächlichen Öffnen geladen.

## Entwürfe und Medien

**Meine Designs** öffnet die gespeicherten Projekte. **Neues Design** bietet einen leeren Post, ein Carousel, ein Reel oder den Einstieg über eine Vorlage. Ein Entwurf erscheint nach dem ersten Speichern in der eigenen Sammlung.

Unter **Medien** können MP4-Dateien (H.264) und WebM-Dateien (VP8/VP9) bis 60 MB und 90 Sekunden hochgeladen werden. Je Slide lassen sich zwei Videolayer einsetzen. Der Startpunkt und Bildausschnitt werden im Ebeneneditor eingestellt. Studio-Exporte enthalten die Videobilder ohne Ton.

Im öffentlichen `config.modules.socialStudio` steht ausschließlich `{ "enabled": true }`. Projekte, Captions, Markenvorgaben und hochgeladene Assets liegen getrennt in privaten `ws_records`-Sammlungen (`social-projects`, `social-brand`, `social-assets`). Dazu ist kein neues Datenbankschema nötig. Speichern verwendet Revisionen und Idempotenzschlüssel; ein konkurrierender Stand darf nicht stillschweigend überschrieben werden.

Die erste Markenvorgabe übernimmt den Namen und die Farben der eigenen Website. Logo, Schriftwahl und weitere Vorgaben bleiben im privaten Studio. Neue Projekte erhalten eine eigene Markenkopie, damit eine spätere Änderung der Grundvorgabe bestehende Designs nicht unerwartet verändert. Der neutrale Starter enthält allgemeine Layouts und Formen; Kundenlogos, Bilder und Texte werden nicht übernommen.

Eigene Rasterbilder lassen sich im Studio hochladen. Vorhandene CMS-Bilder bleiben über die authentifizierte Medienauswahl nutzbar. Projekte referenzieren geschützte Asset-Routen; hochgeladene Studio-Bilder erhalten keine öffentliche Blob-Adresse im Website-Inhalt. Medien, die in gespeicherten Projekten, im Entwurf, im veröffentlichten Stand oder in aufbewahrten Website-Versionen vorkommen, können nicht versehentlich gelöscht werden.

Lokal liegen Studio-Uploads unter `.data/social-assets`. Im Betrieb einen **eigenen privaten Vercel-Blob-Store dieser Website** einrichten und dessen Token ausschließlich als `PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN` setzen. Nicht den öffentlichen `BLOB_READ_WRITE_TOKEN` und keinen Store einer anderen Website wiederverwenden. Ohne diese Einrichtung meldet der Produktionsupload den fehlenden Speicher, statt einen erfolgreichen Upload vorzutäuschen. Eigene Produktionsressourcen und deren Zuordnung nach [Einrichtung](setup.md) dokumentieren.

## Gestalten und exportieren

Die Zeichenfläche bietet Postformate, Texte, eigene Bilder und Logos, Formen und allgemeine Artworks. Ebenen lassen sich auswählen, anordnen und bearbeiten. Mehrere Slides können mit Dauer, Animation und Übergang zu kurzen Reels zusammengesetzt werden. Captions und Tags gehören zum gespeicherten Entwurf. Ungespeicherte Änderungen werden vor dem Verlassen der Verwaltung beziehungsweise des Studio-Bereichs abgefragt.

Unter **Medien** nach Dateinamen suchen und nach Bildern oder Videos filtern. Bei einer ausgewählten, nicht gesperrten Medienebene **Medien ersetzen** wählen. Position, Rahmen, Gestaltung und Bewegung bleiben erhalten. Der Startpunkt eines ersetzten Videos beginnt wieder bei null. Der Vorgang ist rückgängig machbar.

**Formatkopie** öffnet ein eigenes Design mit neuen IDs und denselben Inhalten. Die Kopie übernimmt Caption, Slides und Gruppierung. Objekte werden gleichmäßig skaliert, randfüllende Hintergründe bleiben randfüllend. Vor dem Speichern Bildausschnitt, Text und sichtbare Ränder prüfen. Das Original und vorhandene Planer-Einträge ändern sich dadurch nicht. Überlange Reels können nicht als Reel-Variante angelegt werden.

Bildexporte liefern PNG, auf Wunsch mit transparentem Hintergrund, oder JPEG. Mehrere Slides und gespeicherte Serien werden als ZIP mit Caption und bearbeitbarer Projektdatei ausgegeben. Einzelne Projekte lassen sich als JSON exportieren und wieder importieren; ihre hochgeladenen Bilder bleiben an diese Website gebunden.

Videoexporte rendern die animierten Slides mit 30 Bildern pro Sekunde und ohne Ton. Ist H.264 im Browser verfügbar, entsteht eine MP4-Datei; andernfalls wird nach Möglichkeit eine echte WebM-Datei ausgegeben. Fehlt auch dieser Encoder, meldet die Oberfläche das Problem und die Bild- und Projekt-Exporte bleiben nutzbar. ZIP-Werkzeug und Videoencoder laden erst beim entsprechenden Export.

Ab 1.9.2 können Bildebenen einen langen Website-Screenshot innerhalb eines festen Geräte- oder Bildrahmens durchfahren. Unter **Bewegung → Animation** stehen Bildschwenks nach oben, unten, links und rechts bereit. Die Auswahl setzt „Fläche füllen“; Start und Dauer bleiben einstellbar. Die Vorschau als Standbild zeigt den Startausschnitt, der Videoexport die Bewegung. Für einen sichtbaren Schwenk muss der Screenshot entlang dieser Achse größer als der Rahmen sein. Texte und Formen behalten ihre bisherigen Animationen. Echte Bildschirmaufnahmen und lokale Demo-Abläufe klar von Simulationen und tatsächlich verbundenen Anbieterfunktionen unterscheiden.

Das Studio selbst verbindet keine Plattformkonten. Der getrennte optionale [Post-Planer](social-publishing.md) kann gespeicherte Designs übernehmen und nach eigener Instagram-Einrichtung ausdrücklich freigegeben veröffentlichen. Ohne dieses zusätzliche Modul bleiben Exporte zum Herunterladen verfügbar. Für öffentliche Feed-Anbindungen gelten die gesonderten [Plattformquellen](creator-modules.md#plattformquellen).

## Technische Grenzen und Prüfung

Alle Studio-APIs prüfen die Adminsitzung und den gespeicherten Modulschalter. Schreibzugriffe prüfen zusätzlich Ursprung, Eingabeschema und Revision. Medienzugriff erfolgt über `/api/admin/social/assets/:id` beziehungsweise `/api/admin/social/media/:id`. Es gibt keine Abfrage pro Tastendruck und kein Hintergrund-Polling; der lokale Arbeitsstand wird ausdrücklich gespeichert.

Generatorprüfungen decken die fünf Profile, ausgeschaltete Vorgaben, explizites Opt-in, erhaltenes `false`, CLI-Aliase und abgelehnte private Konfigurationsfelder ab. Server-, Renderer- und Exportprüfungen ergänzen dies. Vor dem Einsatz im Kundenprojekt zusätzlich im echten CMS testen: eigenes Logo und Rasterbild, Speichern und erneutes Öffnen, konkurrierende Revision, Navigation mit ungespeicherten Änderungen, Bildexport, Reel-Export im Zielbrowser sowie Mobil- und Tabletansicht. Lokale Prüfungen ersetzen keinen Uploadtest gegen den eigenen privaten Produktionsspeicher.

Die direkte Seitenbearbeitung und die mobile beziehungsweise Vollbild-Vorschau der Creator-Demo sind bereits Teil des gemeinsamen Website-Editors. Erneutes Kopieren dieser Dateien würde keine zusätzliche Funktion bringen. Die projektspezifische Kantiq-Verbindung zwischen mehreren Websites gehört nicht in diesen neutralen Starter.

## Bildschirmaufnahmen für Produktbeispiele

- Desktop und Smartphone in eigenen, tatsächlichen Browsergrößen aufnehmen. Vor dem Einsetzen Pixelmaße und Seitenverhältnis prüfen; das innere Display des Mockups hat dasselbe Verhältnis. Mit „Einpassen“ einbetten, ohne Strecken oder seitlichen Beschnitt.
- Bedienabläufe als echte Aufzeichnung mit Klicks, Texteingaben und natürlichem vertikalem Scrollen zeigen. Ein bewegter Screenshot ist kein Nachweis einer Bedienung. Den Geräte- und Kameraausschnitt während des Ablaufs fest lassen.
- Bei direkter Textbearbeitung die Auswahl und den gespeicherten Text prüfen, danach die veröffentlichte lokale Demo erneut öffnen. Auch die tatsächlichen MP4-Einzelbilder, mobile Darstellung, Lesbarkeit und Abstände zwischen Gerät, Caption und Logo kontrollieren.
- Fertige Bildschirmvideos im Post-Planer als eigenen Upload hinterlegen. Alternativ die Aufnahme als Videolayer im Studio einsetzen und dort mit Text, Formen und Übergängen gestalten. Medienhash, Quelle und manuelle beziehungsweise bestätigte API-Veröffentlichung getrennt nachweisen.
- H.264-Dateien vor dem Upload gegen den Medienvertrag prüfen: 9:16, 23–60 Bilder/Sekunde, 3–90 Sekunden, maximal 4 MB, vorangestellte MP4-Metadaten und keine Edit-Listen. Bei FFmpeg-Ausgaben die Containerstruktur ausdrücklich prüfen; die Endung allein reicht nicht.
