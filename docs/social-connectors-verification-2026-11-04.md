# Mehrkanal-Versand im Website-Template · 1.14.0

Stand: 4. November 2026. Dieser Auftrag ändert ausschließlich den neutralen Website-Starter und dessen mitgelieferte Anleitung. Die bestehenden Kantiq-/Creators-Deployments, Konten, App-Zugänge und Versandtermine werden nicht umgestellt.

## Was der Code kann

| Kanal | Eigener nativer Versand nach Einrichtung | Abschluss |
| --- | --- | --- |
| Instagram | Einzelbild, Reel, ausdrücklich gewähltes Carousel mit 2–20 Bildern | Bestätigte Veröffentlichung |
| Facebook | Texte/Links, JPEG-Bilder und MP4-Reels auf verwalteten Seiten | Bestätigter Seitenbeitrag |
| Threads | Texte/Links, JPEG und MP4 | Bestätigter Beitrag |
| LinkedIn | Text/Link, JPEG und MP4; Profil oder separat berechtigte Unternehmensseite | Bestätigter Beitrag |
| Pinterest | Bild-/Video-Pin auf bestätigter eigener öffentlicher Pinnwand | Bestätigter Pin; Trial-Sichtbarkeit bleibt eingeschränkt |
| YouTube | Kleines MP4 privat vorbereiten und zum freigegebenen Termin öffentlich stellen | Bestätigte öffentliche Sichtbarkeit |
| Bluesky | Text mit klickbaren Links, JPEG und MP4 auf Bluesky-gehosteten Konten | Bestätigter eigener Datensatz |
| TikTok | MP4 zum Termin über eine verifizierte eigene HTTPS-Adresse abrufen und in die Inbox übergeben | Endgültiges Bearbeiten/Veröffentlichen in TikTok |

Die zusätzlichen nativen Clients waren bereits vorhanden. Die Prüfung hat ihre tatsächlichen Aufrufwege mit der gemeinsamen Freigabe-/Queue-Strecke abgeglichen, irreführende Instagram-only-Texte berichtigt und konkrete Lücken geschlossen. Es wurde kein zweiter Scheduler und kein zentraler Kantiq-Zugang in das Template eingebaut.

## Ergänzungen und Korrekturen

- TikTok verwendet für neue serverseitige Medien PULL_FROM_URL. Die eigene Domain oder der Präfix /api/social/publishing-media/ muss zuvor im TikTok-Portal verifiziert werden. Die CMS-Anleitung benennt diesen Schritt. Der Download beginnt erst in der finalen terminierten Operation; die Vorbereitung löst keine Inbox-Benachrichtigung aus.
- Der Start des TikTok-Auftrags wird vor dem API-Aufruf dauerhaft markiert. Bei verlorenem oder unvollständigem Ergebnis wird kein zweiter Upload angelegt. Bestätigte Vorgänge werden nur lesend abgefragt. Bereits gespeicherte ältere FILE_UPLOAD-Aufträge behalten ihre eigene Wiederaufnahme.
- Bluesky-Caption-Links werden als echte Link-Facets mit UTF-8-Bytebereichen eingefroren. Emoji-/Umlautpositionen stimmen; Linkziele werden nicht vom Server abgerufen.
- Alle acht nativen Pfade besitzen zusätzliche Zustandsprüfungen: kein finaler Versand vor dem Termin, genau eine finale Operation bei doppelter Queue-Zustellung, Anbieterbeleg im richtigen Kanal und eigener TikTok-Handoff-Status.
- Beim nativen lokalen Einrichtungstest blockierte Windows einmal den atomaren Austausch der lokalen CMS-Datei. Der lokale Speicher wiederholt ausschließlich die Dateiumbenennung bei EACCES/EPERM/EBUSY, höchstens fünf Versuche mit zusammen 375 ms Wartezeit. Der vorherige Datenstand wird nicht gelöscht; bei endgültigem Fehler wird nur die eigene temporäre Datei aufgeräumt. Die Datenbankstrecke und die externe Anbieteroperation werden dabei nicht wiederholt.

## Einrichtung pro Kundenprojekt

Unter **Einstellungen → Allgemein** Social-Studio und Post-Planer ausdrücklich einschalten und den Entwurf speichern. Danach im Planer **Kanäle verbinden** öffnen. App-Daten liegen ausschließlich verschlüsselt im eigenen privaten CMS; jedes Ziel wird vom jeweiligen Inhaber autorisiert und separat ausgewählt. Bluesky verwendet ein eigenes App-Passwort statt einer Developer-App.

Anbieter-App und nötige Produkte/Rechte, gegebenenfalls App Review und Zielkonto sind getrennte Schritte. Für den Hintergrundversand sind der eigene private Medienspeicher, eine eigene HTTPS-Adresse und der tatsächliche Queue-Trigger nötig. Die Serverfreigabe SOCIAL_PUBLISHING_QUEUE_ENABLED bleibt bis zur eigenen Einrichtung aus. Ein gespeicherter Termin, App-Daten oder eine konstruierte Login-Adresse sind keine bestätigte Verbindung und keine Inhaltsfreigabe.

Die Datei-/Formatgrenzen des Planers bleiben sichtbar: geprüfte JPEG-/H.264-MP4-Medien bis 4 MB und zusätzliche Kanalgrenzen. Stories und Carousels außerhalb Instagram bleiben manuell. Twitch-/Spotify-Feeds sind eine andere Integration und kein automatischer Beitragsversand.

## Tatsächliche Prüfung

**374/374 Tests bestanden**, Typcheck Code 0 und vollständiger isolierter Next-Produktionsbuild Code 0. Nach dem Speicherfix bestand auch der native CMS-Gesamtcheck (Anmeldung, Herkunft, Entwurf, Versionskonflikt, Veröffentlichung/Cache, Anfrage, Export und Wiederherstellung). Die gebündelten Kanalzustandstests decken alle acht nativen Dispatcher ab. Die tatsächlichen Provider-Clients werden mit injizierten HTTP-Antworten geprüft.

Über die echte lokale CMS-API wurden acht unverbundene Einrichtungsansichten sowie das Speichern künstlicher App-Daten und Erzeugen der offiziellen Login-Adressen geprüft. Bei der ersten Durchführung erreichten alle sieben OAuth-Kanäle diesen Schritt; ein anschließender Aufruf des Testskripts verwendete zunächst einen nicht vorhandenen Workspace-Unterpfad. Bei der Wiederholung wurde der lokale Dateiaustauschfehler erkannt. Nach dessen Korrektur bestätigte die begrenzte API-Nachprüfung das Speichern und den Login-Start für LinkedIn, acht sichtbare App-Einrichtungen ohne erfundene Konten, anonymen Zugriffsschutz und die weiterhin gesperrte Queue. Es wurde keine externe Anmeldung abgeschlossen. Protokolltests verwenden injizierte Anbieterantworten; dabei werden die tatsächlichen Clients und die dauerhafte Versandlogik getrennt geprüft. Ein echter Kunde benötigt weiterhin die eigene App-/Konto-/Queue-Einrichtung sowie einen ausdrücklich gewünschten Testbeitrag.

Bei der nativen Prüfung wurden ausschließlich eine eigene lokale Kopie, künstliche App-Werte und erzeugte Testzugänge verwendet. Es gab keine Aufrufe an die externen Provider-APIs, keine echten Kontoverbindungen und keine Veröffentlichung. Die offiziellen Login-Adressen wurden nur erstellt und geprüft, nicht geöffnet. Der normale lokale CMS-Prüflauf stellt Entwurf, Veröffentlichung und technische Einstellungen wieder her.

## Aktuelle Primärquellen

- [Meta Pages und Reels – offizielle Postman-Sammlung](https://www.postman.com/meta/facebook/documentation/r56bjfd/facebook-api)
- [Meta Threads – offizielle Postman-Sammlung](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api)
- [LinkedIn Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api?view=li-lms-2026-10)
- [Pinterest: Boards und Pins](https://developers.pinterest.com/docs/work-with-organic-content-and-users/create-boards-and-pins/), [Zugriffsstufen](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
- [YouTube: Upload](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert), [Video-Sichtbarkeit](https://developers.google.com/youtube/data/reference/rest/v3/videos)
- [Bluesky: Beiträge und Link-Facets](https://docs.bsky.app/docs/tutorials/creating-a-post), [Videos](https://bsky.network/docs/about-bluesky-content/video/)
- [TikTok: Upload-API](https://developers.tiktok.com/docs/en/content-posting-api-reference-upload-video), [zulässiger Direct-Post-Anwendungsfall und Medienübertragung](https://developers.tiktok.com/docs/en/content-sharing-guidelines)

Die Meta-Direktseiten lieferten beim Abruf teilweise HTTP 429; deshalb wurden zusätzlich Metas offizielle Postman-Unterlagen verwendet. Die Anbieter können Freigaben, Limits und Sichtbarkeit unabhängig vom Template ändern.
