# Interaktive 3D-Scroll-Story

Wähle dieses Modul bei einem ausdrücklichen Auftrag für eine scrollgesteuerte 3D-Szene. Bei der Generierung verwende `--features scroll-3d`. Im bestehenden CMS schaltet **Einstellungen → Allgemein → 3D-Scroll-Stories aktivieren** den Baustein frei. Füge ihn unter **Abschnitt hinzufügen → Cinematic → Interaktive 3D-Scroll-Story** ein. Inhalt, Farbgebung und Seitenauswahl bleiben im Entwurf bis zur Veröffentlichung. Das Modul ist in allen Starter-Profilen standardmäßig aus.

## Eine Geschichte über das Produkt

1. Lege Blickfang, Produktversprechen und Schluss fest. Gib jeder Geschichte ihren eigenen Rhythmus. Eine Demontage, ein Materialwechsel, ein Herstellungsprozess und eine Nutzungssequenz haben unterschiedliche Höhepunkte.
2. Gib jedem Kapitel einen eigenen erzählerischen Zweck und eine erkennbare räumliche Veränderung. Bei einer Wohnung baut sich der Grundriss auf, bevor man in die möblierten Räume blickt. Bei einem Ball erzählen Oberfläche, Bodenkontakt und Flugbahn die Geschichte. Variiere Kameradistanz, Typografie und Licht mit Anlass. Zwischen den Hauptmomenten dürfen sich wenige motivbezogene Details leise weiterbewegen.
3. Schreibe die sichtbare Seite wie eine echte Produktwebsite. Verwende überprüfte Angaben über Material, Herkunft, Zutaten oder Nutzung. Halte Regie, Keyframes und Prüfnotizen im Produktionsplan. Setze eine sinnvolle nächste Handlung ans Ende.
4. Baue zuerst einen schwierigen Übergang. Prüfe ihn im echten Browser beim Anhalten, langsamen Scrollen und Rückwärtsscrollen. Prüfe die Silhouette und alle im Übergang sichtbaren Teile, bevor du die restlichen Assets produzierst.

## Assets und Bewegung

- Modelliere jedes bewegte Teil als eigenes Objekt mit sinnvollem Pivot. Freigestellte Komponenten brauchen vollständige Konturen, eigenständige Details und sichtbare Kontaktflächen. Beim Öffnen sollen die Innenflächen aus ihrer tatsächlichen Perspektive lesbar sein. Dokumentiere Herkunft, Lizenz und gegebenenfalls Attribution im Projekt.
- Verwende konsistente Perspektive, Maßstab, Licht und Schärfe. Backe prozedurale Blender-Materialien für glTF in geeignete Texturen. Kontrolliere Albedo, Rauheit, Normalen, Glas und Flüssigkeit im tatsächlichen WebGL-Renderer. Prüfe Meniskus, Kontakt, Reflexe, Schatten und sichtbare Geometrie bei flüssigen oder transparenten Materialien.
- Animiere Zustände über die Transformationen derselben Teile, Kamera-Keyframes und bei Formänderungen über Shape Keys. Verknüpfe Flugbahnen mit Auflageflächen, Scharnieren und Bewegungsachsen. Kontrolliere Clipping, Durchdringungen, Sprünge, Textkollision und Texturflimmern auch mitten im Übergang. Das Modell bleibt beim Wechsel der Kapitel im selben Canvas.
- Lege vor der Animation fest, welche Kanten sich berühren dürfen und wo Teile Bewegungsfreiheit brauchen. Schiebe eine Baugruppe aus ihrer Führung, bevor sie dreht. Richte einen Guss vom realen Ausguss bis zur Öffnung des Gefäßes aus. Prüfe den Balldurchmesser gegen die Öffnung, durch die er fliegen soll. Vergleiche an kritischen Posen die Geometrie im Raum und den projizierten Ausschnitt getrennt.
- Verankere Größenverhältnisse, Material und Licht in einem konkreten Referenzmotiv. Baue verdeckte Flächen und sichtbare Verbindungen aus. Verwende eigene oder passend lizenzierte Texturen und Modelle. Notiere Bearbeitungen und die vorgeschriebene Attribution bei der Szene und später beim Reel.
- Plane wenige eigene, zum Motiv passende kleine Objekte. Eine kurze, nahtlos wiederholbare `Ambient`-Animation hält sie bei ruhendem Scrollen subtil in Bewegung. Gib ihnen eigene Knoten. Story und Ambient animieren getrennte Eigenschaften.
- Für Spezialfälle wie einen kontinuierlichen Flüssigkeitsstrahl, Glut, Materialwechsel, interaktive Callouts oder eine wortweise freigelegte Überschrift erweitere die Szene gezielt. Der CMS-Baustein liefert den Kapitel- und Wiedergaberahmen. Prüfe die Dramaturgie, den Raum für Text und die Übergänge im konkreten Projekt.

## GLB und CMS

Lege das eingebettete GLB unter `public/assets/motion-story/models/` ab. Trage im CMS den Pfad ab `/assets/motion-story/models/` und ein passendes Standbild mit Alternativtext ein. Ein leerer Modellpfad verwendet das mitgelieferte Sideboard als Funktionsprobe. Ersetze Motiv und Produkttexte bei einem eigenen Auftrag.

Der Player verwendet den Clip `Story` oder den ersten Clip außer `Ambient`. Der Beginn liegt bei 0 %, das Ende bei 100 %. Exportiere eine Perspektivkamera, wenn die Erzählung von Ausschnitt und Kamerafahrt abhängt. Die Laufzeit passt den Bildwinkel an den Canvas an. Eine optionale `Ambient`-Spur läuft unabhängig bei sichtbarer Bühne. Die GLB enthält Geometrie und Texturen. Meshopt wird unterstützt.

Lege die Produkttexte und Kapitel im CMS an. Kapitel können eigene Hintergrund- und Textfarben, eine andere Bildposition und einen Startpunkt im Modell erhalten. Ohne Startpunkt verteilt der Player die Kapitel zwischen den gesetzten Punkten. Gesetzte Punkte steigen in der Reihenfolge der Kapitel an. Über die Scrollstrecke in der Gestaltung passt du das Tempo an. Mit **3D testen** kannst du die Szene im Editor über Kapitel und Schieberegler prüfen. Auf der öffentlichen Seite steuern Scrollen und Kapitelbuttons dieselbe Timeline.

Für projektspezifische Hintergründe, typografische Akzente und Layoutdetails kannst du den Abschnitt über seine Abschnitts-ID und `data-scroll-3d-stage`, `data-scroll-3d-art` oder `data-scroll-3d-copy` gestalten. `data-chapter-index` auf der Bühne folgt dem tatsächlich gezeigten Kapitel. Gestalte das ruhige Standbild und die lineare Lesefassung mit.

## Visuelle und technische Abnahme

- Öffne die veröffentlichungsfähige Vorschau auf Desktop und Mobil. Prüfe Einstieg, Ende, sämtliche Kapitelgrenzen und die wichtigsten Zwischenframes. Scrolle langsam in beide Richtungen, springe per Kapitel und halte mitten in der Animation. Kontrolliere, dass jedes Teil scharf und vollständig bleibt, die Pose stabil ist und Umgebungsdetails dezent weiterlaufen.
- Prüfe die schmale eingebettete Vorschau. Dort bewegt echter Scrollfortschritt dieselbe Szene wie in der Vollansicht. Teste schnelle Impulse und Richtungswechsel. Kamera, Objekte und Text folgen demselben geglätteten Fortschritt. Erhalte den nativen Scrollablauf und einen klaren Ausstieg aus der Bühne. Falls ein Teaser automatisch läuft, teste Pause und die direkte Übernahme durch Scrollen oder Berührung.
- Miss bei langen oder technisch kniffligen Szenen den projizierten Bildrand, den Abstand zur lesbaren Textfläche und sprunghafte Änderungen von einem Frame zum nächsten. Prüfe Kontakte, Öffnungen, Flüssigkeit und Rückbau zusätzlich als Geometrie und im Bild. Stelle dafür die kritischen Zwischenzustände gezielt ein.
- Prüfe Touch, Tastatur, Fokus, Kontrast und die sichtbare Textmenge in schmaler und niedriger Ansicht. Bei reduzierter Bewegung, fehlendem WebGL oder einem Modellfehler müssen das Standbild und die Kapitel in normaler Lesereihenfolge erreichbar sein.
- Prüfe Ladezeit und Bewegung auf dem Zielgerät. Verwende passende Texturauflösung, optimierte Geometrie und komprimierte Assets. Verifiziere, dass Projekte ohne 3D-Abschnitt kein Modell abrufen und dass die Wiedergabe außerhalb der sichtbaren Bühne oder bei ausgeblendetem Tab pausiert.
- Speichere die CMS-Änderungen, öffne den Entwurf erneut und prüfe die Veröffentlichung mit der richtigen Sprache, den richtigen Seiten und dem richtigen Modell. Unterscheide sichtbare Mängel am Asset von Fehlern an der Zeitleiste.

## Reels bei ausdrücklichem Auftrag

Zeichne dieselbe Szene mit einem deterministischen, flüssigen Verlauf auf. Bei einem MacBook-Reel verwende ein freigegebenes Foto oder Video eines echten Geräts. Vermesse die Display-Ecken, passe das aufgezeichnete Bild perspektivisch ein und prüfe Text und Hauptbewegung im fertigen Hochformat. Wähle die Länge nach der Geschichte. 1080 × 1920 bei 30 Bildern pro Sekunde ist der Ausgangspunkt für Instagram. Dekodiere das fertige MP4 und prüfe Anfang und Schluss, Anzahl und Bewegung der Frames, Ton und Lesbarkeit. Prüfe beim Export für den Planer auch Container und Audio gegen dessen tatsächliche Medienanforderungen. Übernimm die freigegebene Videospur, wenn sich die Abweichung durch Remux oder Audioexport beheben lässt.

Bereite eine konkrete Caption, passende Hashtags und die nötige Attribution mit der Vorschau vor. Die Freigabe bezieht sich auf die konkrete Fassung und den Kanal. Beim beauftragten Austausch eines Reels verifiziere zuerst die Veröffentlichung der neuen Fassung und ordne danach den alten Beitrag eindeutig zu. Details zur Aufnahme stehen im [Cinematic-Hero-Rezept](cinematic-hero.md).
