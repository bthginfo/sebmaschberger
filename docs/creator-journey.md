# Vom Content zur nächsten Aktion

`creator-journey` gehört zur optionalen Creator-Bibliothek. Die 54 normalen Abschnitte bleiben unverändert. Der bisherige `creator-lens` bleibt für bestehende Websites verfügbar.

Die drei neutralen Vorgaben zeigen einen nachvollziehbaren Weg: eigener Content → eigene Website → Anmeldung, eigener Shop oder strukturierte Kooperationsanfrage. Die Beispielaktion verändert nur den lokalen Zustand. Sie sendet keine Daten, legt keine Bestellung an und lädt keine Plattform- oder Zahlungsdienste. Die echte Kontaktaktion übernimmt das gewählte Ziel und eine editierbare Nachricht in das vorhandene Kontaktformular.

## Inhalte im normalen CMS

Die Vorlage steht in `profiles/creator-journey.json`. `createJourneyContent()` erstellt davon unabhängige Kopien. Überschrift, Einleitung, Beispielhinweis, Website-Name und Kontaktaktion sind normale Abschnittsfelder. Jeder Weg ist ein normaler Eintrag:

| Feld | Verwendung |
| --- | --- |
| Titel | Auswahl Community, eigener Drop oder Kooperationen |
| Beschreibung | Konkrete Leistung unter dem Beispiel |
| Zusatzzeile (`meta`) | Überschrift der Website-Vorschau |
| Linkbeschriftung | Lokale Beispielaktion |
| Linkziel | Ziel der echten Kontaktanfrage |
| Bild und Symbol | Optionales eigenes Content-Motiv und normales CMS-Symbol |
| Art dieses Content-Wegs | Live/Anmeldung, Produkte/Shop oder Media-Kit/Anfrage |
| Weitere Angaben | Einzelne Texte der Vorschau und des Ergebnisses, im Format `Schlüssel\|Text` |

Die Vorschautexte sind zusätzlich direkt bearbeitbar. Das CMS zeigt den ruhigen Ergebniszustand, ohne Timer oder Scrollstrecke. Die Tags `journey` und `event`, `shop` oder `kit` bestimmen nur den gewählten Beispielaufbau. Ein Eintrag mit dem Tag `ui` enthält die normalen Bedienungsbeschriftungen und wird nicht als Auswahl angezeigt.

Die neutrale Grafik wurde als native Oberfläche für den Starter entwickelt. Es wurden keine Kundenbilder, Kantiq-Markenbestandteile, Anbieterzugänge oder Geschäftsdatensätze übernommen. Optionale eigene Fotos werden über die bestehende Mediathek gepflegt.

## Bewegung und Bedienung

Die Auswahl verändert Website-Inhalt, Aufbau und nächsten Schritt. Eine kurze, einmalige Linienanimation verdeutlicht die Verbindung. Die Beispielaktion bleibt währenddessen fokussierbar, verhindert wiederholte Ausführung über `aria-disabled` und behält den Tastaturfokus. Reduzierte Bewegung zeigt das Ergebnis sofort. Der Abschnitt hat keine Scroll-Capture-, Wheel- oder Touch-Handler und keine verschachtelte Scrollfläche.

## Zehn mobile Hero-Beispiele

Die Galerie komponiert jeden der zehn Stile ausdrücklich für schmale Browserfenster. Normale Creator-Profil-Heros und die Desktop-Kompositionen behalten ihre bestehenden Regeln. Das mobile Galerie-Fenster enthält eine begrenzte eigene Höhe und benötigt keinen inneren vertikalen Scrollbereich. Jede Vorschau hat eine sichtbare Aktion; Audio bleibt im Musik-Beispiel bedienbar.

Bei schmalen Ansichten wird nur die eigene mobile Aktionsinstanz gezeigt; die normale Instanz ist per CSS aus Darstellung und Accessibility-Baum ausgeblendet. Desktop verwendet weiterhin die ursprüngliche Position. Die Vollbildansicht behält denselben Zustand. Escape gibt Fokus und Seitenscrolling zurück. Horizontale Wischgesten wechseln das Beispiel; vertikale Gesten scrollen die eigentliche Seite.

Ein im CMS auf die Bildmitte eingestelltes Motiv erhält je nach Stil eine passende mobile Ausrichtung. Ein ausdrücklich abweichend gewählter Bildfokus bleibt vorrangig. Es wurden weder neue Rasterbilder benötigt noch bestehende Bilddateien verändert.

Der aktuelle Generator besitzt keine separate Websites-Seite mit einem Lens-Abschnitt. Deshalb wird dort keine zusätzliche Seite oder automatische Inhaltsänderung eingeführt. Der neue Abschnitt steht nach ausdrücklicher Aktivierung des Creator-Moduls regulär in der Bibliothek bereit.
