/** Separate first-party setup; never substitutes a guessed account for a failed OAuth grant. */
export const INSTAGRAM_PORTFOLIO_SETUP={
 "title": "Eigene Meta-App und eigenes Konto?",
 "intro": "Wenn App und Instagram-Konto Ihrem eigenen Business-Portfolio gehören, können Sie alternativ einen eigenen Systemnutzer verwenden. Für fremde Kundenkonten bleibt die Anmeldung oben der normale Weg.",
 "steps": [
  "In Meta Business Suite → Einstellungen → Nutzer → Systemnutzer einen eigenen Systemnutzer anlegen. Die Rolle „Employee“ genügt; kein Portfolio-Administrator ist nötig.",
  "Unter „Assets zuweisen“ die eigene Meta-App und das eigene Instagram-Konto zuweisen. Für Instagram nur die benötigten Inhaltsrechte wählen.",
  "Für die oben gespeicherte Meta-App ein Token mit 60 Tagen Gültigkeit und nur instagram_basic sowie instagram_content_publish erzeugen.",
  "Instagram-Konto-ID und Token hier einfügen und prüfen. Danach das von Meta bestätigte Profil ausdrücklich auswählen."
 ],
 "note": "Das Token wird verschlüsselt gespeichert und nach dem Versuch aus dem Formular entfernt. Befristete Portfolio-Tokens erneuert der Server vor Ablauf, solange Meta dies zulässt. Widerrufene Rechte brauchen eine neue Freigabe. Eine Kontoverbindung veröffentlicht noch keine Beiträge."
} as const;
