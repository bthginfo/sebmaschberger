"use client";

import { ArrowLeft, CircleDashed, Crosshair, Flag, Goal, Grid2X2, Minus, MoveUpRight, Pentagon, RectangleVertical, Route, Send, Shapes, Shield, Swords, TrafficCone, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from "react";
import type { CoachPiece, CoachPlay } from "@/lib/coach/model";
import { AdminLanguageSwitch } from "@/components/admin/admin-language";
import styles from "./studio.module.css";

export type CoachLocale = CoachPlay["locale"];
export type CoachKind = CoachPiece["kind"];

export function coachText(locale: CoachLocale, de: string, en: string) {
  return locale === "de" ? de : en;
}

export const categoryLabels = {
  attack: { de: "Angriff", en: "Attack" },
  defence: { de: "Verteidigung", en: "Defence" },
  "set-piece": { de: "Standards", en: "Set piece" },
  drill: { de: "Training", en: "Drill" },
} satisfies Record<CoachPlay["category"], Record<CoachLocale, string>>;

export const pitchLabels = {
  full: { de: "Ganzes Feld", en: "Full pitch" },
  half: { de: "Halbfeld", en: "Half pitch" },
  "22": { de: "22-Meter-Zone", en: "22-metre area" },
  whiteboard: { de: "Whiteboard", en: "Whiteboard" },
} satisfies Record<CoachPlay["pitch"], Record<CoachLocale, string>>;

export const planFields = [
  { key: "objective", de: "Lernziel", en: "Coaching objective", limit: 240 },
  { key: "players", de: "Spielerzahl oder Gruppen", en: "Players or groups", limit: 240 },
  { key: "area", de: "Feldgröße", en: "Playing area", limit: 240 },
  { key: "equipment", de: "Material", en: "Equipment", limit: 240 },
  { key: "progression", de: "Steigerung", en: "Progression", limit: 600 },
] as const;

export const pieceLabels = {
  attack: { de: "Angreifer", en: "Attacker", icon: Swords },
  defence: { de: "Verteidiger", en: "Defender", icon: Shield },
  ball: { de: "Ball", en: "Ball", icon: RugbyBall },
  cone: { de: "Hütchen", en: "Cone", icon: TrafficCone },
  zone: { de: "Zone", en: "Zone", icon: Grid2X2 },
  label: { de: "Text", en: "Text", icon: Type },
  run: { de: "Laufweg", en: "Run", icon: Route },
  pass: { de: "Pass", en: "Pass", icon: MoveUpRight },
  kick: { de: "Kick", en: "Kick", icon: Send },
  ruck: { de: "Ruck", en: "Ruck", icon: Shapes },
  scrum: { de: "Gedränge", en: "Scrum", icon: Pentagon },
  lineout: { de: "Gasse", en: "Lineout", icon: Flag },
  ring: { de: "Kreiszone", en: "Circle zone", icon: CircleDashed },
  line: { de: "Linie", en: "Line", icon: Minus },
  gate: { de: "Hütchentor", en: "Cone gate", icon: Goal },
  pad: { de: "Tacklepolster", en: "Tackle pad", icon: RectangleVertical },
  flag: { de: "Eckfahne", en: "Flag", icon: Flag },
} satisfies Record<CoachKind, Record<CoachLocale, string> & { icon: typeof Swords | typeof RugbyBall }>;

function RugbyBall({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-38 12 12)" />
    <path d="m9 14.4 6-4.8m-3.9 1.6 1.8 2.3" strokeLinecap="round" />
  </svg>;
}

export function PieceIcon({ kind, size = 18 }: { kind: CoachKind; size?: number }) {
  const Icon = pieceLabels[kind].icon;
  return <Icon size={size} aria-hidden="true" />;
}

export function isArrow(kind: CoachKind) {
  return kind === "run" || kind === "pass" || kind === "kick";
}

export function isStroke(kind: CoachKind) {
  return isArrow(kind) || kind === "line";
}

export function pieceName(piece: CoachPiece, locale: CoachLocale) {
  const kind = pieceLabels[piece.kind][locale];
  return piece.label ? kind + " " + piece.label : kind;
}

type ActionProps = ComponentPropsWithoutRef<"button"> & {
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Action({ children, icon: Icon, variant = "secondary", className, type = "button", ...props }: ActionProps) {
  return <button type={type} className={[styles.button, styles[variant], className].filter(Boolean).join(" ")} {...props}>
    {Icon && <Icon size={17} aria-hidden="true" />}
    {children}
  </button>;
}

export function IconButton({ icon: Icon, label, className, ...props }: ComponentPropsWithRef<"button"> & { icon: LucideIcon; label: string }) {
  return <button type="button" className={[styles.iconButton, className].filter(Boolean).join(" ")} title={label} aria-label={label} {...props}>
    <Icon size={18} aria-hidden="true" />
  </button>;
}

export function StudioHeader({ back, children, languageSwitch, inert }: {
  back?: { href: string; label: string; onClick?: ComponentPropsWithoutRef<"a">["onClick"] };
  children?: ReactNode;
  languageSwitch?: boolean;
  inert?: boolean;
}) {
  return <header className={styles.topbar} inert={inert}>
    <div className={styles.topbarInner}>
      {back ? <a href={back.href} className={styles.back} aria-label={back.label} onClick={back.onClick}>
        <ArrowLeft size={17} aria-hidden="true" />
        <span>{back.label}</span>
      </a> : null}
      <div className={styles.wordmark}>
        <span className={styles.mark}><Route size={18} strokeWidth={2.25} aria-hidden="true" /></span>
        <span>Coach Studio</span>
      </div>
      {(children || languageSwitch) && <div className={styles.topbarActions}>
        {languageSwitch && <div className={styles.studioLanguage}><AdminLanguageSwitch compact /></div>}
        {children}
      </div>}
    </div>
  </header>;
}

export function CoachDialog({ title, intro, children, close, locale = "de", className }: {
  title: string;
  intro?: string;
  children: ReactNode;
  close: () => void;
  locale?: CoachLocale;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return <dialog ref={dialog} className={[styles.dialog, className].filter(Boolean).join(" ")} aria-labelledby={headingId} aria-describedby={intro ? titleId : undefined}
    onCancel={(event) => { event.preventDefault(); close(); }}
    onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className={styles.dialogBody}>
      <header className={styles.dialogHeading}>
        <div>
          <h2 id={headingId}>{title}</h2>
          {intro && <p id={titleId}>{intro}</p>}
        </div>
        <button type="button" className={styles.closeButton} aria-label={coachText(locale, "Schließen", "Close")} onClick={close}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>
      {children}
    </div>
  </dialog>;
}

export function CoachPitch({ svg, className, ...props }: Omit<ComponentPropsWithRef<"div">, "children" | "dangerouslySetInnerHTML"> & { svg: string }) {
  return <div className={[styles.pitch, className].filter(Boolean).join(" ")} {...props} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function CoachEmpty({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) {
  return <div className={styles.empty}>
    <Goal size={31} strokeWidth={1.5} aria-hidden="true" />
    <h3>{title}</h3>
    <p>{detail}</p>
    {children}
  </div>;
}

export function PitchLegend({ locale }: { locale: CoachLocale }) {
  const t = (de: string, en: string) => coachText(locale, de, en);
  return <div className={styles.legend} aria-label={t("Legende", "Legend")}>
    <span><i data-tone="attack" />{t("Angriff", "Attack")}</span>
    <span><i data-tone="defence" />{t("Verteidigung", "Defence")}</span>
    <span><i data-tone="ball" />{t("Ball", "Ball")}</span>
    <span className={styles.legendPaths}><Route size={15} aria-hidden="true" />{t("Lauf", "Run")}<MoveUpRight size={15} aria-hidden="true" />{t("Pass", "Pass")}<Send size={15} aria-hidden="true" />{t("Kick", "Kick")}</span>
  </div>;
}

export class CoachApiError extends Error {
  constructor(public readonly status: number, public readonly payload: Record<string, unknown>) {
    super(typeof payload.error === "string" ? payload.error : "request_failed");
  }
}

export async function coachRequest<T>(path: string, method: "GET" | "POST" | "PUT" | "DELETE" = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new CoachApiError(response.status, result);
  return result as T;
}

export function coachError(error: unknown, locale: CoachLocale) {
  const t = (de: string, en: string) => coachText(locale, de, en);
  if (error instanceof CoachApiError) {
    if (error.status === 401 || error.status === 403 || error.status === 410) return t("Der Zugang ist abgelaufen oder wurde widerrufen.", "Access expired or was revoked.");
    if (error.status === 404) return t("Diese Taktik ist nicht mehr verfügbar.", "This play is no longer available.");
    if (error.status === 409) return t("Jemand hat eine neuere Version gespeichert. Lade den neuen Stand, um weiterzuarbeiten.", "Someone saved a newer version. Load it to continue editing.");
    if (error.status === 429) return t("Zu viele Versuche. Warte einen Moment und versuche es erneut.", "Too many attempts. Wait a moment and try again.");
    if (error.status === 400 || error.status === 413 || error.status === 422) return t("Prüfe die Eingaben und versuche es erneut.", "Check your entries and try again.");
  }
  return t("Das hat gerade nicht geklappt. Versuche es erneut.", "That didn’t work. Try again.");
}

export const selectIcon = Crosshair;
