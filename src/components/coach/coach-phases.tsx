"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { frameTimes, playDuration } from "@/lib/coach/model";
import type { CoachPlay } from "@/lib/coach/model";
import { renderCoachBoard } from "@/lib/coach/scene";
import { timeLabel } from "./coach-playback";
import { Action, CoachPitch, IconButton, coachText } from "./coach-ui";
import styles from "./studio.module.css";

export function CoachPhases({ play, current, select, add, disabled, time }: {
  play: CoachPlay;
  current: number;
  select: (index: number) => void;
  add?: () => void;
  disabled?: boolean;
  time?: number;
}) {
  const { language } = useAdminLanguage(play.locale);
  const t = (de: string, en: string) => coachText(language, de, en);
  const times = frameTimes(play);
  const duration = playDuration(play);
  const previews = useMemo(() => play.frames.map((_, index) => renderCoachBoard(play, 0, { frameIndex: index, routes: false, locale: language })), [language, play]);
  const rail = useRef<HTMLOListElement>(null);
  const [overflow, setOverflow] = useState({ before: false, after: false });
  useEffect(() => {
    const list = rail.current;
    if (!list) return;
    const update = () => {
      const before = list.scrollLeft > 2;
      const after = list.scrollWidth - list.clientWidth - list.scrollLeft > 2;
      setOverflow((previous) => previous.before === before && previous.after === after ? previous : { before, after });
    };
    const observer = new ResizeObserver(update);
    observer.observe(list);
    update();
    list.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener("scroll", update);
    };
  }, [play.frames.length]);
  useEffect(() => {
    const list = rail.current;
    const active = list?.querySelector('[aria-current="step"]');
    if (!active || !list) return;
    const view = list.getBoundingClientRect();
    const tile = active.getBoundingClientRect();
    if (tile.left < view.left) list.scrollLeft += tile.left - view.left - 3;
    else if (tile.right > view.right) list.scrollLeft += tile.right - view.right + 3;
  }, [current, play.frames.length]);
  function browse(direction: -1 | 1) {
    const list = rail.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * Math.max(124, list.clientWidth * .63), behavior: reduce ? "instant" : "smooth" });
  }
  return <section className={styles.phasePanel} aria-label={t("Spielphasen", "Play phases")}>
    <div className={styles.phaseHeading}>
      <h2>{t("Phasen", "Phases")}{" "}<span>{play.frames.length}</span></h2>
      <div className={styles.phaseActions}>
        {(overflow.before || overflow.after) && <div className={styles.phaseBrowse}>
          <IconButton icon={ChevronLeft} label={t("Frühere Phasen zeigen", "Show earlier phases")} onClick={() => browse(-1)} disabled={!overflow.before} />
          <IconButton icon={ChevronRight} label={t("Spätere Phasen zeigen", "Show later phases")} onClick={() => browse(1)} disabled={!overflow.after} />
        </div>}
        {add && <Action icon={Plus} variant="ghost" className={styles.addPhase} onClick={add} disabled={disabled || play.frames.length >= 24}>{t("Phase hinzufügen", "Add phase")}</Action>}
      </div>
    </div>
    <ol ref={rail} className={styles.phaseRail}>
      {play.frames.map((frame, index) => {
        const span = (times[index + 1] ?? duration) - times[index];
        const progress = current === index && time !== undefined && span > 0 ? Math.max(0, Math.min(1, (time - times[index]) / span)) : 0;
        return <li key={frame.id}>
          <button type="button" className={styles.phaseTile} onClick={() => select(index)} aria-current={current === index ? "step" : undefined}
            aria-label={t("Phase ", "Phase ") + (index + 1) + " · " + frame.title}
            style={{ "--phase-progress": progress * 100 + "%" } as CSSProperties}>
            <div className={styles.phaseThumb}>
              <CoachPitch svg={previews[index]} aria-hidden="true" />
              <span>{index + 1}</span>
            </div>
            <span className={styles.phaseCaption}><strong lang={play.locale} title={frame.title}>{frame.title || t("Unbenannte Phase", "Untitled phase")}</strong><time>{timeLabel(times[index], true)}</time></span>
          </button>
        </li>;
      })}
    </ol>
  </section>;
}
