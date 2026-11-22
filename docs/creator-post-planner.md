# Öffentlicher Post-Planer

Der optionale Abschnitt `creator-tools` kann Einträge mit `creatorTool: "publishing"` darstellen. Bestehende Tags `planner`, `campaign` und `merch` funktionieren weiterhin. `planner` bleibt das Ideen- und Produktionsboard; `publishing` beginnt mit fertig gestalteten Beispielbeiträgen. Beide erfüllen unterschiedliche Aufgaben.

Die neutrale Vorlage liegt in `profiles/creator-post-planner.json`. Neue Creator-Werkzeugabschnitte enthalten einen Post-Planer und normale UI-Beschriftungen. Die Creator-Abschnitte erscheinen mit aktiviertem Creator-Modul. Das private Modul `socialPublishing` wird durch einen öffentlichen Beispielabschnitt weder aktiviert noch angesprochen.

## Verhalten der öffentlichen Demo

- Drei neutrale, direkt im Browser gezeichnete Beitragsmotive; keine externen Bilder oder Social-Einbettungen.
- Beitrag, Caption, Beispieltag und Uhrzeit wählen. Eine Änderung nach Freigabe setzt den Beitrag wieder auf „Medien geprüft“.
- Freigeben und Versand ausdrücklich simulieren. Die endliche Animation bestätigt nur den lokalen Test. Die Schaltfläche behält ihren Tastaturfokus während der Verarbeitung.
- Ein absichtlicher WebM-Prüffall erklärt den passenden MP4-Export. Die Beispielkorrektur tauscht keine echten Dateien aus.
- Auf kleinen Bildschirmen Agenda und native Tagesauswahl, ohne winzigen Siebenspaltenkalender oder verschachtelten Scrollbereich. Die vorhandene Großansicht bleibt nutzbar.
- Keine API-, Admin-, Provider-, Upload-, Zahlungs- oder Authentifizierungsaufrufe. Zustand lebt nur in der aktuellen Komponenteninstanz. Die Demo speichert keine Entwürfe in einem Kundenkonto.

## Bearbeitung im CMS

Titel, Beschreibung, Link und Linktext sind normale ContentItem-Felder. „Werkzeug dieses Eintrags“ wählt den Untertyp. Für den Post-Planer gibt es benannte Felder für Titel, Demo-Hinweis, Aktionsbeschriftungen, API-Erklärung, Beispielwoche und die drei Beispielbeiträge.

Alle weiteren sichtbaren Beschriftungen stehen als `Schlüssel|Text` in den weiteren Angaben. `seed` enthält maximal sechs geprüfte Beispielbeiträge mit `id`, `title`, `artwork`, `caption`, `kind`, `day` (0–6), `time` (HH:mm) und `needsReview`. Leere Daten zeigen einen echten Leerzustand; ungültige Daten werden nicht ausgeführt. Die Inspector-Felder bearbeiten denselben Inhalt wie die Vorschau. Ein Wechsel des Untertyps in den Post-Planer verwendet dessen neutrale Beispieldetails.

## Automatisierung ehrlich erklären

Die aufklappbare API-Erklärung ist normaler bearbeitbarer Seiteninhalt. Sie beschreibt Instagram als erste konkrete Anbindung: professionelles Business-/Creator-Konto, autorisierte Verbindung, notwendige Berechtigungen, passende Medien und ausdrückliche Freigabe. Ohne Verbindung bleibt automatischer Versand ausgeschaltet. TikTok/YouTube werden als mögliche getrennte Erweiterungen auf Anfrage bezeichnet, nicht als bereits verbundene Konten.

Die echte private Planung, Medienprüfung, Freigabe, Warteschlange und Bestätigung werden vom separaten Social-Publishing-Modul bereitgestellt. Die öffentliche Demo importiert kein Modul dieses Backends und belegt keine tatsächliche Providerveröffentlichung.
