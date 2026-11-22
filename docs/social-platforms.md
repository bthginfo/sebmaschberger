# Kanäle im Post-Planer

Der private Planer unterstützt Instagram, TikTok, YouTube, LinkedIn, Facebook, Pinterest, Threads und Bluesky. Pro Eintrag werden ein Kanal, eine Marke, ein Zielkonto als Bezeichnung, der Text und ein eigener Termin gespeichert. Neue Einträge sind **manuell**. Sie benötigen weder einen Plattformzugang noch eine aktivierte Versandwarteschlange.

Studio und Planer sind über eine gemeinsame Navigation erreichbar. **Design planen** übernimmt einen gespeicherten Designstand; **Im Studio bearbeiten** führt zur zugehörigen Quelle zurück. Ein allgemeiner Wechsel in den Planer erstellt keinen Beitrag. Nicht gespeicherte Änderungen brauchen eine bewusste Entscheidung.

## Drei sinnvolle Einstiege

- **Studio-Design:** gespeicherten Grafik- oder Reel-Stand übernehmen. Die Planung hält genau diesen Stand fest; spätere Studio-Änderungen überschreiben ihn nicht.
- **Fertige Datei:** die bestehende private, geprüfte Uploadstrecke verwenden. Die gemeinsame Prüfung für JPEG/MP4 bis 4 MB und die zusätzlichen Grenzen des gewählten Zielkanals gelten weiterhin.
- **Text oder Original-Link:** ohne Grafik einen Textbeitrag planen oder auf die eigene HTTPS-Ablage für ein Bild beziehungsweise ein größeres Video verweisen. Der Server lädt diese Adresse weder herunter noch an einen Anbieter hoch. Ein Link ist keine geprüfte versandfertige Mediendatei.

**Kopieren** erstellt für Studio- und Link-/Textquellen eine unabhängige manuelle Planung. Kanal, Text und Termin können danach einzeln angepasst werden. Ein fertiger Upload wird bewusst neu hochgeladen; eine private Medien-ID wird nicht zwischen Planungen geteilt.

## Manuell veröffentlichen

Text kopieren beziehungsweise den Plan als Text exportieren, die Medien im Studio exportieren oder die eigene Originaldatei verwenden, auf der Zielplattform prüfen und veröffentlichen. Anschließend **manuell erledigt** markieren. Diese Kennzeichnung dokumentiert die eigene Bestätigung, keine Rückmeldung des Anbieters. **Wieder öffnen** setzt den Eintrag zurück auf manuell vorgesehen.

CSV exportiert die gefilterten Planungen einschließlich Text, Ziel, Termin und Status. ICS übernimmt nur Einträge mit Termin in den eigenen Kalender; es versendet keine Beiträge und richtet keinen Plattformzugang ein. Exportierte Texte stammen aus der Planung und nicht aus einer möglicherweise inzwischen geänderten Studio-Caption.

## Automatisierung und Einrichtung

Native Connectoren für Facebook-Seiten, Threads, LinkedIn, Pinterest, YouTube, TikTok und Bluesky sind implementiert. Unter **Kanäle verbinden** erklärt das CMS die eigene App-Einrichtung, Rücksprungadresse, Rechte und ausdrückliche Kontoauswahl. Instagram verwendet ebenfalls die direkte Anmeldung; das erweiterte Token-Setup bleibt für bestehende Zugänge erhalten. Ohne eigene App/Autorisierung und vollständige Queue-Konfiguration ist kein Konto verbunden. [Einrichtung, unterstützte Formate und Grenzen](social-connectors.md).

Ein Termin allein aktiviert keinen Versand. Textnotizen können nur an textfähige Connectoren gelangen; externe Medienverweise bleiben inert. TikTok übergibt MP4 zur abschließenden App-Freigabe und wird nicht als automatisch veröffentlicht dargestellt. YouTube lädt privat vor und ändert erst am lokal freigegebenen Termin die Sichtbarkeit.

Die aktuelle Kanalhilfe steht in `lib/social/publishing/platforms.ts` (Stand 04.11.2026). Sie trennt Anbieter-Möglichkeiten von den hier tatsächlich verfügbaren Funktionen. Besonders TikToks [Direct-Post-Richtlinien](https://developers.tiktok.com/docs/en/content-sharing-guidelines) schließen ein internes Tool allein für eigene oder betreute Konten aus; die [Upload-API](https://developers.tiktok.com/docs/en/content-posting-api-get-started-upload-content) sieht dagegen eine abschließende Freigabe in TikTok vor.

Weitere Primärquellen: [Meta Instagram](https://www.postman.com/meta/instagram/collection/6yqw8pt/instagram-api), [Meta Facebook-Seiten](https://www.postman.com/meta/facebook/request/bqfxwbp/get-access-tokens-of-pages-you-manage), [Meta Threads](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api), [YouTube-Uploads](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert), [LinkedIn-Profilbeiträge](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin), [LinkedIn-Unternehmensseiten](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview?view=li-lms-2026-10), [Pinterest-Zugriff](https://developers.pinterest.com/docs/key-concepts/access-tiers/), [Bluesky-Beiträge](https://docs.bsky.app/docs/tutorials/creating-a-post).
