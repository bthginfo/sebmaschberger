# Social-Publishing: Prüfstand 03.11.2026

## Implementierte Lieferung

| Kanal | Automatisch implementiert | Wichtige Voraussetzung / Grenze |
| --- | --- | --- |
| Instagram | Einzel-JPEG, explizites Carousel aus 2–20 Studio-JPEGs, MP4-Reel | Professional-Profil; richtige Business-/App-/Testerrollen; Meta bestätigt das konkrete Ziel. |
| Facebook-Seiten | Text, JPEG, MP4-Reel | Eigene verwaltete Seite und bestätigte Content-Rechte. Seiten-Token separat auf App, Rechte und Ablauf geprüft. |
| Threads | Text/Link, JPEG, MP4 | Threads-App und Content-Publishing-Recht. Mehrbild-Posts hier nicht implementiert. |
| LinkedIn | Profil-Text/Link, JPEG, MP4; separat freigeschaltete Organisationen | Mitgliedsrecht; Unternehmensseiten benötigen zusätzlichen genehmigten Produktzugriff und Rolle. |
| Pinterest | Einzelbild- und Video-Pin auf eigener öffentlicher Pinnwand | Alle fünf angeforderten Scopes; Trial-Pins sind nur für den Ersteller sichtbar. Standard-Zugriff für reguläre Sichtbarkeit. |
| YouTube | MP4 resumierbar privat vorbereiten, zum freigegebenen Zeitpunkt öffentlich stellen | youtube.force-ssl, tatsächlicher Kanal, ausdrückliche Kinderzielgruppenangabe; begrenzte Google-Refresh-Laufzeiten beachten. |
| TikTok | Datei automatisch in die TikTok-Inbox übertragen | **Keine automatische öffentliche Veröffentlichung.** Letzten Schritt in TikTok abschließen. FILE_UPLOAD benötigt keine Medien-Domain-Verifizierung. |
| Bluesky | Text, einzelnes JPEG, MP4 | Eigenes App-Passwort und unterstütztes Bluesky-gehostetes Konto; Video benötigt den verlangten Kontostand. |

Eine registrierte App ist keine Anbieterfreigabe. Ein gespeichertes Konto ist keine Veröffentlichung. Die fünf bebilderten Schritte unterscheiden diese Zustände. Externe Kunden bestätigen ihr eigenes Konto; die Vorlage erhält keine Kantiq-Secrets.

## Protokoll- und Sicherheitsprüfung

Mit injizierten HTTP-Antworten, Speicher und Uhr geprüft: OAuth-State, ursprüngliche Sitzung und einmaliger Rückkehr-Cookie; Scope-/Identitätsprüfung; private immutable Dateien; revisionsgebundene Freigabe; per Plattform und Marke getrennte Konten; abgelaufene Token; begrenzte Google-Refresh-Laufzeit; Facebook-Seitenablauf; vertrauenswürdige Uploadhosts; Uploadfortsetzung; Queue-Doppelzustellungen; getrennte TikTok-Inbox-Bestätigung; unklare finale Ergebnisse ohne erneuten Veröffentlichungs-POST.

Carousel-Protokoll: explizites Opt-in; 2–20 Folien; unvollständige Folgen nicht freigebbar; richtige Reihenfolge und identisches Format; alle Bildprüfsummen und Beschreibungen in einer Freigabe; einzelne Child-Container mit Checkpoint; alle fertig vor Parent-Erstellung; genau ein finaler Parent-Publish. Bestehende Einzelbild-Hashes bleiben kompatibel.

Gezielter aktueller Testlauf: jeweils **106 Tests erfolgreich** in Kantiq und im neutralen Starter. Zusätzlich bereits erfolgreich: Starter-Gesamtlauf mit 312 Tests; Kantiq-Gesamtlauf mit 432 von 436 sofort erfolgreich, vier Last-/Timeoutfälle danach im gezielten Lauf mit 20 Dateien / 237 erfolgreichen Tests bestätigt. Keine echten Anbieteranfragen werden aus diesen Tests gesendet. Typecheck, Builds und Browserprüfung werden separat im Release-Nachweis festgehalten.

## Reale Kontoeinrichtung

Die eigenen Kantiq-Appdaten waren bereits vorhanden. Bei der realen Meta-Prüfung gehörte das Instagram-Profil zum Portfolio, hatte aber keine zugewiesene Person. Nach ausdrücklicher Bestätigung wurde ausschließlich der Inhaltszugriff für den vorhandenen Eigentümer eingerichtet. Accounts Center und Portfolio-Vollzugriff allein waren kein Nachweis dieser Asset-Zuordnung. Eine tatsächliche Kontoauswahl und API-Veröffentlichung bleiben separat zu bestätigen; Protokolltests ersetzen sie nicht. Keine fremden Kundenkonten wurden verbunden.

## Primärquellen

- [Meta Unified Login: erste Schritte](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started/) und [Content Publishing](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/content-publishing/) – aktuelle angemeldete Dokumentation geprüft, u. a. Systemnutzer, zugewiesene Instagram-Assets und 20 Carousel-Items.
- [Facebook Pages Posts](https://developers.facebook.com/docs/pages-api/posts/) und [Reels Publishing](https://developers.facebook.com/documentation/video-api/guides/reels-publishing) – Page-Rechte, Upload-/Finish-Vertrag und öffentliche Sichtbarkeit.
- [Threads Posts](https://developers.facebook.com/docs/threads/posts/) – offizielle Hosts, UTF-8-Grenze, Container und finales Publish.
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10) – aktuelle Versionsheader, Rechte und tatsächliche Ressourcenbelege.
- [Pinterest OpenAPI](https://github.com/pinterest/api-description/blob/main/v5/openapi.json) – Version 5.28.0, Pin-Scopes, Media Upload, Status und kontinuierliche Refresh-Tokens.
- [TikTok Video Upload](https://developers.tiktok.com/docs/en/content-posting-api-reference-upload-video), [Content Posting](https://developers.tiktok.com/docs/en/content-posting-api-get-started), [Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines) – Inbox statt Direct Post; Medien-Domain nur für URL-Pull; interne Uploadtools sind kein zulässiger Direct-Post-Audit-Anwendungsfall.
- [YouTube Insert](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert), [resumierbarer Upload](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol), [Google Web-OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Token-Ablauf](https://developers.google.com/identity/protocols/oauth2#expiration) – private Vorbereitung, tatsächliche Bestätigung und refresh_token_expires_in.
- [Bluesky Posts](https://bsky.network/docs/tutorials/creating-a-post/), [API](https://bsky.network/docs/api-directory/), [Video](https://bsky.network/docs/about-bluesky-content/video/) – PDS/DID-Ziel, eigene Bytes und Video-Jobbestätigung.

Nicht mit echten Konten auf allen Plattformen getestet: Es liegen dafür keine freigegebenen Developer-Apps/Konten vor. Die hier tatsächlich ausgeführten Prüfungen und diese Grenze werden bewusst getrennt dokumentiert.

## Nachtrag: eigener Portfolio-Systemnutzer

Die echte OAuth-Rückkehr wurde im CMS eindeutig als fehlgeschlagener Flow gelesen: Meta lieferte trotz ausgewähltem eigenen Portfolio und Profil keine zugewiesenen Instagram-Konten. Es wurden keine Profil-IDs geraten und keine Beiträge freigegeben. Der eigene Portfolio-Systemnutzer ist deshalb als separater, expliziter Einrichtungsweg ergänzt; dies ist keine Behauptung, dass beliebige Kunden-OAuth-Verbindungen denselben Weg benötigen.

Die aktuelle Meta-Dokumentation zu Systemnutzern, Token-Erstellung und -Erneuerung sowie der assigned_instagram_accounts-Edge wurde gelesen. Der neue Weg prüft App, SYSTEM_USER, Ablauf, Systemidentität und echte Zuweisung. Die bestehende Kontoauswahl prüft die Zuordnung erneut. Normaler Unified OAuth, seine Cookie-/Sitzungsbindung und bestehender Instagram-Login bleiben erhalten. Nur explizite eigene Portfolio-Tokens verwenden die dokumentierte 60-Tage-Erneuerung.

Gezielte Protokoll-/Sicherheitstests: 49 pro Repository bestanden. Template-Typecheck und vollständiger Next-Build bestanden. Kantiq-Svelte-Check: 0 Fehler, 0 Warnungen. Smartphone-UI bei 390 px geprüft: Dokumentbreite 390 px, Tokenfeld als Passwortfeld, fehlendes Token sperrt den Prüfschritt. Eigene Systemnutzer-Anlage, echte Tokenprüfung und automatische Veröffentlichung sind zu diesem Prüfstand noch nicht abgeschlossen.

Quellen: [Meta Systemnutzer](https://developers.facebook.com/docs/business-management-apis/system-users), [Token und Erneuerung](https://developers.facebook.com/docs/business-management-apis/system-users/install-apps-and-generate-tokens), [Kontozuweisung](https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/system-user/assigned_instagram_accounts).

### Explizite eigene Profilprüfung ab 1.11.1

Bei einem eigenen Portfolio-Systemnutzer kann die Kontenliste leer sein. Der getrennte manuelle Einrichtungsweg nimmt deshalb eine explizite Instagram-Konto-ID entgegen. Bevor das CMS dieses Ziel anbietet, müssen sowohl die direkte Profilidentität als auch die eigene Veröffentlichungsberechtigung über content_publishing_limit von Meta bestätigt sein. Eine lesbare öffentliche Profilinformation genügt nicht. Auswahl und Token-Erneuerung prüfen diese beiden Nachweise erneut. Kein Fallback im normalen Unified OAuth; keine geratenen IDs, keine Freigabe anhand von UI-Angaben allein.

Gezielte Regressionen: 53 Protokoll-/Sicherheitstests je Repository bestanden, darunter verweigerte Veröffentlichungsrechte, falsche Profil-ID, fehlerhafte Quota-Antwort und erneute Prüfung nach Token-Rotation. Echter eigener Systemnutzer mit Employee, App-Testzugriff, Instagram-Inhalten und 60-Tage-Token eingerichtet; die endgültige Profilverbindung und der Versand sind zu diesem Berichtspunkt noch offen.
