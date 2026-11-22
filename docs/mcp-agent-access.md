# Externer KI-Agent im CMS

Der vorhandene API-Assistent bleibt ein eigener Weg. Für Generierung im CMS braucht er die eigene serverseitige OpenAI- oder Anthropic-Konfiguration. MCP überträgt dagegen CMS-Werkzeuge an einen externen Agenten; dieser verwendet sein eigenes Modell und sein eigenes Abonnement bzw. seine API. MCP benötigt keinen KI-API-Schlüssel im CMS und schaltet keinen Chat im CMS ein.

## Einrichtung

1. Im privaten Admin **KI & Agenten** öffnen und MCP aktivieren.
2. **Agent verbinden** wählen. Name, Aufgaben und eine Laufzeit von 1, 7, 30, 90, 180 oder 365 Tagen auswählen. **Endless** bedeutet: gültig bis zum Widerruf.
3. Den einmalig angezeigten API-Schlüssel im geschützten Secret-Bereich des Agenten speichern. Ein verlorener Schlüssel wird ersetzt, nicht erneut angezeigt.
4. Im Client einen HTTP-MCP-Server mit der angezeigten Adresse `https://eigene-domain.de/api/mcp` anlegen. HTTP-Header: `Authorization: Bearer <API-Schlüssel>`.
5. Die JSON-Vorlage ist ein Beispiel für Clients mit `mcpServers`-Konfiguration. `CMS_MCP_API_KEY` im Secret-/Umgebungsvariablenbereich setzen. Feldnamen hängen vom Client ab. Clients mit ausschließlich OAuth-Login benötigen einen passenden Adapter; keine universelle Client-Kompatibilität behaupten.
6. Mit „Lies die Seitenübersicht“ beginnen. Danach eine kleine Textänderung als Entwurf verlangen und im CMS prüfen.

## Werkzeuge und Grenzen

| Werkzeug | Recht | Ergebnis |
|---|---|---|
| cms_workspace | cms:read | Gespeicherte Seitenübersicht, Revision und reale Abschnittsbibliothek |
| cms_read_page | cms:read | Bearbeitbare Textfelder einer Seite oder eines Abschnitts |
| cms_help | cms:read | Bedienhilfe und erlaubte Statuszusammenfassungen |
| cms_update_text | cms:draft | Genau ein zuvor gelesenes Textfeld als Entwurf |
| cms_create_page | cms:draft | Neue Entwurfsseite aus tatsächlich verfügbaren Abschnitten |
| cms_create_social_draft | social:draft | Neuer bearbeitbarer Studio-Entwurf, wenn dieses CMS das Social-Studio besitzt |
| cms_analytics | analytics:read | Aggregierte Webanalyse mit Zeitraum und Filtern |

Der Agent formuliert selbst und ruft keinen KI-Anbieter des CMS auf. Veröffentlichung, Social-Versand, Zahlungen, Erstattungen, Zugangsdaten und OAuth-Freigaben bleiben getrennte bewusst ausgelöste Vorgänge. Shop- oder Anfragehilfe gibt keine vollständigen Nachrichten und Kontaktdaten weiter. Gelesene Inhalte können beim externen KI-Anbieter verarbeitet werden; deshalb nur benötigte Rechte erteilen.

Schreibvorgänge benötigen eine stabile eigene `operationId`; bei Wiederholung dieselbe Kennung und identische Argumente verwenden. Website-Schreibvorgänge benötigen die aktuelle Revision; Textänderungen zusätzlich den Originaltext. Gleichzeitige Änderungen werden abgewiesen. Neue Seiten werden nicht automatisch in die Navigation aufgenommen.

## Betrieb und Sicherheit

Standard: aus, keine erzeugten Schlüssel. Geheimnisse liegen nicht im Website-Dokument. Gespeichert werden SHA-256-Hashes zufälliger 256-Bit-Schlüssel. Kanonische Host-/Origin-Prüfung, private Antworten, begrenzte Request-Größe, Ratenbegrenzung und Prüfung pro Werkzeug gehören zum Transport. Widerruf und Einstellungen werden bei Schreibvorgängen atomar mitgeprüft. Eine Anfragefreigabe gilt höchstens 60 Sekunden. Im Kantiq-Hauptsystem muss der ausstellende Admin weiterhin berechtigt sein. Veröffentlichte Projekte verwenden HTTPS.

Offizielle MCP-Server-/Client-Pakete: 2.4.0. Stateless HTTP, kein offener SSE-Abokanal. Das technische Audit enthält Schlüssel-ID, Werkzeugname, Zeitpunkt und Ergebnis, keine Argumente, Zugangsdaten oder Nachrichteninhalte. Kantiq Creators verwaltet Social-Entwürfe im zentralen Kantiq-CMS; sein eigener MCP bietet dafür kein separates Studio-Werkzeug.

Quellen: [offizielles TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/), [MCP-Spezifikation](https://modelcontextprotocol.io/specification/2026-07-28).
