"use client";

import { Check, ChevronDown, ClipboardList, CircleHelp, Download, Eye, FileCode2, FileText, LoaderCircle, Minimize2, PanelRight, Pencil, Redo2, Save, Share2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { frameAt, frameTimes } from "@/lib/coach/model";
import type { CoachFrame, CoachPiece, CoachPlay, CoachRecord } from "@/lib/coach/model";
import { localizeCoachPreset } from "@/lib/coach/presets";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { CoachAssistantFab } from "@/components/coach-assistant/coach-assistant-fab";
import { CoachBoard, translatePiece } from "./coach-board";
import type { CoachTool } from "./coach-board";
import { CoachInspector } from "./coach-inspector";
import type { InspectorTab } from "./coach-inspector";
import { CoachPhases } from "./coach-phases";
import { CoachTransport, useCoachPlayback } from "./coach-playback";
import { CoachShare } from "./coach-share";
import { useCoachFocus } from "./coach-focus";
import { CoachGuide } from "./coach-guide";
import { Action, CoachApiError, CoachDialog, IconButton, PitchLegend, StudioHeader, categoryLabels, coachError, coachRequest, coachText, pitchLabels } from "./coach-ui";
import styles from "./studio.module.css";

type History = { past: CoachPlay[]; present: CoachPlay; future: CoachPlay[]; group?: string };
type Dialog = "share" | "leave" | "reload" | "guide" | null;
const historyLimit = 60;
const studioPath = "/admin/coach";

export function CoachEditor({ initial, mode, assistantAvailable = false, member = false, backHref = studioPath, assignmentHref }: {
  initial: CoachRecord; mode: "owner" | "collaborator"; assistantAvailable?: boolean;
  member?: boolean; backHref?: string; assignmentHref?: string;
}) {
  const [history, setHistory] = useState<History>({ past: [], present: initial.play, future: [] });
  const [saved, setSaved] = useState(initial);
  const [phaseId, setPhaseId] = useState(initial.play.frames[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<CoachTool>("select");
  const [tab, setTab] = useState<InspectorTab>("phase");
  const [preview, setPreview] = useState(false);
  const [focusInspector, setFocusInspector] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, setPending] = useState(false);
  const [download, setDownload] = useState<"pdf" | "html" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const skippingGuard = useRef(false);
  const saving = useRef(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const owner = mode === "owner";
  const draft = history.present;
  const { language } = useAdminLanguage(draft.locale);
  const play = useMemo(() => owner ? localizeCoachPreset(saved, language, draft) : draft, [draft, language, owner, saved]);
  const currentDraft = useRef(play);
  const dirty = draft !== saved.play;
  const api = (member ? "/api/club/plays/" : "/api/coach/plays/") + encodeURIComponent(saved.id);
  const index = Math.max(0, play.frames.findIndex((frame) => frame.id === phaseId));
  const selected = play.frames[index].items.find((piece) => piece.id === selectedId);
  const t = (de: string, en: string) => coachText(language, de, en);
  const focus = useCoachFocus();
  const closeFocus = focus.close;
  const openFocus = focus.open;
  const playback = useCoachPlayback(play);
  const times = frameTimes(play);
  const phaseTime = times[index] ?? 0;
  const displayed = preview ? frameAt(play, playback.time) : index;
  const displayedPhase = play.frames[displayed];
  const seek = playback.seek;

  useLayoutEffect(() => {
    currentDraft.current = play;
  }, [play]);

  useEffect(() => {
    if (!preview) seek(phaseTime);
  }, [phaseTime, preview, seek]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      if (skippingGuard.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  const mutate = useCallback((change: (current: CoachPlay) => CoachPlay, group?: string) => {
    setHistory((state) => {
      // Start the first edit from the visible preset while keeping the saved baseline for Undo.
      const source = state.present === draft ? play : state.present;
      const present = change(source);
      if (present === source) return state;
      const past = group && state.group === group ? state.past : [...state.past.slice(-(historyLimit - 1)), state.present];
      return { past, present, future: [], group };
    });
    setMessage("");
  }, [draft, play]);
  const finishEdit = useCallback(() => {
    setHistory((state) => state.group ? { ...state, group: undefined } : state);
  }, []);
  const undo = useCallback(() => {
    setHistory((state) => {
      const previous = state.past.at(-1);
      return previous ? { past: state.past.slice(0, -1), present: previous, future: [state.present, ...state.future] } : state;
    });
    setMessage("");
  }, []);
  const redo = useCallback(() => {
    setHistory((state) => {
      const next = state.future[0];
      return next ? { past: [...state.past, state.present], present: next, future: state.future.slice(1) } : state;
    });
    setMessage("");
  }, []);

  const validate = useCallback(() => {
    if (!play.title.trim()) {
      setError(coachText(language, "Gib der Taktik einen Namen.", "Give this play a name."));
      if (focus.active) closeFocus();
      requestAnimationFrame(() => titleInput.current?.focus());
      return false;
    }
    const untitled = play.frames.find((frame) => !frame.title.trim());
    if (untitled) {
      setError(coachText(language, "Gib jeder Phase einen Namen.", "Give each phase a name."));
      setPhaseId(untitled.id);
      setTab("phase");
      setPreview(false);
      setFocusInspector(true);
      playback.pause();
      return false;
    }
    return true;
  }, [closeFocus, focus.active, language, play, playback.pause]);

  const save = useCallback(async () => {
    if (!dirty || saving.current || conflict || !validate()) return;
    saving.current = true;
    setPending(true);
    setError("");
    finishEdit();
    try {
      const { record } = await coachRequest<{ record: CoachRecord }>(api, "PUT", { play, revision: saved.revision });
      setSaved({ ...record, play });
      setMessage(coachText(language, "Taktik gespeichert.", "Play saved."));
    } catch (caught) {
      if (caught instanceof CoachApiError && caught.status === 409) {
        setConflict(true);
        if (focus.active) closeFocus();
      }
      setError(coachError(caught, language));
    } finally {
      saving.current = false;
      setPending(false);
    }
  }, [api, closeFocus, conflict, dirty, finishEdit, focus.active, language, play, saved.revision, validate]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (dialog || event.altKey || event.defaultPrevented || document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      const textField = event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable);
      if (key === "f" && !event.metaKey && !event.ctrlKey && !textField && !event.repeat) {
        event.preventDefault();
        if (focus.active) closeFocus();
        else { setFocusInspector(false); openFocus(); }
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      if (key === "s") {
        event.preventDefault();
        void save();
        return;
      }
      if (textField || preview || (key !== "z" && key !== "y")) return;
      event.preventDefault();
      if (event.shiftKey || key === "y") redo();
      else undo();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [closeFocus, dialog, focus.active, openFocus, preview, redo, save, undo]);

  function selectPhase(next: number) {
    const frame = play.frames[next];
    if (!frame) return;
    playback.pause();
    playback.seek(times[next] ?? 0);
    setPhaseId(frame.id);
    setSelectedId(null);
    setTab("phase");
    finishEdit();
  }

  function updatePlay(patch: Partial<CoachPlay>, group?: string) {
    mutate((current) => ({ ...current, ...patch }), group);
  }

  function changeFrame(change: (frame: CoachFrame) => CoachFrame, group?: string) {
    mutate((current) => ({ ...current, frames: current.frames.map((frame, i) => i === index ? change(frame) : frame) }), group);
  }

  function updateFrame(patch: Partial<CoachFrame>, group?: string) {
    changeFrame((frame) => ({ ...frame, ...patch }), group);
  }

  function updatePiece(piece: CoachPiece, group?: string) {
    changeFrame((frame) => ({ ...frame, items: frame.items.map((item) => item.id === piece.id ? piece : item) }), group);
  }

  function choosePiece(id: string | null) {
    setSelectedId(id);
    setTool("select");
    setTab(id ? "element" : "phase");
    finishEdit();
  }

  function changePiece(piece: CoachPiece, add?: boolean) {
    if (add) {
      changeFrame((frame) => ({ ...frame, items: [...frame.items, piece] }));
      setSelectedId(piece.id);
      setTab("element");
    } else updatePiece(piece);
  }

  function addPhase() {
    if (play.frames.length >= 24) return;
    playback.pause();
    setPreview(false);
    const phase = play.frames[displayed];
    const next: CoachFrame = { ...phase, id: crypto.randomUUID(), title: "Phase " + (displayed + 2), notes: "", hold: undefined, transition: undefined, ballFlight: undefined };
    mutate((current) => ({ ...current, frames: [...current.frames.slice(0, displayed + 1), next, ...current.frames.slice(displayed + 1)] }));
    setPhaseId(next.id);
    setSelectedId(null);
    setTab("phase");
    setTool("select");
  }

  function deletePhase() {
    if (play.frames.length <= 1) return;
    setPhaseId((play.frames[index - 1] ?? play.frames[index + 1]).id);
    mutate((current) => ({ ...current, frames: current.frames.filter((_, i) => i !== index) }));
    setSelectedId(null);
  }

  function movePhase(delta: -1 | 1) {
    const to = index + delta;
    if (!play.frames[to]) return;
    mutate((current) => {
      const frames = [...current.frames];
      [frames[index], frames[to]] = [frames[to], frames[index]];
      return { ...current, frames };
    });
  }

  function deletePiece() {
    if (!selected) return;
    changeFrame((frame) => ({ ...frame, items: frame.items.filter((item) => item.id !== selected.id) }));
    choosePiece(null);
  }

  function duplicatePiece() {
    if (!selected || play.frames[index].items.length >= 100) return;
    const piece = { ...translatePiece(selected, 24, 22), id: crypto.randomUUID() };
    changePiece(piece, true);
    setTool("select");
  }

  function copyForward() {
    if (!selected) return;
    const next = play.frames[index + 1];
    if (!next || next.items.length >= 100 || next.items.some((item) => item.id === selected.id)) return;
    mutate((current) => ({ ...current, frames: current.frames.map((frame) => frame.id === next.id ? { ...frame, items: [...frame.items, selected] } : frame) }));
    setMessage(t("Element in die nächste Phase übernommen.", "Item copied to the next phase."));
  }

  function startPreview() {
    setPreview(true);
    playback.seek(phaseTime);
  }

  function returnToEdit() {
    selectPhase(displayed);
    setPreview(false);
    setTool("select");
  }

  function applyAssistantPlay(next: CoachPlay, captured?: CoachPlay) {
    const previous = currentDraft.current;
    const firstPhase = next.frames[0];
    if (captured !== previous || !firstPhase) return false;
    currentDraft.current = next;
    mutate((current) => current === previous ? next : current);
    playback.pause();
    setPreview(false);
    if (!next.frames.some((frame) => frame.id === phaseId)) setPhaseId(firstPhase.id);
    setSelectedId(null);
    setTool("select");
    setTab("phase");
    setMessage(t("KI-Vorschlag übernommen.", "AI suggestion applied."));
    return true;
  }

  function togglePlayback() {
    if (!playback.duration) return;
    if (!preview) startPreview();
    playback.toggle();
  }

  async function restore() {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setError("");
    try {
      const { record } = await coachRequest<{ record: CoachRecord }>(api);
      setSaved(record);
      setHistory({ present: record.play, past: [], future: [] });
      setConflict(false);
      setDialog(null);
      setPhaseId(record.play.frames[0].id);
      setSelectedId(null);
      setPreview(false);
      playback.pause();
      setTab("phase");
      setTool("select");
    } catch (caught) {
      setError(coachError(caught, language));
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  async function saveCopy() {
    if (!owner || saving.current || !validate()) return;
    saving.current = true;
    setPending(true);
    setError("");
    try {
      const title = play.title.slice(0, 92) + coachText(play.locale, " – Kopie", " – copy");
      const { record } = await coachRequest<{ record: CoachRecord }>("/api/coach/plays", "POST", { play: { ...play, title } });
      skippingGuard.current = true;
      window.location.assign(studioPath + "/" + encodeURIComponent(record.id));
    } catch (caught) {
      setError(coachError(caught, language));
      saving.current = false;
      setPending(false);
    }
  }

  async function exportPlay(kind: "pdf" | "html") {
    if (download || !validate()) return;
    setDownload(kind);
    setError("");
    try {
      const { downloadCoachHtml, downloadCoachPdf } = await import("@/lib/coach/exports");
      if (kind === "pdf") await downloadCoachPdf(play);
      else await downloadCoachHtml(play);
      setMessage(t("Datei heruntergeladen.", "File downloaded."));
    } catch (caught) {
      setError(coachError(caught, language));
    } finally {
      setDownload(null);
    }
  }

  const modeControl = <div className={styles.editorModes} role="group" aria-label={t("Modus", "Mode")}>
    <button type="button" aria-pressed={!preview} aria-label={t("Bearbeiten", "Edit")} onClick={() => { if (preview) returnToEdit(); }}>
      <Pencil size={15} aria-hidden="true" /><span>{t("Bearbeiten", "Edit")}</span>
    </button>
    <button type="button" aria-pressed={preview} aria-label={t("Vorschau", "Preview")} onClick={() => { if (!preview) startPreview(); }}>
      <Eye size={16} aria-hidden="true" /><span>{t("Vorschau", "Preview")}</span>
    </button>
  </div>;

  return <div className={styles.studio} lang={language}>
    <StudioHeader languageSwitch={owner || member} inert={focus.active} back={owner || member ? { href: backHref, label: member && backHref === "/members" ? t("Mitgliederbereich", "Members") : "Playbook", onClick: (event) => {
      if (dirty && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setDialog("leave");
      }
    } } : undefined}>
      <IconButton className={styles.guideTrigger} icon={CircleHelp} label={t("So funktioniert’s", "How it works")} onClick={() => setDialog("guide")} />
      <div className={styles.historyButtons}>
        <IconButton icon={Undo2} label={t("Rückgängig", "Undo")} onClick={undo} disabled={!history.past.length || preview} />
        <IconButton icon={Redo2} label={t("Erneut anwenden", "Redo")} onClick={redo} disabled={!history.future.length || preview} />
      </div>
      <details className={styles.exportMenu} onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && event.currentTarget.open) {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}>
        <summary aria-label={t("Exportieren", "Export")} title={t("Exportieren", "Export")}>
          {download ? <LoaderCircle className={styles.spin} size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
          <span className={styles.headerActionText}>{t("Export", "Export")}</span><ChevronDown size={12} className={styles.headerActionText} aria-hidden="true" />
        </summary>
        <div className={styles.menuSheet}>
          <button type="button" disabled={Boolean(download)} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); void exportPlay("pdf"); }}><FileText size={17} aria-hidden="true" /> {t("PDF · Phasenblätter", "PDF · Phase sheets")}</button>
          <button type="button" disabled={Boolean(download)} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); void exportPlay("html"); }}><FileCode2 size={17} aria-hidden="true" /> {t("Interaktives HTML", "Interactive HTML")}</button>
        </div>
      </details>
      {owner && <Action icon={Share2} aria-label={t("Taktik teilen", "Share play")} onClick={() => setDialog("share")}><span className={styles.headerActionText}>{t("Teilen", "Share")}</span></Action>}
      {assignmentHref && <a className={`${styles.button} ${styles.secondary}`} href={assignmentHref} aria-label={t("Taktik zuweisen", "Assign play")}>
        <ClipboardList size={17} aria-hidden="true" /><span className={styles.headerActionText}>{t("Zuweisen", "Assign")}</span>
      </a>}
      <Action variant="primary" className={styles.saveButton} icon={pending ? LoaderCircle : Save} disabled={!dirty || pending || conflict} onClick={save}
        aria-label={pending ? t("Speichert …", "Saving …") : t("Speichern", "Save")}>
        <span className={styles.headerActionText}>{pending ? t("Speichert …", "Saving …") : t("Speichern", "Save")}</span>
      </Action>
    </StudioHeader>

    <main className={styles.editorMain}>
      <div className={styles.editorHeading} inert={focus.active}>
        <div className={styles.editorIdentity}>
          <div className={styles.editorMeta}>
            <span className={styles.category} data-category={play.category}>{categoryLabels[play.category][language]}</span>
            <span className={styles.savedState} data-dirty={dirty || undefined}>
              {dirty ? <i aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
              {pending ? t("Wird gespeichert", "Saving") : dirty ? t("Ungespeichert", "Unsaved") : t("Gespeichert", "Saved")}
            </span>
            {!owner && <span className={styles.collabState}><Pencil size={13} aria-hidden="true" />{t("Mitbearbeiten", "Collaborating")}</span>}
          </div>
          <h1 className={styles.visuallyHidden}>{t("Taktik bearbeiten", "Edit play")}</h1>
          <input className={styles.playName} ref={titleInput} lang={play.locale} aria-label={t("Name der Taktik", "Play name")} maxLength={100}
            value={play.title} placeholder={t("Name der Taktik", "Play name")} disabled={preview}
            onChange={(event) => updatePlay({ title: event.target.value }, "title")} onBlur={finishEdit} />
        </div>
        {modeControl}
      </div>
      {error && !focus.active && <div className={styles.editorAlert}>
        <p className={styles.error} role="alert">{error}</p>
        {conflict && <div><Action onClick={() => setDialog("reload")}>{t("Neueren Stand laden", "Load newer version")}</Action>
          {owner && <Action onClick={saveCopy} disabled={pending}>{t("Als Kopie speichern", "Save as a copy")}</Action>}</div>}
      </div>}
      <span className={styles.visuallyHidden} role="status">{message}</span>
      <div className={styles.editorGrid} ref={focus.surface} data-focus={focus.active || undefined} data-properties={focusInspector || undefined}
        role={focus.active ? "dialog" : undefined} aria-modal={focus.active || undefined}
        aria-label={focus.active ? t("Taktik im Vollbild", "Play in fullscreen") : undefined}>
        {focus.active && <div className={styles.focusHeader}>
          <div className={styles.focusIdentity}>
            <strong lang={play.locale} title={play.title}>{play.title || t("Neue Taktik", "New play")}</strong>
            <span>{pitchLabels[play.pitch][language]}</span>
          </div>
          <div className={styles.focusActions}>
            {modeControl}
            <IconButton icon={PanelRight} label={t("Eigenschaften", "Properties")} aria-expanded={focusInspector} onClick={() => setFocusInspector(!focusInspector)} />
            <IconButton icon={pending ? LoaderCircle : Save} label={pending ? t("Speichert …", "Saving …") : t("Speichern", "Save")}
              disabled={!dirty || pending || conflict} onClick={save} />
            <IconButton icon={Minimize2} label={t("Vollbild schließen", "Exit fullscreen")} ref={focus.exit} onClick={closeFocus} aria-keyshortcuts="Escape F" />
          </div>
        </div>}
        {focus.active && error && <p className={styles.focusError} role="alert">{error}</p>}
        <section className={styles.boardPanel} data-preview={preview || undefined} aria-label={t("Taktiktafel", "Tactics board")}>
          <CoachBoard play={play} phase={index} time={playback.time} previewing={preview} tool={tool} setTool={setTool}
            selectedId={selected?.id ?? null} select={choosePiece} changePiece={changePiece} deletePiece={deletePiece} togglePlayback={togglePlayback} />
          <CoachTransport play={play} playback={playback} index={displayed} onPlay={togglePlayback} onPhase={selectPhase}
            onFocus={(initiator) => { setFocusInspector(false); openFocus(initiator); }} onSeek={(time) => { setPreview(true); playback.seek(time); }} />
        </section>
        {preview ? <aside className={styles.viewerNotes} hidden={focus.active && !focusInspector}>
          <p className={styles.phasePosition}>{t("Phase ", "Phase ") + (displayed + 1) + " / " + play.frames.length}</p>
          <h2 lang={play.locale}>{displayedPhase.title}</h2>
          {displayedPhase.notes && <p lang={play.locale} className={styles.coachNotes}>{displayedPhase.notes}</p>}
          <PitchLegend locale={language} />
        </aside> : <CoachInspector hidden={focus.active && !focusInspector} play={play} index={index} tab={tab} chooseTab={setTab} piece={selected} select={choosePiece}
          updatePlay={updatePlay} updateFrame={updateFrame} updatePiece={updatePiece} finishEdit={finishEdit}
          deletePhase={deletePhase} movePhase={movePhase} deletePiece={deletePiece} duplicatePiece={duplicatePiece} copyPieceForward={copyForward} />}
        <CoachPhases play={play} current={displayed} select={selectPhase} add={addPhase} time={preview ? playback.time : undefined} />
      </div>
      <footer className={styles.editorFooter} inert={focus.active}><span>{pitchLabels[play.pitch][language]}</span>{!preview && <PitchLegend locale={language} />}</footer>
    </main>
    {dialog === "guide" && <CoachGuide locale={language} close={() => setDialog(null)} />}
    {dialog === "share" && owner && <CoachShare id={saved.id} locale={language} dirty={dirty} close={() => setDialog(null)} />}
    {dialog === "leave" && <CoachDialog locale={language} title={t("Taktik verlassen?", "Leave this play?")}
      intro={t("Du hast ungespeicherte Änderungen an dieser Taktik.", "This play has unsaved changes.")} close={() => setDialog(null)}>
      <div className={styles.dialogActions}>
        <Action onClick={() => setDialog(null)}>{t("Weiter bearbeiten", "Keep editing")}</Action>
        <Action variant="danger" onClick={() => { skippingGuard.current = true; window.location.assign(backHref); }}>{t("Änderungen verwerfen", "Discard changes")}</Action>
      </div>
    </CoachDialog>}
    {dialog === "reload" && <CoachDialog locale={language} title={t("Neueren Stand laden?", "Load the newer version?")}
      intro={t("Deine lokalen Änderungen werden dabei verworfen.", "This discards your local changes.")} close={() => { if (!pending) setDialog(null); }}>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.dialogActions}>
        <Action onClick={() => setDialog(null)} disabled={pending}>{t("Abbrechen", "Cancel")}</Action>
        <Action variant="primary" onClick={restore} disabled={pending}>{t("Neueren Stand laden", "Load newer version")}</Action>
      </div>
    </CoachDialog>}
    {owner && <CoachAssistantFab available={assistantAvailable} playId={saved.id} draft={play}
      phaseId={play.frames[index].id} onApply={applyAssistantPlay} hidden={focus.active} />}
  </div>;
}
