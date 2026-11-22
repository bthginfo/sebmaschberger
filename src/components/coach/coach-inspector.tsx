"use client";

import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, ClipboardList, Copy, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { COACH_CATEGORIES, COACH_PITCHES, PITCH_HEIGHT, PITCH_WIDTH } from "@/lib/coach/model";
import type { CoachFrame, CoachPiece, CoachPlay } from "@/lib/coach/model";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { Action, IconButton, PieceIcon, categoryLabels, coachText, isArrow, pieceLabels, pieceName, pitchLabels, planFields } from "./coach-ui";
import styles from "./studio.module.css";

export type InspectorTab = "phase" | "play" | "element";
type Props = {
  play: CoachPlay;
  index: number;
  tab: InspectorTab;
  chooseTab: (tab: InspectorTab) => void;
  piece: CoachPiece | undefined;
  select: (id: string | null) => void;
  updatePlay: (patch: Partial<CoachPlay>, group?: string) => void;
  updateFrame: (patch: Partial<CoachFrame>, group?: string) => void;
  updatePiece: (piece: CoachPiece, group?: string) => void;
  finishEdit: () => void;
  deletePhase: () => void;
  movePhase: (delta: -1 | 1) => void;
  deletePiece: () => void;
  duplicatePiece: () => void;
  copyPieceForward: () => void;
  hidden?: boolean;
};

const tones = [
  { key: "sky", color: "#71aaff", de: "Blau", en: "Blue" },
  { key: "coral", color: "#ff9e83", de: "Koralle", en: "Coral" },
  { key: "mint", color: "#6fd9b3", de: "Minze", en: "Mint" },
  { key: "amber", color: "#f5c56b", de: "Bernstein", en: "Amber" },
  { key: "violet", color: "#c8a4f1", de: "Violett", en: "Violet" },
  { key: "white", color: "#edf2f3", de: "Weiß", en: "White" },
] as const;

export function CoachInspector(props: Props) {
  const { play, index, tab, chooseTab, piece, select, updatePlay, updateFrame, updatePiece, finishEdit, deletePhase, movePhase, deletePiece, duplicatePiece, copyPieceForward } = props;
  const { language } = useAdminLanguage(play.locale);
  const t = (de: string, en: string) => coachText(language, de, en);
  const frame = play.frames[index];
  const next = play.frames[index + 1];
  const active = tab === "element" && !piece ? "phase" : tab;
  const canForward = Boolean(next && next.items.length < 100 && !next.items.some((item) => item.id === piece?.id));

  return <aside className={styles.inspector} aria-label={t("Eigenschaften", "Properties")} hidden={props.hidden}>
    <div className={styles.inspectorTabs} role="group" aria-label={t("Eigenschaften wählen", "Choose properties")}>
      <button type="button" aria-pressed={active === "phase"} onClick={() => chooseTab("phase")}>{t("Phase", "Phase")}</button>
      <button type="button" aria-pressed={active === "play"} onClick={() => chooseTab("play")}>{t("Taktik", "Play")}</button>
      {piece && <button type="button" aria-pressed={active === "element"} onClick={() => chooseTab("element")}>{t("Element", "Item")}</button>}
    </div>
    <div className={styles.inspectorBody}>
      {active === "play" && <>
        <h2>{t("Taktikdetails", "Play details")}</h2>
        <label className={styles.field}>{t("Kategorie", "Category")}
          <select value={play.category} onChange={(event) => updatePlay({ category: event.target.value as CoachPlay["category"] })}>
            {COACH_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabels[category][language]}</option>)}
          </select>
        </label>
        <label className={styles.field}>{t("Spielfeld", "Pitch")}
          <select value={play.pitch} onChange={(event) => updatePlay({ pitch: event.target.value as CoachPlay["pitch"] })}>
            {COACH_PITCHES.map((pitch) => <option key={pitch} value={pitch}>{pitchLabels[pitch][language]}</option>)}
          </select>
        </label>
        <label className={styles.field}>{t("Beschreibung", "Description")}
          <textarea lang={play.locale} value={play.description} maxLength={600} rows={3} placeholder={t("Worum geht es in dieser Taktik?", "What is this play about?")}
            onChange={(event) => updatePlay({ description: event.target.value }, "description")} onBlur={finishEdit} />
        </label>
        <label className={styles.field}>{t("Sprache der Taktik und Exporte", "Play and export language")}
          <select value={play.locale} onChange={(event) => updatePlay({ locale: event.target.value as CoachPlay["locale"] })}>
            <option value="de">Deutsch</option><option value="en">English</option>
          </select>
        </label>
        <details className={styles.inspectorDisclosure}>
          <summary><ClipboardList size={15} aria-hidden="true" /><span>{t("Trainingsplan", "Training plan")}</span><ChevronDown size={14} aria-hidden="true" /></summary>
          <div className={styles.disclosureFields}>
            {planFields.map((field) => <label key={field.key} className={styles.field}>{field[language]}
              <textarea lang={play.locale} rows={field.key === "progression" ? 3 : 2} maxLength={field.limit} value={play.plan?.[field.key] ?? ""}
                onChange={(event) => updatePlay({ plan: { ...play.plan, [field.key]: event.target.value } }, "plan-" + field.key)} onBlur={finishEdit} />
            </label>)}
            <label className={styles.field}>{t("Trainingsdauer", "Training time")}
              <span className={styles.unitField}><NumberInput value={play.plan?.minutes} min={1} max={240} step={1} optional
                save={(minutes) => updatePlay({ plan: { ...play.plan, minutes } }, "plan-minutes")} finish={finishEdit} /><span aria-hidden="true">min</span></span>
            </label>
          </div>
        </details>
      </>}
      {active === "phase" && <>
        <div className={styles.inspectorTitle}>
          <h2>{t("Phase ", "Phase ")}{index + 1} <span>/ {play.frames.length}</span></h2>
          <div className={styles.inspectorActions}>
            <IconButton icon={ArrowUp} label={t("Phase vorziehen", "Move phase earlier")} onClick={() => movePhase(-1)} disabled={index === 0} />
            <IconButton icon={ArrowDown} label={t("Phase nach hinten verschieben", "Move phase later")} onClick={() => movePhase(1)} disabled={!next} />
            <IconButton icon={Trash2} label={t("Phase löschen", "Delete phase")} onClick={deletePhase} disabled={play.frames.length === 1} className={styles.removeIcon} />
          </div>
        </div>
        <label className={styles.field}>{t("Name der Phase", "Phase name")}
          <input lang={play.locale} value={frame.title} maxLength={70} onChange={(event) => updateFrame({ title: event.target.value }, "phase-title")} onBlur={finishEdit} />
        </label>
        <label className={styles.field}>{t("Coaching-Notiz", "Coaching note")}
          <textarea lang={play.locale} value={frame.notes} maxLength={600} rows={3} placeholder={t("Worauf soll das Team achten?", "What should the team focus on?")}
            onChange={(event) => updateFrame({ notes: event.target.value }, "phase-notes")} onBlur={finishEdit} />
        </label>
        <div className={styles.timingFields} data-single={!next || undefined}>
          {next && <label className={styles.field}>{t("Bewegungsdauer", "Movement duration")}
            <span className={styles.unitField}><NumberInput key={frame.id + "-duration"} value={frame.seconds} min={0.25} max={20} step={0.25}
              save={(seconds) => { if (seconds !== undefined) updateFrame({ seconds }, "phase-seconds"); }} finish={finishEdit} /><span aria-hidden="true">s</span></span>
          </label>}
          <label className={styles.field}>{next ? t("Standzeit", "Hold before movement") : t("Standzeit am Ende", "Hold on the last frame")}
            <span className={styles.unitField}><NumberInput key={frame.id + "-hold"} value={frame.hold ?? 0} min={0} max={20} step={0.25}
              save={(hold) => updateFrame({ hold: hold || undefined }, "phase-hold")} finish={finishEdit} /><span aria-hidden="true">s</span></span>
          </label>
        </div>
        {next && <details className={styles.inspectorDisclosure}>
          <summary><SlidersHorizontal size={15} aria-hidden="true" /><span>{t("Bewegung und Ballflug", "Motion and ball flight")}</span><ChevronDown size={14} aria-hidden="true" /></summary>
          <div className={styles.disclosureFields}>
            <label className={styles.field}>{t("Bewegungskurve", "Motion curve")}
              <select value={frame.transition ?? "smooth"} onChange={(event) => updateFrame({ transition: event.target.value as CoachFrame["transition"] })}>
                <option value="smooth">{t("Weich", "Smooth")}</option>
                <option value="linear">{t("Gleichmäßig", "Linear")}</option>
                <option value="quick">{t("Explosiver Start", "Quick start")}</option>
              </select>
            </label>
            <label className={styles.field}>{t("Ballflug", "Ball flight")}
              <select value={frame.ballFlight ?? "auto"} onChange={(event) => updateFrame({ ballFlight: event.target.value as CoachFrame["ballFlight"] })}>
                <option value="auto">{t("Automatisch", "Automatic")}</option>
                <option value="ground">{t("Am Boden", "Along the ground")}</option>
                <option value="pass">{t("Passbogen", "Pass arc")}</option>
                <option value="kick">{t("Kickbogen", "Kick arc")}</option>
              </select>
            </label>
          </div>
        </details>}
        <div className={styles.elements}>
          <h3>{t("Auf dem Feld", "On the pitch")} <span>{frame.items.length}</span></h3>
          {frame.items.length > 0 ? <ul>
            {frame.items.map((item) => <li key={item.id}><button type="button" data-kind={item.kind} onClick={() => select(item.id)} title={pieceName(item, language)}>
              <PieceIcon kind={item.kind} size={15} /><span>{pieceName(item, language)}</span>
            </button></li>)}
          </ul> : <p className={styles.quiet}>{t("Wähle ein Werkzeug und tippe auf das Feld.", "Choose a tool and tap the pitch.")}</p>}
        </div>
      </>}
      {active === "element" && piece && <>
        <div className={styles.inspectorTitle}>
          <h2 className={styles.elementTitle}><span data-kind={piece.kind}><PieceIcon kind={piece.kind} size={17} /></span>{pieceLabels[piece.kind][language]}</h2>
          <div className={styles.inspectorActions}>
            <IconButton icon={Copy} label={t("Element duplizieren", "Duplicate item")} onClick={duplicatePiece} disabled={frame.items.length >= 100} />
            <IconButton icon={Trash2} label={t("Element löschen", "Delete item")} onClick={deletePiece} className={styles.removeIcon} />
          </div>
        </div>
        <label className={styles.field}>{piece.kind === "attack" || piece.kind === "defence" ? t("Nummer oder Kürzel", "Number or initials") : t("Beschriftung", "Label")}
          <input key={piece.id} lang={play.locale} value={piece.label} maxLength={48} onChange={(event) => updatePiece({ ...piece, label: event.target.value }, "label")} onBlur={finishEdit} />
        </label>
        {isArrow(piece.kind) && <label className={styles.field}>{t("Kurve", "Curve")}
          <span className={styles.sliderField}><input type="range" min={-250} max={250} step={5} value={piece.curve ?? 0}
            onChange={(event) => updatePiece({ ...piece, curve: Number(event.target.value) }, "curve")}
            onPointerUp={finishEdit} onBlur={finishEdit} /><span aria-hidden="true">{piece.curve ?? 0}</span></span>
        </label>}
        {(piece.kind === "zone" || piece.kind === "ring") && <>
          <label className={styles.field}>{t("Breite", "Width")}<input type="range" min={20} max={Math.max(20, PITCH_WIDTH - piece.x)} step={1} value={piece.width ?? (piece.kind === "ring" ? 112 : 150)}
            onChange={(event) => updatePiece({ ...piece, width: Number(event.target.value) }, "width")} onPointerUp={finishEdit} onBlur={finishEdit} /></label>
          <label className={styles.field}>{t("Höhe", "Height")}<input type="range" min={20} max={Math.max(20, PITCH_HEIGHT - piece.y)} step={1} value={piece.height ?? (piece.kind === "ring" ? 112 : 90)}
            onChange={(event) => updatePiece({ ...piece, height: Number(event.target.value) }, "height")} onPointerUp={finishEdit} onBlur={finishEdit} /></label>
        </>}
        {(piece.kind === "gate" || piece.kind === "pad" || piece.kind === "flag") && <label className={styles.field}>{t("Ausrichtung", "Rotation")}
          <span className={styles.sliderField}><input type="range" min={-180} max={180} step={5} value={piece.angle ?? 0}
            onChange={(event) => updatePiece({ ...piece, angle: Number(event.target.value) }, "angle")}
            onPointerUp={finishEdit} onBlur={finishEdit} /><span aria-hidden="true">{piece.angle ?? 0}°</span></span>
        </label>}
        <fieldset className={styles.swatches}>
          <legend>{t("Farbe", "Colour")}</legend>
          <button type="button" aria-pressed={!piece.tone} title={t("Standardfarbe", "Default colour")} aria-label={t("Standardfarbe", "Default colour")}
            onClick={() => updatePiece({ ...piece, tone: undefined })}><span data-default /></button>
          {tones.map((tone) => <button key={tone.key} type="button" aria-pressed={piece.tone === tone.key} title={tone[language]} aria-label={tone[language]}
            onClick={() => updatePiece({ ...piece, tone: tone.key })}><span style={{ backgroundColor: tone.color }} /></button>)}
        </fieldset>
        {canForward && <Action icon={ArrowRight} onClick={copyPieceForward}>{t("In nächste Phase kopieren", "Copy to next phase")}</Action>}
        <Action variant="ghost" onClick={() => select(null)}>{t("Auswahl aufheben", "Clear selection")}</Action>
      </>}
    </div>
  </aside>;
}

function NumberInput({ value, min, max, step, optional, save, finish }: {
  value?: number; min: number; max: number; step: number; optional?: boolean; save: (value: number | undefined) => void; finish: () => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(value === undefined ? "" : String(value)); }, [editing, value]);
  return <input type="number" value={draft} min={min} max={max} step={step} inputMode={step === 1 ? "numeric" : "decimal"}
    onFocus={() => setEditing(true)}
    onChange={(event) => {
      setDraft(event.target.value);
      const parsed = event.target.valueAsNumber;
      if (event.target.value === "" && optional && value !== undefined) save(undefined);
      else if (parsed >= min && parsed <= max && parsed !== value && (step !== 1 || Number.isInteger(parsed))) save(parsed);
    }}
    onBlur={() => { setEditing(false); finish(); }} />;
}
