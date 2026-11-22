# Vereinsverwaltung und Mitgliederbereich

Die Vereinsverwaltung ist optional. Im Briefing `modules.clubManagement.enabled: true`, beim Erzeugen `--features club-management` oder im CMS **Settings → General → Club management** wählen und den Entwurf speichern. Solange das Modul aus ist, sind Mitgliederbereich, Club-API und Mitglieder-App nicht erreichbar. Das Ausschalten löscht keine Daten. Öffentliche Navigation und Spielabschnitte übernehmen die veröffentlichte Website-Konfiguration.

Die öffentliche Website, der private Mitgliederbereich und das CMS haben getrennte Zugänge. Als CMS-Inhaber findest du die Vereinsverwaltung unter `/admin/club`. Ein Vereinsadmin meldet sich unter `/members/login` an und öffnet **Verein verwalten**. Beide erhalten dieselbe Vereinsverwaltung. Der Starter liefert keine Mitglieder, Spielstände, Chats, Geräteanmeldungen oder Kundendaten als Demo.

**Coach Studio** ist unabhängig und bleibt ohne `--features coach-studio` oder eigene Aktivierung im CMS aus. Sind beide Module aktiv, können Trainer eigene Taktiken und Admins alle Taktiken für Personen oder Teams freigeben. Bei deaktiviertem Coach Studio verschwinden Taktikfunktionen und die zugehörige Push-Kategorie.

| Rolle | Zugriff |
| --- | --- |
| Mitglied | Zugeordnete Teams, Termine, Ergebnisse, veröffentlichte Vereinsnews, eigenes Profil und freigegebene Taktiken. Trainingsteilnahme beantworten und Kalender herunterladen. |
| Trainer | Zusätzlich zugeordnete Teams betreuen, Trainings und Spiele planen, Rückmeldungen lesen, Teamnews bearbeiten und eigene Taktiken zuweisen. |
| Vorstand | Vereinsweite Teams, Kader, Training, Spiele und Vereinsnews verwalten. Teamleitung zuordnen und Spielplan als CSV herunterladen. |
| Vereinsadmin und CMS-Inhaber | Alle Verwaltungsbereiche, Rollen und Einladungen, vereinsweite Taktiken sowie Gestaltung des Mitgliederbereichs. |

## Personen und Teams

Unter **Personen → Einladen** Name, E-Mail, Rolle und optional die Teams auswählen. Der fünf Tage gültige Einladungslink funktioniert einmalig und führt zur Passwortvergabe. Mit eingerichtetem SMTP kann das CMS zusätzlich eine E-Mail senden. Die Vereinsrolle gibt keinen Zugriff auf das Website-CMS.

Teams, Personen, Trainings und Spiele lassen sich als Detailseiten öffnen. Dort stehen beispielsweise die aktiven Spieler, Teamleitung, Wettbewerb, Saison und Heimspielort oder die Rückmeldungen zu einem Training. **Bearbeiten** öffnet das Formular des jeweiligen Eintrags. Ein Link auf einen privaten Eintrag ändert die Zugriffsrechte nicht.

Die Übersicht nennt offene und abgelaufene Einladungen, fehlende Rückmeldungen zu zeitnahen Trainings und Spiele, bei denen noch ein Ergebnis oder die Freigabe fehlt. Ein Ergebnis kann bewusst intern bleiben.

## Öffentliche Spielübersichten

Ein Spiel erscheint erst nach aktivierter Einstellung **Auf der Website anzeigen** in der öffentlichen Auswahl. In einem Zeitstrahl-Abschnitt lässt sich die Datenquelle auf nächstes Heimspiel, kommende Termine oder Ergebnisse stellen. Veröffentliche den Abschnitt einmal; die Daten aktualisieren sich beim Speichern eines Spiels. Die öffentliche Zeitzone lässt sich in **Settings → General → Club management** setzen (Standard: `Europe/Berlin`). Interne Notizen, Profile und die Liste der Rückmeldungen bleiben privat.

## Mitgliederbereich gestalten

Unter **Vereinsverwaltung → Darstellung** können Admins die Startkarten sortieren und einzeln ein- oder ausblenden. Die einzelnen Bereiche bleiben in der Navigation erreichbar. Dort werden auch Layout, Farbschema, Titelbild sowie Überschrift und Unterzeile für beide Sprachen eingestellt. `{name}` setzt den Vornamen der angemeldeten Person ein. Die Vorschau zeigt die Einstellungen vor dem Speichern; die Änderung gilt nach dem Speichern für alle Mitglieder. Hochgeladene Titelbilder werden über den geschützten Mitgliederbereich ausgeliefert.

## Nachrichten

Im Posteingang können Mitglieder Personen aus ihren Teams und das Vereinsbüro anschreiben. Trainer können außerdem Nachrichten an betreute Teams und die Trainergruppe senden. Vorstand und Vereinsadmins können alle Teams, einzelne Rollen oder den gesamten Verein erreichen. Eine Gruppennachricht wird vor dem Senden bestätigt. Antworten an eine Ankündigung gehen privat an die absendende Person. Das Vereinsbüro sieht sein eigenes Postfach; persönliche Nachrichten zwischen anderen Mitgliedern bleiben privat.

## Installation und Benachrichtigungen

Im CMS **Einstellungen → App & Benachrichtigungen** und im Mitgliederbereich **Einstellungen** öffnen. In unterstützten Browsern lässt sich die App dort installieren. Auf iPhone und iPad in Safari über **Teilen → Zum Home-Bildschirm** hinzufügen, anschließend über das neue Symbol öffnen und in der App auf **Benachrichtigungen aktivieren** tippen. Auch die geführte Tour endet mit dieser Anleitung und kann in den Einstellungen neu gestartet werden.

Mitglieder wählen pro Gerät Nachrichten, Termine, Vereinsnews und Taktiken. Im CMS wählt der Inhaber Website-Anfragen und Nachrichten fürs Vereinsbüro. Benachrichtigungen zeigen auf dem Sperrbildschirm keine Nachrichtentexte oder Personenprofile. Private Inhalte werden nicht für die Offline-Nutzung gespeichert.

Der CMS-Inhaber kann Favicon sowie CMS- und Mitglieder-Appsymbol separat aktualisieren oder auf die Standardwerte zurücksetzen. Die Symbole sind öffentliche Markenbilder. Details zur Installation und zu Push: [Workspace-Apps](workspace-apps.md).
