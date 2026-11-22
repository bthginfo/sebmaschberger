# Coach Studio

Das Modul wird nur bei Bedarf im jeweiligen Website-Projekt aktiviert.

```sh
node scripts/create-site.mjs --name "Rugby Club" --out "../rugby-club" --features coach-studio
```

Alternativ im Projektbriefing `modules.coachStudio.enabled` auf `true` setzen. In einem vorhandenen Workspace kann der Eigentümer unter **Settings → General → Coach Studio** aktivieren und den Entwurf speichern. Das Playbook erscheint dann unter **Training → Coach Studio**.

## Taktik erstellen

Unter **New play** eine leere Tafel oder eine der Rugby-Vorlagen wählen. Spieler, Ball, Pfeile, Hütchen und Zonen auf der Tafel platzieren. Die Bewegung entsteht zwischen zwei Phasen, wenn dieselben Elemente dort jeweils an ihren Zielpositionen stehen. In den Phaseneinstellungen lassen sich Bewegung, Standzeit, Kurve und Ballflug wählen. Der Trainingsplan ergänzt Lernziel, Spielerzahl, Feldgröße, Material, Dauer und Steigerung.

**How it works** zeigt die Bedienung mit Beispielen. Im Vollbild bleiben Werkzeuge, Eigenschaften, Zeitleiste und Wiedergabe erreichbar. Für die Besprechung kann die Taktik mit Zeitregler, Tempo und Schleife abgespielt werden.

## Export und Freigabe

Der PDF-Export erzeugt Phasenblätter und gegebenenfalls einen Trainingsplan. Der interaktive HTML-Export enthält Tafel und Player in einer Datei für die Offline-Nutzung.

**Share play** erstellt befristete Links zum Ansehen oder Mitbearbeiten einer gespeicherten Taktik. Der Eigentümer verwaltet und widerruft diese Links im Studio. Mitbearbeitung schreibt in dieselbe Taktik und prüft die gespeicherte Revision vor Änderungen.

## KI-Assistent

Der Coach-Assistent liest die aktuelle Taktik und schlägt Änderungen an Aufstellung, Bewegungen, Phasen oder Trainingsplan vor. Der Eigentümer prüft und übernimmt den Vorschlag im Entwurf. Der Assistent benötigt das separat aktivierte KI-Modul und einen [eigenen serverseitig konfigurierten Anbieter](ai-assistant.md).
