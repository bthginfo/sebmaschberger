# Infrastruktur, Veröffentlichung und Wartung

## Isolierte Installation

Für jede neue Website ein eigenes privates GitHub-Repository anlegen und den vorgesehenen Produktionsbranch dorthin pushen. Mit diesem Repository ein eigenes Vercel-Projekt verbinden. Ein eigenes Neon-Projekt im **Free-Tarif** mit eigener Datenbank und einen eigenen Vercel-Blob-Store für dieselbe Website bereitstellen und verknüpfen. Die Reihenfolge für Einrichtung und Git-Vorschau steht in `docs/setup.md`. Bestehende Ressourcen derselben Website wiederverwenden. Kein fremder Store, kein gemeinsames Neon-Projekt als Ersatz und kein kostenpflichtiger Ausweichplan ohne Auftrag. GitHub-Repository, Produktionsbranch, Ressourcen-IDs, Region, verifizierten Tarif und Live-Adresse in `project/infrastructure.json` festhalten, ohne Geheimnisse.

Lokal `npm ci`, `npm run setup`, `npm run dev`. Lokale Tests nutzen `.data`. Serverzugänge und Runtime-Daten nicht kopieren oder ausgeben. In Produktion eigene Werte für Authentifizierung, Storage, SMTP und benötigte Anbieter. Schema und Erstimport nach `START-HERE.md` einrichten. Einen vorhandenen Entwurf oder Live-Inhalt nie mit dem JSON-Erstimport überschreiben.

## Reale Prüfung

- `npm run typecheck`, relevante Tests und `npm run build`. Den Browserablauf mit lokaler API und richtiger Rolle durchspielen. Entwurf ändern, speichern, neu laden, veröffentlichen und die öffentliche Fassung getrennt prüfen.
- Bei Consent erst ablehnen, dann eine einzelne Kategorie freigeben und widerrufen. DE/EN und Rechtslinks prüfen. Eigene Webanalyse zählt nach Statistik-Einwilligung. Benutzerdefinierte Tags kategorisieren; isolierten Kontext bevorzugen. Seitenkontext nur für einen konkret benötigten vertrauenswürdigen Tag.
- Club aus, Club allein und Club mit Coach Studio unterscheiden. Rollen, Einladungslink, private Bilder, Detailrouten, öffentliche Ergebnisse, Nachrichtenempfänger und die mobile Oberfläche prüfen. Bei Coach Studio zusätzlich Phase, Wiedergabe, Export und View/Edit-Freigabe testen.
- Anleitung `docs/workspace-apps.md`: Manifeste, Appsymbole, Installation, Tour, Geräteberechtigung und gegebenenfalls Push auf das eigene Testgerät prüfen. Keine privaten HTML- oder Daten-Caches. Betriebssystem- oder Provider-Erfolg erst nach tatsächlichem Test melden.

## Freigabe

Vor Produktion echten Namen, Domain, Kontakt, Medienrechte und auf das Projekt abgestimmte Rechtstexte prüfen. Platzhalter nur bei gewünschter Demo. Bei beauftragter Veröffentlichung das konkrete Ziel überprüfen, ausliefern und die echte Domain testen. Anbieterzugänge nur für das beauftragte Projekt verwenden.

Die Live-Prüfung aus [Texte, SEO und KI-Suchen](search-and-copy.md) gehört zur Abnahme. Änderungen an Text, URLs, Indexregeln oder strukturierten Daten vor und nach dem Ausrollen prüfen.

## Template und generierte Projekte

Den neuen Template-Stand als neutralen, verifizierten Commit veröffentlichen. Code, Modulrichtlinien, Anleitungen, Version und Generator gemeinsam pflegen. Kundendaten, Zugangsdaten, Runtime-Verzeichnisse und Provider-Verbindungen bleiben im Kundenprojekt.

Für ein vorhandenes Kundenprojekt das dokumentierte kontrollierte Upgrade verwenden: Kundenstand, Template-Ursprung und Anpassungen vergleichen, isolierte Vorschau erzeugen, kundeneigene Seed-Daten und Infrastruktur bewahren und erst nach Prüfung zusammenführen. Den Kundenordner nicht durch erneutes Generieren ersetzen.
