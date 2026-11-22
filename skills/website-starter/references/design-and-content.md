# Individuelles Design und redaktioneller Aufbau

## Visuelle Idee

Leite aus Zielgruppe, Inhalt und gewünschter Handlung eine projektspezifische Richtung ab. Halte unter `style` fest, welches Motiv den Einstieg trägt, welche Typografie und Farbrollen die Marke wiedererkennbar machen und wie die Seite auf einem schmalen Gerät beginnt. Plane für jede zentrale Route eine eigene Komposition. Die Profile liefern Einstiege, Bildformate und Rhythmus für unterschiedliche Aufgaben.

- Der Einstieg zeigt das konkrete Angebot, eine zur Marke passende Hauptaktion und ein starkes Motiv. Verwende großzügige, sauber umbrechende Überschriften, kurze gut lesbare Textzeilen und eine klare Rangfolge für Links und Buttons. Im nächsten sichtbaren Abschnitt folgt ein überprüfbarer Beleg wie eine Arbeit, eine echte Produktansicht oder ein nachvollziehbarer Ablauf.
- Entwickle den Abschnittsrhythmus aus dem Inhalt. Eine große Bildbühne kann auf eine kompakte Liste treffen, ein ruhiger Text auf eine bedienbare Detailansicht. Verwende Raster und Karten für Inhalte, die verglichen oder wiederholt bedient werden. Unterseiten führen das visuelle System mit einer eigenen Dramaturgie weiter.
- Der iOS- und SaaS-Einfluss zeigt sich in der Bedienung. Nutze konsistente Abstände und Radien, eindeutig gewählte Zustände, ruhige Ebenen, kontextuelle Optionen und verlässliche Zurücknavigation. Eingaben, Fortschritt, leere Ergebnisse und Fehler brauchen dieselbe Sorgfalt wie die Startseite. Buttons, Felder und mobile Menüs mit Tastatur, Touch und sichtbarem Fokus prüfen.
- Gib jeder Seite einen charakteristischen visuellen Moment, zum Beispiel einen Wechsel von Übersicht zu Detail, einen Bildvergleich oder eine gut getimte Typografie. Dosierte Bewegung zeigt, was sich ändert. Lade intensive Medien gezielt, pausier sie außerhalb des Sichtbereichs und gib bewegten Inhalten eine vollständig lesbare reduzierte Fassung. [Interaktive 3D-Scroll-Stories](3d-scroll-stories.md) bleiben eine ausdrücklich gewünschte Option.

## Bewegung und Interaktion

Lege zuerst fest, was Besucher bei einer Aktion erkennen sollen. Beim Kontaktformular hebt das Papierflugzeug beim Senden ab. Der Haken erscheint nach der Serverbestätigung. Ein fehlgeschlagener Versuch lässt die Eingaben stehen und ermöglicht einen erneuten Versand. Für eine Galerie passt ein Wechsel des Motivs, für einen Akkordeon-Eintrag die Drehung seines Öffnen-Symbols. Nutze bei reduzierter Bewegung stabile Icons und denselben verständlichen Statustext.

- Wähle die Bewegung aus der Komposition. Eine Textgruppe darf kurz von unten eintreten, ein Kartenraster erscheint in kleinen Versätzen und eine Galerie zeigt beim Wechsel, welches Bild neu ist. Eine erkennbare Reihenfolge pro Abschnitt genügt. Variiere den Rhythmus zwischen ruhigen und aktiveren Abschnitten.
- Der Starter aktiviert „Sanft einblenden“ für passende Inhaltsabschnitte. Im CMS lässt sich die Bewegung je Abschnitt anpassen oder ausschalten. Auf Wunsch kann die Gestaltung in Sonderkomponenten eigene Übergänge haben. Verwende deren Timelines für bereits animierte Bereiche.
- Halte Einstiege ungefähr bei 8–16 px Weg und 460–520 ms Dauer. Auf kleinen Geräten fällt der Weg kürzer aus. Gestaffelte Karten bleiben zügig zusammen sichtbar. Für normale Einstiege genügen Deckkraft und Verschiebung. Inhalte im ersten Bildschirm, beim schnellen Scrollen und ohne JavaScript bleiben lesbar.
- Zeige an bedienbaren Karten, Buttons, Menüs und Tabs, was ausgewählt oder gerade ausgelöst wurde. Hover ist eine Ergänzung für präzise Zeiger. Auf Touch und per Tastatur sind Zustände und Aktionen ebenso klar erkennbar. Halte den Fokus sichtbar und das Ziel stabil.
- Prüfe am Desktop und auf einem schmalen Touch-Viewport den normalen und schnellen Scroll, das Öffnen interaktiver Details und den Sprung zu einem Abschnitt. Bei „Bewegung reduzieren“ werden Inhalte direkt sichtbar. Scrolle zurück und prüfe, dass Einblendungen einmalig sind und die CMS-Vorschau sofort bearbeitbar bleibt.

## Referenzen aus dem Starter

Lies `DESIGN.md`, `docs/features.md`, `src/lib/section-library.ts` und bei Bewegung `docs/recipes/cinematic-hero.md`. Der Starter enthält eigenständige Profile, Bildbühnen, Fotoerzählungen, Projektgalerien, filterbare Projektübersichten, Scroll-Szenen und Workflow-Demos. Nutze sie, wenn sie dem Inhalt helfen. Prüfe im aktuellen Manifest, welche Section-Typen hinzugekommen sind.

Diese drei Projekte geben den Qualitätsmaßstab für passende neue Aufträge vor. Nutze sie für Komposition, Hierarchie und Interaktion. Leite Schriften, Bilder, Texte, Farben und Markenmerkmale aus dem neuen Projekt ab.

- **Kantiq:** Ruhige Flächen, ein großzügiger zweigeteilter Auftakt und starke Einzelmotive. Nach dem Auftakt kommt ein konkreter Beleg in einer gut lesbaren Website-Vorschau. Für Dienstleistung und B2B das Angebot genauso schnell greifbar machen. [Kantiq](https://kantiq.de/)
- **Creators:** Große kondensierte Typografie, klarer Akzent, starke Hell-Dunkel-Wechsel und ein Produkt im tatsächlichen Nutzungskontext. Bei vergleichbaren Zielgruppen Mut zu charakteristischen Größen, Farben und interaktiven Beispielen. [Creators](https://creators.kantiq.de/)
- **Mario:** In Lichtfang, Kontaktbogen und Schnittplatz führen jeweils eine andere Bildbühne und eine klare persönliche Stimme zu Arbeitsproben und Details. Gerundete Bühnen und kompakte Bedienelemente wirken präzise, weil sie von einer konsistenten Typografie und konkreten Inhalten getragen werden. [Mario Schubert](https://mario-schubert-confil.vercel.app/)

## Seiten und Inhalte

[Texte, SEO und KI-Suchen](search-and-copy.md) verbindlich anwenden: Jede Seite aus Sicht ihres Anbieters schreiben und interne Regie aus der öffentlichen Fassung entfernen.

Jede Route beantwortet eine andere Frage. Die Startseite fasst zusammen und verweist weiter; die Unterseite liefert Tiefe. Nutze passende Inhalte: im Verein Teamprofile, Spielrhythmus, Einsteigerinfos, Ort und Ansprechpartner; im Portfolio Arbeiten mit Ausgangslage, Beispiel und Ergebnis; im Dienstleistungsauftritt Ablauf, Umfang, Belege und klare Kontaktentscheidung. Vermeide wiederholte Aussagen auf mehreren Seiten. Angeforderte Dummydaten konkret und konsistent gestalten und als Beispiele erkennbar halten.

Bilder an Ausschnitt, Licht und Aufgabe ausrichten. Hohe Auflösung für große Motive, responsive Dateien und ein brauchbares Standbild für Video oder 3D. Eigene oder lizenzierte Medien verwenden. KI-generierte Bilder nicht als dokumentarische Aufnahme ausgeben.

Ein vorbereitetes Titelbild kann beim Erzeugen bereits Teil der Bildbühne sein. Lege das optimierte Bild neben die Briefing-Datei oder in einen Unterordner und gib den relativen Pfad unter `hero.image.file` an. JPEG, WebP und PNG sind möglich. `alt` beschreibt das Motiv. Mit `position` wählst du aus den neun Fokuspositionen des Bildeditors. Ohne eigenes Bild liefert der Generator weiterhin das gekennzeichnete Profilmotiv für den Entwurf.

```json
{
  "hero": {
    "heading": "Umbau am Innenhof",
    "image": {
      "file": "bilder/innenhof.webp",
      "alt": "Blick durch die geöffnete Holztür in den begrünten Innenhof",
      "position": "50% 100%"
    }
  }
}
```

Stimme die Schrift des Einstiegs auf das eigentliche Material ab. Der Starter setzt bei Dienstleistungen auf Archivo, bei Portfolios auf Space Grotesk, bei Beratung auf Fraunces und im Magazin auf Cormorant Garamond. Du kannst die Schrift pro Abschnitt im CMS wechseln. Vergleiche bei der Abnahme die Aufnahme des Einstiegs mit dem ersten Arbeitsbeispiel. Sind Ausschnitt, Maßstab oder Aufbau fast gleich, variiere die Komposition dort, wo es den Inhalt besser verständlich macht. Prüfe am Smartphone, ob ein langes Wort und ein anderer Bildfokus funktionieren und ob sich die Hauptaktion direkt bedienen lässt.

## CMS und Abnahme

Sichtbare Texte, Medien, Alt-Texte, Fokusbereiche, Links, Sichtbarkeit, Reihenfolge und Abschnittsfarben editierbar halten. Neue Typen in Schema, Registry, Inspector, Renderer und Mehrsprachigkeit durchgängig ergänzen. Vorschau und Produktion verwenden dieselbe Logik. Bei einer öffentlichen Live-Datenquelle die redaktionellen Felder und die Backend-Daten im Inspector klar erklären.

DE/EN-Routen, Navigation, Footer, Consent, Buttons, Formulare und Fehlermeldungen prüfen. Website- und CMS-Standards bleiben getrennt. Redaktionsinhalte brauchen ihre eigenen gepflegten Übersetzungen.

Prüfe im Browser die Startseite mit dem ersten Beleg, eine repräsentative Unterseite und die wichtigste Aktion. Vergleiche Desktop, Tablet und etwa 390 px breite Smartphone-Ansicht. Kontrolliere Bildbeschnitt, Überschriftenumbrüche, Kontrast, Fokus, Scrollverhalten und den ersten mobilen Bildschirm mit eingeblendeter Einwilligung. Bediene Formulare, Navigation und Tabs mit Tastatur und Touch. Wiederhole die entscheidende Interaktion mit reduzierter Bewegung und bei langsamer Verbindung. Verwende im finalen Review tatsächliche Projekttexte und passende, scharf ausgelieferte Medien. Liefere bei einer Designabnahme Ansichten der geprüften Größen und benenne noch offene Inhalte oder Medien.
