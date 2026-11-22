# Webanalyse und KI & Agenten — Gestaltungsnachweis

Stand: 4. November 2026. Dokumentierter Stand der nativen Ansichten `/admin/analytics` und `/admin/agents` im wiederverwendbaren Starter.

## Overview

Die Erweiterung folgt dem bestätigten **Operate**-Arbeitsbereich: aktuelle Aufgabe zuerst, ruhige helle Flächen, getrennte Karten und native Systemtypografie. Die neutrale Starter-Shell behält grüne aktive Navigation, gruppierte Seitenleiste, Kopfzeile und mobile Vierfachnavigation. Die in den Aufnahmen sichtbare Bezeichnung „Musterstudio“ ist eine Entwicklungsfixture und keine verbindliche Kundenidentität. Es wurde keine neue visuelle Welt und kein Bildentwurf eingeführt.

Autorität sind [PRODUCT.md](../PRODUCT.md), der vorhandene Adminvertrag in [DESIGN.md](../DESIGN.md) und der [Oberflächenbrief](../.impeccable/surfaces/admin-workspace.md). Öffentliche Websites behalten ihre individuelle Gestaltung. Diese Dokumentation ergänzt die konkrete Oberfläche; `DESIGN.md` und `.impeccable/design.json` wurden unverändert erhalten.

Geprüfte Implementierungsquellen: `src/lib/workspace/{modules.css,analytics-panel.ts,agents-panel.ts,panel.ts}` und der native React-Wrapper `src/components/admin/module-panel.tsx`. Die gemeinsamen Panelstile sind in allen drei Projekten identisch.

## Colors

Weiße Datenkarten und feine graue Ränder stehen auf dem vorhandenen kühlen Workspace. Aktuelle und vorherige Periode werden durch orange beziehungsweise graue gestrichelte Linie und beschriftete Zeiträume unterschieden. Zustände und Fehler tragen lesbaren Text.

Bereits vor diesem Dokumentationspass vorhandene lokale Abweichung: Die Panel-CSS definiert eigene Ink-, Muted-, Linien- und Akzentwerte, dunkle Primäraktionen sowie orange Checkbox-, Fokus- und Diagrammwerte. Diese unterscheiden sich vom globalen grünen Starter-Adminvertrag. Sie werden als begrenzte Implementierungsabweichung erfasst, nicht als neue globale Farbwelt übernommen. Die im bestehenden Oberflächenbrief berichteten Public/Admin-Palettenmetadaten-Advisories wurden nicht neu geprüft oder repariert.

## Typography

Die Panels verwenden native Systemschrift, tabellarische Kennzahlen und kleinere Vergleichszeilen. Lokale Paneldefinitionen weichen teilweise von der globalen Skala ab: Titel reichen bis 38 px statt der dort dokumentierten 30 px; Felder sind lokal mit 14 px definiert. Die vorhandene Admin-Kaskade beeinflusst die gerenderten Next.js-Ansichten weiterhin. Diese lokalen Definitionen ersetzen keine globalen Typografierollen.

## Layout

Die Desktopaufnahmen bei 1440 px zeigen Zeitraum und Datumsfelder vor sechs Kennzahlkarten, anschließend Verlauf und zweispaltige Aufschlüsselungen. Bei 390 px bleiben Kennzahlen zweispaltig; Datumssteuerung bricht um, „Anwenden“ erhält eine volle Zeile, Aufschlüsselungen und Erklärungskarten werden einspaltig. Die vorhandene mobile Kopfzeile und das Dock bleiben sichtbar.

Die Agentenansicht beginnt mit Zugang, Zustand und „Agent verbinden“. Erklärungskarten zum CMS-Assistenten und externen MCP-Agenten folgen danach. Verbindungsschritte und Serveradresse bilden einen eigenen Bereich; zusätzliche Konfigurations-, Rechte- und Datenschutzhilfe bleibt aufklappbar.

## Elevation & Depth

Die lokale Panel-CSS ergänzt einen sehr schwachen Kartenschatten; dies weicht vom global dokumentierten schattenlosen Ruhezustand ab. Deutliche Tiefe bleibt dem nativen Dialog mit abgedunkelter, unscharfer Rückfläche vorbehalten. Reduzierte Bewegung entfernt die lokalen Übergänge.

## Shapes

Felder und Buttons behalten sanfte Ecken. Lokal sind Karten mit 18 px am Desktop und 16 px am Telefon sowie Dialoge mit 22 px definiert. Diese unterscheiden sich teilweise von den bestehenden globalen Adminradien. Sie werden hier beschrieben, ohne den globalen Vertrag zu verändern.

## Components

- **Webanalyse:** Zeitraumvorlagen, eigenes Von/Bis, Vergleichsschalter, zusätzliche Filter im Dialog und entfernbare Filteraktionen stehen vor den Ergebnissen. Der Verlauf bietet Zeiger- und Pfeiltastenauswahl, CSV-Export und eine aufklappbare Datentabelle. Beschriftete Aufschlüsselungen können filtern; die Quellen definieren mindestens 44 px hohe Zeilen.
- **Einrichtung und Einwilligung:** Aktivierung, Aufbewahrung und Zielseiten liegen im nativen Einrichtungsdialog. Die Oberfläche erklärt die Kopplung an die freiwillige Kategorie Statistik und den automatisch ergänzten Datenschutzabsatz. Messung und Modul sind standardmäßig aus. Der [Verifikationsnachweis](agent-analytics-verification-2026-11-04.md) dokumentiert den technischen Ablauf und seine Grenzen.
- **Agentenzugang:** Aktivieren, benannte Schlüssel, erlaubte Aufgaben, Laufzeiten in Tagen beziehungsweise „Endless“ und Widerrufen bilden den Arbeitsablauf. Abgelaufene und widerrufene Schlüssel liegen hinter einer Disclosure. CMS-Assistent mit eigener KI-API und externer Agent mit eigenem Modell werden getrennt erklärt; ihre Modulgrenzen bleiben erhalten. Schlüsselmaterial wird einmalig in einem eigenen Dialog angezeigt; diese Dokumentation liest oder enthält keine Geheimnisse.
- **Rückmeldung:** Die gemeinsamen Dialogquellen und die geöffneten Fehleraufnahmen zeigen Konflikte innerhalb des offenen Schlüsseldialogs mit erhaltenen Eingaben. Laden und Fehler besitzen Status-/Alertrollen. Die Schlüsselliste zeigt in der Starter-Fixture einen leeren aktiven Zustand und geschlossene Historie.

## Do's and Don'ts

- Do die neutrale Starter-Shell und ihre unabhängigen Modulfreigaben weiterverwenden; lokale Panelabweichungen bleiben lokal.
- Do operative Aktionen vor längeren Erklärungen zeigen und Daten, Zeitraum sowie Status textlich kenntlich machen.
- Don't Fixture-Inhalte, Schlüsselzustände oder Entwicklungszahlen als Starterstandard oder Geschäftsergebnis übernehmen.
- Don't diese Dokumentation als neue globale Tokenquelle oder vollständige Produktfreigabe behandeln.

Nachweis: Der Dokumenter öffnete alle zwölf aktuellen Desktop-/Telefonaufnahmen aller drei Anwendungen und die zwei gemeinsamen Dialogfehleraufnahmen. Die Starter-Oberflächen sind [Webanalyse Desktop](../../Kantiq/.impeccable/review/agent-analytics-2026-11-04/template-analytics-desktop.png), [Webanalyse Telefon](../../Kantiq/.impeccable/review/agent-analytics-2026-11-04/template-analytics-mobile.png), [Agenten Desktop](../../Kantiq/.impeccable/review/agent-analytics-2026-11-04/template-agents-desktop.png) und [Agenten Telefon](../../Kantiq/.impeccable/review/agent-analytics-2026-11-04/template-agents-mobile.png); ergänzend [Dialogfehler Desktop](../../Kantiq/.impeccable/review/agent-analytics-2026-11-04/key-error-desktop.png) und [Dialogfehler Telefon](../../Kantiq/.impeccable/review/agent-analytics-2026-11-04/key-error-mobile.png). Die zentral abgelegten Aufnahmen sind Entwicklungsnachweise mit Testzuständen, keine ausgelieferten Rasterassets und kein physischer iOS-Test.

Die übergebene unabhängige FINISH-Nachprüfung bewertete alle vier angeforderten UI-Korrekturen als behoben und gab **ship für diese vier Korrekturen**. Der [Verifikationsnachweis](agent-analytics-verification-2026-11-04.md) hält die zugehörigen Builds, Tests und nativen Abläufe fest. Dieser Dokumentationspass führte weder Detector, Kontextgenerierung, Build noch neue QA aus und änderte keinen Quelltext.
