"use client";

import { Check, Clipboard, Eye, Link2, Pencil, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoachLink } from "@/lib/coach/model";
import { Action, CoachDialog, IconButton, coachError, coachRequest, coachText } from "./coach-ui";
import type { CoachLocale } from "./coach-ui";
import styles from "./studio.module.css";

export function CoachShare({ id, locale, dirty, close }: { id: string; locale: CoachLocale; dirty: boolean; close: () => void }) {
  const t = (de: string, en: string) => coachText(locale, de, en);
  const path = "/api/coach/plays/" + encodeURIComponent(id) + "/links";
  const [role, setRole] = useState<CoachLink["role"]>("view");
  const [days, setDays] = useState(7);
  const [name, setName] = useState("");
  const [links, setLinks] = useState<CoachLink[] | null>(null);
  const [createdLink, setCreatedLink] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Berlin" });
  useEffect(() => {
    let current = true;
    coachRequest<{ links: CoachLink[] }>(path).then(({ links }) => { if (current) setLinks(links); })
      .catch((caught) => { if (current) setError(coachError(caught, locale)); });
    return () => { current = false; };
  }, [path, locale]);

  async function createLink() {
    if (busy) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const { link, url } = await coachRequest<{ link: CoachLink; url: string }>(path, "POST", {
        role, name: name.trim() || (role === "view" ? t("Team", "Team") : t("Co-Trainer", "Assistant coach")), days,
      });
      setLinks((existing) => [link, ...(existing ?? [])]);
      setCreatedLink({ id: link.id, url: new URL(url, window.location.origin).href });
      setName("");
    } catch (caught) {
      setError(coachError(caught, locale));
    } finally {
      setBusy(false);
    }
  }
  async function revokeLink(link: CoachLink) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await coachRequest(path, "DELETE", { id: link.id });
      setLinks((existing) => existing?.map((entry) => entry.id === link.id ? { ...entry, revokedAt: new Date().toISOString() } : entry) ?? []);
      if (createdLink?.id === link.id) {
        setCreatedLink(null);
        setCopied(false);
      }
    } catch (caught) {
      setError(coachError(caught, locale));
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink.url);
      setCopied(true);
    } catch {
      input.current?.focus();
      input.current?.select();
    }
  }

  return <CoachDialog title={t("Taktik teilen", "Share play")} locale={locale} close={close}
    intro={t("Erstelle einen Magic Link für diese Taktik.", "Create a magic link for this play.")}>
    <form onSubmit={(event) => { event.preventDefault(); void createLink(); }} className={styles.shareForm}>
      <fieldset className={styles.shareRoles}>
        <legend className={styles.visuallyHidden}>{t("Zugriff", "Access")}</legend>
        {(["view", "edit"] as const).map((value) => {
          const Icon = value === "view" ? Eye : Pencil;
          return <button type="button" className={styles.roleChoice} aria-pressed={role === value} key={value} onClick={() => setRole(value)}>
            <Icon size={18} aria-hidden="true" />
            <span>
              <strong>{value === "view" ? t("Ansehen", "View") : t("Mitbearbeiten", "Collaborate")}</strong>
              <small>{value === "view" ? t("Taktik abspielen", "Play the animation") : t("Tafel bearbeiten und speichern", "Edit and save the board")}</small>
            </span>
          </button>;
        })}
      </fieldset>
      <div className={styles.createFields}>
        <label className={styles.field}>{t("Name für den Link", "Link name")}
          <input maxLength={80} placeholder={role === "view" ? t("z. B. Team", "e.g. Squad") : t("z. B. Co-Trainer", "e.g. Assistant coach")} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className={styles.field}>{t("Gültigkeit", "Expires after")}
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={1}>{t("1 Tag", "1 day")}</option><option value={7}>{t("7 Tage", "7 days")}</option><option value={30}>{t("30 Tage", "30 days")}</option>
          </select>
        </label>
      </div>
      {dirty && <p className={styles.notice}>{t("Der Link zeigt den gespeicherten Stand. Speichere deine Änderungen, damit sie im Link erscheinen.", "The link opens the saved version. Save your changes to update it.")}</p>}
      <Action type="submit" variant="primary" icon={Link2} disabled={busy || (!links && !error)}>{busy ? t("Wird verarbeitet …", "Working …") : t("Link erstellen", "Create link")}</Action>
    </form>
    {createdLink && <div className={styles.copyField}>
      <label className={styles.field}>{t("Freigabelink", "Share link")}
        <input ref={input} type="url" readOnly value={createdLink.url} onFocus={(event) => event.currentTarget.select()} />
      </label>
      <Action icon={copied ? Check : Clipboard} onClick={copy}>{copied ? t("Kopiert", "Copied") : t("Kopieren", "Copy")}</Action>
    </div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.shareExisting} aria-label={t("Freigaben", "Existing links")}>
      <h3>{t("Freigaben", "Existing links")}</h3>
      {!links && !error && <p className={styles.quiet}>{t("Freigaben werden geladen …", "Loading links …")}</p>}
      {links?.length === 0 && <p className={styles.quiet}>{t("Für diese Taktik sind noch keine Links erstellt.", "There are no links for this play yet.")}</p>}
      {links && links.length > 0 && <ul className={styles.linkList}>
        {links.map((link) => {
          const active = !link.revokedAt && Date.parse(link.expiresAt) > Date.now();
          const Icon = link.role === "view" ? Eye : Pencil;
          const access = link.role === "view" ? t("Ansehen", "View") : t("Mitbearbeiten", "Collaborate");
          return <li key={link.id}>
            <span className={styles.linkIcon}><Icon size={16} aria-hidden="true" /></span>
            <span className={styles.linkInfo}><strong>{link.name}</strong><small>{access} · {link.revokedAt ? t("Widerrufen", "Revoked") : active ? t("Bis ", "Until ") + date.format(new Date(link.expiresAt)) : t("Abgelaufen", "Expired")}</small></span>
            {active && <IconButton icon={X} label={t("Link widerrufen", "Revoke link") + " · " + link.name} onClick={() => revokeLink(link)} disabled={busy} />}
          </li>;
        })}
      </ul>}
      <p className={styles.shareFootnote}><ShieldCheck size={17} aria-hidden="true" />{t("Der Link gilt für diese Taktik. Du kannst ihn jederzeit widerrufen.", "Each link is limited to this play. You can revoke it at any time.")}</p>
    </section>
  </CoachDialog>;
}
