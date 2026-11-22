# Newsletter und Webanalyse

## Auf einer neuen Website einrichten

1. Prüfen Sie die Anbieteranschrift, die veröffentlichte Domain und das Impressum. Richten Sie unter **Einstellungen → E-Mail** den Mailversand der Website ein. Verwenden Sie ein Postfach des Kunden und testen Sie den Versand an die eigene Empfängeradresse.
2. Öffnen Sie **Newsletter → Einrichtung**. Tragen Sie den tatsächlichen Anbieter des Mailversands für den Datenschutzhinweis ein und aktivieren Sie das Modul. Die Datenschutzerklärung ergänzt ihren Newsletter-Abschnitt aus dieser Einstellung.
3. Fügen Sie in der gewünschten Seite den Abschnitt **Newsletter-Anmeldung** ein und veröffentlichen Sie die Seite. Wenn das Formular zu einer öffentlichen Gruppe gehören soll, kopieren Sie ihre Kennung unter **Empfänger & Gruppen** in den Abschnitt. Ein leeres Gruppenfeld ist die allgemeine Anmeldung.
4. Testen Sie mit einer eigenen Testadresse. Die Adresse erscheint zunächst als offen. Sie wird nach der Bestätigung über die E-Mail für den Versand freigeschaltet. Offene Anmeldungen laufen nach 48 Stunden ab.
5. Entwerfen Sie eine Ausgabe unter **Ausgaben**. Verwenden Sie Bilder aus den eigenen öffentlichen Medien und prüfen Sie Desktop- und Mobilvorschau. Speichern Sie die Ausgabe, wählen Sie bei Bedarf Empfängergruppen und bestätigen Sie die angezeigte Anzahl, um den Versand freizugeben.
6. Prüfen Sie den Versandstatus und den Abmeldelink mit Ihrer eigenen bestätigten Testadresse. Richten Sie den vom Mailanbieter empfohlenen SPF-, DKIM- und DMARC-Schutz für die Absenderdomain ein und prüfen Sie die signierten Abmelde-Header beim produktiven Anbieter.

## Versand und Messung

Der Hintergrundversand nutzt die Vercel Queue dieser Website und deren bestehenden Cleanup-Cron als Rückfallebene. Die Produktion benötigt ein eigenes `AUTH_SECRET` und `CRON_SECRET`. Die Queue erhält eine signierte Wecknachricht ohne Empfängeradresse. Bestätigte Adressen werden vor jeder Zustellung geprüft. Bei einem unklaren SMTP-Ergebnis wird die Nachricht zur Vermeidung von Dubletten als unklar angezeigt.

Die Webanalyse zeigt zusammengefasste Newsletter-Anmeldungen, Bestätigungen, Abmeldungen und vom Mailserver angenommene Nachrichten im gewählten Zeitraum. Ausgaben haben einen Abmeldelink. Das Modul speichert keine personalisierte Lese- oder Klickstatistik. Kampagnenparameter sind optional und werden ausschließlich für Links zur eigenen Website ergänzt. Website-Besuche zählen in der Webanalyse nach Zustimmung zu Statistik.

Der Baustein **Newsletter und Webanalyse · Vorschau** verwendet Beispieldaten. Er zeigt weder Kundendaten noch schaltet er die Statistik oder den Versand ein.
