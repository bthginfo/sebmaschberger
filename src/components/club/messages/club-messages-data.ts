import type { ClubRole } from "@/lib/club/model";
import type { ClubAudience, ClubMessageChoices } from "@/lib/club/messages-model";

export type MessageLanguage = "de" | "en";
export type MessageText = (de: string, en: string) => string;
export type MailboxTab = "inbox" | "sent";
export type AudienceKind = ClubAudience["kind"];

export const subjectLimit = 120;
export const bodyLimit = 5_000;

export class ClubMessageRequestError extends Error {
  constructor(readonly status: number) {
    super("Club message request failed");
  }
}

export async function messageRequest<T>(
  path: string,
  owner: boolean,
  language: MessageLanguage,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept-Language", language);
  if (init.body) headers.set("Content-Type", "application/json");
  if (owner) headers.set("x-club-workspace", "cms");
  const response = await fetch("/api/club/messages" + path, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new ClubMessageRequestError(response.status);
  return response.json() as Promise<T>;
}

export function requestProblem(error: unknown, t: MessageText, fallback: string) {
  if (!(error instanceof ClubMessageRequestError)) return fallback;
  if (error.status === 401) return t("Deine Sitzung ist abgelaufen. Melde dich erneut an.", "Your session expired. Sign in again.");
  if (error.status === 403 || error.status === 404) return t("Darauf hast du derzeit keinen Zugriff.", "You don’t currently have access to this.");
  if (error.status === 429) return t("Versuche es in einem Moment erneut.", "Try again in a moment.");
  return fallback;
}

const roleNames: Record<ClubRole, readonly [string, string]> = {
  member: ["Alle Mitglieder", "All members"],
  coach: ["Alle Trainer", "All coaches"],
  board: ["Gesamter Vorstand", "All board members"],
  admin: ["Alle Admins", "All admins"],
};

export type AudienceOption = { key: string; name: string; audience: ClubAudience };

export function audienceOptions(choices: ClubMessageChoices | undefined, t: MessageText): Record<AudienceKind, AudienceOption[]> {
  return {
    person: (choices?.people ?? []).map(({ id, name }) => ({
      key: id, name: id === "cms-owner" ? t("Vereinsbüro", "Club office") : name, audience: { kind: "person", id },
    })),
    team: (choices?.teams ?? []).map(({ id, name }) => ({ key: id, name, audience: { kind: "team", id } })),
    role: (choices?.roles ?? []).map(role => ({ key: role, name: t(...roleNames[role]), audience: { kind: "role", role } })),
    club: choices?.club ? [{ key: "club", name: t("Gesamter Verein", "Whole club"), audience: { kind: "club" } }] : [],
  };
}

export function replySubject(subject: string) {
  return (/^(re|aw):/i.test(subject) ? subject : "Re: " + subject).slice(0, subjectLimit);
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase() || "·";
}

export function messageName(id: string, name: string, t: MessageText) {
  return id === "cms-owner" ? t("Vereinsbüro", "Club office") : name;
}
