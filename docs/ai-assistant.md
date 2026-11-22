# Optionaler CMS-Assistent

Der schwebende Assistent unterstützt die normale Arbeit im CMS: ausgewählte Texte überarbeiten, neue Seiten aus der vorhandenen Abschnittsbibliothek vorbereiten und Bedienung oder Einrichtung erklären. Social-Posts und Content-Ideen sind zusätzliche Aufgaben. Jeder Vorschlag bleibt zunächst in einer Vorschau. Erst die ausdrückliche Übernahme ändert den lokalen Arbeitsstand. Es wird nichts automatisch gespeichert oder veröffentlicht.

## Freischalten

Das Modul ist unabhängig vom Website-Profil und vom Social-Studio. Fehlende Einstellungen bedeuten aus. Bei neuen Projekten `--features ai-assistant` beziehungsweise `--ai-assistant` verwenden. Mehrere optionale Funktionen lassen sich kombinieren:

```sh
node scripts/create-site.mjs --name "Eigenes Studio" --out "../eigenes-studio" --profile services --features social-studio,ai-assistant
```

Im Briefing entspricht dies `"modules": { "aiAssistant": { "enabled": true } }`; auch die Kurzform `"aiAssistant": true` wird akzeptiert. Ein explizites `false` bleibt ohne positiven CLI-Schalter erhalten. In einer bestehenden Website unter Einstellungen → Allgemein einschalten und den Entwurf speichern. Die private Freigabe richtet sich nach dem gespeicherten Website-Entwurf, nicht nach einer öffentlichen Veröffentlichung.

Nur `{ "enabled": true }` steht im öffentlichen Website-Inhalt. Anbieter, Modell, Schlüssel und Chatverlauf gehören nicht in `config.modules`. Ein eigener OpenAI- oder Anthropic-Zugang und ein passendes Modell werden ausschließlich serverseitig eingerichtet. Die Umgebungsvariablen der tatsächlich installierten Version verwenden; die API gibt nur den Einrichtungsstatus, niemals einen Schlüssel zurück. Aktivieren allein verbindet keinen Dienst. Ohne Anbieter zeigt der Assistent ehrlich „Noch kein KI-Anbieter eingerichtet“ und sendet keine Generierungsanfrage.

Die Einrichtung eines eigenen kostenpflichtigen Anbieters ist eine gesonderte Entscheidung. Die Starter-Aktivierung richtet kein Konto ein, erzeugt keinen Schlüssel und führt keine bezahlten Testanfragen aus.

## Im Editor

**Website-Text** verwendet den aktuell ausgewählten Abschnittstext. Vorher und Vorschlag sind sichtbar. Beim Übernehmen werden Ziel und Originaltext erneut geprüft: Wurde inzwischen ein anderer Abschnitt ausgewählt oder dessen Text bearbeitet, muss ein neuer Vorschlag erstellt werden. Die normale Rückgängig-Funktion des Editors bleibt erhalten. Anrede, Zielgruppe und Ton können als begrenzter Kontext mitgegeben werden; unbekannte Fakten bleiben unbekannt.

**Seite aufbauen** entwirft einen Seitennamen, eine freie Adresse, eine Beschreibung und einen geordneten Aufbau aus tatsächlich verfügbaren Sections. Die Bibliothek wird serverseitig auf das aktive Profil und dessen Module begrenzt. Titel, Adresse und Sections sind vor der Übernahme sichtbar. Beim Bestätigen werden Adresse, Bibliothek, Grenzen und der aktuelle Entwurf erneut geprüft. Neue IDs entstehen lokal; fremde Beispielbilder, Links und Standardinhalte werden nicht ungeprüft übernommen. Die Seite wird in einem einzigen rückgängig zu machenden Schritt ergänzt. Navigation, bestehende Seiten und öffentliche Website bleiben bis zu einer getrennten bewussten Bearbeitung beziehungsweise Veröffentlichung erhalten.

**CMS-Hilfe** erklärt Speichern, Veröffentlichen und die nächsten Schritte zu Anfragen, Shop und Social-Kanälen. Diese native Hilfe funktioniert auch ohne KI-Anbieterschlüssel und wird als solche gekennzeichnet. Sie verwendet nur den tatsächlichen, berechtigten Einrichtungsstand und zusammengefasste Statusangaben. Kundennachrichten, Käuferdaten und Zugangstoken werden dafür nicht an einen KI-Anbieter gesendet. Ein Hinweis auf fehlende Einrichtung ist keine erfolgreiche Verbindung. Die Hilfe öffnet vorhandene CMS-Bereiche über deren normale Navigation samt Schutz ungespeicherter Änderungen.

**Social-Post entwerfen** zeigt Bildtext, Kurztext und Caption. Sind Assistent und Social-Studio freigeschaltet, kann daraus ein neuer ungespeicherter Social-Entwurf mit dem aktuellen Markenprofil entstehen. Ein bestehendes ungespeichertes Design wird nur nach dessen normaler Bestätigung verlassen. Ohne Social-Studio bleibt ein kleiner bearbeitbarer Post-Entwurf in der Vorschau verfügbar. **Ideen sammeln** liefert Anregungen zur eigenen Ausarbeitung.

Generierungsanfragen sind begrenzt und enthalten nur die ausgewählten Textangaben und die nötigen neutralen Beschreibungen verfügbarer Sections. Sie führen keine freien Werkzeuge aus und verändern den Serverinhalt nicht. Die API schützt Sitzung, Ursprung, Modulfreigabe, Eingabeschema, Anfragehäufigkeit und Laufzeit. Abbruch und erneuter Versuch erhalten die Eingabe. Ein Anbieterfehler wechselt niemals heimlich zu einem simulierten Ergebnis. Die native CMS-Hilfe ist eine getrennte, ausdrücklich gekennzeichnete Antwortstrecke.

Der Assistent umgeht keine Anmeldung bei Instagram, TikTok oder anderen Anbietern. Er führt zur passenden Einrichtung; Zustimmung und Zielkontowahl erfolgen über den vorhandenen offiziellen Connector. Zahlungsfreigaben, Erstattungen, Preisänderungen, Antworten auf Anfragen und Veröffentlichungen werden nicht automatisch ausgeführt. Eine Shop-Hilfe ersetzt keine Einrichtung und Prüfung des Zahlungsanbieters.

Vorschläge auf konkrete Angaben, Stil und Aussage prüfen. Der Assistent ist kein Werkzeug für unbeaufsichtigte Änderungen an Rechtstexten, Referenzen oder ganzen Websites. Personenbezogene oder vertrauliche Inhalte nur nach einer passenden Vereinbarung mit dem tatsächlich verwendeten Anbieter übermitteln.

## Öffentliche Beispiele

Der öffentliche CMS-Browser verwendet ausschließlich einen getrennten lokalen Demo-Adapter. Er trägt immer den Hinweis **Beispiel · keine echte KI-Verbindung**. Vorgefertigte Vorschläge lassen sich lokal übernehmen, bearbeiten, zurücknehmen und zurücksetzen. Es gibt weder eine Anfrage an `/api/admin/assistant` noch eine Verbindung zu einem KI-Anbieter. Ein erzeugter Demo-Post ist lokal bearbeitbar und als JSON-Entwurf herunterladbar. Hilfebeispiele haben keinen Zugriff auf echte Anfragen, Bestellungen oder Social-Konten.

Die eigene Section **KI-Assistent** (`assistant-showcase`) stellt den optionalen Nutzen unabhängig vom normalen CMS-Beispiel vor. Sie ist für Unternehmens- und Creator-Profile verfügbar und vollständig im visuellen Editor bearbeitbar. Die Section selbst ist eine öffentliche Simulation; das Hinzufügen aktiviert kein privates Modul und keinen Anbieter. Die neutralen Vorgaben enthalten keine Kundenmarke oder fremden Ressourcen.

Die Demo eignet sich zum Ausprobieren der Bedienung. Sie belegt keine Antwortqualität eines Anbieters und enthält keine automatische Veröffentlichung auf Instagram oder anderen Plattformen.

## Prüfung

Generatorprüfungen sichern ausgeschaltete Vorgaben, die fünf Profile, kombinierte Opt-ins, explizites `false` und den Ausschluss privater Konfigurationsfelder. Die Serveradapter werden mit einem simulierten SDK-Modell geprüft; dabei entstehen keine Anbieteraufrufe. Vor einer realen Kundennutzung zusätzlich den eigenen freigegebenen Anbieter mit bewusst gewählten Testinhalten prüfen. Öffentliche Demo und echte Verbindung müssen dabei weiterhin klar getrennt bleiben.


## Provider-Vertrag geprüft (2026-11-02)

Die Provider-Ausgabe nutzt ein separates striktes JSON-Schema. Jede Eigenschaft ist verpflichtend; Abschnitte ohne Listeneinträge liefern `items: []`. Die Varianten verwenden `anyOf` statt `oneOf`. Interne CMS-Pläne behalten ihre bisherigen optionalen Felder und werden nach der Provider-Antwort erneut gegen die erlaubten Abschnitte, Ziele und Aktionen geprüft.

Vertragstests führen die tatsächlich installierten OpenAI- und Anthropic-SDKs mit abgefangenen HTTP-Antworten aus. Sie prüfen den ausgehenden Anfragekörper und das Einlesen von Seitenplänen. Dabei wird kein echter KI-Dienst aufgerufen. OpenAI-Datenspeicherung bleibt ausgeschaltet; der Anthropic-Fallback besitzt nur das interne JSON-Formatierungswerkzeug und keine schreibenden CMS-Werkzeuge. Ein echter Provider-Aufruf bleibt vom eigenen Schlüssel, Modellzugang und der bewussten Einrichtung abhängig.
