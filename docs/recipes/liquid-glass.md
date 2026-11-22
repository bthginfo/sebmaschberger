# Liquid Glass · iOS

Eine ausdrückliche Gestaltungsoption für `services`, `portfolio`, `consulting` und `editorial`. Sie ergänzt Panorama mit dunklem Blau, transparenten Flächen, Lichtkanten, räumlichen Schatten, sanften Einstiegen und Interaktionsfeedback. Die fünf bisherigen Profile und ihr Standardverhalten bleiben erhalten. Das Creator-Profil nutzt seine eigene Gestaltung.

## Auswahl und Einrichtung

```sh
node scripts/create-site.mjs --name "Eigenes Studio" --out "../eigenes-studio" --profile consulting --aesthetic liquid-glass --git
```

Alternativ enthält das Briefing `"aesthetic": "liquid-glass"`. `style` beschreibt weiterhin die eigene Bildidee, Typografie und Komposition. Ohne diese Auswahl erzeugt der Generator die bisherigen Ausgangslayouts. Neue Kundenprojekte behalten ihre eigenen Inhalte, Bilder, Konten, Passwörter und Cloud-Ressourcen.

Unter **Einstellungen → Gestaltung → Look & räumliche Tiefe** ist der Stil auch im CMS wählbar. Die Auswahl setzt Panorama und eine dunkle Palette im lokalen Entwurf. Vorhandene Seiten und Inhalte bleiben bestehen. **Entwurf speichern** sichert die Auswahl; **Seiten bearbeiten → Veröffentlichen** gibt sie frei. Beim Wechsel zu einem anderen Ausgangsentwurf wird der Glas-Look ausgeschaltet. Die gewählte Palette bleibt separat bearbeitbar und lässt sich mit den vorhandenen Farbwerkzeugen zurücksetzen.

## Gestaltung und Bewegung

- Inhalt liegt vor einem festen dekorativen Hintergrund. Lichtnebel bewegen sich sehr langsam; Sterne sind eine alternative Hintergrundwahl. Der Vordergrund scrollt nativ.
- Rahmen, Schatten und transparente Flächen erzeugen die Tiefe. Überschriften bleiben klar, Kontraste ausreichend und primäre Aktionen erkennbar.
- Stärke, Tempo, Scrolltiefe, Einblenddauer und Interaktionsfeedback sind im CMS bearbeitbar. Jeder Abschnitt behält seine eigene Einblend-Einstellung. Explizite Abschnitts- und Eintragsfarben haben Vorrang.
- Im Editor steht die Bewegung still. „Bewegung reduzieren“ stoppt Dekoration und Einblendanimationen. Die Website bietet eine Textoption zum Pausieren im Fußbereich.
- Touch-Feedback braucht keine Maus. Die wichtigsten Übergänge auch auf einem Smartphone prüfen; Hover allein ist kein Funktionsnachweis.

Planeten, Weltraummotive und 3D gehören zum jeweiligen Auftrag. Die neutrale Option enthält keine fest eingebauten Kundenmotive und lädt kein 3D-Modell. Für ausdrücklich gewünschte 3D-Szenen zusätzlich [3D-Scroll-Stories](3d-scroll-story.md) verwenden: automatisch starten, wenn das Motiv sichtbar ist, Poster bis zur Bereitschaft zeigen und native vertikale Gesten erhalten. Falls der Auftrag einen Wechsel per Wischen vorsieht, diesen direkt am Motiv auslösen. Eine zusätzliche Start-Schaltfläche oder eine platzraubende Navigationsleiste nur bei passender, ausdrücklich gewählter Bedienidee einsetzen.

## Umsetzung und Prüfung

Die gemeinsame Konfiguration liegt in `src/lib/liquid-glass.mjs`; Typ und striktes Schema ergänzen `types.ts` und `validation.ts`. `LiquidGlassEditor` schreibt ausschließlich den Entwurf. `SiteView` setzt das Opt-in-Attribut; `LiquidGlassLayer` wird nur für den gewählten Stil geladen. Die Hintergrundebene nutzt Sticky innerhalb des Container-Query-Rahmens, damit sie auch in der CMS-Vorschau korrekt hinter dem Inhalt bleibt. Alle Gestaltungsregeln in `src/styles/liquid-glass.css` sind darauf begrenzt. Die Abschnittsrenderer werden in CMS und öffentlicher Website gemeinsam verwendet.

Prüfen: Typecheck, Tests und Production-Build; Standardseite ohne Glas-Attribut; Generator mit und ohne Stil; CMS-Auswahl, Speichern, Neuladen, getrennte Veröffentlichung; eigene Abschnittsfarben; Desktop, Smartphone, Tastatur, Pause, reduzierte Bewegung und tatsächliche Hintergrundtiefe. Die sichtbaren Inhalte und die wichtigsten Aktionen bleiben vollständig im CMS bearbeitbar.
