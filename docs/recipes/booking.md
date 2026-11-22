# Terminbuchung

Zwischen einer Anfrage für einen Wunschtermin und einer verbindlichen Buchung unterscheiden. Ein vorhandener Buchungsanbieter kann als Link oder nach Einwilligung eingebettet werden; eine eigene Verfügbarkeitsverwaltung benötigt ein eigenes Servermodul.

Für echte Buchungen Zeitzone, Dauer, Öffnungszeiten, Puffer, Abwesenheiten und Kalenderquelle festlegen. Verfügbarkeit serverseitig erneut prüfen und Doppelbuchungen transaktional verhindern. Idempotente Erstellung, Bestätigung und Stornierung vorsehen. Geheimnisse und Kalenderzugriffe bleiben auf dem Server.

CMS und geschützter Admin zeigen Status und Fehlermeldungen. Benachrichtigungen nach erfolgreicher Speicherung versenden; bei Ausfall keinen Termin verlieren. Tests für Parallelbuchungen, Sommer-/Winterzeit, Absagen und fehlgeschlagene Zustellung ergänzen.
