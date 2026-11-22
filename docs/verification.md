# Prüfstand · 30. Oktober 2026

Der Starter wurde aus dem in `template.manifest.json` dokumentierten CMS-Stand abgeleitet. Neutrale Inhalte, eigene Beispielgrafiken, der Projektgenerator und der Skill wurden ergänzt. Kundenspezifische Daten und Infrastrukturverknüpfungen sind ausgeschlossen.

## Erfolgreiche Prüfungen

- **Saubere Installation, Typprüfung, 22 Tests und Produktions-Build:** [GitHub Actions](https://github.com/bthginfo/website-starter/actions/runs/41026823191), Code-Commit `7e82893eb64eb512530a1f287befb485739135cd`, Node 24 auf Ubuntu.
- **CMS gegen den echten Produktionsserver:** nicht angemeldeter Zugriff, unzulässige Schreibherkunft, Anmeldung, Cookie-Eigenschaften, Entwurf speichern, veraltete Revision ablehnen, Entwurf öffentlich unsichtbar, Veröffentlichung einschließlich Cache-Aktualisierung, Anfrage speichern, Export, Wiederherstellung und Abmeldung. Derselbe GitHub-Lauf bestätigt diesen Ablauf mit deaktiviertem SMTP und synthetischen Daten.
- **Generator:** alle vier Profile erzeugen valide eigenständige Projekte; Namen, Kontakt, Farben, Blogprofil und Briefing werden übernommen. Bestehende Ziele werden erhalten. Zugangsdaten, Laufzeitdaten, vorhandene Git-Historie und Hostingverknüpfungen werden ausgeschlossen.
- **Inhalt und Sicherheit:** Abschnittsregistry, interne Links, öffentliche Blogprojektionen, Scrypt, authentifizierte Verschlüsselung, sichere Links und Escaping strukturierter Daten geprüft.
- **Abhängigkeiten:** `npm audit --package-lock-only --json` meldete nach der Korrektur einer indirekten Zod-Abhängigkeit am Prüftag null bekannte Schwachstellen. Die Korrektur verwendet Zod 4.6.7; [zugehöriger Sicherheitshinweis](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- **Skill:** formale Prüfung erfolgreich; die installierte persönliche Kopie und der Repository-Quelltext sind identisch. Automatische Auswahl ist zugelassen.
- **Repository:** privat und als GitHub-Template angelegt.

## Einordnung der Umgebung

Die lokale Windows-Neuinstallation und Browser-/Development-Laufzeitversuche liefen in Zeitüberschreitungen. Lokale Typ- und Modultests verwendeten vorübergehend bestehende Abhängigkeiten. Der vollständige Nachweis mit sauber installierten Paketen und Produktionsserver erfolgte deshalb in GitHub Actions. Die vorübergehende Verknüpfung wird nicht mit der Vorlage ausgeliefert.

Für diesen Starter wurden keine produktiven Neon-, Blob- oder SMTP-Ressourcen angelegt. Echte Uploads und Mailzustellung benötigen die eigene Einrichtung und Prüfung je Website. Neue Kundendesigns werden zusätzlich visuell und auf Bedienbarkeit geprüft; die enthaltenen Rechtstextseiten und Unternehmensangaben sind bewusst Platzhalter.
