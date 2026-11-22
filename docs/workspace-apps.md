# Installierbare Arbeitsbereiche

Das CMS lässt sich bei jeder neuen Website als eigene App installieren. **Settings → App & notifications** öffnet die Geräteeinstellungen; Redaktions- und Shop-Zugänge finden sie in **My account**. Bei aktivierter Vereinsverwaltung hat `/members` eine zweite, getrennte App. Beide bleiben online: Der Service Worker speichert keine privaten Seiten, Bilder, Nachrichten oder Antworten.

Chrome, Edge und andere unterstützte Browser bieten **Installieren** in der App oder im Browsermenü. Auf iPhone und iPad in Safari über **Teilen → Zum Home-Bildschirm** hinzufügen und dann das neue Symbol öffnen. Erst dort im App-Bereich auf **Benachrichtigungen aktivieren** tippen. Der erste Login pro Browser führt optional durch die Oberfläche; **Überspringen** und **Tour neu starten** sind verfügbar.

Push wird pro Gerät nach einer ausdrücklichen Auswahl freigeschaltet. CMS-Inhaber können Website-Anfragen und, bei aktiviertem Club, Nachrichten fürs Vereinsbüro auswählen. Mitglieder können Nachrichten, Termine, News und bei freigeschaltetem Coach Studio Taktiken abonnieren. Der Gerätetest prüft die Zustellung zum eigenen Gerät. Sperrbildschirme zeigen nur den Ereignistyp, keine Texte oder Namen. Das Postfach bleibt die zuverlässige Quelle, wenn das Betriebssystem Push verzögert, blockiert oder nicht unterstützt.

Für Push ist kein externer API-Schlüssel nötig. Die Site erzeugt einen eigenen VAPID-Schlüssel und verschlüsselt den privaten Teil sowie die Geräteabonnements mit `AUTH_SECRET`. Keine Schlüssel zwischen Projekten kopieren. Die produktive Site-URL in den CMS-Einstellungen auf die tatsächliche HTTPS-Adresse setzen. Abmeldung oder Geräte-Deaktivierung entfernt das Abonnement aus der Site; eine Neuinstallation kann eine erneute Freigabe erfordern.

## Favicon und Appsymbole

Unter **Settings → App & notifications → Brand icons** kann der CMS-Inhaber ein öffentliches Favicon und ein CMS-Appsymbol hochladen. Ist Vereinsverwaltung aktiv, erscheint auch das separate Mitglieder-Appsymbol. Die Vorschau verwendet die gespeicherte Datei; **Reset** stellt den jeweiligen Standard wieder her. Verwende ein gut erkennbares, möglichst quadratisches PNG, JPEG, WebP oder AVIF unter 3 MB. Die App erzeugt die Varianten für Browser, Apple-Startbildschirm und maskierbare Appsymbole. Installierte Symbole können vom Betriebssystem zwischengespeichert werden.

## Abnahme

Teste beide freigegebenen Manifeste, Scope und Start-URL, die lokalen Icon-Varianten, Tour-Neustart, die tatsächlichen Rollen und einen berechtigten Gerätetest in einem unterstützten Browser. Benenne klar, wenn lediglich Web-Push-API und Service Worker geprüft wurden und kein reales Handy verfügbar war. Aktiviere keine Benachrichtigung ungefragt auf fremden Geräten.
