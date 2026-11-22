# Coaching-Portal und Google Ads

## Im CMS anfangen

Öffne **Coaching-Kunden** und starte die Einführung. Lege Kunde oder Betreuer per Einladung an. Einladung im Fenster kopieren oder per eingerichteter SMTP-Verbindung versenden. Sie gilt 72 Stunden und kann einmal verwendet werden. Unter **Kunden** weist Sebastian einem Profil einen oder mehrere Betreuer zu und kann einen Zugang pausieren. Im Kundenportal melden sich Team und Kunden mit ihrem persönlichen Zugang an.

Im **Planeditor** Startdatum und Zahl der Wochen einstellen. Für jeden Tag Trainings, Mahlzeiten, Inhalte, Termine, Routinen oder Check-ins hinzufügen. Mit **Woche duplizieren** geplante Einträge übernehmen. Den Ursprung unverändert erhalten, indem der Plan als Vorlage gespeichert wird. Die Kundenvorschau zeigt, welche Einträge am gewählten Tag sichtbar sind. **Profil & Sichtbarkeit** enthält individuelle Daten und die Schalter für Bereiche und Nährwerte. In der Freigabe Name und Zeitraum prüfen. Veröffentliche Versionen und absolvierte Einheiten stehen im Verlauf.

Kurze Videos, Bilder und PDF-Dateien können bis 4 MB privat hochgeladen werden. Bei wiederverwendbaren eigenen Übungen lässt sich der Upload für weitere Pläne freigeben. YouTube- und Vimeo-Videos werden erst nach einer Aktion im Kundenportal geladen. Kunden können Training protokollieren, Portionsmengen umrechnen, eine Einkaufsliste ansehen, Termine exportieren und mit dem Coaching-Team schreiben.

## Geräte im Kundenportal

- Google Health für Fitbit und Pixel Watch nutzt Google OAuth und die Google Health API. Im Google-Cloud-Projekt die API aktivieren, die erforderlichen Lesebereiche im Consent Screen wählen und die Callback-URL aus **Geräte** eintragen. Je nach Verteilung ist eine Google-Freigabe erforderlich. [Google Health einrichten](https://developers.google.com/health/setup)
- Oura und Withings nutzen persönliche OAuth-Freigaben. Bei jedem Anbieter eine eigene App registrieren. Die Callback-Adresse aus dem Coaching-CMS in genau der gezeigten Form hinterlegen. Client-ID und Client-Geheimnis im CMS speichern. [Oura OAuth](https://cloud.ouraring.com/docs/authentication) · [Withings OAuth](https://developer.withings.com/api-reference/)
- Apple Watch und andere mit Apple Health synchronisierte Geräte lassen sich über den ZIP- oder XML-Export importieren. Die Auswahl der letzten 90 Tage erfolgt im Browser. Über **Automatischen Export einrichten** kann der Kunde außerdem einen REST-Zugang erstellen. In Health Auto Export eine REST-Automation mit JSON, täglicher Aggregation und den ausgewählten Werten für Schritte und Schlaf erstellen. Die angezeigte URL und den Authorization-Header übernehmen. [Apple-Health-Export](https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios) · [Health Auto Export REST](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/)
- HealthKit und Health Connect stellen ihre direkten Zugriffe nativen Apps bereit. Android-Geräte können über Google Health angebunden werden, wenn ihre Werte dort synchronisiert werden. Garmin, Polar und WHOOP bieten eigene Herstellerprogramme und Schnittstellen. [HealthKit](https://developer.apple.com/documentation/healthkit) · [Health Connect](https://developer.android.com/health-and-fitness/health-connect/architecture) · [Garmin Health API](https://developer.garmin.com/gc-developer-program/enterprise/health-api/) · [Polar AccessLink](https://www.polar.com/accesslink-api/) · [WHOOP OAuth](https://developer.whoop.com/docs/developing/oauth/)

Manuelle Werte und Gerätedaten liegen im privaten Fortschrittsbereich. Der Kunde kann sie für sein Betreuungsteam freigeben, die Freigabe zurücknehmen und importierte Werte löschen. Auch bei pausierter Erfassung bleiben diese Einstellungen zugänglich. Zugangsdaten und Tokens bleiben serverseitig verschlüsselt. Der Zeitplan für direkte Cloud-Anbieter läuft mit dem geschützten Vercel-Cron und synchronisiert kürzlich aktualisierte Tageswerte.

## Suchkampagne

Unter **Google Ads** stehen sechs Anzeigengruppen mit 150 Such-Keywords. Dazu kommen Formulierungen für responsive Suchanzeigen, Zielseiten, kampagnenweite Ausschlüsse, Sitelinks und Zusatzinformationen. Text einzeln über **Kopieren** übernehmen oder in Google Ads Editor die CSV-Dateien importieren. Google Ads Editor zeigt vor der Übernahme die jeweils erkannten Felder. Die interne Freigabe speichert einen Stand im CMS. Budget, Standort und Conversion-Aktion in Google Ads vor dem Start bestätigen. [Google zu Suchanzeigen](https://support.google.com/google-ads/answer/7684791) · [CSV-Import im Ads Editor](https://support.google.com/google-ads/editor/answer/30564)

## Infrastruktur

Das Coaching-Portal verwendet die separate Produktionsverbindung über `PORTAL_DATABASE_URL`. Versionsprüfungen und Kundenfreigaben werden serverseitig durchgeführt. `AUTH_SECRET` verschlüsselt Anbieterzugänge. Der private Blob-Store speichert die Uploads. Lokale Entwicklung verwendet separate `.data/`-Dateien. Preview-Projekte erhalten eigene Testressourcen. `CRON_SECRET` schützt den Geräteabgleich.
