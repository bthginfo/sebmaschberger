"use client";

import { ChevronDown, ClipboardList, Eye, Minimize2, PanelRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { frameAt, frameTimes } from "@/lib/coach/model";
import type { CoachRecord } from "@/lib/coach/model";
import { localizeCoachPreset } from "@/lib/coach/presets";
import { CoachPhases } from "./coach-phases";
import { CoachTransport, useCoachPlayback } from "./coach-playback";
import { CoachMotionPitch } from "./coach-motion-pitch";
import { useCoachFocus } from "./coach-focus";
import { IconButton, PitchLegend, StudioHeader, categoryLabels, coachText, pitchLabels, planFields } from "./coach-ui";
import styles from "./studio.module.css";

export function CoachViewer({ initial, memberHref }: { initial: CoachRecord; memberHref?: string }) {
  const { language } = useAdminLanguage(initial.play.locale);
  const play = useMemo(() => memberHref ? localizeCoachPreset(initial, language) : initial.play, [initial, language, memberHref]);
  const t = (de: string, en: string) => coachText(language, de, en);
  const playback = useCoachPlayback(play);
  const index = frameAt(play, playback.time);
  const current = play.frames[index];
  const times = frameTimes(play);
  const focus = useCoachFocus();
  const { active, open, close } = focus;
  const [notesOpen, setNotesOpen] = useState(false);
  const plan = play.plan;
  const planEntries = plan ? planFields.filter((field) => plan[field.key]?.trim()) : [];

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.key.toLowerCase() !== "f") return;
      if (event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable)) return;
      event.preventDefault();
      if (active) close();
      else { setNotesOpen(false); open(); }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, close, open]);

  const select = (selected: number) => {
    playback.pause();
    playback.seek(times[selected] ?? 0);
  };

  return <div className={styles.studio} lang={language}>
    <StudioHeader inert={active} languageSwitch={Boolean(memberHref)} back={memberHref ? { href: memberHref, label: t("Mitgliederbereich", "Members") } : undefined}>
      <span className={styles.viewBadge}><Eye size={16} aria-hidden="true" />{t("Freigegebene Ansicht", "Shared view")}</span>
    </StudioHeader>
    <main className={styles.viewerMain}>
      <div className={styles.viewerHeading} inert={active}>
        <div lang={play.locale}><h1>{play.title}</h1>{play.description && <p>{play.description}</p>}</div>
        <span className={styles.category} data-category={play.category}>{categoryLabels[play.category][language]}</span>
      </div>
      <div ref={focus.surface} className={styles.viewerLayout} data-focus={active || undefined}
        role={active ? "dialog" : undefined} aria-modal={active || undefined}
        aria-label={active ? t("Taktik im Vollbild", "Play in fullscreen") : undefined}>
        {active && <div className={styles.focusHeader}>
          <div className={styles.focusIdentity}>
            <strong lang={play.locale} title={play.title}>{play.title}</strong>
            <span>{t("Phase", "Phase")} {index + 1} / {play.frames.length}</span>
          </div>
          <div className={styles.focusActions}>
            <IconButton icon={PanelRight} label={t("Coaching-Notizen", "Coaching notes")} aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)} />
            <IconButton icon={Minimize2} label={t("Vollbild schließen", "Exit fullscreen")} ref={focus.exit} onClick={close} aria-keyshortcuts="Escape F" />
          </div>
        </div>}
        <section className={styles.viewerBoard} aria-label={t("Taktiktafel", "Tactics board")}>
          <div className={styles.viewerBoardTop}>
            <span>{pitchLabels[play.pitch][language]}</span>
            <span>{t("Phase", "Phase")} {index + 1} / {play.frames.length}</span>
          </div>
          <div className={styles.viewerStage}>
            <CoachMotionPitch play={play} time={playback.time} locale={language} className={styles.viewerPitch}
              tabIndex={0} role="img" aria-label={t("Animierte Rugby-Taktiktafel", "Animated rugby tactics board")}
              aria-keyshortcuts="Space ArrowLeft ArrowRight"
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "ArrowLeft" || event.key === "ArrowRight") event.preventDefault();
                if (event.key === " ") playback.toggle();
                if (event.key === "ArrowLeft" && index > 0) select(index - 1);
                if (event.key === "ArrowRight" && index < times.length - 1) select(index + 1);
              }} />
          </div>
          <CoachTransport play={play} playback={playback} onFocus={(initiator) => { setNotesOpen(false); open(initiator); }} />
        </section>
        <aside className={styles.viewerNotes} hidden={active && !notesOpen}>
          <p className={styles.phasePosition}>{t("Phase ", "Phase ") + (index + 1) + " / " + play.frames.length}</p>
          <h2 lang={play.locale}>{current.title}</h2>
          {current.notes && <p lang={play.locale} className={styles.coachNotes}>{current.notes}</p>}
          <PitchLegend locale={language} />
          {plan && (plan.minutes || planEntries.length > 0) && <details className={styles.inspectorDisclosure}>
            <summary><ClipboardList size={15} aria-hidden="true" /><span>{t("Trainingsplan", "Training plan")}</span><ChevronDown size={14} aria-hidden="true" /></summary>
            <dl className={styles.viewerPlan}>
              {plan.minutes && <><dt>{t("Trainingsdauer", "Training time")}</dt><dd>{plan.minutes} min</dd></>}
              {planEntries.map((field) => <div key={field.key}><dt>{field[language]}</dt><dd lang={play.locale}>{plan[field.key]}</dd></div>)}
            </dl>
          </details>}
        </aside>
        <CoachPhases play={play} current={index} select={select} time={playback.time} />
      </div>
    </main>
  </div>;
}
