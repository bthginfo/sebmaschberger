# Scrollgesteuerte Produktszenen und Aufnahmen für Social Media

Diese Anleitung ist der Standard für einen Hero, in dem sich ein Objekt beim Scrollen im Raum verändert. Zum Auftrag gehören zwei getrennte Ausgaben: die bedienbare Website und, falls gewünscht, eine Aufnahme der echten Website im Geräte-Mockup.

Wenn der Auftrag ein freistehendes, räumlich veränderliches Motiv meint, baue eine 3D-Szene. Ein gefilmter Ablauf erfüllt diesen Auftrag auch dann nicht, wenn seine Abspielposition an das Scrollen gekoppelt ist. Die Referenz ist eine einzelne Form, die sich sichtbar öffnet, weiterbewegt oder umgebaut wird. Der Raum, die Oberflächen und die Verdeckungen bleiben über den Übergang konsistent. Zwischenzustände müssen sich beim Zurückscrollen genauso erschließen.

Einsetzbares Beispiel: Röstzeit zeigt zwei modellierte Bohnenhälften mit getrennten Bruchflächen, instanziertes Mahlgut, den Siebträger und einen Espressofluss, der die Crema berührt. Bei Geräten denselben Körper für Vorderseite, Kante und Rückseite nutzen; ein aufgeklapptes Display, Glas und Rahmen müssen zusammen an der modellierten Achse hängen. HTML-Texte bleiben in ihren Lesebereichen, blenden vor dem Seitenwechsel aus und überlagern das Motiv nicht. In der Mitte ist für den entscheidenden Moment Platz ohne Text.

## 1. Einen Übergang entwerfen, bevor die ganze Szene entsteht

Beginne mit einer Sache, die man sehen kann. Beispiel Rösterei: Ganze Bohnen fallen in die Mühle, eine Hand hält den Siebträger, Espresso trifft die Tasse. Wähle eine kurze, klare Handlung und liste pro Abschnitt Motiv, Kontaktpunkt, Kamerabewegung, Textzone und benötigtes Material. Prüfe Rohaufnahmen in Originalgröße. Baue erst den schwierigsten Übergang als Bewegungsprobe, danach die vollständige Szene. Die Probe muss auf Desktop und Handy tragen, bevor weitere Einstellungen produziert werden.

| Scrollfortschritt | Bild | HTML-Inhalt |
| --- | --- | --- |
| 0–27 % | Bohnen fallen in die Mühle; die Bewegung läuft sichtbar über mehrere Frames. | Navigation auf der Bühne; Titel im ruhigen Teil der Aufnahme. |
| 27–58 % | Schnitt in dieselbe Bewegungsrichtung: Siebträger und Hand füllen den Ausschnitt. | Ersten Text vor dem Schnitt ausblenden; zweite Zeile nach der Bewegung einblenden. |
| 58–86 % | Kaffee läuft aus der Maschine und trifft die Tasse. Die Kamera hält den Kontaktpunkt. | Text bleibt außerhalb von Strahl und Tasse. |
| 86–100 % | Kurzer Blick auf den fertigen Espresso. | Schlusszeile bleibt lesbar; erst danach beginnt der nächste Abschnitt. |

Die Prozentwerte sind ein Ausgangspunkt für die Vorschau. Halte den tatsächlichen Zeitpunkt des Kontakts und die Lesedauer fest. Kleine Bewegungen können im Stillstand weiterlaufen, ohne den Scrollfortschritt zu verändern. Auf einem schmalen Gerät das Motiv über den Text setzen, statt den breiten Ausschnitt in den Rand zu drücken. Die Navigation, Links und Überschriften bleiben HTML und die dafür vorgesehenen Texte bleiben im CMS bearbeitbar.

## 2. Einen zusammenhängenden Master herstellen

- Für reale Motive zuerst echte Aufnahmen wählen. Nur für Verwandlungen, die ausdrücklich gerendert werden sollen, eine durchgehende Szene in Blender mit eigenem Modell oder lizenziertem Scan, fotografischen Materialreferenzen, Kamerapfad und konsistentem Licht bauen. Glanz und Rauheit separat ausarbeiten. Quelle, Lizenz und Aufnahmeeinstellungen bzw. Renderparameter dokumentieren.
- Bewegungen auf sichtbare Kontaktpunkte beziehen: Der Bruch beginnt an der Naht, die Teilchen folgen demselben Fallweg und der Strahl endet auf der Flüssigkeitsoberfläche. Wenn ein Gegenstand vor dem anderen liegt, entscheidet seine tatsächliche Tiefe über die Verdeckung. Eine freigestellte, gefilmte Bewegung kann ebenfalls ein guter Master sein, etwa für Stoff. Die Alphamaske folgt dabei der wirklichen Kontur.
- Für Displayfahrten die nächste Ansicht im richtigen Verhältnis auf die Displayfläche legen. An der Durchfahrt müssen Bildachsen, Helligkeit und Blickrichtung an beiden Seiten zusammenpassen. Teste den Anschluss über mehrere aufeinanderfolgende Frames.
- Wenn echte Geräte gewünscht sind, plane mit einer eigenen oder lizenzierten Aufnahme eines physischen Geräts. Für eine Drehung braucht es Vorderseite, Kante und Rückseite in demselben durchgehenden Take; für ein aufklappendes Notebook müssen Deckel, Scharnier und Basis zusammen aufgenommen sein. Wenn das Material nur einen Teil der Drehung zeigt, die Choreografie an diesen Bewegungsweg anpassen. Verwende keine zusammengesetzten Fotoausschnitte als künstliches Scharnier oder Seitenprofil.
- Fotografische Vorlage: Ein iPhone zeigt Start, Live und Shop, während das gefilmte Gerät im Bild seine Perspektive ändert. Ein zweiter Take zeigt das MacBook beim Öffnen, dann führt die Kamera durch sein Display. Pro Einstellung die vier inneren Ecken des Glases verfolgen und die echte Browseransicht in dessen Seitenverhältnis einpassen. Verdeckungen durch Hand, Kameraaussparung oder Rahmen vor das Bild legen, Kontakt und Reflexionen erhalten. Den Schlüsselübergang bei 100 % prüfen: kein grüner Rand, keine verzogene Typografie, keine Versätze im Scharnier. Für das letzte Textkapitel eigenen Platz reservieren und beim Eintritt in das Display ausblenden.
- Bei einer geteilten Frucht oder einem zerlegten Produkt den Abstand nicht nur im Modell, sondern auch im projizierten Kamerabild prüfen. Die Schnittflächen sollen nach dem Öffnen einen erkennbaren Abstand behalten. Streuteile erst danach prüfen; sie dürfen die Naht nicht verdecken.
- Den Master in hoher Auflösung als nummerierte PNG-Folge mit geraden Alphawerten ausgeben. 30 fps sind ein Startwert, 48 fps kommen für schnelle Makrobewegung infrage. Bewegungsunschärfe beim Render einstellen, danach PNGs gegen einen hellen und einen dunklen Hintergrund prüfen. Die Master gehören ins Produktionsverzeichnis und nicht in `public/`.

## 3. Im Browser genau den sichtbaren Frame platzieren

Für frei bewegliche Motive die Alphagrenzen jedes Frames messen. Eine transparente, quadratische Renderdatei kann links noch viel Luft haben, während die geöffnete Form plötzlich deutlich breiter wird. Miss deshalb den rechteckigen Bereich der sichtbaren Pixel, inklusive weicher Schatten oder Streuteilchen, wenn sie zur Handlung gehören. Prüfe zugleich, ob das Motiv bereits im Quellrender einen Rand berührt: Nachträgliches Verschieben kann abgeschnittene Pixel nicht zurückbringen.

Ein einfaches Platzierungsbeispiel für einen quadratischen Quellframe. `bounds` enthält normalisierte Kanten `[left, top, right, bottom]`, `zone` ist der freie Bereich in CSS-Pixeln und `angle` ist im Bogenmaß. Canvas zuerst zum Zentrum der Zone verschieben, drehen und dann den Frame mit `left`, `top` und `size` zeichnen.

```js
function fitVisibleFrame(bounds, zone, angle) {
  const [l, t, r, b] = bounds;
  const w = Math.max(.001, r - l), h = Math.max(.001, b - t);
  const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
  const size = Math.min(zone.width / (w*c + h*s), zone.height / (w*s + h*c));
  return { size, left: -(l+r)/2 * size, top: -(t+b)/2 * size };
}
```

Die Zone muss sich **inklusive** Schutzabstand in der Bühne befinden. Auf breiten Screens zwei Seitenzonen und eine Mittelzone definieren; auf dem Handy eine Zone oberhalb des Textes. Wenn das Abspielen beim Laden kurz ein älteres Bild zeigt, muss dessen Alpha-Box für die Platzierung gelten. Für zusätzliche Schwebeteile die gleiche Sichtgrenze anwenden und ihre Ebene festlegen, damit etwa ein Blatt hinter der Frucht bleibt.

Den Fortschritt aus dem normalen Seitenscrollen lesen und pro Frame sanft annähern. Nicht direkt bei jedem Scroll-Event zeichnen. Bei einem fixierten Abschnitt das Ende um den sichtbaren Platz unter der Bühne plus ca. 80–150 px Lesepuffer vorziehen. Die Schlusszeile soll stehen, während die Bühne noch vollständig im Bild ist. Kein erzwungenes Snap, keine verschluckten Touch-Gesten. Die kleine Ruhebewegung pausiert außerhalb des Sichtbereichs und in inaktiven Tabs. Bei reduzierter Bewegung Standbild und normalen Text liefern.

Halte zwei Werte getrennt: Der Scrollfortschritt steuert Objekt, Kamera, Materialwechsel und Text. Eine unabhängige Zeit steuert nur kleine schwebende Akzente. Bei unveränderter Scrollposition muss das Hauptmotiv nach dem kurzen Nachlauf stillstehen. Beim Zurückscrollen folgt es denselben Posen in umgekehrter Richtung.

## 4. Ausliefern und prüfen

Das vorhandene `RenderedHero` kann zusammenhängende nummerierte Renderfolgen abspielen. Für reine Fahrten mit im Render komponierten Rändern kann es direkt genutzt werden; für bewegliche, freigestellte Objekte braucht die projektspezifische Bühne zusätzlich die oben gezeigte Alpha-Grenze und die Textzonen. Das optionale [GLB-Modul](../features.md#animierter-hero) ist eine separate Möglichkeit, wenn eine Szene in Echtzeit gezeichnet werden soll. Die Qualitätsprüfung bleibt gleich.

Für eine Renderfolge ohne Lücken ab `0000.png` gibt es den Export im Template:

```sh
python scripts/pack-motion-frames.py --source render/desktop --mobile-source render/mobile --out public/media/hero/roesterei-v1 --base /media/hero/roesterei-v1 --wide 1440x810 --mobile 648x972 --fps 30 --chunk 12 --cuts 36 69 105 --alpha --once
```

Bei einer eigenen Bühne kann man mehrere benachbarte RGBA-Frames zu einer kleinen WebP-Bildtafel bündeln. Dazu die tatsächlichen Alpha-Grenzen als Manifest speichern. Das erste Standbild sofort anzeigen, nur das erste Paket und den nächsten Bereich vorladen und die übrigen Pakete in der Nähe des sichtbaren Frames dekodieren. Einige Pakete im Speicher halten und weiter entfernte freigeben. Für eine Browsergalerie denselben Master kleiner ausliefern. Automatisches Abspielen bekommt eine Pause, stoppt außerhalb des Fensters und darf am Schlussbild stehen bleiben.

Für Galerien die transparenten Ränder aus den Vorschauframes schneiden und ihre ursprünglichen Koordinaten im Manifest behalten. Eine kompaktere Variante für schmale oder langsame Geräte einsetzen. Den Puffer auch bei vollem Cache bei jedem Paketwechsel nachführen. Die Abspieluhr wartet, wenn die nächste Pose noch nicht dekodiert ist. Das Bild nur bei einer neuen Pose aktualisieren; Kamerafahrt, Deckkraft und Akzente laufen auf getrennten Ebenen. Für jede Szene festlegen, zu welcher Handlung ein Akzent gehört und wann er verschwindet.

Unter langsamerem Netz und CPU-Drosselung messen: Zeit bis zum Standbild, Zeit bis zur ersten Bewegung, längste sichtbare Pause und Anteil gezeigter Posen. Desktop und Mobil getrennt prüfen. Ein hoher nomineller FPS-Wert allein sagt nichts darüber aus, ob die geplanten Bilder wirklich gezeigt werden.

Vor Freigabe auf 320 px, 390 px, Tablet, einem schmalen Desktop um 1140 × 720 und einem großen Desktop prüfen. Relevante Zwischenbilder mitprüfen, nicht nur Anfang und Ende. Das Objekt muss vollständig im Bild liegen, Text und Links bleiben im Lesebereich, die nächste Sektion kommt erst nach dem vollständigen Übergang. Teste langsames und schnelles Scrollen, die Gegenrichtung, Ladefehler und reduzierte Bewegung. Übertrage eine reparierte Quellsequenz auch auf die Screenshots und Clips.

## 5. Die echte Website im MacBook aufnehmen

1. Wähle je Clip eine eigene echte Tischaufnahme, deren Licht und Materialien zum Motiv passen. Gerät und Scharnier bleiben im Bild. Die vier inneren Displayecken und Aussparungen wie die Kamera-Notch messen. Bewegt sich das Gerät, die vier Punkte über den gesamten Take verfolgen. Für neue Aufnahmen kann ein einfarbig vorbereitetes Display das Freistellen erleichtern.
2. Nimm die laufende Website im Browser ohne Adressleiste im passenden Verhältnis auf, für ein 16:10-Display z. B. **1152 × 720**. Setze bei 30 Aufnahmeframes pro Sekunde die echte vertikale Scrollposition mit einer sanften Kurve. Nimm die Einstiegsansicht, die lesbaren Zwischenzustände und den Auslauf bis in den folgenden Abschnitt auf. Für ein Interaktionsbeispiel klicke echte Bedienelemente. So stimmt die Darstellung mit der Seite überein und es gibt keinen seitlichen Scroll oder künstlich verzerrten Viewport.
3. Lege die Aufnahme mit einer Vierpunkt-Transformation in die Displayfläche. Begrenze sie mit der echten Maske, behalte Ecken, Rahmen und Notch und passe das Ergebnis an das Licht im Raum an. Eine langsame Kamerafahrt im fertigen Set ist möglich, solange der ganze Laptop und der Text im sicheren Bildbereich bleiben.
4. Für das Reel in **1080 × 1920** exportieren. Für native Instagram-Texte die MP4 ohne Zusatzschrift ausgeben und eine **freie Zone über dem Gerät** lassen. Die Hooks mit Zeitmarken separat beilegen, zum Beispiel `00:00–00:02.3 The brief: Show how it’s made.` und `00:02.3–00:09.5 The website:`. Die Texte werden im Instagram-Editor hinzugefügt; die Reel-Publishing-API nimmt keine solchen editierbaren Textebenen entgegen. Die eigentliche Post-Caption ist ein eigenes Feld: Leistung erklären, auf die passende Website verweisen, wenige spezifische Hashtags. Fiktive Beispiele als solche kennzeichnen.
5. Für die eigene Startseite eine zweite, horizontale Fassung ohne Social-Hook und Plattformverweis ausgeben, mit eigenem Standbild und einem sichtbaren Startknopf. Das Video selbst erst auf Anforderung laden; die interaktive Studie bleibt separat erreichbar. Beispiel für einen kompakten Export: H.264, `yuv420p`, quadratische Pixel und `faststart`. Größen-, Laufzeit- und Codecgrenzen des eingesetzten Planers vor dem finalen Export prüfen. Manche Planer lehnen die MP4-Schnittliste ab, obwohl das Video im Browser läuft. Mit `ffmpeg -i reel.mp4 -map 0 -c copy -movflags +faststart -use_editlist 0 reel-planer.mp4` lässt sich der Container ohne erneute Bildkompression vorbereiten. Die fertige Datei anschließend gegen den echten Medienvalidator prüfen.

Eine fertige Vorschau muss exakt die später zu planenden Reels, ihre Captions und Reihenfolge zeigen. Liegt die Freigabe beim Auftraggeber, wird erst nach dessen Zustimmung im Planer terminiert. Der Download der Vorschau ist keine Freigabe.
