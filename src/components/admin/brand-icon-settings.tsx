"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow, Globe, RotateCcw, Upload, UsersRound } from "lucide-react";
import type { AdminLanguage } from "@/lib/admin-i18n/locale";
import { Button } from "./admin-ui";
import styles from "./brand-icon-settings.module.css";

const iconTypes = ["favicon", "cms", "member"] as const;
type IconType = (typeof iconTypes)[number];
type BrandIcon = { version?: string; href: string };
type BrandIcons = Record<IconType, BrandIcon>;
type Message = "saved" | "reset" | "file" | "owner" | "error";

const formats = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const maxBytes = 3 * 1024 * 1024;
const choices = {
  favicon: { title: ["Favicon", "Favicon"], description: ["Im Browser-Tab der Website.", "In the website’s browser tab."], icon: Globe },
  cms: { title: ["CMS-App-Symbol", "CMS app icon"], description: ["Für den installierten CMS-Arbeitsbereich.", "For the installed CMS workspace."], icon: AppWindow },
  member: { title: ["Mitglieder-App-Symbol", "Member app icon"], description: ["Für den installierten Mitgliederbereich.", "For the installed member area."], icon: UsersRound },
} as const;
const messages: Record<Message, readonly [string, string]> = {
  saved: ["Das neue Symbol wurde gespeichert.", "The new icon was saved."],
  reset: ["Das Standardsymbol ist wieder aktiv.", "The default icon is active again."],
  file: ["Wählen Sie ein PNG-, JPEG-, WebP- oder AVIF-Bild bis 3 MB.", "Choose a PNG, JPEG, WebP or AVIF image up to 3 MB."],
  owner: ["Melden Sie sich als CMS-Inhaber an, um Symbole zu ändern.", "Sign in as the CMS owner to change icons."],
  error: ["Das Symbol konnte gerade nicht geändert werden. Versuchen Sie es erneut.", "The icon could not be changed. Try again in a moment."],
};

class BrandingRequestError extends Error {
  constructor(readonly status: number) { super("Workspace branding request failed"); }
}

async function readIcons(path = "", init?: RequestInit): Promise<BrandIcons> {
  const response = await fetch("/api/workspace-branding" + path, { credentials: "same-origin", cache: "no-store", ...init });
  const result = await response.json().catch(() => null) as { icons?: BrandIcons } | null;
  if (!response.ok || !result?.icons || iconTypes.some(key => typeof result.icons?.[key]?.href !== "string")) {
    throw new BrandingRequestError(response.status);
  }
  return result.icons;
}

function iconError(error: unknown): Message {
  if (error instanceof BrandingRequestError) {
    if (error.status === 401 || error.status === 403) return "owner";
    if (error.status === 400 || error.status === 413 || error.status === 415 || error.status === 422) return "file";
  }
  return "error";
}

function BrandIconItem({ kind, icon, language, busy, disabled, message, onChange }: {
  kind: IconType;
  icon: BrandIcon;
  language: AdminLanguage;
  busy: boolean;
  disabled: boolean;
  message?: Message;
  onChange: (kind: IconType, file?: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState("");
  const index = language === "en" ? 1 : 0;
  const choice = choices[kind];
  const Icon = choice.icon;
  const title = choice.title[index];
  const success = message === "saved" || message === "reset";
  return <li className={styles.item} aria-busy={busy}>
    <div className={styles.identity}>
      <span className={styles.preview} aria-hidden="true">
        {failed === icon.href ? <Icon size={24} /> : <img src={icon.href} width={64} height={64} alt="" onError={() => setFailed(icon.href)} />}
      </span>
      <div><h4>{title}</h4><p>{choice.description[index]}</p>
        <span className={styles.state}>{icon.version ? (index ? "Custom icon" : "Eigenes Symbol") : (index ? "Default icon" : "Standardsymbol")}</span>
      </div>
    </div>
    <input type="file" accept={formats.join(",")} ref={input} hidden onChange={event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (file) onChange(kind, file);
    }} />
    <div className={styles.actions}>
      <Button type="button" disabled={disabled} busy={busy}
        aria-label={(index ? "Choose image" : "Bild wählen") + " · " + title}
        onClick={() => input.current?.click()}><Upload size={16} aria-hidden="true" />{index ? "Choose image" : "Bild wählen"}</Button>
      {icon.version && <Button type="button" disabled={disabled} variant="quiet"
        aria-label={(index ? "Reset to default" : "Auf Standard zurücksetzen") + " · " + title}
        onClick={() => onChange(kind)}><RotateCcw size={15} aria-hidden="true" />{index ? "Reset to default" : "Auf Standard zurücksetzen"}</Button>}
    </div>
    {message && <p className={styles.message} data-error={!success || undefined} role={success ? "status" : "alert"}>{messages[message][index]}</p>}
  </li>;
}

export function BrandIconSettings({ language, showMember = true }: { language: AdminLanguage; showMember?: boolean }) {
  const [icons, setIcons] = useState<BrandIcons | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<IconType | null>(null);
  const [feedback, setFeedback] = useState<{ kind: IconType; message: Message } | null>(null);
  const mutation = useRef(false);
  const en = language === "en";

  useEffect(() => {
    const controller = new AbortController();
    void readIcons("", { signal: controller.signal }).then(next => {
      if (!controller.signal.aborted) setIcons(next);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => controller.abort();
  }, [attempt]);

  async function change(kind: IconType, file?: File) {
    if (mutation.current) return;
    if (file && (!formats.includes(file.type) || file.size < 1 || file.size > maxBytes)) {
      setFeedback({ kind, message: "file" });
      return;
    }
    mutation.current = true;
    setPending(kind);
    setFeedback(null);
    try {
      let body: FormData | undefined;
      if (file) {
        body = new FormData();
        body.set("file", file);
      }
      const next = await readIcons("/" + kind, { method: file ? "PUT" : "DELETE", body });
      setIcons(next);
      setFeedback({ kind, message: file ? "saved" : "reset" });
    } catch (error) {
      setFeedback({ kind, message: iconError(error) });
    } finally {
      mutation.current = false;
      setPending(null);
    }
  }

  const visibleIcons = showMember ? iconTypes : iconTypes.filter(kind => kind !== "member");
  return <section className={`cms-form-section ${styles.section}`} aria-labelledby="cms-public-icons-heading">
    <h3 id="cms-public-icons-heading">{en ? "Public icons" : "Öffentliche Symbole"}</h3>
    <p>{en ? "Browsers and app installations can access these icons publicly. Use PNG, JPEG, WebP or AVIF images up to 3 MB." :
      "Browser und App-Installationen können diese Symbole öffentlich abrufen. Verwenden Sie PNG-, JPEG-, WebP- oder AVIF-Bilder bis 3 MB."}</p>
    {icons ? <ul className={styles.list} role="list">
      {visibleIcons.map(kind => <BrandIconItem key={kind} kind={kind} icon={icons[kind]} language={language}
        busy={pending === kind} disabled={pending !== null} message={feedback?.kind === kind ? feedback.message : undefined}
        onChange={(target, file) => void change(target, file)} />)}
    </ul> : loadError ? <div className={styles.retry}>
      <p role="alert">{en ? "The current icons could not be loaded." : "Die aktuellen Symbole konnten nicht geladen werden."}</p>
      <Button type="button" onClick={() => { setLoadError(false); setAttempt(value => value + 1); }}>{en ? "Retry" : "Erneut laden"}</Button>
    </div> : <p role="status">{en ? "Loading icons…" : "Symbole werden geladen …"}</p>}
  </section>;
}
