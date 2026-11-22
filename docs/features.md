# Funktionskatalog

„Enthalten“ bedeutet: Der Starter besitzt ausführbaren Code. „Bauanleitung“ bedeutet: Codex muss die Funktion bei einem entsprechenden Auftrag noch implementieren, einrichten und prüfen.

| Funktion | Stand | Konfiguration / Einstieg |
| --- | --- | --- |
| Zentrale Speisen- und Getränkekarte | Enthalten, optional | Kategorien, Einträge und Portionspreise zentral oder aus der Vorschau pflegen. Drei Kartenlayouts in der Abschnittsbibliothek. [Anleitung](hospitality.md) |
| Tischreservierungen | Enthalten, optional | Tische, Kapazitäten, Buchungsfenster und Schließtage, manuelle Zusagen und Absagen, drei Widget-Layouts. [Anleitung](hospitality.md) |
| Visuelles CMS, Seiten und Abschnittsbibliothek | Enthalten | `/admin`, `src/components/admin/` |
| Karten, FAQ und andere Listen pflegen | Enthalten | Im Abschnitt hinzufügen, duplizieren, suchen, sortieren oder mehrere Titel einfügen. Das Raster passt sich der Anzahl an. |
| Interne Links bei Adressänderungen | Enthalten | Wird eine Seitenadresse oder Sprungmarke im Entwurf geändert, folgen passende interne Links. |
| Einstellungen suchen | Enthalten | Im Einstellungsbereich nach Begriffen wie SMTP, Schriften oder Consent suchen. |
| Speichern, Vergleich mit der Live-Fassung, Veröffentlichen, Konflikte, Versionen, Undo/Redo | Enthalten | CMS und `src/lib/db.ts` |
| Farben, Typografie, Navigation, Footer, fünf Ausgangslayouts | Enthalten | CMS, profilspezifischer Einstieg bei neuen Projekten und [Designstandard](../skills/website-starter/references/design-and-content.md) für die individuelle Gestaltung |
| Liquid Glass · iOS mit räumlicher Tiefe | Enthalten, ausdrückliche Gestaltungsoption für die vier Standardprofile | CMS Gestaltung oder `--aesthetic liquid-glass`; [Anleitung](recipes/liquid-glass.md). Bisherige Vorgaben bleiben erhalten. |
| Medienbibliothek, Alt-Text, Fokus, Rasterbild-Upload | Enthalten; eigener Blob-Store für Uploads nötig | CMS Medien |
| Galerien, Lightbox, Team, Leistungen, FAQ, Abläufe, Downloads | Enthalten | Abschnittsbibliothek; Downloads verlinken eigene Dateien |
| Blog, Beitragsstatus und drei Teaser-Layouts | Enthalten, standardmäßig aus | Beiträge, Abschnittsbibliothek und Seitenvorlagen |
| Seitenvorlagen für Blogübersicht, Beitragsdetail, Produktdetail, Kategorie und Suche | Enthalten | CMS Seitenvorlagen. Shop-Vorlagen erscheinen nach Einrichtung des Shops. |
| Ankündigung mit Zeitraum und Link | Enthalten | Abschnittsbibliothek |
| Animierter Hero mit 3D-Szene | Enthalten, einzeln hinzufügbar | Abschnittsbibliothek → Cinematic |
| Anfrageformular, Postfach, Notizen, Status, CSV | Enthalten | `/api/contact`, CMS Anfragen |
| SMTP-Benachrichtigungen | Enthalten, standardmäßig aus | Eigene SMTP-Verbindung im CMS |
| Karten, Videos und Einwilligungen | Enthalten | Externe Medien erst nach Zustimmung |
| GA4 / Matomo | Enthalten, ohne vorkonfigurierte IDs | CMS; Einwilligung und tatsächliche Einrichtung nötig |
| SEO, Sitemap, Robots, Open Graph, JSON-LD, `llms.txt` | Enthalten | Seiten-/Site-Einstellungen; JSON-LD passend zum Betrieb erweitern |
| Suchergebnis-Titel und Meta-Beschreibungen prüfen | Enthalten | Übersicht → Startcheck. Hinweise zu fehlenden und wiederholten Angaben. |
| Inhaber-Zugang und persönliche Teamzugänge | Enthalten | Team & Zugänge. Redaktion bearbeitet Entwürfe, das Shop-Team wickelt Bestellungen ab. |
| Betriebscheck mit letzten gespeicherten Bestätigungen | Enthalten | Übersicht. E-Mail-Test, Zahlungsstand und Zustand aktiver Social-Kanäle. |
| Kontrollierte Starter-Updates und verschlüsselte Sicherung | Enthalten | [Wartung und Wiederherstellung](maintenance.md) |
| Newsletter mit Design-Editor, Empfängergruppen, Double-Opt-in, Abmeldelink und Versandstatus | Enthalten, optional und standardmäßig aus | [Newsletter einrichten](newsletter.md) |
| Social-Studio für Beiträge, Bildfolgen und kurze Reels | Enthalten, optional und standardmäßig aus; unabhängig vom Profil | [Social-Studio](social-studio.md), CMS Einstellungen → Allgemein. Formatkopie, Mediensuche und Austausch im Rahmen. |
| Post-Planer und native Kanal-Connectoren | Optional enthalten, standardmäßig aus; benötigt Social-Studio, eigene Kanal-/App-Einrichtung und Queue | [Post-Planer](social-publishing.md), [Connectoren](social-connectors.md); Planung funktioniert auch unkonfiguriert |
| CMS-Assistent für gespeicherte Daten und bestätigte Aktionen, Texte, Seitenaufbau und Social-Entwürfe | Arbeitsbereich im Admin enthalten. Modellgestützte Vorschläge mit eigenem Anbieter. | [CMS-Assistent](ai-assistant.md); eigene bearbeitbare Nutzen-Section, öffentliche Beispiele ausschließlich lokal simuliert |
| Angebots- und Terminvorschläge mit persönlichem Freigabelink | Optional enthalten | Einstellungen → Projektfreigaben. Entscheidung erscheint in der Anfrage. Kalender, Kundenportal und Rechnungsprozess sind eigene Erweiterungen. |
| Podcast-RSS, Archiv, redaktionelle Overrides, Sync | Bauanleitung aus Amélie | [Podcast](recipes/podcast.md) |
| Bewertungen von externem Anbieter | Bauanleitung | [Bewertungen](recipes/reviews.md) |
| Visitenkarten / Druckstudio mit PDF-Ausgabe | Bauanleitung aus Amélie | [Druckstudio](recipes/print-studio.md) |
| Terminbuchung / Kalender | Bauanleitung | [Buchung](recipes/booking.md) |
| Kundenportal, CRM, Angebote, Rechnungen, Outbox | Bauanleitung; Kantiq vor Wiederverwendung erneut prüfen | [Portal und CRM](recipes/portal-crm.md) |
| Creator-Profil, optionale Creator-Abschnitte, isoliertes echtes Demo-CMS | Enthalten, nur ausdruecklich aktiviert | [Creator-Module](creator-modules.md) |
| Creator Media Kit mit Kooperationsanfragen | Enthalten im Creator-Profil | Seite „Media Kit“ oder Startlayout im Editor. Kennzahlen und Zeitraum redaktionell pflegen. |
| Shop mit Stripe Checkout, optionalem PayPal über Stripe, privaten Downloads und Bestellungen | Optionaler Kern enthalten. Händlerkonto, Webhook und Testkauf pro Projekt prüfen. | Shop und [Einrichtung](recipes/commerce.md) |
| Elektronischer Widerruf mit Bestätigung per E-Mail | Optional im Shop. Das Formular legt eine Nachricht im Anfragepostfach ab. | Einstellungen → Shop. Testwiderruf vor dem Start durchführen. |
| Offizielle Social-Quellen | Adaptervertrag vorhanden; Anbieteradapter je Kunde gesondert implementieren | [Creator-Module](creator-modules.md) |
| Deutsch und Englisch für Website und CMS | Enthalten. Beide Standardsprachen sind separat im CMS einstellbar | [Mehrsprachigkeit](recipes/multilingual.md) |
| Coach Studio für Rugby-Taktiken | Enthalten als eigenständiges Opt-in | [Coach Studio](coach-studio.md) |
| Vereinsverwaltung und privater Mitgliederbereich | Enthalten als eigenes Opt-in, unabhängig vom Coach Studio | [Club management](club-management.md): Rollen, Einladungen, Teams, Detailseiten, Termine, Ergebnisse, News, Nachrichten, Darstellung, App und Push |
| Interaktive 3D-Scroll-Story | Ausdrückliches Opt-in in jedem Profil | [3D-Scroll-Story](recipes/3d-scroll-story.md) mit kontinuierlicher GLB-Animation, Kapitelgestaltung und Browser-Abnahme |
| CMS als installierbare App, geführte Tour und Favicon/Appsymbole | Im Kern enthalten, Push je Gerät freiwillig | [App & notifications](workspace-apps.md) |

Ein Briefing kann jede dieser Funktionen anfordern. Der Skill verwendet den vorhandenen Kern und ergänzt nur die konkret benötigten Erweiterungen. Keine leeren Menüpunkte oder scheinbar aktiven Funktionsschalter anlegen.

Die gemeinsame Verwaltung und der visuelle Wochenplaner sind in [Admin-Arbeitsbereich](admin-workspace.md) beschrieben. Die Einrichtungshilfe ist bei Bedarf erreichbar; bestehende Modul- und Veröffentlichungsgrenzen bleiben erhalten.

Für Upgrades und neue Websites die [gemeinsamen Modulabläufe](../skills/website-starter/references/admin-modules.md) als Abnahmematrix nutzen.

### Admin-Usability · 1.12.2

Gemeinsamer Schutz vor dem Verwerfen lokaler Dialogeingaben, mobile Studio-Werkzeuge ohne überlagernde globale Navigation und Zahlenbearbeitung mit erlaubten Zwischenständen. Details und Prüfgrenzen stehen in [Admin-Arbeitsbereich](admin-workspace.md). Kunden-/Finanzabläufe bleiben eine gesonderte Umsetzung nach [Portal-/CRM-Rezept](recipes/portal-crm.md), kein automatisch aktiviertes Starter-Modul.

## Visuelle Abschnitte

Unter **Abschnitt hinzufügen** stehen diese visuellen Bausteine für alle Profile bereit.

- **Bildbühne** mit großer Überschrift, einem eigenen Motiv und bis zu zwei Aktionen. Unter **Gestaltung** stehen Panorama, Porträtfokus und eine Anordnung nebeneinander zur Wahl.
- **Fotogeschichte** mit einem Motiv, das auf breiten Bildschirmen stehen bleibt und beim nächsten Kapitel sanft wechselt. Auf schmalen Bildschirmen und bei reduzierter Bewegung stehen die Kapitel mit ihrem jeweiligen Bild untereinander.
- **Szenenwechsel beim Scrollen** mit großflächigen Bildern und Texten. Beim Scrollen schieben sich die Szenen seitlich aus der Bühne. Auf kleinen Bildschirmen und bei reduzierter Bewegung sind die Szenen direkt untereinander lesbar.
- **Animierter Ablauf** für eine Beispielanfrage, Freigabe oder Übergabe. Besucher können zu einem Schritt springen, den Ablauf pausieren und weiterschalten. Die automatische Wiedergabe läuft im sichtbaren Bereich bei aktivierter Bewegung.
- **Projektgalerie** mit einem großen Motiv, Beschreibung und optionalem Link je Eintrag. Mit den Pfeilen lässt sich auch auf dem Smartphone zwischen Einträgen wechseln.
- **Filterbare Projektübersicht** mit einem großen Auftaktprojekt und einer Übersicht der weiteren Arbeiten. Projekte derselben Kategorie erscheinen unter einem Filter.
- **Themenverzeichnis** mit übersichtlichen Zeilen für Titel, Erklärung, kleines Bild und Link. Es eignet sich für Leistungen, Themen und redaktionelle Empfehlungen.

Das Profil `services` verwendet auf der Leistungsseite die klickbare **Leistungen**-Übersicht. Beim Wechsel passt sich das Bild zusammen mit der Beschreibung an. `consulting` startet mit einem Szenenwechsel und zeigt einen animierten Ablauf unter `/ablauf`. `portfolio` zeigt auf der Projektseite die filterbare Übersicht.

Im Seiteneditor sind Kapitel und Galerieeinträge direkt zugänglich. Unter **Gestaltung** lassen sich Farben, Abstände, Bildseite und Bewegung einstellen. Ersetzen Sie die lokalen, generierten Beispielmotive und Texte vor dem öffentlichen Start.

Sanfte Einstiege sind Bestandteil der Ausgangsgestaltung. Ausgewählte Texte und Karten erscheinen einmal beim Eintritt in den Sichtbereich. Bedienbare Karten und Buttons geben Feedback für Zeiger und Tastatur. Die Einstellung „Sanft einblenden“ liegt im Abschnitt; „Keine Animation“ und die Systemeinstellung für reduzierte Bewegung deaktivieren sie. Scroll-Szenen behalten eigene Bewegungsabläufe.

## Animierter Hero

Wählen Sie **Abschnitt hinzufügen → Cinematic → Animierter Hero**. Die mitgelieferte 3D-Szene zeigt den Aufbau eines Sideboards aus Nussbaum. Über **Animation startet** wählen Sie die automatische Schleife oder die Kamerafahrt beim Scrollen. **Animation testen** zeigt die Bewegung schon im Entwurf. Überschrift, Text, Links und Standbild bleiben bearbeitbar.

Für eine eigene Szene legt das Projektteam eine GLB-Datei unter `public/assets/motion-story/models/` ab. Sie enthält Geometrie, Texturen und mindestens einen Animationsclip. Der Hero spielt den ersten Clip und übernimmt eine eingebettete Perspektivkamera, falls vorhanden. Hinterlegen Sie den öffentlichen Modellpfad und das Standbild im Editor. Das Standbild erscheint auch bei reduzierter Bewegung oder wenn der Browser WebGL nicht bereitstellt. Die Render-Schleife pausiert außerhalb des Sichtbereichs.

Die Modi **Material verwandeln** und **Elemente zusammenführen** stehen weiterhin für freigestellte PNG- und WebP-Motive zur Verfügung. Vorhandene Abschnitte behalten ihre gewählte Darstellung.

## Vorlagen und Sortiment (1.13.0)

[Dokument-Studio, E-Mail-Vorlagen und Sortiment](business-studio.md): echte PDF-Vorschau, Logo und Layout, bearbeitbare automatische Mails, Produktgruppen, Dienstleistungen, feste Steuerregeln und Liefergebiete. Shop-Rechnungen und private Originale sind ausdrücklich konfigurierbar.

## Mehrkanal-Versand · 1.14.0

Der native Versand ist für Instagram, Facebook-Seiten, Threads, LinkedIn, Pinterest, YouTube und Bluesky enthalten. Alle verwenden die vorhandene dauerhafte Queue, ausdrückliche Inhaltsfreigabe und ein eigens autorisiertes Ziel. TikTok verwendet eine terminierte Inbox-Übergabe über eine beim Anbieter verifizierte HTTPS-Domain; der letzte Veröffentlichungsschritt erfolgt in TikTok. Einrichtung unter **Post-Planer → Kanäle verbinden**. [Prüfbericht und Funktionsmatrix](social-connectors-verification-2026-11-04.md). Ohne eigene Anbieterfreigaben, Konto und Queue wird nichts automatisch gesendet.

Die **Webanalyse** bündelt Besucher, Besuche, Aufrufe, aktive Zeit, Zielseiten und erfasste Geschäftsergebnisse. Zeiträume lassen sich vergleichen und nach Seite, Gerät, Land, Herkunft und Kampagne eingrenzen. Die geschützte Live-Ansicht nutzt die vorhandenen Statistik-Signale der letzten fünf Minuten. Der Consent-Bereich und der dynamische Datenschutzhinweis erläutern diese Auswertung. Bei neuen Starter-Installationen ist die Webanalyse eingeschaltet und misst erst nach ausdrücklicher Statistik-Einwilligung. Unter **Webanalyse → Einrichten** lässt sie sich ausschalten. Gespeicherte Aus-Einstellungen bestehender Projekte bleiben erhalten.
