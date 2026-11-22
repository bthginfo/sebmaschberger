# Shop und Zahlungen

Für den konkreten Auftrag Anbieter, Sortiment, Währungen, Versand, Steuern und Rückabwicklung festlegen. Einen geeigneten Zahlungs-/Commerceanbieter auswählen und dessen aktuelle offizielle Integration verwenden.

Preise und Berechtigungen auf dem Server berechnen. Checkout-Sitzungen serverseitig erzeugen, Webhook-Signatur prüfen, Ereignisse idempotent verarbeiten. Eine Weiterleitung auf eine Erfolgsseite ist kein Zahlungsnachweis.

Bestellungen, Zahlstatus und Zustellung dauerhaft speichern. Private Downloads erst nach serverseitiger Berechtigungsprüfung freigeben. Kundendaten und Bestelldokumente nicht in den öffentlichen Medien-Store legen.

Im Sandboxmodus erfolgreiche Zahlung, Abbruch, verspäteten/doppelten Webhook, Rückerstattung und unberechtigten Download prüfen. Die dafür nötigen Anbieterressourcen gehören dem neuen Projekt.

### Vorlagen und Preisregeln

Das native optionale Commerce-Modul enthält jetzt Produktgruppen, Dienstleistungen, feste inklusive Steuerregeln, Ländergebiete und private PDF-Originale. Einrichtung und Grenzen: [Vorlagen und Sortiment](../business-studio.md). Ein eigener Stripe-Zugang, Webhooks und ein freigegebener Testkauf bleiben Voraussetzung.

## Veröffentlichung

Verbrauchershops können unter **Einstellungen → Shop** die Widerrufsfunktion einschalten. Nach dem Veröffentlichen führt **Vertrag widerrufen** im Fußbereich zum Formular. Der Kunde prüft seine Angaben und bestätigt den Widerruf. Der Vorgang erscheint mit Eingangszeit im Anfragepostfach. Dort ist der Status der Bestätigung sichtbar und der Versand lässt sich bei einem Fehler erneut versuchen. Lassen Sie die Funktion auch bei einer Verkaufspause erreichbar, solange Kunden einen Widerruf einreichen können. Testen Sie die E-Mail mit dem vorgesehenen SMTP-Konto vor Verkaufsstart. [§ 356a BGB](https://www.gesetze-im-internet.de/bgb/__356a.html)

Test- und Live-Zahlungen verwenden getrennte Stripe-Schlüssel, Webhooks und Datenbestände. PayPal wird optional über den eigenen Stripe-Händlerzugang angeboten, sobald diese Zahlungsart dort freigeschaltet ist. [Stripe-Testmodus](https://docs.stripe.com/test-mode) · [PayPal in Stripe Checkout](https://docs.stripe.com/payments/paypal)
