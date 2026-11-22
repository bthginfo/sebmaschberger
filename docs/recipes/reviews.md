# Externe Bewertungen

Zuerst Anbieter, tatsächlichen Betrieb, gewünschte Kennzahlen und die erlaubte API-Nutzung festlegen. Schlüssel und Abruf bleiben serverseitig; keine ungeprüfte HTML-Übernahme aus fremden Webseiten.

Normalisierte Bewertungen, Quellenlink und Abrufdatum speichern. Abruf begrenzen und zwischenspeichern; beim Ausfall den letzten gültigen Stand oder einen klaren leeren Zustand zeigen. Nur echte, korrekt zugeordnete Bewertungen darstellen. Keine erfundenen Sterne, anonymisierten Kundenstimmen oder Gesamtwerte erzeugen.

CMS: Anbieter-/Betriebskennung, Sichtbarkeit, Reihenfolge und manueller Abruf. Frontend: lesbare Texte, zugängliche Wertung und Quellenzuordnung. Ein öffentliches Widget mit Drittanbieteranfragen erst nach passender Einwilligung laden.

Tests: falscher Betrieb, fehlender Schlüssel, Timeouts, leere Ergebnisse, Cache und mobile Darstellung. Bei verfügbarer Amélie-Quelle `google-reviews.tsx` und `/api/reviews` als Muster prüfen; Geheimnisse und Betriebskennungen neu einrichten.
