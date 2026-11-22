# Optionaler Post-Planer

Ab Starter 1.5.0 enthält der Planer die manuelle Planung für Instagram, TikTok, YouTube, LinkedIn, Facebook, Pinterest, Threads und Bluesky. Neue Einträge sind manuell. Studio und Planer sind über einen gemeinsamen Umschalter erreichbar; Text-/Linkquellen, unabhängige Kanalkopien, manuelle Erledigung und TXT-/CSV-/ICS-Exporte sind enthalten. Der [Kanalablauf](social-platforms.md) erklärt die Bedienung und trennt Planung von tatsächlichem API-Versand. Das Modul bleibt standardmäßig aus. Ab Starter 1.6.0 ergänzt [Eigene Social-Kanäle verbinden](social-connectors.md) die nativen zusätzlichen Connectoren. Der folgende technische Abschnitt beschreibt den weiter bestehenden Instagram-Versand.

Der private Post-Planer ergänzt das Social-Studio um gespeicherte Planungen, Kalender beziehungsweise mobile Agenda, Captions, Bildbeschreibungen und ausdrücklich freizugebende Veröffentlichungen auf Instagram, Facebook-Seiten, Threads, LinkedIn, Pinterest, YouTube und Bluesky sowie eine TikTok-Inbox-Übergabe. Fertige Bildposts und unterstützte MP4-Reels können auch direkt vom Gerät hochgeladen werden. Das Modul bleibt in allen fünf Profilen standardmäßig aus. Entwürfe und Termine lassen sich auch ohne Kontoverbindung speichern. Ein öffentlicher Creator-Tools-Beispielplaner ist eine getrennte lokale Simulation und ruft diese APIs nicht auf.

## Aktivieren

```sh
node scripts/create-site.mjs --name "Eigenes Studio" --out "../eigenes-studio" --features social-publishing
```

`--social-publishing` ist gleichwertig. Ein Briefing kann `modules.socialPublishing.enabled: true` enthalten. Der Generator aktiviert das benötigte Social-Studio mit, wenn dessen Angabe fehlt. Ein ausdrücklich ausgeschaltetes `modules.socialStudio` widerspricht dem Publishing-Opt-in und wird abgelehnt; beide Module dann bewusst einschalten. Nur `enabled` ist in diesen öffentlichen Konfigurationsobjekten erlaubt. Konten, Tokens, Captions und Termine gehören dort nicht hinein.

In bestehenden Websites unter **Einstellungen → Allgemein → Post-Planer** aktivieren und den Entwurf speichern. Menü, `/admin/social/planner` und APIs verwenden ausschließlich den gespeicherten Modulstand. Das Abschalten des Social-Studios schaltet auch den Planer aus. Eine öffentliche Website-Veröffentlichung ist für die private Aktivierung nicht nötig.

Das Abschalten hebt bisherige Versandfreigaben dauerhaft auf. Beim Speichern und beim Wiederherstellen eines Website-Stands wird ein privater Freigabezähler innerhalb derselben Speicheroperation erhöht. Nach erneutem Einschalten brauchen alte Beiträge eine neue bewusste Prüfung und Freigabe. Überfällige Beiträge werden dadurch nicht automatisch versendet. Private Planungsdaten bleiben erhalten.

## Vom Entwurf zur Veröffentlichung

1. Einen gespeicherten Social-Entwurf oder eine neutrale Vorlage wählen. Ein eigener vollständiger Projektstand wird für die Planung eingefroren.
2. Caption, Bildbeschreibung, Konto, Zeitpunkt und IANA-Zeitzone festlegen und speichern. Ungültige Ortszeiten bei der Zeitumstellung werden abgelehnt; eine doppelte Ortszeit braucht eine ausdrückliche UTC-Abstandswahl.
3. Genau die zu sendende Datei vorbereiten oder hochladen und ansehen. Spätere Designänderungen verändern dieses Medium nicht. Ein neuer Quellstand muss bewusst übernommen und vorbereitet werden.
4. Konto, Inhalt, Medium und Zeitpunkt in der Zusammenfassung prüfen und ausdrücklich freigeben. Ohne eingerichtete technische Voraussetzungen bleibt diese Aktion gesperrt.
5. „Warteschlange ausstehend“ bedeutet noch keine bestätigte Einplanung. Erst eine bestätigte Queue-Nachricht ergibt „Geplant“. „Veröffentlicht“ setzt eine tatsächliche Bestätigung des gewählten Anbieters voraus. TikTok bleibt nach bestätigter Übergabe bei „In TikTok freigeben“.

Änderungen an Inhalt, Konto, Termin oder Medium heben eine vorhandene Freigabe auf. Speichern nutzt Revisionen und Vorgangskennungen; Konflikte dürfen den lokalen Entwurf nicht überschreiben. Ein bestätigter veröffentlichter Versuch bleibt unveränderlich. Ein Abbruch stoppt zukünftige Schritte, entfernt aber keinen bereits beim Anbieter veröffentlichten Beitrag.

## Bereits fertige Beiträge hochladen

**Fertigen Beitrag hochladen** öffnet eine eigene Dateiauswahl. JPEG, PNG und fertige H.264-MP4-Dateien bis 4 MB werden tatsächlich serverseitig geprüft. Ein verständlicher Titel hilft beim Wiederfinden. Nach erfolgreicher Prüfung erscheint die geschützte echte Vorschau im Planungseditor; Caption, Bildbeschreibung, Konto, Datum und Zeitzone lassen sich dort ergänzen und speichern. Ein neuer Upload wird als manuelle Planung mit geprüfter Datei und ohne Versandfreigabe gespeichert.

Hochgeladene Dateien werden nicht als bearbeitbare Studio-Designs ausgegeben. Ihre Quelle trägt `origin: upload`, eine eigene Medien-ID und die Prüfsumme der normalisierten Datei. Der Projekt-Snapshot ist tatsächlich `null`. Studio-Quellen behalten ihren echten Projektstand; alte Quellen ohne `origin` bleiben unverändert lesbar. Ein normaler Speichervorgang kann weder eine Upload-Quelle erfinden noch die Datei einer anderen Planung übernehmen.

**Datei ersetzen** übernimmt eine neue geprüfte Datei in genau einem neuen Planungsstand. Gespeicherte Caption, Konto und Termin bleiben erhalten; eine alte Freigabe wird aufgehoben. Vor dem Ersetzen müssen lokale Änderungen gespeichert werden. Fehlgeschlagene Prüfungen behalten Dateiauswahl und Titel in der Oberfläche und lassen die bisherige Datei unverändert. Ein erneuter Versuch mit derselben Vorgangskennung legt keinen zweiten Beitrag an; dieselbe Kennung mit anderen Dateibytes wird abgelehnt. Veröffentlichte, geleaste oder bereits final angefragte Versuche lassen sich nicht ersetzen. Bei Bedarf eine neue Planung durch erneuten Upload anlegen; ein automatisches Kopieren registrierter Upload-Medien ist nicht enthalten.

PNG und JPEG werden ohne Zuschnitt als sRGB-JPEG vorbereitet. MP4-Dateien werden nicht neu komprimiert. MOV, HEIC, WebM, unpassende Seitenverhältnisse und zu große Dateien brauchen einen passenden eigenen Export. Sowohl Quelldatei als auch normalisiertes Ergebnis müssen innerhalb von 4 MB liegen.

## Eigene Instagram-Einrichtung

Neue Meta-Apps verwenden die Instagram API mit Unified Login, Version `v26.0`: Professional-Konto, Business-Portfolio, Meta App-ID/-Secret, Konfigurations-ID und die Rechte `instagram_basic` sowie `instagram_content_publish`. Vorhandene Apps können ihren bisherigen Instagram Login mit `instagram_business_basic` und `instagram_business_content_publish` behalten. Für fremde Kundenkonten sind die von Meta verlangten Advanced-Access-/Live-Freigaben und App Review erforderlich. Die vollständige aktuelle Einrichtung und Unterschiede stehen in [Social-Connectoren](social-connectors.md). Ein privates persönliches Konto genügt nicht.

Die erweiterte Betreiber-Einrichtung im Planer speichert eigene Konto-ID, langlebigen Zugriffstoken und tatsächliche Ablaufzeit. Der Token wird mit dem eigenen `AUTH_SECRET` verschlüsselt und nach dem Speichern nicht ausgegeben. „Konto prüfen“ führt beim späteren echten Betrieb einen lesenden Anbieteraufruf aus; ein nur gespeicherter Zugang ist noch keine geprüfte Verbindung. Abgelaufene oder geänderte Zugänge stoppen alte Freigaben. Langlebige Tokens müssen rechtzeitig aus der eigenen Meta-Einrichtung erneuert werden; dieser ältere manuelle Zugang ist von der inzwischen vorhandenen nativen OAuth-Verbindung unter „Kanäle verbinden“ getrennt.

Diese Implementierung enthält keine vorkonfigurierten Konten oder Anbieterzugänge. Die nativen zusätzlichen Connectoren sind in [Social-Connectoren](social-connectors.md) beschrieben und benötigen eigene Einrichtung und Anbieterfreigaben. TikTok bleibt eine Inbox-Übergabe; Twitch-Veröffentlichung ist nicht implementiert. Öffentliche Social-Feeds sind davon unabhängig.

## Medien und Ressourcen

Unterstützt werden einzelne JPEG-Bilder im Instagram-Bereich 4:5 bis 1,91:1, Breite 320–1440 px, sowie H.264-MP4-Reels im Format 9:16 mit 3–90 Sekunden. Die erste Uploadstrecke begrenzt jede Datei auf **4 MB**. PNG/WebP werden bewusst als sRGB-JPEG vorbereitet; Transparenz wird dabei weiß. Es erfolgt kein stilles Zuschneiden. WebM, nicht passende Seitenverhältnisse und zu große Dateien werden mit einem Korrekturhinweis abgelehnt. Ein Reel braucht mindestens 15 Minuten Vorlauf, ein Bild zwei Minuten.

Die genaue Datei liegt unveränderlich mit Prüfsumme unter `.data/publishing-media` in der lokalen Entwicklung beziehungsweise im **eigenen privaten Blob-Store dieser Website** unter `social-publishing/`. Dafür gilt `PRIVATE_SOCIAL_BLOB_READ_WRITE_TOKEN`, niemals der öffentliche Medientoken oder ein Store einer anderen Website. Instagram erhält eine kurzlebige HMAC-URL unter der eigenen öffentlichen HTTPS-Adresse. GET, HEAD und einzelne Byte-Ranges sind unterstützt. Die Route prüft aktuelle Freigabe, Generation, Modulzähler und Kontoverbindung; sie liest nur eigene gespeicherte Medien und lädt keine beliebigen URLs. Private Vorschaurouten brauchen weiterhin eine Adminsitzung.

## Dauerhafte Warteschlange

Die native Vercel Queue (`@vercel/queue@0.10.0`) verwendet das Topic `website-social-publishing-v1` und den in `vercel.json` definierten Empfänger `/api/queues/social-publishing`. Im eigenen Vercel-Projekt den Queue-Trigger tatsächlich einrichten beziehungsweise dessen Bereitstellung prüfen, den täglichen geschützten Wiederherstellungslauf konfigurieren und erst danach `SOCIAL_PUBLISHING_QUEUE_ENABLED=1` setzen. Ohne diese ausdrückliche Serverfreigabe ist automatisches Senden aus. `AUTH_SECRET` muss projektbezogen und mindestens 32 Zeichen lang sein; die öffentliche HTTPS-Adresse stammt aus den eigenen Website-Einstellungen.

Eine Freigabe speichert zuerst einen dauerhaften Wake-Auftrag im privaten Datensatz. Enqueue und externe Anbieteraufrufe liegen außerhalb wiederholbarer CAS-Updates. Termine innerhalb der nächsten sechs Tage werden mit sieben Tagen Nachrichten-Aufbewahrung übergeben. Weiter entfernte Termine bleiben vorgemerkt; der tägliche Lauf übergibt sie vorab, sobald sie im Horizont liegen. Dieser Lauf ist eine Wiederherstellung und Vorausplanung, kein minutengenauer Timer. Die Queue übernimmt fällige Schritte ohne geöffneten Browser. Hosting- und Queue-Kontingente sowie die tatsächliche Verarbeitung können Zeitabweichungen verursachen.

Jede Nachricht trägt eine eigene HMAC-Freigabe für Topic, Planung, Generation und Wake-ID. Jeder Verarbeitungsschritt prüft aktuellen Modulstand, Freigabezähler, Inhalt, Dateiprüfsumme, Konto und Lease erneut. Containeranlage, Statusprüfung und finaler Publish sind getrennte dauerhafte Schritte. Der Container wird vor dem nächsten Schritt gespeichert. Ein fehlgeschlagenes Folge-Enqueue kann über den alten Wake erneut vorgemerkt werden, ohne den Container erneut anzulegen.

Vor der finalen Instagram-Anfrage wird eine dauerhafte Startmarkierung gespeichert. Nach einem Absturz oder unklarer Antwort folgt „Prüfung nötig“, niemals ein blind wiederholtes Publish. „Instagram-Status prüfen“ verwendet dafür nur einen lesenden Containerstatus. Solange die finale Anfrage läuft, lassen sich deren Konto und Zugang nicht austauschen. Während eines bereits laufenden Anbieteraufrufs kann keine Oberfläche einen Rückruf garantieren.

## Speicherung und Prüfung

Private `ws_records`-Sammlungen: `social-publications`, `social-publishing-connections`, `social-publishing-media`, `social-publishing-control`. Es ist kein neues Datenbankschema nötig. Aufbewahrte Planungs-Snapshots schützen referenzierte CMS-Medien vor versehentlichem Löschen. Vorbereitete Veröffentlichungsdateien werden derzeit bewusst aufbewahrt; eine automatische Löschung aktiver oder historischer Dateien ist nicht enthalten.

Lokale Prüfungen verwenden injizierte Uhr, Queue, Speicher und Instagram-Antworten. Sie ersetzen keine Prüfung gegen die eigene Meta-App, deren tatsächliche Berechtigungen, den privaten Produktionsspeicher oder den echten Queue-Trigger. Im Starter ist keine reale Veröffentlichung durchgeführt. Vor einer kundenseitig gewollten echten Freigabe mit eigenen Testressourcen Ablauf, Erreichbarkeit der signierten Medien, Providerannahme des MP4 und Quoten prüfen. Keine Testveröffentlichung ohne konkreten Auftrag senden.

Primärquellen: [Meta Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/), [Meta Medienreferenz](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/), [Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/), [Vercel Queues](https://vercel.com/docs/queues), [Queue-Kontingente](https://vercel.com/docs/queues/pricing).


## Gemeinsame Instagram-Bildfolgen

Ab diesem Stand kann ein eigener Studio-Post mit 2 bis 20 Folien ausdrücklich als Carousel geplant werden. Jede Folie wird getrennt vorbereitet (JPEG, höchstens 4 MB, gleiches Format), inklusive eigener Bildbeschreibung und geschützter Vorschau. Alle Dateien müssen vollständig sein. Die Freigabe mit mindestens fünf Minuten Vorlauf bindet Reihenfolge, alle Prüfsummen, Konto, Caption und Termin. Danach übernimmt die bestehende dauerhafte Queue auch bei geschlossenem Browser. Bestehende Einzelbild-Planungen ändern ihr Verhalten nicht. Upload- und Linkquellen werden nicht stillschweigend zu Carousels. Andere Plattform-Carousels und Stories sind hier keine automatisch unterstützten Formate.

## Oberfläche ab Template 1.12

Der Planer startet mit einer visuellen Woche; Monat und Liste, Suche und Status-/Kanalfilter sind direkt erreichbar. Beiträge bearbeiten Sie nach Auswahl in einem geschützten Dialog. Auf Smartphones stehen kleine Vorschauen vor dem Text. Einrichtung und ausführliche Hinweise bleiben über Kanäle und Hilfe erreichbar. Siehe [Admin-Arbeitsbereich](admin-workspace.md). Dies ändert keine Versandfreigabe oder Anbieterberechtigung.
