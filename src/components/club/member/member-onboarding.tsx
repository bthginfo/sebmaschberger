"use client";

import { ArrowLeft, ArrowRight, CalendarDays, House, Layers3, MessageCircle, Newspaper, Settings2, UserRound, UsersRound, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { MemberLanguage } from "./member-shared";

export const memberTourStorageKey = "website-starter-member-tour-v1";

type TourView = "overview" | "calendar" | "teams" | "messages" | "news" | "tactics" | "profile" | "settings";
type TourStep = { view: TourView; icon: LucideIcon; title: [string, string]; description: [string, string] };

const stepsWithCoach: TourStep[] = [
  { view: "overview", icon: House, title: ["Deine Startseite", "Your home"], description: [
    "Hier siehst du das nächste Training, Spiele und aktuelle Meldungen deines Vereins.",
    "See your next training session, matches and updates from your club.",
  ] },
  { view: "calendar", icon: CalendarDays, title: ["Planen und zusagen", "Plan and RSVP"], description: [
    "Öffne ein Training und gib an, ob du dabei bist. Du kannst die Termine auch in deinen Kalender laden.",
    "Open a training session to let your team know if you can make it. You can also download the events to your calendar.",
  ] },
  { view: "teams", icon: UsersRound, title: ["Deine Teams", "Your teams"], description: [
    "Hier findest du die Kader und Positionen. Spieltermine und Ergebnisse stehen unter Spiele.",
    "Find your squad lists and player positions here. Go to Matches for fixtures and results.",
  ] },
  { view: "messages", icon: MessageCircle, title: ["Private Nachrichten", "Private messages"], description: [
    "Schreibe Personen, die für deinen Zugang verfügbar sind, und antworte direkt im Gespräch.",
    "Message the people available to your account and reply directly in a conversation.",
  ] },
  { view: "tactics", icon: Layers3, title: ["Taktiken und Vereinsnews", "Tactics and club news"], description: [
    "Hier öffnest du die mit dir geteilten Spielzüge. Meldungen für dich und dein Team findest du unter Vereinsnews.",
    "Open the plays shared with you here. Find updates for you and your squad under Club news.",
  ] },
  { view: "profile", icon: UserRound, title: ["Dein Profil", "Your profile"], description: [
    "Halte deinen Namen, deine Position und dein Profilfoto aktuell.",
    "Keep your name, playing position and profile photo up to date.",
  ] },
  { view: "settings", icon: Settings2, title: ["Die App auf deinem Gerät", "The app on your device"], description: [
    "Installiere den Mitgliederbereich und wähle, für welche Ereignisse du Mitteilungen möchtest.",
    "Install the member area and choose which events you want to hear about.",
  ] },
];

const newsStep: TourStep = { view: "news", icon: Newspaper, title: ["Vereinsnews", "Club news"], description: [
  "Hier findest du Meldungen für dich und deine Mannschaften.",
  "Find updates for you and your squads here.",
] };
const stepsWithoutCoach = stepsWithCoach.map(step => step.view === "tactics" ? newsStep : step);

export function memberTourSteps(coachStudio: boolean) {
  return coachStudio ? stepsWithCoach : stepsWithoutCoach;
}

type Placement = {
  spotlight?: { top: number; left: number; width: number; height: number };
  panel?: { top: number; left: number };
};

export function MemberOnboarding({ index, steps, language, onStep, onSkip, onDone }: {
  index: number; steps: TourStep[]; language: MemberLanguage; onStep: (index: number) => void; onSkip: () => void; onDone: () => void;
}) {
  const t = (de: string, en: string) => language === "de" ? de : en;
  const step = steps[index];
  const final = index === steps.length - 1;
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [placement, setPlacement] = useState<Placement>({});

  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = "hidden";
    next.current?.focus({ preventScroll: true });
    return () => {
      modal.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(step.view === "settings"
      ? "[data-workspace-app-install]" : '[data-member-tour-target="' + step.view + '"]');
    let frame = 0;
    function measure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target?.getBoundingClientRect();
        const panel = card.current;
        if (!rect || !panel || rect.bottom <= 4 || rect.top >= innerHeight - 4 || rect.width < 1) {
          setPlacement({});
          return;
        }
        const margin = 10;
        const top = Math.max(margin, rect.top - 6);
        const left = Math.max(margin, rect.left - 6);
        const right = Math.min(innerWidth - margin, rect.right + 6);
        const bottom = Math.min(innerHeight - margin, rect.bottom + 6);
        const panelLeft = Math.max(margin, Math.min(left, innerWidth - panel.offsetWidth - margin));
        const below = bottom + 13;
        const above = top - panel.offsetHeight - 13;
        const panelTop = below + panel.offsetHeight <= innerHeight - margin ? below : Math.max(margin, above);
        setPlacement({
          spotlight: { top, left, width: right - left, height: bottom - top },
          panel: innerWidth <= 680 ? undefined : { top: panelTop, left: panelLeft },
        });
      });
    }
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    if (card.current) observer.observe(card.current);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [language, step.view]);

  const Icon = step.icon;
  return <dialog ref={dialog} className="club-member-tour" aria-labelledby={titleId} aria-describedby={titleId + "-description"}
    onCancel={event => { event.preventDefault(); onSkip(); }}
    onKeyDown={event => {
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); onStep(index - 1); }
      if (event.key === "ArrowRight" && !final) { event.preventDefault(); onStep(index + 1); }
    }}>
    {placement.spotlight
      ? <div className="club-member-tour-spot" aria-hidden="true" style={placement.spotlight} />
      : <div className="club-member-tour-shade" aria-hidden="true" />}
    <div ref={card} className="club-member-tour-card" data-positioned={Boolean(placement.panel) || undefined} style={placement.panel}>
      <header className="club-member-tour-head">
        <span className="club-member-tour-symbol"><Icon size={21} aria-hidden="true" /></span>
        <span className="club-member-tour-progress-label">{t(`Schritt ${index + 1} von ${steps.length}`, `Step ${index + 1} of ${steps.length}`)}</span>
        <button className="club-member-icon-button" type="button" onClick={onSkip} aria-label={t("Einführung schließen", "Close the tour")}><X size={18} aria-hidden="true" /></button>
      </header>
      <div aria-live="polite">
        <h2 id={titleId}>{t(...step.title)}</h2><p id={titleId + "-description"}>{t(...step.description)}</p>
      </div>
      <div className="club-member-tour-progress" aria-hidden="true">
        {steps.map((entry, position) => <i key={entry.view} data-current={position <= index || undefined} />)}
      </div>
      <footer className="club-member-tour-actions">
        {index > 0 && <button className="club-member-icon-button" type="button" onClick={() => onStep(index - 1)} aria-label={t("Zurück", "Back")}><ArrowLeft size={18} aria-hidden="true" /></button>}
        <button className="club-member-text-button" type="button" onClick={onSkip}>{t("Überspringen", "Skip")}</button>
        <button className="club-member-button club-member-button-primary" type="button" ref={next}
          onClick={final ? onDone : () => onStep(index + 1)}>
          {final ? t("App-Einstellungen öffnen", "Open app settings") : t("Weiter", "Next")}<ArrowRight size={17} aria-hidden="true" />
        </button>
      </footer>
    </div>
  </dialog>;
}
