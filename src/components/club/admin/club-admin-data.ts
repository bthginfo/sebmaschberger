import type {
  ClubActor, ClubAssignment, ClubInvite, ClubMatch, ClubNews, ClubPerson, ClubRole, ClubRsvp, ClubStatus, ClubTeam, ClubTraining, ClubWorkspace,
} from "@/lib/club/model";
import { clubDate, useMemberTimeZone } from "../member/member-shared";

export type Language = "de" | "en";
export type Text = (de: string, en: string) => string;
export type Copy = readonly [string, string];

export const clubViews = ["overview", "people", "teams", "trainings", "fixtures", "news", "messages", "tactics", "appearance"] as const;
export type ClubView = typeof clubViews[number];

export const viewLabels: Record<ClubView, Copy> = {
  overview: ["Übersicht", "Overview"],
  people: ["Personen", "People"],
  teams: ["Teams", "Teams"],
  trainings: ["Trainings", "Training"],
  fixtures: ["Spieltermine", "Fixtures"],
  news: ["Vereinsnews", "Club news"],
  messages: ["Nachrichten", "Messages"],
  tactics: ["Taktiken", "Tactics"],
  appearance: ["Darstellung", "Appearance"],
};

export const roleLabels: Record<ClubRole, Copy> = {
  member: ["Mitglied", "Member"],
  coach: ["Coach", "Coach"],
  board: ["Vorstand", "Board"],
  admin: ["Administrator", "Administrator"],
};

export const statusLabels: Record<ClubStatus, Copy> = {
  invited: ["Eingeladen", "Invited"],
  active: ["Aktiv", "Active"],
  disabled: ["Deaktiviert", "Disabled"],
};

export const matchLabels: Record<ClubMatch["status"], Copy> = {
  scheduled: ["Geplant", "Scheduled"],
  final: ["Beendet", "Final"],
  cancelled: ["Abgesagt", "Cancelled"],
};

export const responseLabels: Record<ClubRsvp, Copy> = {
  yes: ["Zusage", "Going"],
  maybe: ["Vielleicht", "Maybe"],
  no: ["Absage", "Declined"],
};

export function attendanceCounts(training: ClubTraining) {
  const counts: Record<ClubRsvp, number> = { yes: 0, maybe: 0, no: 0 };
  for (const entry of training.attendance ?? []) counts[entry.response]++;
  return counts;
}

export function attendanceLabel(response: ClubRsvp, count: number, t: Text) {
  if (count !== 1 && response === "yes") return t("Zusagen", "Going");
  if (count !== 1 && response === "no") return t("Absagen", "Declined");
  return t(...responseLabels[response]);
}

export type Records = {
  people: ClubPerson;
  teams: ClubTeam;
  trainings: ClubTraining;
  matches: ClubMatch;
  news: ClubNews;
  assignments: ClubAssignment;
};

export type Fields = {
  people: Partial<Pick<ClubPerson, "name" | "position" | "jersey" | "bio" | "teamIds" | "role" | "status">>;
  teams: Pick<ClubTeam, "name" | "shortName" | "description" | "color" | "category" | "competition" | "season" | "homeVenue"> & { managerIds?: string[] };
  trainings: Pick<ClubTraining, "teamId" | "title" | "startsAt" | "endsAt" | "location" | "details" | "equipment">;
  matches: Omit<ClubMatch, "id" | "revision">;
  news: Omit<ClubNews, "id" | "revision" | "updatedAt">;
  assignments: Omit<ClubAssignment, "id" | "revision" | "updatedAt">;
};

export type InviteFields = Pick<ClubInvite, "name" | "email" | "role"> & { teamIds: string[]; deliver: boolean };
export type Invitation = {
  invite: ClubInvite;
  link: string;
  delivery: "sent" | "link" | "unavailable" | "failed";
};

export type Resource = keyof Records;
export type EditDialog =
  | { kind: "people"; item: ClubPerson }
  | { kind: "teams"; item?: ClubTeam }
  | { kind: "trainings"; item?: ClubTraining; teamId?: string }
  | { kind: "matches"; item?: ClubMatch; teamId?: string; finish?: boolean }
  | { kind: "news"; item?: ClubNews }
  | { kind: "assignments"; item?: ClubAssignment; playId?: string };

export type SaveResource = <K extends Resource>(kind: K, fields: Fields[K], item?: Records[K]) => void;
export type ClubDialog = EditDialog
  | { kind: "invite"; previous?: ClubInvite; teamIds?: string[] }
  | { kind: "invited"; result: Invitation }
  | { kind: "revoke"; invite: ClubInvite }
  | { kind: "roster"; id: string }
  | { kind: "attendance"; id: string }
  | { kind: "remove"; resource: Exclude<Resource, "people">; id: string; revision: number; label: string };

export function clubView(value: string | null | undefined): ClubView {
  return clubViews.find(view => view === value) ?? "overview";
}

export function isClubAdmin(actor: ClubActor) {
  return actor.owner || actor.role === "admin";
}

export function isClubWide(actor: ClubActor) {
  return isClubAdmin(actor) || actor.role === "board";
}

export function managesTeam(actor: ClubActor, teamId: string) {
  return isClubWide(actor) || actor.teamIds.includes(teamId);
}

export function canAssignClubPlays(workspace: ClubWorkspace) {
  return workspace.capabilities.coachStudio && workspace.capabilities.assign;
}

export function editsPerson(actor: ClubActor, person: ClubPerson) {
  return isClubWide(actor) || actor.id === person.id || person.teamIds.some(id => managesTeam(actor, id));
}

export function textFilter(language: Language, query: string) {
  const normalize = (value: string) => value.toLocaleLowerCase(language).normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const needle = normalize(query.trim());
  return (...values: (string | null | undefined)[]) => !needle || values.some(value => value && normalize(value).includes(needle));
}

export function localDateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const year = String(date.getFullYear()).padStart(4, "0");
  const pad = (part: number) => String(part).padStart(2, "0");
  return year + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + "T" + pad(date.getHours()) + ":" + pad(date.getMinutes());
}

export function clubDateIso(value: string, previous?: string) {
  if (previous && localDateInput(previous) === value) return previous;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const instant = date.toISOString();
  // Reject nonexistent local times and normalized dates. An unchanged saved time keeps its original offset.
  return localDateInput(instant) === value ? instant : "";
}

export function useClubDates(language: Language) {
  const zone = useMemberTimeZone();
  const formatClubDate = (value: string | number, options: Intl.DateTimeFormatOptions) => clubDate(value, language, options, zone);
  return {
    formatClubDate,
    shortDate: (value: string) => formatClubDate(value, { day: "numeric", month: "short", year: "numeric" }),
    eventDate: (value: string) => formatClubDate(value, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    eventTime: (value: string) => formatClubDate(value, { hour: "2-digit", minute: "2-digit" }),
  };
}

export class ClubRequestError extends Error {
  constructor(readonly status: number, message = "") {
    super(message);
  }
}

const revisionMessage = "This entry changed. Refresh it before saving.";

export function isRevisionConflict(error: unknown) {
  return error instanceof ClubRequestError && error.status === 409 && error.message === revisionMessage;
}

export async function clubRequest<T>(path: string, owner: boolean, method = "GET", body?: object): Promise<T> {
  const headers = new Headers();
  if (owner) headers.set("x-club-workspace", "cms");
  if (body) headers.set("Content-Type", "application/json");
  const response = await fetch("/api/club" + path, {
    method, headers, cache: "no-store", credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ClubRequestError(response.status, typeof payload?.error === "string" ? payload.error : "");
  if (!payload || typeof payload !== "object") throw new ClubRequestError(502);
  return payload as T;
}

export function requestProblem(error: unknown): Copy {
  if (!(error instanceof ClubRequestError)) return ["Die Verbindung wurde unterbrochen. Lade die Ansicht neu, um den aktuellen Stand zu prüfen.", "The connection was interrupted. Refresh to check the latest state."];
  const specific: Record<string, Copy> = {
    [revisionMessage]: ["Der Eintrag wurde inzwischen geändert. Beim Neuladen werden deine Eingaben verworfen.", "This record was updated elsewhere. Reloading discards your entries."],
    "An account already exists for this email.": ["Für diese E-Mail-Adresse gibt es bereits ein Konto.", "An account already exists for this email."],
    "The club directory has reached its capacity.": ["Das Mitgliederverzeichnis hat sein Limit erreicht.", "The club directory has reached its capacity."],
    "This list has reached its capacity.": ["Diese Liste hat ihr Limit erreicht.", "This list has reached its capacity."],
    "This person needs a valid invitation to activate their account.": ["Die Person benötigt zur Aktivierung eine gültige Einladung.", "This person needs a valid invitation to activate their account."],
    "Responses for this training are closed.": ["Die Rückmeldung zu diesem Training ist geschlossen.", "Responses for this training are closed."],
    "This play is already assigned to the selected audience.": ["Diese Taktik ist der ausgewählten Zielgruppe bereits zugewiesen.", "This play is already assigned to the selected audience."],
    "End time must be after the start time.": ["Das Ende muss nach dem Beginn liegen.", "End time must be after the start time."],
    "Enter both scores to mark the match as final.": ["Gib beide Punktzahlen ein, um das Spiel zu beenden.", "Enter both scores to mark the match as final."],
    "Select active coaches or club admins as team leads.": ["Wähle aktive Coaches oder Vereinsadministratoren für die Teamleitung.", "Select active coaches or club admins as team leads."],
  };
  if (Object.hasOwn(specific, error.message)) return specific[error.message];
  const details: Record<number, Copy> = {
    400: ["Prüfe deine Eingaben und versuche es erneut.", "Check your entries and try again."],
    401: ["Deine Sitzung ist abgelaufen. Melde dich erneut an.", "Your session has expired. Sign in again."],
    403: ["Dein Zugang erlaubt diese Änderung nicht.", "Your account does not allow this change."],
    404: ["Dieser Eintrag ist nicht verfügbar.", "This record is unavailable."],
    409: ["Die Änderung steht im Konflikt mit einem vorhandenen Eintrag.", "This change conflicts with an existing record."],
    429: ["Zu viele Anfragen. Versuche es später erneut.", "Too many requests. Try again later."],
  };
  return details[error.status] ?? ["Die Anfrage konnte gerade nicht verarbeitet werden.", "The request could not be completed."];
}
