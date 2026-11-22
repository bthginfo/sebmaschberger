"use client";

import { ArrowLeft, ArrowRight, Check, ClipboardList, Crosshair, FileCode2, FileText, Layers3, Maximize2, Play, Share2, Timer, Waypoints } from "lucide-react";
import { useMemo, useState } from "react";
import { frameTimes, playDuration } from "@/lib/coach/model";
import { coachTemplates } from "@/lib/coach/presets";
import { renderCoachBoard } from "@/lib/coach/scene";
import { timeLabel } from "./coach-playback";
import { Action, CoachDialog, CoachPitch, coachText } from "./coach-ui";
import type { CoachLocale } from "./coach-ui";
import styles from "./studio.module.css";

type Copy = readonly [string, string];
type Tip = { title: Copy; body: Copy };
type GuideStep = { name: Copy; icon: typeof Crosshair; title: Copy; tips: readonly Tip[] };

const steps: readonly GuideStep[] = [
  {
    name: ["Aufstellen", "Set up"], icon: Crosshair,
    title: ["Die Aufstellung zeichnen", "Set up your play"],
    tips: [
      { title: ["Spielfeld wählen", "Choose the pitch"], body: ["Lege eine Taktik an. Unter Taktik kannst du auf Halbfeld, 22-Meter-Zone oder Whiteboard wechseln.", "Create a play. In Play properties, switch to a half pitch, 22-metre area, or whiteboard."] },
      { title: ["Werkzeug wählen und platzieren", "Pick a tool and place it"], body: ["Tippe für Spieler, Ball und Ausrüstung auf das Feld. Ziehe Pfade und Linien oder setze ihre Endpunkte.", "Tap the pitch to place players, the ball, and equipment. Drag to draw paths and lines or set their endpoints."] },
      { title: ["Details ergänzen", "Add the details"], body: ["Wähle ein Element für Farbe und Beschriftung. Im Trainingsplan ist Platz für Lernziel, Gruppen, Material und Steigerung.", "Select an item to adjust its colour and label. Use the training plan for objectives, groups, equipment, and progression."] },
    ],
  },
  {
    name: ["Phasen", "Phases"], icon: Layers3,
    title: ["Aus Positionen wird Bewegung", "Turn positions into motion"],
    tips: [
      { title: ["Nächste Phase anlegen", "Add the next phase"], body: ["Die neue Phase übernimmt deine Aufstellung. Verschiebe Spieler und Ball dorthin, wo sie als Nächstes hin sollen.", "The new phase copies your set-up. Move the players and ball to where they should be next."] },
      { title: ["Timing bestimmen", "Set the timing"], body: ["Die Standzeit hält das Bild vor der Bewegung. Die Bewegungsdauer bestimmt, wie lange es bis zur nächsten Aufstellung dauert.", "The hold keeps the current position on screen. Movement duration controls how long it takes to reach the next set-up."] },
      { title: ["Kurve und Ballflug einstellen", "Choose a curve and ball flight"], body: ["Passe die Beschleunigung an und wähle bei Bedarf Bodenball, Pass- oder Kickbogen. Notizen bleiben bei ihrer Phase.", "Adjust acceleration and choose a ground path, pass arc, or kick arc. Each phase keeps its own coaching notes."] },
    ],
  },
  {
    name: ["Abspielen", "Playback"], icon: Play,
    title: ["Den Ablauf im Vollbild prüfen", "Review the play in fullscreen"],
    tips: [
      { title: ["Genau zur richtigen Stelle springen", "Jump to the right moment"], body: ["Spiele die Taktik ab, ziehe den Regler oder wechsle direkt in eine Phase.", "Play the sequence, scrub the timeline, or jump straight to a phase."] },
      { title: ["Tempo und Wiederholung wählen", "Choose speed and loop"], body: ["Gehe bis auf ¼× herunter und wiederhole die aktuelle Phase oder die ganze Taktik.", "Slow down to ¼× and loop the current phase or the entire play."] },
      { title: ["Im Vollbild weiterarbeiten", "Keep editing in fullscreen"], body: ["Öffne Vollbild oder drücke F. Werkzeuge, Eigenschaften und Wiedergabe bleiben erreichbar. Mit Escape kommst du zurück.", "Open fullscreen or press F. Tools, properties, and playback stay within reach. Press Escape to return."] },
    ],
  },
  {
    name: ["Weitergeben", "Share"], icon: Share2,
    title: ["Speichern und weitergeben", "Save and share the play"],
    tips: [
      { title: ["Taktik speichern", "Save your play"], body: ["Speichere über die Leiste oder mit Strg/⌘ + S. Eine neue Version von jemand anderem wird beim Speichern erkannt.", "Save from the toolbar or with Ctrl/⌘ + S. Saving detects newer revisions from other editors."] },
      { title: ["PDF oder interaktives HTML", "PDF or interactive HTML"], body: ["Das PDF enthält Phasenbilder und Notizen. Die HTML-Datei spielt die Taktik auch offline ab.", "The PDF contains phase diagrams and notes. The HTML file plays the tactic offline."] },
      { title: ["Link erstellen und kopieren", "Create and copy a link"], body: ["Eigentümer wählen Ansehen oder Mitbearbeiten und eine Laufzeit. Kopiere den neuen Link direkt im Dialog. Dort kannst du ihn auch widerrufen.", "Owners choose view or collaborate and set an expiry. Copy the new link in the dialog, where you can also revoke it."] },
    ],
  },
];

export function CoachGuide({ locale, close }: { locale: CoachLocale; close: () => void }) {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  const t = (de: string, en: string) => coachText(locale, de, en);
  const say = (copy: Copy) => t(...copy);
  const play = useMemo(() => coachTemplates(locale)[0], [locale]);
  const previews = useMemo(() => play.frames.slice(0, 3).map((_, index) => renderCoachBoard(play, 0, {
    frameIndex: index, variant: "play", routes: true, locale,
  })), [locale, play]);
  const times = frameTimes(play);
  const complete = selected === steps.length - 1;

  return <CoachDialog locale={locale} title={t("So funktioniert’s", "How it works")} close={close} className={styles.guideDialog}>
    <nav className={styles.guideTabs} aria-label={t("Anleitungsschritte", "Guide steps")}>
      {steps.map((entry, index) => <button key={index} type="button" aria-current={index === selected ? "step" : undefined} onClick={() => setSelected(index)}>
        <entry.icon size={15} aria-hidden="true" /><span>{say(entry.name)}</span>
      </button>)}
    </nav>
    <div className={styles.guideBody}>
      <figure className={styles.guideFigure} aria-label={t("Beispiel auf der Rugby-Taktiktafel", "Example on the rugby tactics board")}>
        <div className={styles.guideVisual} aria-hidden="true">
          <CoachPitch svg={previews[selected === 2 ? 1 : 0]} className={styles.guidePitch} />
          {selected === 0 && <>
            <span className={styles.guidePin} style={{ left: "31%", top: "37%" }}>1</span>
            <span className={styles.guidePin} style={{ left: "50%", top: "51%" }}>2</span>
            <span className={styles.guidePin} style={{ left: "81%", top: "73%" }}>3</span>
          </>}
        </div>
        <div className={styles.guideDiagram} aria-hidden="true">
          {selected === 0 && <>
            <span><Crosshair size={15} />{t("Auswahl", "Select")}</span>
            <span><Waypoints size={15} />{t("Pfade", "Paths")}</span>
            <span><ClipboardList size={15} />{t("Eigenschaften", "Properties")}</span>
          </>}
          {selected === 1 && <div className={styles.guideFrames}>{previews.map((svg, index) => <div key={index} data-current={index === 1 || undefined}>
            <CoachPitch svg={svg} /><span>{index + 1} <time>{timeLabel(times[index], true)}</time></span>
          </div>)}</div>}
          {selected === 2 && <>
            <span><Play size={16} />{timeLabel(times[1] ?? 0)} / {timeLabel(playDuration(play))}</span>
            <span><Timer size={15} />¼×</span><span><Maximize2 size={15} />{t("Vollbild", "Fullscreen")}</span>
          </>}
          {selected === 3 && <><span><FileText size={15} />PDF</span><span><FileCode2 size={15} />HTML</span><span><Share2 size={15} />{t("Freigabelink", "Share link")}</span></>}
        </div>
      </figure>
      <div className={styles.guideText}>
        <h3 aria-live="polite">{say(step.title)}</h3>
        <ol>
          {step.tips.map((tip, index) => <li key={index}>
            <span aria-hidden="true">{index + 1}</span>
            <div><strong>{say(tip.title)}</strong><p>{say(tip.body)}</p></div>
          </li>)}
        </ol>
      </div>
    </div>
    <div className={styles.guideFooter}>
      <Action icon={ArrowLeft} variant="ghost" disabled={selected === 0} onClick={() => setSelected(selected - 1)}>{t("Zurück", "Back")}</Action>
      <span>{selected + 1} / {steps.length}</span>
      <Action icon={complete ? Check : ArrowRight} variant="primary" onClick={complete ? close : () => setSelected(selected + 1)}>
        {complete ? t("Fertig", "Done") : t("Weiter", "Next")}
      </Action>
    </div>
  </CoachDialog>;
}
