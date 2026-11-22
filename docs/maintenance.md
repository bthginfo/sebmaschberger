# Den Starter weiterentwickeln

Der Starter wird zentral gepflegt; erzeugte Kundenprojekte bleiben eigenständig. Verbesserungen gelten direkt für neue Projekte. Bestehende Websites erhalten gezielte Updates anhand ihrer verwendeten Starter-Version.

## Änderungen an der Vorlage

Neutrale Inhalte und eigenständige Infrastruktur als Standard erhalten. Wiederverwendbare Funktionen gehören in den Kern; betriebsspezifische Erweiterungen bekommen eigene Module oder eine klar bezeichnete Bauanleitung. Keine laufenden Kundeninhalte in die Vorlage zurückkopieren.

Bei einer funktionalen Änderung Typprüfung, passende Tests, Build und den CMS-Ablauf in GitHub Actions prüfen. Nach Abhängigkeitsänderungen zusätzlich den Lockfile-Audit ausführen. Kompatibilität von Entwurf/Veröffentlichung, bestehenden Inhaltsverträgen und Migrationen berücksichtigen.

Bei einer neuen Starter-Version `template.manifest.json` und die Paketversion aktualisieren. Funktionskatalog, Einrichtung und Skill nur dort ändern, wo sich der tatsächliche Arbeitsablauf ändert. Für neue Rechner den enthaltenen Skill installieren; vorhandene lokale Skill-Anpassungen vor einem Austausch prüfen.

## Bestehende Website aktualisieren

`project/origin.json` nennt die verwendete Starter-Version und bei einer Erzeugung aus einem sauberen Git-Stand auch den Basis-Commit. Für ältere Projekte den passenden Commit aus der Starter-Historie ermitteln. Beide Projektordner brauchen einen sauberen Git-Stand.

Den Vergleich im Checkout der neuen neutralen Starter-Version starten.

```sh
npm run upgrade:site -- --project ../kundenprojekt
npm run upgrade:site -- --project ../kundenprojekt --out ../kundenprojekt-update
```

Bei älteren Projekten `--from <ursprünglicher Starter-Commit>` ergänzen. Der Vergleich erhält die kundenspezifische Paketidentität, Seed-Inhalte, Projektbriefing und Infrastrukturangaben. Änderungen an gemeinsamen Dateien werden zusammengeführt. Bei Überschneidungen zeigt der Befehl die betroffenen Dateien an und wartet auf manuelle Übernahme. In den Vorschauordner gelangen ausschließlich gespeicherte Git-Dateien.

In der Vorschau `git diff --cached`, `npm ci` und `npm run check` ausführen. Mit einer eigenen Testumgebung und synthetischen Anfragen prüfen. Anschließend einen Update-Branch anlegen und die geprüften Änderungen committen. Bei Bedarf kann der Commit wie jede Git-Änderung zurückgenommen werden. Datenbankmigrationen und Freigabe gesondert durchführen.

## Sicherung und Wiederherstellung

Im sauber gespeicherten Kundenprojekt eine Passphrase mit mindestens 16 Zeichen über eine geschützte Umgebungsvariable `WS_BACKUP_PASSPHRASE` bereitstellen. Archiv und Passphrase getrennt aufbewahren.

```sh
npm run backup:create -- --out ../kundenprojekt.ws-backup
npm run backup:restore -- --in ../kundenprojekt.ws-backup --out ../kundenprojekt-recovery
# Im neuen Wiederherstellungsordner
npm ci
npm run recovery:preview
```

Die Erstellung liest standardmäßig den lokalen Datenstand. `--remote` wählt ausdrücklich die konfigurierte Neon-Datenbank. `--cloud-media` liest zusätzlich Medien aus den eigenen, verknüpften Blob-Speichern. Lokale Sicherungen können damit auch Bibliotheksdateien sichern, die aus dem eigenen Blob stammen. Das Archiv enthält Entwurf, Veröffentlichung, Inhaltsversionen, Medienbibliothek, Anfragen, Tischreservierungen, Shop-Bestellungen, Dokumente und freigegebene Einstellungen. Geschützte Produktdateien werden separat im Archiv erfasst. Das Format unterstützt bis zu 96 MB pro Archiv und 12 MB pro Datei. Für größere Bestände die Infrastruktur-Sicherungen des jeweiligen Projekts verwenden.

Die Wiederherstellung öffnet den im Archiv genannten Code-Stand im neuen Ordner. Die Vorschau läuft lokal mit einem frischen Zugang, abgeschaltetem Versand und separatem Dateispeicher. Private Produktdateien liegen unter `.data/recovered-private`. Für einen späteren Produktivwechsel werden sie über den Shop in den neuen privaten Speicher übernommen. Zugangsdaten, Sitzungen, Live-Freigabelinks, Social-Verbindungen und geplante Sendungen werden beim Wiederaufbau neu eingerichtet. Statistik- und Social-Studio-Daten bleiben in der jeweiligen Infrastruktur-Sicherung.

Beim Wiederherstellungstest die öffentliche Seite und einen Entwurf vergleichen, ein Bild öffnen, im Postfach eine Anfrage finden und einen bestehenden Bestellbeleg öffnen. Danach den lokalen Testzugang und den Wiederherstellungsordner gemäß der Aufbewahrungsvorgabe des Projekts entfernen.
