"use client";

import { Check, ChevronRight, LoaderCircle, MessageSquareText, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import type { CoachAssistantResult } from "@/lib/coach/assistant";
import type { CoachPlay } from "@/lib/coach/model";
import { renderCoachBoard } from "@/lib/coach/scene";
import styles from "./coach-assistant.module.css";

interface CoachAssistantFabProps {
  available: boolean;
  playId?: string;
  draft?: CoachPlay;
  phaseId?: string;
  onApply: (next: CoachPlay, captured?: CoachPlay) => boolean | Promise<boolean>;
  hidden?: boolean;
}

export function CoachAssistantFab({ available, playId, draft, phaseId, onApply, hidden = false }: CoachAssistantFabProps) {
  const { language, t } = useAdminLanguage(draft?.locale);
  const en = language === "en";
  const copy = (de: string, english: string) => en ? english : de;
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const request = useRef<AbortController | null>(null);
  const captured = useRef<CoachPlay | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [proposal, setProposal] = useState<CoachAssistantResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const name = copy("KI-Assistent", "AI Assistant");
  const needsSetup = copy("Richte zuerst in den Einstellungen einen KI-Anbieter ein.", "Set up an AI provider in Settings first.");

  useEffect(() => {
    const node = dialog.current;
    if (!open || !node || node.open) return;
    node.showModal();
    input.current?.focus();
  }, [open]);

  useEffect(() => () => request.current?.abort(), []);

  function close() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!available || request.current || message.trim().length < 3) return;
    const controller = new AbortController();
    request.current = controller;
    captured.current = draft;
    setBusy(true);
    setError("");
    setNotice("");
    setProposal(null);
    try {
      const response = await fetch("/api/coach/assistant", {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, language, playId, phaseId, draft }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.result) throw new Error(payload.error || copy("Der Assistent ist gerade nicht erreichbar.", "The assistant is temporarily unavailable."));
      if (!controller.signal.aborted) setProposal(payload.result);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? t(reason.message) : copy("Die Anfrage konnte nicht abgeschlossen werden.", "The request could not be completed."));
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  async function apply() {
    if (!proposal?.play || applying) return;
    setApplying(true);
    setError("");
    try {
      if (!await onApply(proposal.play, captured.current)) {
        setError(copy("Die Taktik hat sich inzwischen geändert. Erstelle einen neuen Vorschlag.", "The play has changed. Generate a new suggestion."));
        return;
      }
      setProposal(null);
      setNotice(copy("Vorschlag im Entwurf übernommen.", "Suggestion applied to the draft."));
    } catch (reason) {
      setError(reason instanceof Error ? t(reason.message) : copy("Die Taktik konnte nicht übernommen werden.", "The play could not be applied."));
    } finally {
      setApplying(false);
    }
  }

  const examples = draft
    ? [copy("Pass in dieser Phase schneller machen", "Make the pass quicker in this phase"), copy("Eine nächste Phase ergänzen", "Add a follow-up phase")]
    : [copy("Eine Taktik für 3 gegen 2 anlegen", "Create a 3 v 2 play"), copy("Einen Kick-Drill planen", "Plan a kicking drill")];

  return <>
    {!hidden && <div className={styles.launcher}>
      <button ref={trigger} type="button" className={styles.fab}
        aria-disabled={!available} aria-haspopup={available ? "dialog" : undefined}
        aria-describedby={available ? undefined : id + "-setup"}
        aria-label={name} onClick={() => { if (available) setOpen(true); }}>
        <MessageSquareText size={21} aria-hidden="true" /><span>{name}</span>
      </button>
      {!available && <span role="tooltip" id={id + "-setup"} className={styles.tooltip}>{needsSetup}</span>}
    </div>}
    {open && <dialog ref={dialog} className={styles.dialog} aria-labelledby={id + "-title"}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <span className={styles.mark}><MessageSquareText size={20} aria-hidden="true" /></span>
          <div><h2 id={id + "-title"}>{copy("Coach-Assistent", "Coach assistant")}</h2>
          <p>{draft ? draft.title : copy("Neue Taktik", "New play")}</p></div>
          <button type="button" className={styles.close} onClick={close} aria-label={copy("Schließen", "Close")}><X size={18} aria-hidden="true" /></button>
        </header>
        <p className={styles.intro}>{draft
          ? copy("Frag zu deiner Taktik oder lass dir Änderungen am aktuellen Entwurf vorschlagen.", "Ask about your play or request changes to the current draft.")
          : copy("Beschreibe den Drill. Der Assistent entwirft Feldaufbau, Phasen und Coaching-Notizen.", "Describe the drill. The assistant drafts the set-up, phases and coaching notes.")}</p>
        <form className={styles.form} onSubmit={submit}>
          <label htmlFor={id + "-message"}>{copy("Deine Anfrage", "Your request")}</label>
          <textarea id={id + "-message"} ref={input} value={message} onChange={event => setMessage(event.target.value)}
            rows={3} maxLength={1200} placeholder={copy("Was möchtest du vorbereiten?", "What would you like to prepare?")} />
          <div className={styles.examples}>{examples.map(example => <button type="button" key={example}
            onClick={() => { setMessage(example); input.current?.focus(); }}>{example}</button>)}</div>
          <button type="submit" className={styles.action} disabled={busy || applying || message.trim().length < 3}>
            {busy ? <LoaderCircle className={styles.spin} size={16} /> : <Send size={16} />}
            {busy ? copy("Wird vorbereitet …", "Preparing …") : copy("Vorschlag erstellen", "Generate suggestion")}
          </button>
        </form>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {notice && <p role="status" className={styles.notice}><Check size={16} />{notice}</p>}
        {proposal && <section className={styles.result} aria-label={copy("Vorschlag", "Suggestion")}>
          <p>{proposal.reply}</p>
          {proposal.play && <>
            <div className={styles.snapshot} dangerouslySetInnerHTML={{ __html: renderCoachBoard(proposal.play, 0, {
              frameIndex: 0, locale: language, sceneKey: id + "-assistant-preview",
            }) }} />
            <p className={styles.details}>{proposal.changeCount} {copy("Änderungen", "changes")} · {proposal.play.frames.length} {copy("Phasen", "phases")}</p>
            <button type="button" className={styles.action} disabled={applying} onClick={() => void apply()}>
              <ChevronRight size={17} />{draft ? copy("In Entwurf übernehmen", "Apply to draft") : copy("Im Editor öffnen", "Open in editor")}
            </button>
          </>}
        </section>}
      </div>
    </dialog>}
  </>;
}
