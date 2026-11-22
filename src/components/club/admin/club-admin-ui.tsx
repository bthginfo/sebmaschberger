"use client";

import { AlertCircle, Check, Search, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties, type ReactNode } from "react";
import type { ClubPerson, ClubTeam } from "@/lib/club/model";
import { useClubDates, type Language, type Text } from "./club-admin-data";
import styles from "./club-admin.module.css";

type ButtonStyle = "primary" | "secondary" | "quiet" | "danger";

export function Action({ icon: Icon, tone = "secondary", className, type = "button", children, ...props }:
  ComponentPropsWithoutRef<"button"> & { icon?: LucideIcon; tone?: ButtonStyle }) {
  return <button type={type} className={[styles.button, className].filter(Boolean).join(" ")} data-tone={tone} {...props}>
    {Icon && <Icon size={17} aria-hidden="true" />}{children}
  </button>;
}

export function ActionLink({ icon: Icon, children, className, ...props }:
  ComponentPropsWithoutRef<"a"> & { icon?: LucideIcon }) {
  return <a className={[styles.button, className].filter(Boolean).join(" ")} data-tone="secondary" {...props}>
    {Icon && <Icon size={17} aria-hidden="true" />}{children}
  </a>;
}

export function IconAction({ icon: Icon, label, className, ...props }:
  ComponentPropsWithoutRef<"button"> & { icon: LucideIcon; label: string }) {
  return <button type="button" className={[styles.iconButton, className].filter(Boolean).join(" ")} aria-label={label} title={label} {...props}>
    <Icon size={17} aria-hidden="true" />
  </button>;
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={styles.chip} data-tone={tone}>{children}</span>;
}

export function ClubAvatar({ person, photo = false, owner = false }: { person: Pick<ClubPerson, "id" | "name">; photo?: boolean; owner?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = person.name.trim().split(/\s+/u).slice(0, 2).map(part => Array.from(part)[0] ?? "").join("").toLocaleUpperCase();
  return <span className={styles.avatar} data-colour={(person.name.codePointAt(0) ?? 0) % 4} aria-hidden="true">
    {initials || "–"}
    {photo && !failed && <img src={"/api/club/avatar/" + encodeURIComponent(person.id) + (owner ? "?scope=cms" : "")} alt="" width={40} height={40}
      loading="lazy" onError={() => setFailed(true)} />}
  </span>;
}

export function TeamTag({ team }: { team: ClubTeam }) {
  const color = /^#[\da-f]{6}$/iu.test(team.color) ? team.color : "#4e695f";
  return <span className={styles.teamTag} style={{ "--team-colour": color } as CSSProperties} title={team.name}>{team.shortName || team.name}</span>;
}

export function DateBadge({ iso, language }: { iso: string; language: Language }) {
  const { formatClubDate } = useClubDates(language);
  return <time className={styles.dateBadge} dateTime={iso}>
    <strong>{formatClubDate(iso, { day: "2-digit" })}</strong>
    <span>{formatClubDate(iso, { month: "short" }).replace(/\.$/u, "")}</span>
  </time>;
}

export function Empty({ icon: Icon, title, detail, children }: { icon: LucideIcon; title: string; detail?: string; children?: ReactNode }) {
  return <div className={styles.empty}>
    <span className={styles.emptyIcon}><Icon size={23} aria-hidden="true" /></span>
    <h2>{title}</h2>
    {detail && <p>{detail}</p>}
    {children}
  </div>;
}

export function Notice({ message, error = false, children }: { message: string; error?: boolean; children?: ReactNode }) {
  const Icon = error ? AlertCircle : Check;
  return <div className={styles.notice} data-error={error || undefined} role={error ? "alert" : "status"}>
    <Icon size={18} aria-hidden="true" /><p>{message}</p>{children}
  </div>;
}

export function SearchField({ value, onChange, t }: { value: string; onChange: (value: string) => void; t: Text }) {
  return <div className={styles.search}>
    <Search size={17} aria-hidden="true" />
    <input type="search" aria-label={t("Suchen", "Search")} placeholder={t("Suchen", "Search")} value={value}
      onChange={event => onChange(event.target.value)} />
    {value && <IconAction icon={X} label={t("Suche leeren", "Clear search")} onClick={() => onChange("")} />}
  </div>;
}

export function Field({ label, hint, children, wide = false }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={styles.field} data-wide={wide || undefined}>
    <span>{label}</span>{children}{hint && <small>{hint}</small>}
  </label>;
}

export function Sheet({ title, intro, children, t, close, busy, wide }: {
  title: string; intro?: string; children: ReactNode; t: Text; close: () => void; busy?: boolean; wide?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      requestAnimationFrame(() => {
        if (focus instanceof HTMLElement && focus.isConnected && !document.querySelector("dialog[open]")) focus.focus({ preventScroll: true });
      });
    };
  }, []);

  return <dialog ref={ref} className={styles.sheet} data-wide={wide || undefined}
    aria-labelledby={id} aria-describedby={intro ? id + "-intro" : undefined}
    onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className={styles.sheetInner}>
      <header className={styles.sheetHeader}>
        <div><h2 id={id}>{title}</h2>{intro && <p id={id + "-intro"}>{intro}</p>}</div>
        <IconAction icon={X} label={t("Schließen", "Close")} onClick={close} disabled={busy} />
      </header>
      {children}
    </div>
  </dialog>;
}
