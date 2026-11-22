# Eigene Social-Kanäle verbinden

Der private Post-Planer enthält native Connectoren für Instagram, Facebook-Seiten, Threads, LinkedIn, Pinterest, YouTube, TikTok und Bluesky. Instagram kann direkt über die offizielle Anmeldung verbunden werden. Neue Planungen bleiben manuell; eine App-Konfiguration oder ein Termin veröffentlicht noch nichts.

## Einrichtung im CMS

Im Post-Planer **Kanäle verbinden** öffnen und den Kanal wählen. Die Anleitung nennt das offizielle Entwicklerportal, benötigte Produkte und Rechte sowie die genaue Rücksprungadresse. Diese Adresse kann schon vor dem Speichern einer App kopiert werden. App-ID und App-Geheimnis gehören nur in dieses geschützte Formular. Das Geheimnis wird verschlüsselt gespeichert und nicht zurückgegeben.

Danach die Anmeldung beim Anbieter starten, dessen Einwilligung prüfen und im CMS das tatsächlich vom Anbieter gelieferte Ziel ausdrücklich auswählen: Profil, Seite, Kanal oder Pinnwand. In der neutralen Vorlage bleibt jede Verbindung der eigenen Website-Marke zugeordnet. Ein Kanalzugang lässt sich nicht für eine andere Plattform oder Marke verwenden.

Es werden keine Developer-Apps automatisch angelegt. Testnutzer, Kontotypen, App Review, freigegebene Produkte, Quoten und öffentliche Sichtbarkeit hängen vom jeweiligen Anbieter ab. Die Oberfläche zeigt fehlende Einrichtung und Fehler; sie simuliert keine erfolgreiche Verbindung.

| Kanal | Hier implementierter Weg | Eigene Voraussetzungen |
| --- | --- | --- |
| Instagram | Unified Login für neue Meta-Apps; bisheriger Instagram Login für vorhandene Apps; einzelne JPEG-Bilder, explizite JPEG-Carousels (2–20 Folien) und MP4-Reels | Professional-Konto, Business-Portfolio, Meta App-ID/-Secret und config_id mit instagram_basic und instagram_content_publish; für Legacy die bisherigen Instagram-App-Daten und business_* Rechte |
| Facebook | Seitenbeiträge mit Text, JPEG oder MP4-Reel | Meta-App, verwaltete Seite, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`; geeignete Seitenrolle und gegebenenfalls App Review |
| Threads | Text, Link, JPEG oder MP4 | Threads-App, `threads_basic`, `threads_content_publish`; Advanced Access außerhalb der erlaubten Testkonten |
| LinkedIn | Profilbeiträge mit Text, JPEG oder MP4; optional Unternehmensseiten | Sign In with LinkedIn/OpenID Connect und Share on LinkedIn; `openid`, `profile`, `w_member_social`. Unternehmensseiten separat aktivieren: genehmigtes Community Management, passende Organisationsrechte und Seitenrolle |
| Pinterest | Bild- und Video-Pins auf einer ausdrücklich ausgewählten eigenen öffentlichen Pinnwand | Eigene App, Pin-/Pinnwand-Rechte. Trial-Pins sind nur für die erstellende Person sichtbar; reguläre Sichtbarkeit benötigt Standard-Zugriff |
| YouTube | MP4 privat hochladen, Verarbeitung prüfen, zum lokal freigegebenen Termin öffentlich stellen | Google-Cloud-App, YouTube Data API, Web-OAuth und `youtube.force-ssl`; Zielkanal und ausdrückliche Angabe „speziell für Kinder“ |
| TikTok | MP4 über eine signierte, verifizierte HTTPS-Adresse zum Termin in den TikTok-Posteingang übergeben | Eigene TikTok-App, Login Kit, Content Posting, verifizierte Medien-Domain/-Präfix und `user.info.basic`, `video.upload`. Caption, Musik, Sichtbarkeit und endgültige Veröffentlichung in TikTok abschließen |
| Bluesky | Text, JPEG oder MP4 mit einem vorgesehenen App-Passwort | Bluesky-gehostetes Konto; kein Developer-App-Projekt. App-Passwort einmalig eingeben, danach werden nur die verschlüsselten Sitzungstoken aufbewahrt. Video benötigt den von Bluesky verlangten Kontostand, unter anderem bestätigte E-Mail |

TikTok Direct Post und Foto-Uploads sind hier nicht implementiert. Direct Post ist kein Ersatz für die vorgeschriebene Prüfung eines zulässigen öffentlichen Anwendungsfalls. Für YouTube wird bewusst kein entferntes `publishAt` gesetzt: Stoppen oder Trennen soll keine bei Google hinterlassene spätere Veröffentlichung übersehen. Stories, Carousels auf anderen Plattformen und beliebig große Videos bleiben manuell. Instagram-Carousels aus eigenen Studio-Designs werden ausdrücklich als gemeinsame Bildfolge gewählt.

## Inhalt freigeben

1. Eigenen Studio-Stand, fertige Datei oder eine Textnotiz übernehmen. Externe Original-Links bleiben reine Planungshilfen; es werden keine fremden URLs als Medien heruntergeladen.
2. Kanal, passende Übergabeart und bestätigtes Zielkonto wählen. Caption, Bildbeschreibung, Termin und kanalspezifische Angaben speichern.
3. Eigene Medien vorbereiten. Die vorhandene geprüfte Strecke bleibt auf JPEG beziehungsweise H.264-MP4 und **4 MB** begrenzt. Weitere Plattformgrenzen gelten zusätzlich, etwa 2 MB für Bluesky-Bilder oder mindestens vier Sekunden bei Pinterest-Videos. Textbeiträge benötigen keine erfundene Mediendatei.
4. Den genauen gespeicherten Stand ausdrücklich freigeben. Einzelbilder/Text brauchen zwei Minuten Vorlauf, Carousels fünf Minuten und Videos 15 Minuten. Ohne eingerichtete Queue, privaten Speicher, Verschlüsselung und eigene HTTPS-Adresse bleibt automatisches Senden gesperrt.
5. Nur ein tatsächlich bestätigtes Anbieterergebnis heißt **Veröffentlicht**. TikTok heißt zunächst **In TikTok freigeben**. Eine anschließende manuelle Bestätigung ist keine API-Bestätigung der öffentlichen Veröffentlichung.

Inhalte, Provider-Optionen, Medien, Marke, Konto und Termin sind an die Freigabe gebunden. Änderungen benötigen eine neue Freigabe. Die Plattform kann einen Beitrag trotz lokaler Prüfung ablehnen.

## Schutz und Wiederaufnahme

App-Geheimnisse, Access-/Refresh-Token, OAuth-Zwischenstände und temporäre Upload-Adressen liegen nur in privaten, authentifiziert verschlüsselten Datensätzen. Sie erscheinen weder im öffentlichen CMS-Inhalt noch im Browser, Export oder normalen Fehlertext. Die Source-Vorlage nutzt ausschließlich ihre eigenen Schlüssel und Ressourcen und bleibt standardmäßig deaktiviert.

OAuth verwendet einen einmaligen Zustand, einen eigenen kurzlebigen HttpOnly-Lax-Rückkehr-Cookie und die Bindung an die ursprüngliche aktive Adminsitzung; unterstützte Anbieter nutzen zusätzlich PKCE. Die normale Strict-Anmeldung der Vorlage wird dafür nicht abgeschwächt. Die Rückkehrseite entfernt die Code-URL, verwendet keine Fremdressourcen und sendet nur die Vorgangskennung an den eigenen Ursprung. Danach braucht die Kontoauswahl wieder die reguläre authentifizierte Sitzung.

Vor einer finalen Anfrage werden App und Konto vor konkurrierenden Änderungen geschützt und ein dauerhafter Startmarker gespeichert. Eine unklare finale Antwort wird nicht blind erneut gesendet. Bestätigte, noch laufende Anbieteraufträge werden nur lesend abgefragt; bei fehlender Bestätigung folgt **Prüfung nötig**. YouTube setzt denselben resumierbaren privaten Upload fort; Bluesky verwendet dieselbe gespeicherte Datensatzkennung. Bluesky-Medien werden erst nahe dem Termin vorbereitet, weil unreferenzierte Blobs kurzlebig sind.

**Trennen** löscht die lokal gespeicherten Zugangstoken und stoppt künftige freigegebene Übergaben. Das ist keine Behauptung einer globalen Anbieter-Widerrufung: App-Rechte können zusätzlich beim Anbieter entzogen werden. Eine bereits laufende finale Übergabe lässt sich nicht sicher zurückrufen. Verbindungsänderungen werden während ihrer aktiven Sperre abgewiesen. Erneuerbare Zugänge werden vor Ablauf im Wiederherstellungslauf erneuert; abgelehnte/abgelaufene Zugänge brauchen eine neue Anmeldung.

## Betrieb und Prüfung

Kantiq benötigt zusätzlich Migration `0015_social_native_connectors.sql`. Sie erstellt eine private, agency-gebundene Tabelle mit erzwungener RLS und verändert keine bestehenden Einträge. Die neutrale Vorlage verwendet eigene private Record-Collections und ihren bestehenden Modul-/Epoch-Schalter. Automatischer Versand bleibt hinter der bestehenden Server-/Queue-Freigabe. Keine Zugangsdaten in `.env.example`, Vorlagen, generierte Kundendaten oder Versionskontrolle kopieren.

Die automatisierten Prüfungen verwenden injizierte HTTP-Antworten, Uhr und Speicher. Sie decken OAuth-Rückkehr und Wiederholung, fehlende Rechte, Uploads, Token-Erneuerung, konkurrierendes Trennen, Freigabebindung, Doppelzustellung und unklare Ergebnisse ab. Eine echte Developer-App, deren Anbieterfreigabe und eine reale Veröffentlichung sind damit nicht bestätigt. Vor einem gewünschten Produktivversand die eigenen Ressourcen und erlaubten Testkonten prüfen. Die öffentlichen Website-Beispiele bleiben lokale Simulationen.

Primärquellen, erneut geprüft am 04.11.2026 (Meta-Direktseiten teils rate-limitiert; zusätzlich offizielle Meta-Postman-Sammlungen): [Meta Pages](https://developers.facebook.com/docs/pages-api/), [Meta Threads](https://developers.facebook.com/docs/threads/), [LinkedIn Posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10), [Pinterest OpenAPI](https://github.com/pinterest/api-description/blob/main/v5/openapi.json), [TikTok Video Upload](https://developers.tiktok.com/doc/content-posting-api-reference-upload-video), [YouTube Uploads](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Bluesky Posts](https://docs.bsky.app/docs/tutorials/creating-a-post), [Bluesky Video](https://bsky.network/docs/about-bluesky-content/video/).

## Einmalige App-Freigabe und einzelne Kunden

Eine Anbieter-App gehört zu einer konkreten Anwendung und ihren geprüften Produkten/Rechten. Sie kann mehrere berechtigte Konten bedienen. Im eigenen Kantiq-CMS werden App-ID und Secret einmal je Plattform gespeichert; Kantiq und Creators verbinden danach ihre Konten getrennt und wählen jeweils die richtige Marke. Instagram, Facebook und Threads haben eigene Konfigurationen und Rechte.

Jeder Kunde muss sein Konto selbst autorisieren oder einer berechtigten Person Zugriff geben. Die Kontoauswahl, gespeicherten Tokens, Ablaufzeiten und Inhaltsfreigaben bleiben pro Ziel getrennt. Ein global genehmigter API-Zugang ersetzt diese Zustimmung nicht. Neue Produkte, zusätzliche Rechte oder geänderte Anwendungsfälle können eine erneute Anbieterprüfung auslösen.

Eigenständig gehostete Kunden-CMS verwenden weiterhin ihre eigene App-Konfiguration, eigene Verschlüsselung und eigene Ressourcen. Eine gemeinsame Kantiq-App ohne verteilte Secrets benötigt einen separaten zentralen Verbindungsdienst mit Mandantentrennung, registrierten Rücksprungadressen und der passenden Anbieterfreigabe. Dieser Dienst wird nicht durch Kopieren von Kantiq-Zugangsdaten in Kundenprojekte ersetzt und ist nicht Teil dieser Version. TikTok erlaubt derzeit höchstens zehn Web-Redirect-URIs je App; viele unabhängige Kundendomains passen daher nicht unbegrenzt in denselben Login-Kit-Client.

## Was im CMS und was beim Anbieter passiert

Im CMS: Plattform/Marke wählen; offizielle Einrichtungsschritte lesen; exakte Callback-Adresse kopieren; App-ID beziehungsweise Client-Key und Secret verschlüsselt speichern; offizielle Anmeldung starten; tatsächlich bestätigtes Konto auswählen; Kontozugriff erneut prüfen oder lokal trennen. Niemand muss dafür einen Instagram-Access-Token aus einem Entwicklerwerkzeug kopieren. Das alte Token-Setup bleibt ausschließlich für bestehende oder bewusst manuell verwaltete Zugänge erreichbar.

Beim Anbieter: Entwicklerkonto und App anlegen, Anwendung und Datenschutz-/Supportangaben hinterlegen, Produkte aktivieren, Callback erlauben, verlangte Rechte beantragen und Prüfung/Verifizierung abschließen. Bei Testbetrieb müssen passende Test-/App-Rollen eingeladen und angenommen werden. Diese Schritte werden durch Speichern im CMS nicht automatisch genehmigt. TikTok ruft neue serverseitig gespeicherte Videos über PULL_FROM_URL ab. Deshalb vorab im TikTok-Entwicklerportal unter „Manage URL properties“ die eigene Website-Domain oder den Präfix /api/social/publishing-media/ verifizieren. Das CMS erzeugt danach kurzlebige signierte HTTPS-Adressen mit Prüfung von Freigabe und Kontobindung. Die endgültige Übertragung beginnt erst im freigegebenen Zeitschritt. Bereits vorbereitete ältere FILE_UPLOAD-Aufträge behalten ihren gespeicherten Wiederaufnahmeweg; neue Aufträge verwenden ihn nicht.

## Instagram-Anmeldung und bestehende Planungen

Neue Meta-Apps verwenden seit Oktober 2026 die Instagram API mit **Unified Login**, auf Basis von Facebook Login for Business. Im CMS den passenden Anmeldemodus wählen. Für Unified Login werden **Meta App-ID, Meta App-Secret und Konfigurations-ID** gespeichert. Die Konfiguration verwendet General, Systemnutzer-Zugriffstoken und erforderliche Instagram-Konten. Vorher instagram_basic und instagram_content_publish zur App hinzufügen; sonst ist die Berechtigungsauswahl leer. Nur diese benötigten Rechte auswählen und im Instagram-Anwendungsfall das Label „Kompatibel mit Instagram-Login“ prüfen. Eine Facebook-Seite ist nicht nötig, ein passendes Business-Portfolio schon. Ein in Accounts Center hinzugefügtes Profil ist damit noch nicht automatisch als Business-Asset freigegeben.

Die exakte Rücksprungadresse in der Unified-Login-Einrichtung registrieren. Die Anmeldung bietet Instagram und Facebook an; der Nutzer wählt Business-Portfolio und Instagram-Assets. Der Server tauscht den einmaligen Code aus, prüft App-ID, bestätigte Rechte, Tokenlaufzeit, Systemnutzer und Kundenunternehmen. /me ist hier der **Systemnutzer**, nicht das Instagram-Profil. Die freigegebenen Profile werden über /me/assigned_instagram_accounts ermittelt; im CMS wird genau ein bestätigtes Ziel gewählt. Alle Medienanfragen verwenden graph.facebook.com/v26.0 mit expliziter Instagram-Konto-ID. Tokens, Business-ID und Konfigurations-ID bleiben verschlüsselt auf dem Server.

Die gewählte Konfiguration bestimmt die Laufzeit. Ein nicht ablaufendes Token wird nur akzeptiert, wenn Meta dies ausdrücklich bestätigt. Der Connector fordert kein zusätzliches business_management allein für eine automatische Verlängerung an. Abgelaufene oder entzogene Unified-Zugänge werden erneut autorisiert; sie dürfen nie über den alten Instagram-Refresh-Endpunkt verlängert werden. Die Einrichtung erfordert reale App-/Testerrollen und angenommene Einladungen; Kunden außerhalb dieser Rollen benötigen Metas Advanced Access, Live-Modus und Review. Webhooks für Nachrichten, Kommentare oder Insights sind hier kein implementierter Bestandteil des Publishing-Connectors.

Bestehende Apps mit Instagram Login behalten ihren Modus und die Rechte instagram_business_basic und instagram_business_content_publish. Sie verwenden graph.instagram.com und dessen Verlängerung frühestens nach 24 Stunden, nur vor Ablauf. Bestehende Datensätze ohne Modus werden als Legacy behandelt. Ein Modus-/Konfigurationswechsel widerruft lokale alte Verbindungen und offene Login-Vorgänge. Vorhandene manuelle Instagram-Planungen behalten ihren bisherigen Hash. Neue OAuth-Planungen verwenden connectionMode=native; jede Veröffentlichung braucht weiterhin eine eigene Inhaltsfreigabe.

Die neuen Protokolltests prüfen ausschließlich lokale Antworten und eigene Testdaten. Es wurde keine fremde App eingerichtet, kein echtes Konto ohne Zustimmung verbunden und kein Beitrag veröffentlicht.

Weitere Primärquellen, geprüft am 02.11.2026: [Offizielle Meta-Instagram-Sammlung](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/), [TikTok Login Kit](https://developers.tiktok.com/docs/en/login-kit-web), [TikTok-Upload](https://developers.tiktok.com/docs/en/content-posting-api-get-started-upload-content), [TikTok Direct-Post-Grenzen](https://developers.tiktok.com/docs/en/content-sharing-guidelines), [Google Web-OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).

## Einfacher Einstieg und Einrichtungshilfe

Die mobile Navigation steht in einer eigenen Zeile. „Kanäle“ öffnet die Einrichtung; ein zweiter Verbindungsknopf wird dort nicht eingeblendet. Die bebilderte Anleitung zeigt fünf frei wählbare Schritte: App anlegen, Anbieterfreigabe prüfen, App-Daten eintragen, eigenes Konto verbinden und den ersten Beitrag freigeben. Der aktuelle nächste Schritt wird mit einer kurzen Erklärung hervorgehoben. Bluesky verwendet stattdessen sein App-Passwort. Technische Voraussetzungen bleiben aufklappbar.

„Mit Assistenten einrichten“ öffnet optional die Hilfe zum ausgewählten Kanal und aktuellen Schritt. Diese Bedienhilfe läuft lokal ohne KI-Schlüssel, Plattformzugriff oder kostenpflichtigen KI-Aufruf. Sie erhält nur einen validierten Plattformnamen und Einrichtungsschritt; Formularwerte, App-Secrets, Tokens und Passwörter werden nicht übernommen. Sie erteilt keine Anbieterfreigabe, verbindet kein Konto und veröffentlicht nichts. Die echte Anmeldung startet weiterhin nur über die ausdrückliche Anmeldeschaltfläche.


Unified-Primärquellen, anhand der angemeldeten Meta-Dokumentation und des tatsächlichen App-Dashboards am 02.11.2026 geprüft: [Erste Schritte](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started/), [Authentifizierung und Zugriffstoken](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication/), [Onboarding](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/business-onboarding/), [Berechtigungen](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions/).


Die aufklappbare Hilfe „Schritt für Schritt · mit Bildern erklärt“ zeigt pro Schritt eine reduzierte Beispielansicht, konkrete Handgriffe, den offiziellen Link und ein erkennbares Abschlussmerkmal. Sie unterscheidet eigenes Testkonto, freigegebene App und tatsächlich verbundenes Ziel. Die Skizzen enthalten ausschließlich illustrative Werte und ändern keine echte Verbindung. Die echte Anmeldung und Kontoprüfung bleiben im normalen Formular.

Unified Login prüft Professional-Ziele über die von Meta zugewiesenen Instagram-Assets und die explizite IG-Nutzer-ID. Der Graph-Facebook-IG-Nutzer stellt kein account_type-Feld bereit; dieses darf hier nicht angefordert werden. Der Legacy-Instagram-Host verwendet weiterhin dessen eigenen Kontotyp-Vertrag. Siehe [IG-Nutzer-Referenz](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/).

Die Anmeldung bietet nach dem Start immer zusätzlich „Anmeldung in diesem Tab fortsetzen“ an. Dadurch bleiben Browser mit unsichtbaren oder unzuverlässigen Popups bedienbar. Der Link nutzt denselben serverseitigen Vorgang, Rückkehr-Cookie und Sitzungs-/State-Schutz; ein Neustart legt bewusst einen neuen Vorgang an.


Bei Unified Login kann Meta Facebook oder Instagram zur Anmeldung anbieten und ein früher verwendetes Business-Portfolio vorauswählen. Vor dem Fortsetzen beide Namen prüfen: das eigene Kundenportfolio und das gewünschte Instagram-Profil. Ein Hinweis, dass ein Profil erst mit einem anderen Portfolio geteilt wird, ist keine bereits bestehende Zuordnung. Eine Meta-Erfolgsmeldung allein bestätigt die CMS-Verbindung noch nicht: Erst die erfolgreiche Rückkehr und ein tatsächlich angebotenes, ausgewähltes und geprüftes Ziel zählen. Bricht Meta vor der Rückkehr mit einem Anbieterfehler ab, keine Verbindung oder automatischen Versand als erfolgreich ausgeben. Bereits manuell veröffentlichte Inhalte behalten ihren eigenen Status; ein erneuter Login darf diese nicht noch einmal senden.


## Instagram-Carousels und bestätigte Laufzeiten (03.11.2026)

Im Planer ausdrücklich **Carousel · alle Folien** wählen. 2 bis 20 Folien desselben eingefrorenen Studio-Posts werden einzeln als JPEG geprüft und privat gespeichert. Erst wenn jede Folie in der richtigen Reihenfolge vorliegt, lässt sich der gemeinsame Beitrag freigeben. Alle Prüfsummen, Bildbeschreibungen, Konto und Termin gehören zu derselben Freigabe. Eine unvollständige Folge kann nicht gesendet werden. Bestehende mehrseitige Studio-Planungen bleiben Einzelbilder, solange Carousel nicht bewusst gewählt wird.

Die Queue erstellt und prüft jeden Instagram-Bildcontainer, erstellt danach einen gemeinsamen Carousel-Container und sendet genau dessen abschließenden Veröffentlichungsauftrag. Eine unklare finale Antwort wird nicht automatisch wiederholt.

Google kann eine begrenzte Laufzeit für Refresh-Tokens bestätigen. Diese Grenze bleibt auch bei späteren Refresh-Antworten ohne neue Laufzeit erhalten; ein darüber hinaus geplanter Beitrag erfordert eine neue Anmeldung. Facebook-Seitentokens werden separat geprüft. „Läuft nicht ab“ wird nur aus einer ausdrücklichen Anbieterbestätigung abgeleitet, nie aus einem fehlenden Ablaufdatum.

Aktueller vollständiger Prüfstand mit Primärquellen: [Connector-Prüfung vom 03.11.2026](social-publishing-verification-2026-11-03.md).

## Eigene Meta-App und eigenes Instagram-Konto

Für ein Portfolio, das App und Instagram-Konto selbst besitzt, gibt es einen getrennten, expliziten Systemnutzer-Weg. Der normale Unified-Login für Kund:innen bleibt bestehen; eine leere OAuth-Kontenliste löst keinen automatischen Fallback aus.

1. In Meta Business Suite unter Einstellungen → Nutzer → Systemnutzer einen eigenen Systemnutzer mit Rolle Employee anlegen. Nur die eigene App und das benötigte Instagram-Konto zuweisen.
2. Für die gespeicherte Meta-App ein auf 60 Tage befristetes Token mit instagram_basic und instagram_content_publish erzeugen. Weitere Rechte nur für tatsächlich verwendete Funktionen anfordern.
3. Im CMS unter Kanäle verbinden → Instagram → Eigene Meta-App und eigenes Konto? die Instagram-Konto-ID und das Token im Passwortfeld einfügen. Der Server prüft App-ID, SYSTEM_USER-Typ, Scope, echte Laufzeit und die mit /me bestätigte Systemnutzer-ID.
4. Bei einer ausdrücklich angegebenen eigenen Instagram-Konto-ID prüft der Server zuerst das Profil über GET /{id}?fields=id,username und anschließend den erlaubten Veröffentlichungszugriff über GET /{id}/content_publishing_limit?fields=quota_usage,config. Beide Antworten müssen die konkrete Zielprüfung bestätigen; erst dann erscheint das Profil zur separaten Auswahl. Ein öffentlich lesbarer Profilname allein genügt nicht. Ohne explizite Konto-ID bleibt die ursprüngliche Kontenliste erhalten. Der normale Unified OAuth verwendet weiterhin ausschließlich seine tatsächlich zugewiesenen Profile, ohne automatischen Wechsel. Bei Auswahl und Erneuerung werden Profil und Veröffentlichungsberechtigung erneut geprüft.

Das Token steht nie im Workspace-Ergebnis, in einer URL des Browsers oder in unverschlüsselten Anwendungsdaten. Vor der Kontoauswahl liegt es verschlüsselt in einem zehn Minuten gültigen, sitzungsgebundenen Vorgang; danach nur im verschlüsselten Konto. Das Formular leert es auch nach Fehlern. Admin-, Marken-, Revisions- und Freigabegrenzen bleiben erhalten. Ein Konto allein gibt keinen Beitrag frei.

Befristete Portfolio-Systemnutzer-Tokens können über die offizielle 60-Tage-Erneuerung aktualisiert werden. Der bestehende Wartungslauf erneuert sie vor Ablauf und prüft danach App, Systemnutzer und den bestätigten Profil-/Veröffentlichungszugriff erneut. Dies gilt ausdrücklich nicht für per Unified OAuth erhaltene Business-Integration-Systemnutzer-Tokens; deren bisheriger Wiederanmeldeweg bleibt erhalten.

Primärquellen: [Meta: eigene Systemnutzer](https://developers.facebook.com/docs/business-management-apis/system-users), [Token erzeugen und erneuern](https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens), [zugewiesene Instagram-Konten](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/system-user/assigned_instagram_accounts).

## Versandstand 1.14.0

Sieben Kanäle besitzen automatische Versandwege; TikTok eine terminierte Inbox-Übergabe. Protokollprüfungen der tatsächlichen Clients sind von den gemeinsamen Queue-/Freigabeprüfungen getrennt. Für Bluesky werden URLs in der Caption mit korrekten UTF-8-Bytebereichen als klickbare Link-Facets eingefroren, ohne Zielseiten abzurufen. Der [aktuelle Prüfbericht](social-connectors-verification-2026-11-04.md) nennt genau, was lokal geprüft wurde und was mit der jeweiligen eigenen App noch zu bestätigen ist.
