"use client";

import { ArrowRight, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Action, StudioHeader, coachError, coachRequest, coachText } from "./coach-ui";
import type { CoachLocale } from "./coach-ui";
import styles from "./studio.module.css";

export function CoachAccess() {
  const [locale, setLocale] = useState<CoachLocale>("de");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const token = useRef<string | null>(null);
  const t = (de: string, en: string) => coachText(locale, de, en);

  useEffect(() => {
    if (token.current !== null) return;
    token.current = window.location.hash.slice(1);
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    setLocale(navigator.language.toLowerCase().startsWith("de") ? "de" : "en");
    setReady(true);
  }, []);

  async function open() {
    if (pending || !token.current) return;
    setPending(true);
    setError("");
    try {
      const { path } = await coachRequest<{ path: string }>("/api/coach/access", "POST", { token: token.current });
      if (!/^\/coach\/(view|edit)\/[a-z0-9-]+$/i.test(path)) throw new Error("invalid_destination");
      window.location.replace(path);
    } catch (caught) {
      setError(coachError(caught, locale));
      setPending(false);
    }
  }

  return <div className={styles.studio} lang={locale}>
    <StudioHeader />
    <main className={styles.accessMain}>
      <div className={styles.accessCard}>
        <span className={styles.accessMark}><KeyRound size={28} aria-hidden="true" /></span>
        <h1>{t("Freigegebene Taktik", "Shared play")}</h1>
        <p>{ready && !token.current ? t("Bitte öffne den vollständigen Freigabelink erneut.", "Please reopen the complete share link.") : t("Öffne den Spielzug im Coach Studio.", "Open the play in Coach Studio.")}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {ready && token.current && <Action variant="primary" icon={ArrowRight} disabled={pending} onClick={open}>{pending ? t("Wird geöffnet …", "Opening …") : t("Taktik öffnen", "Open play")}</Action>}
        {ready && !token.current && <a className={styles.textLink} href="/">{t("Zur Website", "Back to the website")}</a>}
      </div>
    </main>
  </div>;
}
