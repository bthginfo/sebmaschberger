# Creator-Profil und optionale Module

`--profile creator` aktiviert die Creator-Darstellung ausdrücklich. `services`, `portfolio`, `consulting` und `editorial` verwenden ihre jeweiligen Startlayouts und die gemeinsame Abschnittsbibliothek. Fehlende Moduleinstellungen bedeuten aus. Das neue Profil aktiviert keine Zahlung und verbindet kein Plattformkonto.

Das [Social-Studio](social-studio.md) ist davon unabhängig und bleibt auch im Creator-Profil standardmäßig aus. `--features social-studio`, das entsprechende Briefing-Modul oder eine gespeicherte Aktivierung im CMS schalten ausschließlich den privaten Post- und Reel-Editor frei. Die öffentlichen Plattformquellen und die Creator-Demo sind getrennte Funktionen.

## Inhalt und CMS

Öffentliche Einstellungen liegen in `config.modules`; redaktionelle Inhalte bleiben in Seiten und Abschnitten. Sie durchlaufen denselben Entwurf, dieselbe Revision und dieselbe Veröffentlichung wie der übrige Auftritt. Ergänzende Abschnittstypen unterstützen Hero, Plattformen, Shop, Werkzeuge, Hero-Galerie, Media-Kit, Links, einen eingebetteten Demo-Browser, einen Website-Remix, einen Content-Orbit, ein Bildportal und Scroll-Erzählungen. Zehn Hero-Kompositionen sind Abschnittsvorgaben und keine weiteren globalen Designvarianten.

Die gemeinsame Komponentenschnittstelle steht in `src/lib/creator/types.ts`. Neue Darstellungen verwenden `EditableText`, `EditableImage`, `ContentLink` und stabile `data-item-id`-Attribute. Auswahl und Sichtbarkeit verwaltet der gemeinsame Renderer. Globale Kernabschnitte bleiben verwendbar.

`DemoCms` verwendet den tatsächlichen dreispaltigen `PageEditor`. Sein Adapter hält Entwurf, Veröffentlichung, Versionen und Medien ausschließlich im Sitzungsspeicher des Browser-Tabs. Lokale Bildimporte bis 1 MB werden nicht hochgeladen. Bei erschöpftem Sitzungsspeicher bleibt der offene Arbeitsstand im Speicher und die Oberfläche meldet die Einschränkung. Das normale `/admin` verwendet weiterhin die authentifizierte dauerhafte API.

Der gemeinsame Website-Editor enthält bereits die direkten Seitenänderungen, Seiten- und Abschnittssortierung, Live-Vorschau, Mobilansicht, Vollbild, Medienauswahl und den kompakten Bedienbereich der Creator-Demo. Diese Funktionen bleiben im Starter erhalten. Das Social-Studio ergänzt eine eigene Zeichenfläche; es ersetzt weder den Website-Editor noch dessen Entwurfs- und Veröffentlichungsablauf. Verwendete Medien werden zusätzlich gegen veröffentlichte Inhalte, aufbewahrte Revisionen und gespeicherte Social-Projekte geprüft, bevor sie löschbar sind.

Die generische Route `/demo/[creator]/[[...path]]` ist nur erreichbar, wenn `config.modules.creator.enabled` und der freigegebene `demoBasePath` übereinstimmen. Sie ist stets `noindex`. `src/data/creator-demo.json` enthält ausschließlich das öffentliche fiktive Beispiel. In einer neuen Kundenwebsite wird diese Datei durch deren eigens ausgearbeitetes Beispiel ersetzt; Daten und Medien anderer Kunden dürfen nicht übernommen werden.

Der Abschnitt `creator-demo` zeigt die eigene fiktive Website in einem gleichursprünglichen iframe mit wirklicher Seitennavigation. Website und CMS bleiben beim Umschalten und im Vollbild eingehängt; Warenkorb, Navigation und ungespeicherter Entwurf bleiben erhalten. Der Editor wird erst auf ausdrückliche Auswahl geladen. Veröffentlichungen werden über gefilterte Sitzungsspeicher-Ereignisse und nach Quelle, Ursprung und Vorlagenversion geprüfte Nachrichten sichtbar. Die unveränderte Ausgangsvorlage bestimmt einen Versionsschlüssel: aktualisierte Beispiele übernehmen keinen veralteten lokalen Arbeitsstand. Ausschließlich die öffentlichen `/demo/...`-Routen erlauben `SAMEORIGIN`; die übrigen Seiten einschließlich Admin behalten ihre Framing-Sperre.

Der öffentliche Server-Einstieg bindet Creator-Stile vor der ersten Darstellung ein; ein bedingter Client-Einstieg lädt Creator-JavaScript nur bei aktiviertem Modul. Neue öffentliche Abschnittsstile in `src/components/creator/creator-critical-styles.ts` registrieren. Die dynamische Editor-Darstellung bleibt separat, damit normale Profile und ungeöffnete CMS-Beispiele keine Editor-Pakete benötigen. Eigene Schriften werden lokal aus dem Dokument vorgeladen; interne Inhaltslinks verwenden die bestehende Next-Navigation. Downloads und geschützte Werkzeuge bleiben normale Links.

Auch gewöhnliche Kontakt-, Video- und Kartenabschnitte sind im öffentlichen Beispiel isoliert: kein echter Versand, kein Tracking und keine externen Embeds. Die Bildauswahl erhält einen separaten Medienadapter, damit auch direkte Bildbearbeitung keine Admin-API verwendet.

## Plattformquellen

`mockSocialSource` liefert ausschließlich lokale, gekennzeichnete Platzhalter und benötigt keinen Anbieterzugang. Instagram, TikTok, YouTube, Twitch, Spotify und Discord können so gezeigt werden, ohne ein tatsächliches Konto oder eine fremde Einbettung zu laden.

`officialSocialSource` ist ein Adaptervertrag für separat eingerichtete offizielle Anbieteranbindungen. Ohne registrierten Adapter meldet er `unconfigured`, bei Abruffehlern `error`. Der Kern enthält keine vorkonfigurierten Konten und behauptet keine fertige Synchronisation mit allen Plattformen. Einen benötigten offiziellen Adapter je Kunde implementieren, mit dessen eigenen Zugangsdaten einrichten und prüfen. Geheimnisse bleiben im Servermodul beziehungsweise in privaten Einstellungen; der veröffentlichte Inhalt erhält nur freigegebene Ergebnisse.

## Shop einrichten

Der optionale Shop enthält serverseitige Preis- und Variantenprüfung, Bestandsreservierung, Stripe Checkout, signierte Webhooks, private Bestellungen, geschützte Downloads und wiederholbaren E-Mail-Versand. Der veröffentlichte Demo-Shop bleibt ein getrenntes lokales Beispiel ohne Zahlung. Eine vorhandene Konfiguration ist noch kein Nachweis einer Händlerfreigabe oder erfolgreichen Testzahlung.

1. Im CMS das Shop-Modul ausdrücklich aktivieren. Echte Produkte, Varianten, Endpreise und Versand als Entwurf vorbereiten. Jeder Produktpreis muss mindestens 0,50 € betragen; Produktpreis und Bestellsumme sind auf 999.999,99 € begrenzt. Kostenlose Bestellungen und Rabattcodes sind nicht eingerichtet. Steuern, Versandländer, Verbraucherinformationen und Rückabwicklung für den eigenen Betrieb klären.
2. Digitale Produkte zuerst als Entwurf speichern. Danach im geschützten CMS die eigene ZIP-, PDF-, PNG-, JPEG- oder WebP-Datei bis 4 MB hochladen. Der Server prüft Produktzugehörigkeit, Dateigröße, Dateisignatur und privaten Speicher. Erst nach der Dateiprüfung Produkt und Website veröffentlichen. Öffentliche Medien sind keine geschützten Produktdateien.
3. Das eigene Stripe-Konto mit eigenen Testschlüsseln einrichten lassen: `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` bleiben ausschließlich auf dem Server. Webhook-Ziel: `/api/commerce/webhook`. Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
4. Karte ist die Basis. PayPal wird über Stripe verarbeitet, nicht über eine separate PayPal-Anbindung. Erst nach Aktivierung und tatsächlicher Verfügbarkeit im eigenen Händlerkonto `STRIPE_PAYPAL_ENABLED=1` setzen lassen. Die CMS-Anzeige unterscheidet einen gesetzten Schalter von einer ungeprüften Händlerverfügbarkeit. Angefordert werden ausschließlich Karte und gegebenenfalls PayPal.
5. Für digitale Waren ausschließlich den eigenen privaten Blob-Store mit `PRIVATE_COMMERCE_BLOB_READ_WRITE_TOKEN` verbinden lassen. `AUTH_SECRET` benötigt mindestens 32 Zeichen. Unter Einstellungen eine eigene HTTPS-Website-Adresse ohne Unterpfad, Suchparameter oder Zugangsdaten speichern. `COMMERCE_SHIPPING_COUNTRIES` enthält erlaubte ISO-Ländercodes, zum Beispiel `DE,AT`; ohne Angabe gilt `DE`.
6. Eigenes SMTP im CMS einrichten und testen. Bestellmails verwenden den veröffentlichten Namen, die Bestellübersicht und einen persönlichen signierten Statuslink. Fehlender oder fehlerhafter Versand verliert keine Bestellung; der tatsächliche Mailstatus bleibt im CMS sichtbar und der Versand wiederholbar.
7. Die Einrichtung im Shop-Bereich prüfen. Nach eigenen Sandboxprüfungen `COMMERCE_CHECKOUT_ENABLED=1` setzen lassen. Dieses serverseitige Tor und der veröffentlichte Shop müssen neue Zahlungen erlauben. Die Bereitschaftsanzeige zeigt nur vorhandene technische Angaben, keine erfolgreiche Händler- oder Zahlungsprüfung. Das Abschalten neuer Verkäufe sperrt bestehende Bestellzugänge, bezahlte Downloads und die Bestellverwaltung nicht.

### Angefangene Kasse und Bestände

Die Checkout-API akzeptiert Produkt-ID, Variante und Menge. Preise und Versand stammen aus dem veröffentlichten Katalog. Der Browser speichert einen zufälligen Bestellschlüssel je angefangenen Warenkorb in diesem Tab. Bei Rückkehr oder Neuladen wird dieselbe Kasse fortgesetzt. Bei einem geänderten Warenkorb beendet der Server die vorige offene Stripe-Sitzung zuerst ausdrücklich; erst die Bestätigung des Zahlungsanbieters gibt deren Reservierung frei. Eine bloße Rückkehr mit `canceled=1` bestätigt weder eine Stornierung noch eine Zahlung.

Auf dem persönlichen Bestellstatus lassen sich Zahlungsstatus und dieselbe Kasse ausdrücklich prüfen. Die Kasse kann dort beim Anbieter beendet werden. Verarbeitung oder bestätigte Zahlung erzeugen bei Wiederholung keine neue Bestellung. Abgelaufene oder fehlgeschlagene Kassen bieten einen bewussten Neustart an.

Die serverseitig gespeicherte Checkout-Anfrage wird bei unklarem Netzwerkfehler unverändert mit demselben Stripe-Idempotenzschlüssel wiederholt. Es gilt Stripes Standardlaufzeit von 24 Stunden. Ist eine unbestätigte Anfrage ohne bekannte Stripe-Sitzungs-ID bereits 23 Stunden alt, wird sie nicht erneut erzeugt: Der Shop muss sie anhand der Bestellnummer prüfen. Solche unklaren Reservierungen werden nicht allein anhand der lokalen Uhr freigegeben.

Mehrere Warenkorbänderungen behalten die Kette früherer angefangener Kassen bei. Noch nicht abgesendete Zwischenstände ersetzen keinen bereits abgesendeten Bestellzugang. Auch wenn eine spätere Anfrage vor dem Anlegen einer Bestellung scheitert, prüft der Server bei der nächsten Kasse die älteren bekannten Bestellungen und beendet offene Sitzungen nur mit Anbieterbestätigung. Eine bereits bezahlte oder verarbeitete Zahlung stoppt den Neustart. Die Kette ist auf 20 frühere Zugänge begrenzt; bei Erreichen der Grenze bleibt sie vollständig erhalten und der Kunde wird zum vorhandenen Bestelllink oder zur Shop-Unterstützung geführt.

Der Bestand bezeichnet die Gesamtauflage einschließlich bereits bestellter Stücke. Offene und verarbeitete Zahlungen reservieren Bestand; bezahlte und erstattete Bestellungen bleiben bis zu einer bewussten Kapazitätsanpassung belegt. Die öffentliche Verfügbarkeitsanzeige berücksichtigt diese Belegung; der Server prüft beim Checkout nochmals atomar.

### Zahlungen, Erstattungen und Downloads

Zahlungsereignisse und Geschäftsänderungen werden mit atomarem Compare-and-swap in einem privaten Moduldatensatz gespeichert. Zahlungsbetrag, Währung und Checkout-/PaymentIntent-Zuordnung müssen stimmen. Doppelte Ereignisse erzeugen keine zusätzlichen Downloadrechte.

Teilrückerstattungen speichern den kumulativ erstatteten Betrag. Ältere oder doppelte Ereignisse verringern ihn nicht. Ohne bekannte Zuordnung zu einzelnen Artikeln bleiben die übrigen bezahlten Leistungen und digitalen Downloadrechte bei einer Teilerstattung bestehen. Eine vollständige Erstattung sperrt die Downloadrechte endgültig; ein später eintreffendes Zahlungsereignis gibt sie nicht erneut frei. Der physische Bestand wird durch eine Erstattung nicht automatisch aufgestockt.

Downloadlinks sind signiert, sieben Tage gültig und auf 20 Abrufe begrenzt. Der Bestellstatus zeigt gültige, abgelaufene, ausgeschöpfte und gesperrte Freigaben verständlich an. Jeder Abruf prüft den aktuellen Zahlungszustand erneut. Der Server liest ausschließlich private Shop-Dateipfade, prüft tatsächliche Bytes, Typ und Größe und zählt einen Abruf erst nach erneuter atomarer Berechtigungsprüfung. Antworten erhalten `private, no-store`, `nosniff` und `attachment`. Persönliche Bestelllinks vertraulich aufbewahren.

Der einfache Moduldatensatz ist für kleine Shops begrenzt: höchstens 5.000 Bestellungen und 15.000 verarbeitete Ereignisse. Vor Erreichen dieser Grenze in eigene transaktionale Tabellen mit Archivierung migrieren. Das Idempotenzarchiv wird nicht stillschweigend gelöscht. SMTP kann bei einem Absturz nach dem Versand und vor dessen Bestätigung eine Wiederholung erzeugen; Bestell- und Zahlungszustände bleiben davon unabhängig.

## Prüfung

Pure Modelltests und der injizierbare echte Commerce-Service prüfen Reservierung, unveränderte Timeout-Wiederholung, gleichzeitige Anfragen, providerbestätigten Abbruch, Verarbeitung, Preis-/Währungs-/Sitzungsfehler, abgeschaltete Neuverkäufe mit bestehendem Bestellzugriff, Teil-/Vollerstattung in verschiedenen Reihenfolgen, private Dateien und den konkurrierenden Downloadzähler. Die Tests verwenden ausschließlich lokale Provider-, Blob- und Mail-Doubles; sie bestätigen keine reale Anbieteranbindung.

Vor Freischaltung mit eigenen Testressourcen zusätzlich Checkout-Erfolg und Abbruch, PayPal, asynchrone Bestätigung, doppelte und anders sortierte Webhooks, Ablauf, Teil-/Vollerstattung, fehlende Datei, unberechtigten/abgelaufenen Download, Bestandskonkurrenz und SMTP-Ausfall/Wiederholung durchspielen. Anschließend den vollständigen Ablauf im echten CMS und auf Mobilgeräten prüfen.

Offizielle Grundlagen: [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions/create), [Checkout-Sitzungen beenden](https://docs.stripe.com/api/checkout/sessions/expire), [Stripe-Idempotenz](https://docs.stripe.com/api/idempotent_requests), [Erstattete Charge-Beträge](https://docs.stripe.com/api/charges/object), [Zahlungsgrenzen](https://docs.stripe.com/currencies), [PayPal über Stripe](https://docs.stripe.com/payments/paypal), [Stripe Webhooks](https://docs.stripe.com/events/manage-webhook-endpoints), [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk).

## Website-Remix

`creator-remix` ist ein optionaler, vollständig registrierter Abschnitt mit vier Bausteinen (`content`, `community`, `shop`, `kit`). Die gemeinsame Abschnittsbibliothek steht allen Profilen zur Verf?gung. `ContentItem.remixModule` benennt einen Baustein; `remixSelection` definiert eine von bis zu vier Beispielauswahlen. Die echten Inspector-Felder bearbeiten diese Zuordnung, Titel, Beschreibung, eigene Bilder und die Vorschautexte in `details`. Ein mit `default` markierter Beispiel-Mix ist der Startzustand. Die Bedienung steht wie bei den übrigen Creator-Abschnitten in einem `ui`-Eintrag.

Die manuelle Auswahl verändert die tatsächliche Anordnung; es gibt kein Autoplay und keine verschachtelte Scrollfläche. FLIP erhält die räumliche Beziehung bei Änderungen und kann durch die nächste Auswahl unterbrochen werden. Reduzierte Bewegung bleibt ohne räumliche Animation vollständig nutzbar. Der Kopierknopf bestätigt Erfolg oder einen verfügbaren Text-Fallback.

Die Anfrageaktion überträgt ausschließlich die gewählten, redaktionellen Bausteintitel als `service` und `message`. Das normale Kontaktformular liest beide Felder, zeigt sie editierbar an und verwendet anschließend unverändert die validierte Kontakt-API. Es wird weder automatisch eine Nachricht versendet noch ein Projekt angelegt. Die generischen Vorgaben enthalten keine Kundenbilder oder Kundendaten. Neue Abschnittsstile werden im Server-Einstieg `creator-critical-styles.ts` geladen.


## Orbit und Perspektivwechsel

`creator-orbit` verwendet bis zu sechs normale Einträge mit eigenen Bildern, Titeln, Labels und optionalen Links. Die identischen Karten werden ausgewählt, zusammengebracht und wieder verteilt. Der Editor zeigt dieselben Daten in einer frei bearbeitbaren Übersicht. `creator-lens` verwendet ein eigenes Bild und bis zu drei Einträge mit `lens: {x,y,radius}`. Diese Positionen und Größen bearbeiten Sie im normalen Inspector; die Beschriftungen sind die Titel der Einträge. Validierung und öffentliche Projektion erhalten die Zahlen. Maus, Bild-Taps, native Auswahlknöpfe und ein Tastatur-Regler steuern denselben Portalzustand, ohne Touch-Capture oder Scroll-Simulation.

Beide Abschnitte sind nur bei ausdrücklich aktiviertem Creator-Modul auswählbar. Sie registrieren ihr CSS im Server-Einstieg und behalten reduzierte Bewegung sowie sichtbare Inhalte vor JavaScript. Die optionale Schriftvariable `--kc-headline-font` kann ein kundeneigenes Headline-Alphabet ergänzen. Der neutrale Starter enthält weder Kantiq-Schriftdateien noch deren Marken-CSS oder Font-Preloads.

Der kompakte Website-Remix zeigt vier kurze Schalter, eine echte Modulkomposition und eine Anfrageaktion. Die bestehende Beispielauswahl, Zurücksetzen und Kopieren bleiben im aufklappbaren Bereich. Der vollständige gewählte Mix wird weiterhin als bearbeitbarer Text an das bestehende Kontaktformular übergeben.

## Engagement und Geräteansicht

Der optionale [Content-Weg und die mobilen Hero-Beispiele](creator-journey.md) zeigen, wie aus Inhalten eine Anmeldung, ein eigener Drop oder eine strukturierte Anfrage werden kann. Der bisherige Bildportal-Abschnitt bleibt unabhängig davon verfügbar.

`creator-engagement` beginnt mit einer scharfen HTML-Website und zieht sich beim nativen Scrollen in eine fotografierte Geräteansicht zurück. Desktop und Tablet zeigen einen Laptop, schmale Ansichten ein iPhone. Der begrenzte Weg benötigt ungefähr eine Bildschirmhöhe; es gibt weder Touch-Capture noch verschachtelte Scrollbereiche. Ein lokal bedienbares Herz füllt sich einmal während des Rückzugs. Es sendet keine Likes an Plattformen und zeigt keine erfundenen Reichweiten. Tastaturbedienung und `aria-pressed` bleiben verfügbar. Reduzierte Bewegung und die CMS-Bearbeitung zeigen die ruhige Geräteansicht ohne Scrollstrecke.

Überschrift, Unterzeile, Beschreibung, Beispielhinweis und optionale Aktion verwenden normale Inhaltsfelder. `images[0]` ist das Desktopmotiv, `images[1]` das Mobilmotiv; beide haben eigene Bild-, Alternativtext- und Ausschnittsfelder im Inspector. Ersatzbilder benötigen dieselbe Bildschirmposition, damit die projizierten Live-Inhalte auf dem Gerät bleiben. Die mitgelieferten generierten Fotos wurden für den neutralen Starter erstellt; Herkunft und Prompts stehen in `project/design/engagement-assets.json`. `profiles/creator-engagement.json` ist die gemeinsame neutrale Vorlage für Generator und Abschnittsbibliothek. Nur das ausdrückliche Creator-Profil verwendet sie standardmäßig auf Home; der Website-Remix ist weiterhin optional.

Die eingebetteten Beispiele sind standardmäßig vollständig bedienbar; der explizite Modus „Seite scrollen“ gibt native Gesten an die umgebende Seite weiter, während der optionale Vollbildmodus dieselben Instanzen und Arbeitsstände erhält. Der standardmäßig deaktivierte `embedded`-Prop des echten `PageEditor` passt nur die Demo-Oberfläche an; `/admin` bleibt unverändert.
