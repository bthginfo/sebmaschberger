# Podcast nach dem Amélie-Muster

Referenz ist die eigenständige Amélie-Implementierung, nicht ein eingebettetes fremdes CMS. Bei verfügbarer Quelle insbesondere `src/lib/podcast*`, `src/app/api/internal/podcast-sync/`, `src/app/api/admin/podcast/`, `components/admin/podcast-settings.tsx` und die zugehörigen Tests prüfen. Das Referenzprojekt kann sich weiterentwickelt haben.

- Eigenes Feedmodell mit stabilen Episoden-IDs, Quell-URL, Veröffentlichungsdatum, Seitennavigation und sichtbaren Episoden definieren.
- RSS ausschließlich serverseitig abrufen; Protokoll/Hostname, Antwortgröße und Timeout begrenzen, XML mit deaktivierten unsicheren Funktionen parsen. Keine beliebige interne Serveradresse aus CMS-Eingaben abrufen.
- Feedwerte von redaktionellen Overrides und Sichtbarkeit trennen. Ein erneuter Import darf manuelle Änderungen nicht löschen.
- Startseitenauszug, Archiv und individuelle Folge aus demselben Modell darstellen. Externe Player nach Einwilligung laden.
- Einstellungen und manuellen Abruf im geschützten CMS anbieten. `nextSyncAt`, atomare Sperre, letzter Erfolg und Fehlerzustand dauerhaft speichern.
- Gewünschtes Intervall explizit in Kalendertagen berechnen. Ein geschützter täglicher Cron kann Fälligkeit prüfen; nicht jeden Seitenbesuch zum externen Abruf machen.
- Bei Fehlern den letzten erfolgreichen Stand erhalten. Tests für Sortierung, Dubletten, Pagination, Overrides, parallele Ausführung und Intervall ergänzen.

Neue Feeds und Bilder gehören zum neuen Auftrag. Den Amélie-Feed oder ihre Episoden nicht als Standardinhalt übernehmen.
