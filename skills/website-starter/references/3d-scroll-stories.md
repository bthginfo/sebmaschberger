# Interaktive 3D-Scroll-Stories

Aktiviere `scroll-3d` nur bei einem ausdrücklichen Auftrag für diese Art von Abschnitt. Bei neuen Projekten gilt `--features scroll-3d`, im bestehenden Starter-CMS **Einstellungen → Allgemein → 3D-Scroll-Stories aktivieren**. Füge danach **Cinematic → Interaktive 3D-Scroll-Story** in die gewünschte Seite ein. Bei einem neuen neutralen Starter-Stand ist das Modul in jedem Profil aus.

Öffne `docs/recipes/3d-scroll-story.md` im ausgewählten Template-Commit. Entwickle vor der Serienproduktion eine im Browser scrollbare Probe des schwierigsten Übergangs. Kläre anhand der Probe Kamerafahrt, Beleuchtung, Geometrie und typografische Hierarchie. Die Probe zeigt Zwischenzustände beim Vorwärts- und Rückwärtsscrollen.

Leite die Kapitel aus dem Motiv ab. Eine Wohnungsbesichtigung führt vom Grundriss in begehbar wirkende Räume. Eine Sportgeschichte kann über Bodenkontakt und Flugbahn eines einzelnen Balls funktionieren. Verwende dieselben räumlichen Objekte über die Übergänge hinweg. Text, Kamera, Licht und Hintergrund bekommen ihre Einsätze aus der Geschichte. Die Texte sprechen aus Sicht des Anbieters oder Vereins.

## Skills und Werkzeuge

- **`scroll-world-storytelling`** für den Story- und Stilentwurf, die durchgehende Three.js-Szene, die Scroll-Kapitel und die Prüfung mit frischem Blick. Die Umsetzung folgt dem Modus für eine Three.js-Welt. [Scroll World](https://github.com/oso95/scroll-world)
- **`threejs-materials-lighting`** für physikalisch plausible Materialien, HDR-Umgebung, Licht, Kontakt und Schatten. Übernimm die zum installierten Three.js-Stand passenden Beispiele. [Three.js-Materialien](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial)
- **`scroll-scrubbed-word-reveal`** für eine bewusst gesetzte typografische Szene mit scrollgesteuerter Wortfreigabe. Überschriften, Betonung und Links bleiben als HTML lesbar. Verwende den Effekt, wenn er den Text trägt. [WAI-Seitenstruktur](https://www.w3.org/WAI/tutorials/page-structure/)
- **`impeccable`** für Hierarchie, Responsive-Layout, Kontrast, lesbare Produkttexte und visuelle Prüfung. **`agent-browser`** für die tatsächlichen Scroll-, Touch- und Tastaturabläufe sowie Screenshots der kritischen Zwischenzustände.
- **`find-skills`** bei einer offenen Aufgabe wie Modellierung, Materialbacken oder einem speziellen Motion-Effekt. Lies die ausgewählte Quelle und prüfe Aktualität, Kompatibilität und Lizenz. Falls die Skills in der Umgebung fehlen, enthält das Template-Rezept die Anforderungen und die Arbeitsfolge.

Verwende Higgsfield für geeignete Einzelmotive, wenn der Auftrag oder die vorhandene Produktionsumgebung das vorsieht. Baue bewegliche Teile und Physik in Blender oder übernimm geeignete lizenzierte 3D-Assets. Prüfe auch Flächen, die erst beim Auseinanderbauen sichtbar werden. Erstelle Reels nur bei Auftrag, dann aus einem Lauf durch die tatsächlich scrollbare Seite. Vor Live-Schaltung oder geplantem Social-Versand gilt die Abnahme aus dem Auftrag.

## Scrolltempo und Vorschau

- Nativen Scrollwert als Ziel lesen, die dargestellte Position mit zeitabhängiger Dämpfung und begrenzter Geschwindigkeit nachführen. Kamera, Mechanik und Kapiteltext aus derselben dargestellten Position ableiten. Mit großen Mausradimpulsen, schnellen Wischgesten, Tastatur und unmittelbarer Richtungsumkehr prüfen. Scrollstrecken nur verändern, wenn der Auftrag dies verlangt. Der [ScrollTrigger-Skill von GreenSock](https://www.skills.sh/greensock/gsap-skills/gsap-scrolltrigger) enthält hilfreiche Muster für Scrubbing und Sticky-Szenen. Installiere keine neue Laufzeit nur für das Muster.
- Eine automatisch laufende Teaser-Instanz derselben 3D-Szene ist eine eigene Option im aktivierten Modul. Sie hat keinen Scrollweg, startet im sichtbaren Bereich, pausiert außerhalb, bietet Pause und bleibt bei reduzierter Bewegung als Standbild mit lesbarem Inhalt verfügbar. Wenn das Ende nicht nahtlos zum Start passt, die Rücksetzung mit einer kurzen Blende kaschieren. Die verlinkte Vollansicht kann interaktiv bleiben.
- Bei Flüssigkeit oder anderem Materialfluss Quelle, Flugbahn und Auftreffpunkt aus einer Bewegung ableiten. Separate Teile und ihre erst im Übergang sichtbaren Flächen prüfen. Im Test mehrere Zwischenframes ansehen, insbesondere Kontakt und Überschneidungen.
- Kritische Bewegung mit Platz zum Öffnen, Drehen und Zurücksetzen konstruieren. Prüfe interne Kollisionen separat von Textüberlauf, Bildrand und Kamerasprüngen. Miss die kritischen Zwischenzustände bei Bedarf über alle Frames. Teste danach die Vollansicht und den eingebetteten Scrollbereich auf Desktop und Mobil.

## Reel-Export

Verwende für MacBook-Reels freigegebene Foto- oder Videoaufnahmen echter Geräte mit perspektivisch kalibriertem Display. Prüfe Dekodierung, Ton, Lesbarkeit und Übergänge im exportierten Hochformat nach dem Template-Rezept. Lege Caption, Hashtags und Quellen mit dem Film zur Freigabe vor. Wenn der Planer ein anderes Container- oder Audioformat braucht, verwende nach Möglichkeit dieselbe Videospur.
