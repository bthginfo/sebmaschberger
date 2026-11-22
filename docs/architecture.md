# Architektur

Ein modular aufgebautes Next.js-Projekt hält Website, CMS und geschützte Serverfunktionen in einem Repository. Der Inhalt bleibt unabhängig von den fünf mitgelieferten Darstellungen.

| Bereich | Ort | Verantwortung |
| --- | --- | --- |
| Verträge | `src/lib/types.ts`, `validation.ts` | Typen und serverseitige Validierung |
| Abschnitte | `section-library.ts`, `components/admin/section-capabilities.ts` | Bibliothek, Vorgaben und Bearbeitungsfunktionen |
| Öffentlicher Renderer | `src/components/site/` | Darstellung und direkte CMS-Bearbeitung |
| CMS | `src/components/admin/` | Lokaler Arbeitsstand, Speichern, Vorschau, Veröffentlichung |
| API | `src/app/api/` | Authentifizierung, Herkunftsschutz, Befehle und Uploads |
| Speicherung | `src/lib/db.ts` | Postgres oder lokale Entwicklungsdatei |
| Öffentlicher Cache | `content.ts`, `public-projection.ts` | Kleine veröffentlichte Snapshots, getrennt vom Admin |
| Versand | `mail.ts`, `settings-cache.ts` | Optionale SMTP-Verbindung mit serverseitigen Geheimnissen |

## Inhalt und Veröffentlichung

`WebsiteContent` enthält globale Konfiguration, Seiten und optionale Blogbeiträge. Abschnitte besitzen stabile IDs sowie getrennte Inhalts- und Gestaltungsfelder. Schema, Bibliothek, Renderer und Inspektor müssen dieselben Typen unterstützen.

Eine Sitzung bearbeitet zunächst ihren lokalen Stand. Speichern schreibt ausschließlich den Entwurf und prüft die Revision. Veröffentlichung übernimmt diesen Entwurf atomar, legt eine Revision an und invalidiert `ws-published` sowie die Routen. Eine frühere Fassung wird als neuer Entwurf wiederhergestellt. Blogbeiträge können unabhängig von fremden Seitenentwürfen veröffentlicht werden.

## Daten und Kosten

Öffentliche Seiten lesen ausschließlich veröffentlichte Snapshots. Der öffentliche Index enthält Routen und SEO, keine vollständigen Seitenkörper. Seiten laden nur ihren jeweiligen Inhalt. Next Data Cache und React Request Cache vermeiden wiederholte Datenbankzugriffe; private Einstellungen und Sitzungen sind davon getrennt. Große Textsnapshots werden für den persistenten Cache komprimiert.

Das CMS lädt einen gemeinsamen Bootstrap aus Inhalt, Medien, Einstellungen und Anfragen. Tippen, Vorschau, Tour, Bildfokus und Undo/Redo benötigen keine weiteren Datenbankzugriffe. Es gibt kein Autosave pro Tastendruck und kein regelmäßiges Polling.

Postgres hält `ws_site`, `ws_records`, `ws_revisions` und `ws_limits`. SQL ist parametrisiert. Schema und Erstimport laufen nur mit `npm run db:setup` und überschreiben keinen vorhandenen Inhalt. Jede neue Website erhält ein eigenes Vercel-Projekt, ein eigenes Neon-Projekt im Free-Tarif mit eigener Datenbank sowie einen eigenen Blob-Store. Tabellen, Datenbanken oder Blob-Pfadpräfixe innerhalb von Ressourcen anderer Websites ersetzen diese Trennung nicht. Preview und Produktion sind getrennte Umgebungen; ein Preview-Branch kann zum eigenen Neon-Projekt derselben Website gehören. `.data/cms.json` ist nur für lokale Entwicklung in einem Prozess vorgesehen.

Vercel Functions und neue Speicherressourcen sollen für dieses Setup in Frankfurt liegen. Öffentliche Medien dürfen global über das CDN ausgeliefert werden. Konkrete Tarife und Kontingente vor Einrichtung prüfen; der Starter garantiert keine kostenlose Nutzung.

## Zugang, Upload und Kontakt

Der Kern enthält einen gemeinsamen Administratorzugang mit Scrypt-Passwort, gehashten zufälligen Sitzungen, HttpOnly-/SameSite-Cookies, Ablaufzeit und Passwortwechsel mit Sitzungswiderruf. Mehrere individuelle Redaktionskonten und Rollen sind eine spätere Auth-Erweiterung.

Kontaktanfragen werden vor dem optionalen Versand gespeichert. Fehler oder fehlendes SMTP verlieren die Anfrage nicht. SMTP-Zugangsdaten werden mit einem je Website unabhängigen `AUTH_SECRET` verschlüsselt. Rate-Limits und Sitzungen bleiben dauerhaft gespeichert, abgelaufene Einträge werden bereinigt.

Uploads akzeptieren JPEG, PNG und WebP bis 4 MiB. Sharp dekodiert, entfernt Metadaten, korrigiert die Orientierung, begrenzt die Bildgröße und speichert WebP. Der öffentliche Blob-Store ist ausschließlich für öffentliche Medien bestimmt. Private Kundendokumente brauchen einen getrennten privaten Speicher mit eigener Zugriffsprüfung.

## Erweiterungen

Neue redaktionelle Funktionen zuerst als eigene Inhaltsverträge und Servermodule ergänzen. Ereignisverarbeitung wird erst für tatsächlich asynchrone Geschäftsprozesse eingeführt; Kontaktformular und CMS benötigen keine allgemeine Queue-Plattform. Portal-/CRM- und Abrechnungserweiterungen haben eigene Berechtigungen und Transaktionen. Bauanleitungen: `docs/recipes/`.

Das Sprachfeld bereitet Inhalte vor; vollständige Mehrsprachigkeit erfordert eigene Routen, Übersetzungsbeziehungen und `hreflang`. `llms.txt` ergänzt lesbare Inhalte und strukturiertes Markup, garantiert aber keine Sichtbarkeit in KI-Antworten.

## Optionale Creator- und Shop-Module

Creator-Inhalte bleiben in config/pages/sections und durchlaufen die gemeinsame Validierung, Registry, Capability-Zuordnung und direkte Bearbeitung. Die Module sind standardmaessig aus. Privater Commerce-Zustand verwendet einen atomaren Compare-and-swap-Datensatz, getrennt von veroeffentlichten Snapshots. Die oeffentliche Editor-Demo verwendet denselben PageEditor mit ausschliesslich sitzungslokalen Medien- und Speicheradaptern. Details, Grenzen und Einrichtung: [Creator-Module](creator-modules.md).
