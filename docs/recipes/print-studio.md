# Visitenkarten und Druckstudio

Die aktuelle Amélie-Implementierung dient als Referenz für ein eigenes CMS-Modul: `src/components/admin/business-card-studio.tsx`, die Serverfunktionen unter `src/app/api/admin/business-cards/`, Druckassets und zugehörige Prüfskripte. Vor Übernahme den dann aktuellen Stand und die Lizenz-/Nutzungsrechte der Schriftdateien prüfen. Keine Amélie-Marke, Kontaktdaten, Bilder oder Druckprofile ungeprüft als Projektstandard übernehmen.

Kartendaten unabhängig vom Website-Entwurf speichern. Vorder-/Rückseite, Kontaktzeilen, Logo, Schriften und Farben erhalten ein eigenes validiertes Modell. Vorschau und tatsächlicher PDF-Download müssen denselben aktuellen Bearbeitungsstand verwenden; inszenierte Mockup-Fotos gehören nicht in die Druckdatei.

Das konkrete Druckprodukt bestimmt Endformat, Beschnitt, Sicherheitsabstand und Ausgabeprofil. Texte, einfache Logos, Icons und QR-Codes möglichst als Vektoren ausgeben; eigene Uploads prüfen und privat speichern. Erforderliche Farbprofile und Schriften serverseitig verwalten.

Vor Ausgabe fehlende Glyphen, Überlappungen, Sicherheitszonen, unlesbare QR-Codes und ungeeignete Bilder erkennen. Geschützte Speichern-/Downloadrouten und Revisionskonflikte berücksichtigen. PDF-Dateien zusätzlich rendern und visuell prüfen; ein erfolgreicher Export allein belegt keine brauchbare Druckdatei.

Tests für Datenänderung, Front-/Rückseite, Papier-/Profilkombination, PDF-Seitenformat, Autorisierung und QR-Lesbarkeit ergänzen. Eine automatische Bestellung ist kein Teil dieses Moduls.
