# Sebastian Maschberger · Coaching

[Vercel-Vorschau](https://sebmaschberger-coaching.vercel.app) · [CMS](https://sebmaschberger-coaching.vercel.app/admin)

Das persönliche Erstpasswort liegt in `.data/vercel-admin-access.json`. Im CMS lässt es sich unter Team & Zugänge ändern. Die Datei ist vom Repository ausgeschlossen.

## Redaktion

- Unter **Seiten bearbeiten** die deutsche oder englische Seitenfassung wählen, den Entwurf speichern und die Änderungen in der Desktop- und Mobilvorschau prüfen. **Veröffentlichen** übernimmt den Entwurf in die öffentlich sichtbare Fassung.
- Unter **Partner & Empfehlungen** im Abschnitt **Partnerlinks** Beschriftung, Bild und Linkziel bearbeiten. Der Schalter **Affiliate-Link (Werbung)** setzt die sichtbare Kennzeichnung und das Linkattribut `sponsored`. Die Sprachfassungen haben jeweils eigene redaktionelle Inhalte.
- Unter **Anfragen** erscheinen Kontakt- und Kooperationsanfragen. Die Website speichert Nachrichten im Postfach. SMTP lässt sich im CMS verbinden.
- Unter **Shop** lassen sich Sortiment, Preise, Liefergebiete und Bestellungen verwalten. Für den Verkaufsstart brauchen die Artikel freigegebene Daten und die Website ihren eigenen Stripe-Zugang samt Webhook. Der produktive Checkout steht bis dahin auf aus. Details stehen in `docs/recipes/commerce.md`.

## Betrieb

Die Vercel-Vorschau ist zur Abnahme erreichbar. Indexierung, Händlerfreigabe und projektspezifische Rechtstexte stehen vor dem öffentlichen Start an. Unabhängige Projekt- und Speicher-IDs stehen in `infrastructure.json`.

Die Datenbank dieser Vorschau ist eine SQLite-Datei im privaten Blob-Store dieser Website. Der Server übernimmt Änderungen mit einem ETag-Vergleich und wiederholt Schreibvorgänge bei einem Versionskonflikt. `DATABASE_URL` aktiviert bei einer separat aufgesetzten Neon-Datenbank den PostgreSQL-Pfad des Starters. Vor dem Wechsel müssen Inhalte und Einträge aus der Vorschau übertragen werden. Der GitHub-Zugriff der Sitzung hat die Erstellung des privaten Ziel-Repositorys verweigert. Der übergebene Quellstand liegt in einem eigenen lokalen Git-Repository.

## Quellen

- Aktuelles Coaching und Haltung. [Sebastian Maschberger](https://www.sebmaschberger.com/)
- Früheres Projekt und historische Wettbewerbsstationen. [Train Like a Pro](https://trainlikeapro.coach/) · [Archiv](https://maschberger.jimdoweb.com/)
- Bayerischer Wettkampf 2017. [DBFV Ergebnisliste](https://dbfv.de/wp-content/uploads/Ergebnisliste_BM2017.pdf)
- Porträts und Training. [Instagram](https://www.instagram.com/sebastian_maschberger/) · [Auftaktfoto](https://www.instagram.com/p/Df7C7BrAgMT/) · [Trainingsfoto](https://www.instagram.com/p/DejPtbEgoEe/)
- Themen Energie und Fokus, veröffentlichte Kontakt-E-Mail und das Porträt aus den Vorschaumetadaten. [Flamingo-Stand](https://flamingo-renderer.vercel.app/sebastian-maschberger) · [Kontaktseite](https://flamingo-renderer.vercel.app/sebastian-maschberger/kontakt)
- Originales SM-Logo und Studioaufnahme. [Flamingo-Vorschau](https://flamingo-renderer.vercel.app/sebastian-maschberger) · [Studiofoto](https://cdn.prod.website-files.com/67b377d0529a72a36ceb21d1/68f1335d2f13dfc5f6526898_F3E8ABBA-9902-4348-954B-060F3730DCCE.jpeg)
- Vier Vorher-Nachher-Paare aus Sebastians veröffentlichten Coaching-Referenzen. Die Bildhälften wurden für die Gegenüberstellung getrennt. [Referenzen](https://www.sebmaschberger.com/home-en)
