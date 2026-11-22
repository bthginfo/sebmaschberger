"use client";

import { useState, useSyncExternalStore, type MouseEventHandler, type ReactNode } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import type { ClubPerson } from "@/lib/club/model";
import "./member.css";

export type MemberLanguage = "de" | "en";
const defaultTimeZone = "UTC";
const locale = (language: MemberLanguage) => language === "en" ? "en-GB" : "de-DE";
const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function subscribeToTimeZone(update: () => void) {
  window.addEventListener("focus", update);
  return () => window.removeEventListener("focus", update);
}

export function useMemberTimeZone() {
  return useSyncExternalStore(subscribeToTimeZone, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => defaultTimeZone);
}

export function clubDate(value: string | number, language: MemberLanguage, options: Intl.DateTimeFormatOptions, timeZone = defaultTimeZone) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "–" : new Intl.DateTimeFormat(locale(language), { timeZone, ...options }).format(date);
}

export function clubDayKey(value: string | number, timeZone = defaultTimeZone) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  let dayFormatter = dayFormatters.get(timeZone);
  if (!dayFormatter) {
    dayFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    dayFormatters.set(timeZone, dayFormatter);
  }
  const parts = dayFormatter.formatToParts(date);
  return ["year", "month", "day"].map(key => parts.find(part => part.type === key)?.value ?? "").join("-");
}

export function clubTime(value: string, language: MemberLanguage, timeZone = defaultTimeZone) {
  return clubDate(value, language, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, timeZone);
}

export class MemberRequestError extends Error {
  constructor(readonly status: number) {
    super(`Club request failed (${status})`);
    this.name = "MemberRequestError";
  }
}

export async function memberRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/club${path}`, { cache: "no-store", credentials: "same-origin", ...options });
  const value = await response.json().catch(() => null);
  if (!response.ok || !value || typeof value !== "object") throw new MemberRequestError(response.status);
  return value as T;
}

export async function memberWrite(path: string, method: "POST" | "PATCH", body: unknown) {
  const result = await memberRequest<{ ok?: boolean }>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (result.ok !== true) throw new MemberRequestError(500);
}

export function MemberBrand({ href = "/members", brandName, subtitle, onClick }: {
  href?: string;
  brandName: string;
  subtitle: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return <Link href={href} className="club-member-brand" onClick={onClick}>
    <span className="club-member-brand-mark" aria-hidden="true"><Shield size={20} /></span>
    <span className="club-member-brand-text"><strong>{brandName}</strong><small>{subtitle}</small></span>
  </Link>;
}

export function MemberLanguageToggle({ onChange }: { onChange?: () => void }) {
  const { language, setLanguage, hasProvider } = useAdminLanguage();
  if (!hasProvider) return null;
  function choose(next: MemberLanguage) {
    if (next === language) return;
    setLanguage(next);
    onChange?.();
  }
  return <div role="group" className="club-member-language" aria-label={language === "en" ? "Interface language" : "Oberflächensprache"}>
    <button type="button" lang="de" aria-label="Deutsch" aria-pressed={language === "de"} onClick={() => choose("de")}>DE</button>
    <button type="button" lang="en" aria-label="English" aria-pressed={language === "en"} onClick={() => choose("en")}>EN</button>
  </div>;
}

function initials(name: string) {
  return name.trim().split(/\s+/u).slice(0, 2).map(word => Array.from(word)[0] ?? "").join("").toUpperCase() || "·";
}

export function MemberAvatar({ person, name, size = 40, stamp = 0, lazy = false }: {
  person?: Pick<ClubPerson, "id" | "avatar" | "revision">;
  name: string;
  size?: number;
  stamp?: number;
  lazy?: boolean;
}) {
  const source = person?.avatar ? `/api/club/avatar/${encodeURIComponent(person.id)}?v=${person.revision}.${stamp}` : "";
  const [failed, setFailed] = useState("");
  return <span className="club-member-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * .34)) }}>
    {source && failed !== source ? <img src={source} width={size} height={size} alt="" loading={lazy ? "lazy" : undefined} decoding="async" onError={() => setFailed(source)} /> : initials(name)}
  </span>;
}

export function MemberEmpty({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="club-member-empty">
    <span className="club-member-empty-icon" aria-hidden="true">{icon}</span>
    <div><strong>{title}</strong><p>{description}</p></div>
    {action}
  </div>;
}
