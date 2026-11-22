# Portal, CRM und Geschäftsprozesse

Kantiq ist eine veränderliche Referenz. Der Nutzer hat es für diese Starter-Version ausdrücklich als noch nicht aktuellen Implementierungsstand eingeordnet. Deshalb enthält der Kern kein Kantiq-Laufzeitmodul. Vor einer konkreten Übernahme den dann aktuellen Stand von `bthginfo/kantiq` und seine Tests prüfen.

Je nach Auftrag nur die benötigten Module ergänzen: Kunden, Ansprechpartner, Projektmitgliedschaften, Aufgaben, Freigaben, Angebote, Rechnungen oder private Dokumente. Die Website-Verwaltung bleibt davon getrennt.

- Individuelle Nutzer und serverseitige Sitzungen einführen; Portalzugriffe zusätzlich pro Projekt/Objekt prüfen. Ein Admin-Passwort allein ist kein Kundenportal.
- Öffentliche Medien und private Dokumente getrennt speichern. Downloads prüfen bei jedem Zugriff die Berechtigung und verwenden kurzlebige URLs.
- Fachliche Befehle besitzen Wiederholungsschlüssel. Änderung, Audit-Eintrag und Outbox-Ereignis gehören in dieselbe Postgres-Transaktion.
- Asynchrone Zustellungen getrennt je Konsument, mit Lease, Wiederholungsgrenze und Fehlersicht verwalten. Eine Queue transportiert IDs; die Datenbank hält den dauerhaften Status. Tatsächlichen Queueanbieter erst bei Bedarf auswählen.
- E-Mail-Texte, Versandstatus und manuelle Wiederaufnahme im Admin vorsehen. Versandfehler dürfen gespeicherte Vorgänge nicht löschen.
- Angebote und ausgestellte Rechnungen verwenden eingefrorene Daten. Beträge in kleinsten Währungseinheiten führen; Nummernvergabe und Zahlungseingänge transaktional/idempotent behandeln. Ein eigener Rechnungsworkflow braucht eine fachliche Prüfung der konkret benötigten Ausgabeformate und Regeln.

Mit synthetischen Kunden in einer eigenen Datenbank prüfen: fremder Projektzugriff, abgelaufene Einladung, paralleler Befehl, doppeltes Ereignis, fehlgeschlagener Versand, privater Download und Wiederaufnahme. Erst danach als fertige Funktion ausweisen.

## Bedienvertrag für eine konkrete CRM-Umsetzung

Diese Punkte wurden im Kantiq-Admin mit synthetischen Daten geprüft. Sie sind eine Übernahmeregel für ein beauftragtes CRM-Modul und keine im neutralen Starter versteckte Laufzeitfunktion.

- Neue Projekte, Angebote, Rechnungen und Portaleinladungen verlangen eine ausdrückliche Kundenwahl. Nur ein erkennbarer Kundenkontext darf vorbelegen. Bei mehreren Portalprojekten vor einer Nachricht das Projekt wählen lassen.
- Angebot und Rechnung als Entwurf erneut bearbeiten können. Alle Änderungen mit Objektsperre, erwarteter Version, Statusprüfung und serverseitiger Neuberechnung sichern. Veraltete oder bereits ausgestellte Belege ablehnen; verbindliche Rechnungen bleiben unveränderbar. Fehlende Daten dürfen im Entwurf offen bleiben, die konkrete Ausstellung muss sie verlangen.
- Zahlungsbetrag, Eingangsdatum und Notiz als gemeinsamen Öffnungsstand merken. Auch reine Datumsänderungen und Zurück aus Zahlungs-/Stornodialogen benötigen den Verwerfen-Schutz. Nach Weiter bearbeiten die Daten und den Fokus erhalten.
- IBAN gemeinsam im Browser und Server normalisieren und auf Prüfziffer prüfen. Ein leeres unvollständiges Profil zulassen, einen ausdrücklich ungültigen Wert mit Feldfehler ablehnen. Einrichtungslinks direkt zum benötigten Rechnungsprofil führen.
- Einladungsbestätigung mit Kopieren/Öffnen bis zur bewussten Fertig-Aktion stehen lassen. Fehler beim Mailversand dürfen den persönlich weitergebbaren Link nicht unzugänglich machen. Entzug muss bestehende Kundensitzungen sperren.
- Mobile Datensätze als beschriftete Karten mit direkt sichtbaren Öffnen-/Download-Aktionen anbieten. Kein horizontales Suchen nach dem primären Button. Projektname und Leistungsbereiche müssen nach dem Anlegen korrigierbar bleiben, ohne still den Kunden zu wechseln.

Die wiederverwendbaren Beleg-/Mail-Renderer und die Vorlagengestaltung stehen im nativen Dokument-Studio bereit. Der eigenständige Kantiq-Leistungskatalog samt CRM-Angeboten/Rechnungen bleibt eine Svelte-Domäne; das neutrale Template behauptet dadurch kein vollständiges CRM.
