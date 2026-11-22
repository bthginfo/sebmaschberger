"use client";

import { ArrowLeft, Building2, ChevronRight, ChevronsUpDown, CircleAlert, LoaderCircle, Search, Send, Shield, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { ClubMessage, ClubMessageChoices } from "@/lib/club/messages-model";
import {
  audienceOptions, bodyLimit, ClubMessageRequestError, initials, messageName, messageRequest, replySubject, requestProblem, subjectLimit,
  type AudienceKind, type AudienceOption, type MessageLanguage, type MessageText,
} from "./club-messages-data";
import styles from "./club-messages.module.css";

const audienceKinds = [
  { kind: "person", icon: UserRound, de: "Person", en: "Person" },
  { kind: "team", icon: UsersRound, de: "Team", en: "Team" },
  { kind: "role", icon: Shield, de: "Rolle", en: "Role" },
  { kind: "club", icon: Building2, de: "Verein", en: "Club" },
] as const;

type ComposeStep = "write" | "review" | "discard";

export function ClubMessageCompose({ choices, language, owner, reply, onClose, onSent }: {
  choices?: ClubMessageChoices;
  language: MessageLanguage;
  owner: boolean;
  reply?: ClubMessage;
  onClose: () => void;
  onSent: (message: ClubMessage) => void;
}) {
  const t: MessageText = (de, en) => language === "de" ? de : en;
  const options = useMemo(() => audienceOptions(choices, (de, en) => language === "de" ? de : en), [choices, language]);
  const availableKinds = audienceKinds.filter(entry => options[entry.kind].length > 0);
  const [preferredKind, setKind] = useState<AudienceKind>(() => availableKinds[0]?.kind ?? "person");
  const kind = options[preferredKind].length ? preferredKind : availableKinds[0]?.kind ?? "person";
  const [optionKey, setOptionKey] = useState("");
  const [search, setSearch] = useState("");
  const initialSubject = reply ? replySubject(reply.subject) : "";
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");
  const [step, setStep] = useState<ComposeStep>("write");
  const [problem, setProblem] = useState("");
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const audienceControls = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const scopeName = useId();
  const recipientName = useId();
  const recipientScrollHint = useId();
  const subjectId = useId();
  const bodyId = useId();
  const dirty = subject !== initialSubject || body.length > 0;
  const target = reply?.replyToPerson;
  const selected: AudienceOption | undefined = target
    ? { key: target.id, name: messageName(target.id, target.name, t), audience: { kind: "person", id: target.id } }
    : options[kind].find(option => option.key === (kind === "club" ? "club" : kind === preferredKind ? optionKey : ""));
  const recipients = options[kind].filter(option => option.name.toLocaleLowerCase(language).includes(search.trim().toLocaleLowerCase(language)));
  const scrollableRecipients = recipients.length > 3;
  const group = selected && selected.audience.kind !== "person";
  const reviewKind = group ? audienceKinds.find(entry => entry.kind === selected.audience.kind) : undefined;
  const ReviewIcon = reviewKind?.icon ?? UsersRound;
  const title = step === "review" ? t("Versand prüfen", "Review message")
    : step === "discard" ? t("Entwurf verwerfen?", "Discard draft?")
    : reply ? t("Antwort schreiben", "Write a reply") : t("Neue Nachricht", "New message");

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (step === "write" && reply) subjectInput.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
  }, [step, reply]);

  function requestClose() {
    if (inFlight.current) return;
    setProblem("");
    if (step === "discard" || step === "review") setStep("write");
    else if (dirty) setStep("discard");
    else onClose();
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || step === "discard") return;
    setProblem("");
    if (!selected) {
      setProblem(t("Wähle aus, wer die Nachricht erhalten soll.", "Choose who should receive the message."));
      if (step === "review") setStep("write");
      else audienceControls.current?.focus();
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setProblem(t("Gib einen Betreff und eine Nachricht ein.", "Enter a subject and a message."));
      subjectInput.current?.focus();
      return;
    }
    if (group && step !== "review") {
      setStep("review");
      return;
    }
    inFlight.current = true;
    setSending(true);
    try {
      const { message } = await messageRequest<{ message: ClubMessage }>("", owner, language, {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), audience: selected.audience, replyTo: reply?.id }),
      });
      onSent(message);
    } catch (error) {
      const fallback = group && error instanceof ClubMessageRequestError && error.status === 400
        ? t("In dieser Gruppe sind derzeit keine aktiven Empfänger.", "There are currently no active recipients in this group.")
        : t("Der Versand konnte nicht bestätigt werden. Prüfe „Gesendet“, bevor du es erneut versuchst.", "Sending couldn’t be confirmed. Check Sent before trying again.");
      setProblem(requestProblem(error, t, fallback));
      inFlight.current = false;
      setSending(false);
    }
  }

  return <dialog ref={dialog} className={styles.composer} aria-labelledby={titleId} lang={language}
    onCancel={event => { event.preventDefault(); requestClose(); }}>
    <form onSubmit={send}>
      <header className={styles.composeHeader}>
        <div>
          <h2 ref={heading} id={titleId} tabIndex={-1}>{title}</h2>
          {step === "write" && <p>{t("Nachrichten im Mitgliederbereich.", "Messages stay in the member portal.")}</p>}
        </div>
        <button type="button" className={styles.iconButton} onClick={requestClose} disabled={sending}
          aria-label={step === "write" ? t("Schließen", "Close") : t("Zurück zum Entwurf", "Back to draft")}>
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.composeBody}>
        {step === "write" && <>
          <fieldset className={styles.audience}>
            <legend>{t("Empfänger", "To")}</legend>
            {target && selected ? <div className={styles.fixedRecipient}>
              <span className={styles.avatar} aria-hidden="true">{initials(selected.name)}</span>
              <strong>{selected.name}</strong>
            </div> : <div ref={audienceControls} className={styles.audienceControls} tabIndex={-1}>
              {availableKinds.length ? <>
                {availableKinds.length > 1 && <div className={styles.audienceKinds} role="group" aria-label={t("Empfängerkreis", "Recipient type")}>
                  {availableKinds.map(({ kind: value, icon: Icon, de, en }) => <label className={styles.audienceKind} key={value}>
                    <input type="radio" name={scopeName} checked={kind === value} onChange={() => { setKind(value); setOptionKey(""); setSearch(""); setProblem(""); }} />
                    <span><Icon size={17} aria-hidden="true" />{t(de, en)}</span>
                  </label>)}
                </div>}
                {kind === "club" && selected ? <div className={styles.fixedRecipient}><Building2 size={19} aria-hidden="true" /><strong>{selected.name}</strong></div>
                  : <>
                    {options[kind].length >= 5 && <label className={styles.recipientSearch}>
                      <Search size={16} aria-hidden="true" />
                      <input type="search" value={search} onChange={event => setSearch(event.target.value)}
                        aria-label={t("Empfänger suchen", "Find a recipient")} placeholder={t("Empfänger suchen …", "Find a recipient…")} />
                    </label>}
                    {selected && !recipients.some(recipient => recipient.key === selected.key) &&
                      <p className={styles.currentRecipient}>{t("Ausgewählt", "Selected")} <strong>{selected.name}</strong></p>}
                    <div className={styles.recipientList} role="group" aria-label={t("Verfügbare Empfänger", "Available recipients")}
                      tabIndex={scrollableRecipients ? 0 : undefined} aria-describedby={scrollableRecipients ? recipientScrollHint : undefined}>
                      {recipients.map(recipient => <label className={styles.recipient} key={recipient.key}>
                        <input type="radio" name={recipientName} checked={optionKey === recipient.key}
                          onChange={() => { setOptionKey(recipient.key); setProblem(""); }} />
                        <span>{recipient.name}</span>
                      </label>)}
                      {!recipients.length && <p>{t("Keine passenden Empfänger.", "No matching recipients.")}</p>}
                    </div>
                    {scrollableRecipients && <small id={recipientScrollHint} className={styles.recipientScrollHint}>
                      <ChevronsUpDown size={13} aria-hidden="true" />{t("Für weitere Empfänger scrollen", "Scroll for more recipients")}
                    </small>}
                  </>}
              </> : <p className={styles.composeHint}>{t("Derzeit sind keine Empfänger verfügbar.", "There are no recipients available.")}</p>}
            </div>}
          </fieldset>

          <label className={styles.field} htmlFor={subjectId}>
            <span>{t("Betreff", "Subject")}</span>
            <input ref={subjectInput} id={subjectId} value={subject} maxLength={subjectLimit} required
              placeholder={t("Worum geht es?", "What’s it about?")} onChange={event => setSubject(event.target.value)} />
          </label>
          <label className={styles.field} htmlFor={bodyId}>
            <span>{t("Nachricht", "Message")}</span>
            <textarea id={bodyId} value={body} maxLength={bodyLimit} required rows={5}
              placeholder={t("Schreib deine Nachricht …", "Write your message…")} onChange={event => setBody(event.target.value)} />
            <small aria-hidden="true">{body.length.toLocaleString(language)} / {bodyLimit.toLocaleString(language)}</small>
          </label>
        </>}

        {step === "review" && selected && <div className={styles.review}>
          <div className={styles.reviewAudience}>
            <span className={styles.reviewIcon}><ReviewIcon size={21} aria-hidden="true" /></span>
            <div>
              <span>{reviewKind ? t("Gruppennachricht · ", "Group message · ") + t(reviewKind.de, reviewKind.en) : t("Gruppennachricht an", "Group message to")}</span>
              <strong>{selected.name}</strong>
            </div>
          </div>
          <div className={styles.reviewContent}>
            <h3>{subject.trim()}</h3>
            <p>{body.trim()}</p>
          </div>
        </div>}

        {step === "discard" && <p className={styles.discardText}>
          {t("Betreff und Nachricht werden gelöscht.", "The subject and message will be discarded.")}
        </p>}
        {problem && <p role="alert" className={styles.error}><CircleAlert size={17} aria-hidden="true" /><span>{problem}</span></p>}
      </div>

      <footer className={styles.composeFooter}>
        {step === "write" ? <>
          <button type="button" className={styles.button} onClick={requestClose} disabled={sending}>{t("Abbrechen", "Cancel")}</button>
          <button type="submit" className={styles.primary} disabled={sending || !selected && !availableKinds.length}>
            {sending ? <LoaderCircle size={17} className={styles.spin} aria-hidden="true" />
              : group ? <ChevronRight size={17} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            {sending ? t("Wird gesendet …", "Sending…") : group ? t("Versand prüfen", "Review message") : t("Senden", "Send")}
          </button>
        </> : step === "review" ? <>
          <button type="button" className={styles.button} onClick={requestClose} disabled={sending}>
            <ArrowLeft size={16} aria-hidden="true" />{t("Bearbeiten", "Edit")}
          </button>
          <button type="submit" className={styles.primary} disabled={sending}>
            {sending ? <LoaderCircle size={17} className={styles.spin} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            {sending ? t("Wird gesendet …", "Sending…") : t("An Gruppe senden", "Send to group")}
          </button>
        </> : <>
          <button type="button" className={styles.button} onClick={requestClose}>{t("Weiterschreiben", "Keep writing")}</button>
          <button type="button" className={styles.danger} onClick={onClose}>{t("Verwerfen", "Discard")}</button>
        </>}
      </footer>
    </form>
  </dialog>;
}
