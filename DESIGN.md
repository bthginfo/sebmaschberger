---
name: Website Starter Admin workspace
description: Extracted neutral admin tokens; public websites keep their project-specific design.
colors:
  admin-accent: "#315f4d"
  admin-accent-hover: "#264c3d"
  admin-accent-base: "#e7efe9"
  admin-ink: "#243545"
  admin-muted-base: "#697887"
  admin-secondary: "#5c6875"
  admin-workspace: "#f5f6f8"
  admin-surface-base: "#f5f7f9"
  admin-card: "#fff"
  admin-line: "#e4e9ef"
  admin-panel-line: "#e3e9ef"
  admin-nav-ink: "#5d6e7d"
  admin-nav-active-background: "#e8f0eb"
  admin-nav-active-ink: "#315e4b"
  admin-field-ink: "#30495c"
  admin-field-line: "#dfe5ec"
  admin-segment: "#e9edf2"
  admin-planned: "#3f6785"
  admin-done: "#2a7856"
  admin-attention: "#a34b20"
typography:
  admin-body:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  admin-page-title:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.025em"
  admin-planner-title:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.025em"
  admin-section-title:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-.025em"
  admin-button:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
  admin-helper:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "12px"
    lineHeight: 1.65
  admin-calendar-status:
    fontFamily: "-apple-system,BlinkMacSystemFont,'Inter Variable','DM Sans Variable',sans-serif"
    fontSize: "9px"
    lineHeight: 1.5
rounded:
  admin-navigation: "9px"
  admin-control: "10px"
  admin-calendar-card: "11px"
  admin-media: "12px"
  admin-shortcut-card: "14px"
  admin-panel: "16px"
  admin-dock: "18px"
  admin-dialog: "19px"
spacing:
  admin-field-gap: "7px"
  admin-control-gap: "8px"
  admin-panel: "25px"
  admin-page-block: "30px"
  admin-page-inline: "32px"
  admin-phone-inline: "17px"
components:
  admin-button-primary:
    backgroundColor: "{colors.admin-accent}"
    textColor: "{colors.admin-card}"
    typography: "{typography.admin-button}"
    rounded: "{rounded.admin-control}"
    padding: "10px 14px"
  admin-button-primary-hover:
    backgroundColor: "{colors.admin-accent-hover}"
    textColor: "{colors.admin-card}"
  admin-button-secondary:
    backgroundColor: "{colors.admin-card}"
    textColor: "{colors.admin-ink}"
    typography: "{typography.admin-button}"
    rounded: "{rounded.admin-control}"
    padding: "10px 14px"
  admin-input:
    backgroundColor: "{colors.admin-card}"
    textColor: "{colors.admin-field-ink}"
    typography: "{typography.admin-body}"
    rounded: "{rounded.admin-control}"
    padding: "11px 12px"
  admin-navigation-active:
    backgroundColor: "{colors.admin-nav-active-background}"
    textColor: "{colors.admin-nav-active-ink}"
    rounded: "{rounded.admin-navigation}"
    padding: "9px 12px"
  admin-panel:
    backgroundColor: "{colors.admin-card}"
    rounded: "{rounded.admin-panel}"
    padding: "{spacing.admin-panel}"
  admin-segmented:
    backgroundColor: "{colors.admin-segment}"
    rounded: "{rounded.admin-control}"
    padding: "3px"
  admin-status-planned:
    textColor: "{colors.admin-planned}"
    typography: "{typography.admin-calendar-status}"
  admin-calendar-card:
    backgroundColor: "{colors.admin-card}"
    rounded: "{rounded.admin-calendar-card}"
    padding: "0"
---

# Gestalterische Grundlage

Die sichtbare Website wird aus Zielgruppe, Angebot, Inhalt und Stilbriefing entwickelt. Der [Designstandard](skills/website-starter/references/design-and-content.md) leitet Komposition, Typografie, Medien und Interaktion aus den Referenzen Kantiq, Creators und den Mario-Bewerbungsseiten ab. Die fünf vorhandenen Layouts liefern funktionierende Ausgangspunkte für die CMS-Anbindung. Ein neuer Auftrag verlangt nur die bestellte Anzahl an Entwürfen.

Neue Dienstleistungsseiten starten mit einer gerahmten Split-Bühne, Portfolios mit einem großformatigen Projektmotiv, Beratung mit einer hellen zweiteiligen Bühne und Magazine mit einer leichter gesetzten Bild-Text-Komposition. Das Creator-Profil hat einen eigenen Renderer. Die gestalterischen Profile werden beim Erzeugen gesetzt. Bestehende Projekte können ihren bisherigen Aufbau weiter verwenden. Farben, Schriften, Texte und Bilder werden für die jeweilige Marke ausgearbeitet.

Die Verwaltung bleibt ruhig und verständlich. Alltagsbegriffe des jeweiligen Betriebs, klare Speicherzustände, nachvollziehbare Fehlermeldungen, Tastaturbedienung und mobile Erreichbarkeit sind wichtiger als zusätzliche Layoutregler.

Inhalt und Darstellung bleiben getrennt. Text, Bild, Alt-Text, Bildfokus, Listen, Links, Sichtbarkeit und Reihenfolge müssen auch in einem neu entwickelten Frontend weiterhin aus dem CMS stammen. Keine sichtbaren Kundentexte ausschließlich in Komponenten festschreiben.

Für jedes Projekt Typografie, Farbwelt, Bildsprache, Flächen und Bewegung bewusst festlegen. Die neutralen SVGs sind ausdrücklich Platzhalter. Nur eigene oder freigegebene Motive verwenden. Reduzierte Bewegung, Touch und kleine Bildschirme berücksichtigen.

# Admin workspace — implemented contract

## Overview

**Creative North Star: "A daily workspace that puts the current task first."**

Dieser Vertrag erfasst ausschließlich die implementierte neutrale Verwaltung. Das bestätigte SaaS-/iOS-/Apple-artige Bedienbild nutzt ruhige helle Arbeitsflächen, klar getrennte Karten und kurze Wege zur aktuellen Aufgabe. Öffentliche Websites und mögliche Kundenportale erhalten weiterhin ihre eigene Gestaltung aus dem jeweiligen Briefing.

Produktionsnachtrag: Offene Ideen bleiben von erledigten oder abgebrochenen Planungen ohne Termin getrennt. Der neutrale Adminvertrag und die getrennten Modulfreigaben bleiben erhalten.

Stand: 3. November 2026. Quellen: `src/styles/cms-saas.css` und `planner-board.css`; `src/components/admin/admin-app.tsx`, `dashboard-help.tsx`, `src/components/social/post-planner.tsx` und `planner-board.tsx`. Basiskomponenten und native Dialoge stammen aus `admin-ui.tsx`.
Die Frontmatter-Namen sind Dokumentationsbezeichner für vorhandene CSS-Werte; sie führen keine neuen CSS-Variablen ein. Die Werte beschreiben den implementierten Stand. Der Oberflächenablauf und sein FINISH-Nachweis stehen in [admin-workspace.md](.impeccable/surfaces/admin-workspace.md).

**Key Characteristics:**

- Aufgabenorientierte Übersicht und gruppierte Navigation.
- Weiße Karten auf kühlem hellem Workspace; native Systemtypografie.
- Visuelle Wochenplanung mit echten, unveränderlichen Beitragsvorschauen.
- Hilfe und Einrichtungshinweise erst bei Bedarf; geschützte native Editordialoge.

## Colors

### Primary

Die neutrale Verwaltung verwendet Grün für primäre Aktionen. `admin-accent` entspricht `--admin-accent`; `admin-accent-hover` ist dessen Button-Hoverzustand. `admin-accent-base` dokumentiert den getrennten deklarierten `--cms-accent`; die aktive Navigation nutzt ihre eigenen Hintergrund- und Textwerte.

### Neutral

`admin-ink` entspricht dem tatsächlich gesetzten `--cms-ink`, `admin-muted-base` dem deklarierten `--cms-muted`. Der Workspace-Hintergrund ist eine eigene direkte CSS-Zuweisung; `admin-surface-base` bleibt der getrennte deklarierte `--cms-surface`. `admin-secondary` erfasst die kontrastkorrigierten direkten Sekundärtexte. Der Planer erbt den Starter-Ink; sein Kantiq-Fallback wird hier nicht zum Root-Token.

### Semantic status

Die Kalenderzustände verwenden die belegten Textfarben `admin-planned`, `admin-done` und `admin-attention` zusammen mit lesbaren Statusbezeichnungen. Farbe allein bezeichnet weder die Freigabe noch die Zustellung.

**The Admin Scope Rule.** Die Admin-Tokens gelten nur im Arbeitsbereich und seinen Dialogen; öffentliche Websites und Portale behalten ihren eigenen visuellen Vertrag.

Die achtstufigen Farbrampen im Sidecar sind synthetische Vorschau-Metadaten, keine implementierte Farbskala und keine zusätzlichen CSS-Tokens.

## Typography

Die native Systemschrift steht zuerst in `admin-body`; die vorhandenen variablen Inter- und DM-Sans-Schriften sind Fallbacks. Adminüberschriften erben diese Familie. Allgemeine Seitenüberschriften folgen `admin-page-title`; der Planer verwendet den etwas kräftigeren `admin-planner-title`. Unterüberschriften folgen `admin-section-title`, Dashboardkarten nutzen lokal 18 px. Auf kleinen Bildschirmen sinkt die Seitenüberschrift auf 27 px. Diese lokalen Rollen sind vorhandene Varianten, keine neue universelle Skala.

Fließtext, Hilfstext und Buttons folgen den dokumentierten Rollen. Eingaben werden auf kleinen Bildschirmen auf 16 px gesetzt. Kalender-Metadaten und Statuslabels sind bewusst kompakt; in der mobilen Wochenansicht wird das Statuslabel auf 11 px vergrößert. Die öffentliche Typografie wird daraus nicht abgeleitet.

## Layout

Desktop: gruppierte Seitenleiste (244 px), Kopfzeile (64 px), Inhaltsbreite bis 1.500 px und regulärer Seitenabstand aus den Frontmatter-Tokens. Bis 1.180 px wechselt die dauerhafte Seitenleiste in eine aufrufbare Navigation (270 px); ein Dock bietet vier Aktionen (Übersicht, Website, Social beziehungsweise Medien, Mehr). Bis 750 px werden Übersicht und Editor gestapelt, bis 600 px gelten die kompakten Seitenabstände und größere Eingabeschrift. Die Übersicht priorisiert Website, aktivierte Social-Arbeit und Anfragen.

Der gemeinsame Planer zeigt am Desktop sieben Tage mit echten Vorschaukarten. Bis 700 px wird die Woche zu einer vertikalen Tagesfolge; der Monat zeigt stattdessen kompakte Tage mit Statuspunkten und die Beiträge des ausgewählten Tages darunter. Suche und Filter bleiben erreichbar. Im Editor wird die Medienvorschau bis 750 px in eine kompakte 96-px-Spalte mit maximal 155 px Höhe umgestellt; der Caption-Bereich folgt auf den Medienblock.

Abstände folgen den belegten lokalen Werten; die vorhandenen 7-, 17- und 25-px-Abstände werden nicht als erfundene durchgängige 8-px-Skala umgedeutet. Die 390-px-Entwicklungsansicht zeigt das vierteilige Dock mit sicherem Abstand zum unteren Bildschirmrand.

## Elevation & Depth

Karten werden durch weiße Flächen, kühlen Workspace und feine Ränder getrennt. Der native Dialog nutzt `0 24px 85px #142b3f2b`, die abgedunkelte, leicht unscharfe Rückfläche `#142a3c52`. Kopfzeile, Dialogfuß und mobile Navigation verwenden transluzentes Weiß und Hintergrundunschärfe.

**The Cards at Rest Rule.** Normale Karten bleiben ohne Flächenschatten. Subtile Schatten markieren ausgewählte Segmente; deutliche Tiefe ist dem geöffneten Dialog vorbehalten.

Buttons und Navigation reagieren überwiegend mit kurzen Farbwechseln (160 ms), Kalenderkarten mit Rand und kleiner Lageänderung (180 ms). Die jeweiligen Reduced-Motion-Regeln entfernen diese Übergänge; die Dialog- und Fokusbedienung bleibt nativ.

## Shapes

Große Dashboard- und Einstellungsflächen verwenden `admin-panel`; Schnellzugriffe `admin-shortcut-card`. Der Kalendercontainer ist lokal 15 px gerundet. Bedienelemente, Medien, einzelne Kalenderkarten und Dialoge behalten ihre eigenen im Frontmatter belegten Radien; der mobile Dialog sinkt lokal auf 18 px. Keine dieser Adminformen ersetzt projektspezifische öffentliche Gestaltung.

## Components

### Buttons

Primäre und sekundäre Buttons folgen den Frontmatter-Komponenten. Allgemeine Buttons haben mindestens 40 px Höhe, bis 600 px mindestens 44 px. Sekundäre Buttons sind weiß mit feinem Rand; der Hoverzustand wird leicht grau. Gedrückt wird auf `.985` skaliert. Sichtbarer Tastaturfokus: 2-px-Outline in `#59836e`, Abstand 3 px.

### Inputs / Fields

Weiße, fein umrandete Felder mit dem dokumentierten Innenabstand und mindestens 43 px Höhe. Labels, Hilfstexte, Fehler und Speicherzustände bleiben sichtbar. Mobile Eingaben erhalten 16-px-Schrift und überwiegend mindestens 46 px Höhe. Der Planerfokus verwendet seinen eigenen Akzent-Outline mit 3 px Abstand.

### Cards / Containers

Große weiße Karten trennen Aufgaben und Datenbereiche. Lokale Header-/Bodyabstände bleiben erhalten; die Frontmatter-Komponente `admin-panel` beschreibt die reguläre Dashboardkarte. Kalenderkarten haben eine echte Vorschau, Beitragstitel, Kanal, Uhrzeit und lesbaren Status. Ohne Bild wird die vorhandene Text-/Formatsicht verwendet; kein erfundenes Vorschaumotiv.

### Navigation / Segmented controls / Status

Gruppen und aktuelle Seite sind sichtbar ausgezeichnet. Bereichssuche ist per Strg/⌘ K erreichbar. Kompakte Segmente wechseln Woche/Monat/Liste beziehungsweise lokale Unterbereiche. Semantische Zustände behalten Textlabels und ihre bestehenden Bedeutungen. Navigation und Aufgabenstarter berücksichtigen die gespeicherten Modulfreigaben. Social-Studio und CMS-Assistent bleiben unabhängig und standardmäßig aus; der Post-Planer bleibt aus und benötigt zusätzlich Social-Studio. Der Dockeintrag führt ohne Social-Modul zu Medien. Creator ist ein ausdrücklich gewähltes Profil. Portal/CRM, Rechnungen, Buchung und Podcast sind weiterhin Erweiterungsbauanleitungen, kein durch diese Oberfläche belegter Starterumfang.

### Protected editor and optional help

Ein gewählter Beitrag öffnet den vorhandenen nativen `dialog` mit Medienkontext und anschließendem Beitragstext. Escape und Schließen laufen durch die vorhandenen Guard-Funktionen; ungespeicherte Änderungen verlangen eine Entscheidung. Beim Schließen wird der Fokus zum Auslöser zurückgeführt. Einrichtung, zusätzliche Medien-/Exportfelder und längere Anleitungen liegen hinter Hilfe oder aufklappbaren Details. Ein gespeicherter Termin erteilt keine Versandfreigabe.

### Production follow-up — 2026-11-03

Ohne Termin bleiben offene Planungen, `failed`, `needs_review` und Einträge mit gespeichertem Fehler sichtbar. `published`, `manual_completed` und `cancelled` ohne Termin und ohne Fehler liegen im Board in nativen, zunächst geschlossenen Details „Erledigte & abgebrochene Beiträge ohne Termin“. Beim Erledigt-Filter oder einer aktiven Suche öffnet sich die passende Gruppe. Diese reine UI-Partition verändert weder Datensätze noch Listenansicht.

## Do's and Don'ts

### Do:

- Do die Admin-Tokens ausschließlich auf Verwaltungsflächen anwenden.
- Do echte Beitragsvorschauen, Kanal, Zeitpunkt und lesbaren Status gemeinsam zeigen.
- Do die mobile Medienvorschau kompakt halten und den Beitragstext unmittelbar danach zugänglich machen.
- Do Speicherzustand, Fokus und bestehende Freigabegrenzen erhalten.

### Don't:

- Don't öffentliche Websitefarben oder Schriften durch diese Admin-Tokens ersetzen.
- Don't den Aufgabenbereich mit dauerhaft offenen Setupanleitungen füllen.
- Don't Kalendertermin, Vorschaubild oder gespeicherte Planung als Versandfreigabe darstellen.
- Don't deaktivierte Module durch scheinbar aktive Einstiege ersetzen.
