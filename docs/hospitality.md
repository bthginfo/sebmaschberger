# Speisen, Getränke und Tischreservierungen

Die beiden Module lassen sich unabhängig einschalten. Im Generator stehen `--features restaurant-menu,reservations` zur Verfügung. In einem bestehenden CMS finden Inhaber die Schalter unter **Einstellungen → Allgemein**.

## Zentrale Karte

1. Unter **Speisen & Getränke** Kategorien und Einträge anlegen. Die Reihenfolge der Kategorien und Einträge folgt der Verwaltung.
2. Für einen Eintrag Name, Beschreibung und bei Bedarf Herkunft, Jahrgang oder weitere Hinweise pflegen. Ein Eintrag kann mehrere Preise mit Portionsangaben wie „0,1 l“ und „Flasche“ haben. Eingabe in Euro, Speicherung in Cent.
3. Vorübergehend fehlende Einträge und Kategorien ausblenden. Hervorgehobene Einträge stehen im Auswahllayout zuerst.
4. Unter **Seiten bearbeiten → Abschnitt hinzufügen → Gastronomie** die zentrale Karte einsetzen. Im Inspector **Vollständige Karte**, **Kompakte Vorschau** oder **Hervorgehobene Auswahl** wählen. Kategorien und Anzahl der Einträge je Kategorie sind pro Abschnitt einstellbar. Bei leerer Kategorieauswahl erscheinen alle sichtbaren Kategorien.
5. In der Seitenvorschau auf eine Kategorie, einen Eintrag oder dessen Preis klicken. Der Karteneditor öffnet die passende Stelle. Änderungen erscheinen direkt in allen Platzierungen im Entwurf und lassen sich mit der Seitenhistorie rückgängig machen. Die Redaktion kann die Karte bearbeiten. Veröffentlichung und Modulschalter bleiben beim Inhaber.

## Tischreservierungen

1. Unter **Reservierungen → Tische & Buchungszeiten** die tatsächlich verfügbaren Tische mit Kapazität erfassen. Jede Anfrage belegt einen passenden Tisch. Für jedes Buchungsfenster Wochentag, Beginn, Ende und Dauer eines Besuchs festlegen. Mehrere Fenster am selben Tag dürfen sich nicht überschneiden.
2. Abstände der Startzeiten, Vorlauf, Buchungshorizont und Dauer der vorläufigen Tischfreihaltung einstellen. Abweichende Schließtage als einzelne Daten oder Zeiträume eintragen.
3. Einen Abschnitt **Tischreservierung** hinzufügen und im Inspector zwischen **Kompakt**, **Formularkarte** und **Mit Bild** wählen. Ein Bild im Split-Layout kann aus der eigenen Medienbibliothek stammen. Die Vorschau lässt keine echten Anfragen zu.
4. Entwurf speichern und veröffentlichen. Die Gästeseite fragt verfügbare Zeiten anhand der veröffentlichten Konfiguration und der aktuellen Tischbelegung ab.
5. In der Übersicht Anfragen nach Datum oder Status filtern. **Annehmen** bestätigt den Tisch, **Ablehnen** gibt ihn frei. Bei Ablauf einer vorläufigen Tischfreihaltung erscheint der Termin wieder im Angebot, sofern ein Tisch frei ist. Das CMS prüft die Kapazität bei der Zusage erneut.
6. In der Reservierungsübersicht **E-Mail-Einstellungen öffnen** wählen. Den SMTP-Zugang mit Absender und Testempfänger speichern. Eine erfolgreiche Testnachricht bestätigt die gespeicherte Verbindung. Nach geänderten Zugangsdaten erneut testen. Ohne SMTP öffnet der E-Mail-Link im CMS eine vorbereitete Antwort. Beide Antworten übernehmen die Sprache der Gästeseite. Die Bestätigung einer Anfrage in der Verwaltung und der E-Mail-Versand haben getrennte Status.

Kontakt- und Anfragedaten sind im CMS nur für Inhaber sichtbar. Die serverseitige Bereinigung verwendet die in den technischen Einstellungen konfigurierte Aufbewahrungsdauer, gerechnet ab Reservierungsdatum. Für die Datenschutzhinweise die tatsächliche Verarbeitung, Ansprechpartner und eingesetzten Dienste des Betriebs eintragen.

## Abnahme

- Karte in mindestens zwei Abschnitte einsetzen. Einen Preis ändern, den Entwurf speichern, neu laden und erst dann veröffentlichen. Beide Abschnitte zeigen denselben aktualisierten Preis. Ausgeblendete Einträge bleiben im CMS.
- Mit einem Testgast einen offenen Tag, eine passende Personenzahl und eine Uhrzeit auswählen. Ablehnung, Zusage und Stornierung in einer Testinstallation durchspielen. Prüfen, dass ein geschlossener Tag und eine zu große Gruppe keine Zeiten liefern. Zwei Anfragen für denselben letzten freien Tisch dürfen nicht beide eine Tischfreihaltung erhalten.
- Öffentliche Formulare, die drei Layouts, Entwurfsbearbeitung, Tastatur und Mobilansicht prüfen. Mit eingerichtetem SMTP eine Testadresse für die echte Zustellung verwenden.
- Nach einer Änderung der veröffentlichten Buchungsfenster eine offene Anfrage prüfen. Das CMS sagt sie nur zu, wenn der ursprüngliche Termin weiterhin vollständig hineinpasst.
