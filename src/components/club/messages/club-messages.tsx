"use client";

import {
  ArrowLeft, Check, CircleAlert, Inbox, LoaderCircle, Mail, MailOpen, RefreshCw, Reply, Send, SquarePen, UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ClubMessage, ClubMessageChoices, ClubMessagePage } from "@/lib/club/messages-model";
import { ClubMessageCompose } from "./club-message-compose";
import {
  initials, messageName, messageRequest, requestProblem, type MailboxTab, type MessageLanguage, type MessageText,
} from "./club-messages-data";
import styles from "./club-messages.module.css";

type Props = { owner: boolean; actorId: string; language: MessageLanguage };
type MailboxState = {
  messages: ClubMessage[];
  nextBefore?: string;
  status: "idle" | "loading" | "ready" | "failed";
  loadingMore: boolean;
  error?: unknown;
};
type ReadChange = { version: number; read: boolean };

const emptyMailbox: MailboxState = { messages: [], status: "idle", loadingMore: false };

function timestamp(value: string, language: MessageLanguage, full = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const sameDay = new Date().toDateString() === date.toDateString();
  const options: Intl.DateTimeFormatOptions = full ? { dateStyle: "long", timeStyle: "short" }
    : sameDay ? { timeStyle: "short" } : { day: "numeric", month: "short" };
  return new Intl.DateTimeFormat(language, options).format(date);
}

function hasRecipients(choices: ClubMessageChoices | undefined) {
  return Boolean(choices && (choices.people.length || choices.teams.length || choices.roles.length || choices.club));
}

export function ClubMessages(props: Props) {
  return <Mailbox key={(props.owner ? "cms/" : "member/") + props.actorId} {...props} />;
}

function Mailbox({ owner, language }: Props) {
  const t: MessageText = (de, en) => language === "de" ? de : en;
  const [tab, setTab] = useState<MailboxTab>("inbox");
  const [boxes, setBoxes] = useState<Record<MailboxTab, MailboxState>>({ inbox: emptyMailbox, sent: emptyMailbox });
  const [choices, setChoices] = useState<ClubMessageChoices>();
  const [selectedId, setSelectedId] = useState<string>();
  const [compose, setCompose] = useState<{ reply?: ClubMessage } | null>(null);
  const [notice, setNotice] = useState<"sent" | "read-error">();
  const [marking, setMarking] = useState<string[]>([]);
  const requests = useRef<Partial<Record<MailboxTab, AbortController>>>({});
  const readRequests = useRef(new Map<string, AbortController>());
  const readChanges = useRef(new Map<string, ReadChange>());
  const version = useRef(0);
  const readingHeading = useRef<HTMLHeadingElement>(null);
  const rowPrefix = useId();
  const box = boxes[tab];
  const selected = box.messages.find(message => message.id === selectedId);
  const unread = boxes.inbox.messages.filter(message => !message.read).length;
  const canCompose = hasRecipients(choices);
  const loading = box.status === "loading" || box.status === "idle";
  const busy = loading || box.loadingMore;

  const loadPage = useCallback(async (mailbox: MailboxTab, before?: string) => {
    requests.current[mailbox]?.abort();
    const controller = new AbortController();
    requests.current[mailbox] = controller;
    const startedAt = version.current;
    setBoxes(current => ({
      ...current,
      [mailbox]: { ...current[mailbox], status: before ? "ready" : "loading", loadingMore: !!before, error: undefined },
    }));
    const search = new URLSearchParams({ tab: mailbox });
    if (before) search.set("before", before);
    try {
      const page = await messageRequest<ClubMessagePage>("?" + search, owner, language, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setChoices(page.choices);
      setBoxes(current => {
        const entries = page.messages.map(message => {
          const changed = readChanges.current.get(message.id);
          return mailbox === "inbox" && changed && changed.version > startedAt ? { ...message, read: changed.read } : message;
        });
        const prior = before ? current[mailbox].messages : [];
        const ids = new Set(prior.map(message => message.id));
        return {
          ...current,
          [mailbox]: { messages: [...prior, ...entries.filter(message => !ids.has(message.id))], nextBefore: page.nextBefore, status: "ready", loadingMore: false },
        };
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setBoxes(current => ({
        ...current,
        [mailbox]: { ...current[mailbox], status: "failed", loadingMore: false, error },
      }));
    } finally {
      if (requests.current[mailbox] === controller) delete requests.current[mailbox];
    }
  }, [owner, language]);

  useEffect(() => {
    void loadPage(tab);
    return () => requests.current[tab]?.abort();
  }, [loadPage, tab]);

  useEffect(() => {
    const active = readRequests.current;
    return () => {
      for (const request of active.values()) request.abort();
      active.clear();
    };
  }, []);

  useEffect(() => {
    if (selected?.id) readingHeading.current?.focus({ preventScroll: true });
  }, [selected?.id]);

  async function mark(message: ClubMessage, read: boolean) {
    if (message.sent || message.read === read || readRequests.current.has(message.id)) return;
    const controller = new AbortController();
    readRequests.current.set(message.id, controller);
    setMarking(current => [...current, message.id]);
    setNotice(current => current === "read-error" ? undefined : current);
    try {
      await messageRequest<{ ok: true }>("/" + encodeURIComponent(message.id), owner, language, {
        method: "PATCH", body: JSON.stringify({ read }), signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      readChanges.current.set(message.id, { version: ++version.current, read });
      setBoxes(current => ({
        ...current,
        inbox: { ...current.inbox, messages: current.inbox.messages.map(entry => entry.id === message.id ? { ...entry, read } : entry) },
      }));
    } catch {
      if (!controller.signal.aborted) setNotice("read-error");
    } finally {
      if (readRequests.current.get(message.id) === controller) {
        readRequests.current.delete(message.id);
        setMarking(current => current.filter(id => id !== message.id));
      }
    }
  }

  function select(message: ClubMessage) {
    if (selectedId === message.id) return;
    setSelectedId(message.id);
    if (tab === "inbox") void mark(message, true);
  }

  function backToList() {
    const rowId = rowPrefix + selectedId;
    setSelectedId(undefined);
    requestAnimationFrame(() => document.getElementById(rowId)?.focus());
  }

  function switchTab(mailbox: MailboxTab) {
    if (mailbox === tab) return;
    setTab(mailbox);
    setSelectedId(undefined);
    setNotice(undefined);
  }

  function sent(message: ClubMessage) {
    setBoxes(current => ({
      ...current,
      sent: { ...current.sent, status: "ready", messages: [message, ...current.sent.messages.filter(entry => entry.id !== message.id)] },
    }));
    setCompose(null);
    setTab("sent");
    setSelectedId(message.id);
    setNotice("sent");
    if (tab === "sent") void loadPage("sent");
  }

  const selectedName = selected && messageName(selected.senderId, selected.senderName, t);
  const unreadLabel = t(
    unread === 1 ? "1 ungelesene Nachricht in der Liste" : unread + " ungelesene Nachrichten in der Liste",
    unread === 1 ? "1 unread message in the list" : unread + " unread messages in the list",
  );
  const loadError = t("Das Postfach konnte nicht geladen werden.", "The mailbox couldn’t be loaded.");
  const markLabel = selected?.read ? t("Als ungelesen markieren", "Mark unread") : t("Als gelesen markieren", "Mark read");
  const empty = !box.messages.length;
  const Folder = tab === "inbox" ? Inbox : Send;

  return <section className={styles.messages} aria-label={t("Vereinspostfach", "Club mailbox")} lang={language}>
    <div className={styles.toolbar}>
      <div className={styles.folders} role="group" aria-label={t("Ordner", "Folders")}>
        <button type="button" aria-pressed={tab === "inbox"} onClick={() => switchTab("inbox")}>
          <Inbox size={17} aria-hidden="true" />{t("Eingang", "Inbox")}
          {unread > 0 && <span className={styles.unreadBadge} aria-label={unreadLabel} title={unreadLabel}>{unread}</span>}
        </button>
        <button type="button" aria-pressed={tab === "sent"} onClick={() => switchTab("sent")}>
          <Send size={15} aria-hidden="true" />{t("Gesendet", "Sent")}
        </button>
      </div>
      <div className={styles.toolbarActions}>
        <button type="button" className={styles.refresh} aria-label={t("Postfach aktualisieren", "Refresh mailbox")}
          title={t("Postfach aktualisieren", "Refresh mailbox")} disabled={busy} onClick={() => void loadPage(tab)}>
          <RefreshCw size={17} className={loading ? styles.spin : undefined} aria-hidden="true" />
        </button>
        <button type="button" className={styles.primary} disabled={!canCompose} onClick={() => setCompose({})}>
          <SquarePen size={17} aria-hidden="true" /><span>{t("Schreiben", "Compose")}</span>
        </button>
      </div>
    </div>

    {notice && <div className={notice === "sent" ? styles.success : styles.error} role={notice === "sent" ? "status" : "alert"}>
      {notice === "sent" ? <Check size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
      <span>{notice === "sent" ? t("Nachricht gesendet.", "Message sent.")
        : t("Der Lesestatus konnte nicht gespeichert werden.", "The read status couldn’t be saved.")}</span>
    </div>}
    {!empty && box.status === "failed" && <p className={styles.error} role="alert">
      <CircleAlert size={18} aria-hidden="true" /><span>{requestProblem(box.error, t, loadError)}</span>
    </p>}

    <div className={styles.split} data-empty={empty || undefined} data-reading={!!selected || undefined}>
      <section className={styles.listPane} aria-label={tab === "inbox" ? t("Posteingang", "Inbox messages") : t("Gesendete Nachrichten", "Sent messages")}>
        {empty ? <div className={styles.empty}>
          <span className={styles.emptyIcon}><Folder size={28} strokeWidth={1.6} aria-hidden="true" /></span>
          {loading ? <div role="status"><strong>{t("Postfach wird geladen …", "Loading mailbox…")}</strong></div>
            : box.status === "failed" ? <>
              <div role="alert"><strong>{requestProblem(box.error, t, loadError)}</strong></div>
              <button type="button" className={styles.button} onClick={() => void loadPage(tab)}>{t("Erneut versuchen", "Try again")}</button>
            </> : <div>
              <strong>{tab === "inbox" ? t("Dein Posteingang ist leer", "Your inbox is empty") : t("Noch keine gesendeten Nachrichten", "No sent messages yet")}</strong>
              <p>{tab === "inbox" ? t("Nachrichten aus deinem Verein erscheinen hier.", "Messages from your club appear here.")
                : t("Hier findest du die Nachrichten, die du verschickt hast.", "Messages you send appear here.")}</p>
            </div>}
        </div> : <>
          <ul className={styles.list}>
            {box.messages.map(message => {
              const name = tab === "inbox" ? messageName(message.senderId, message.senderName, t) : message.audienceLabel;
              const isUnread = tab === "inbox" && !message.read;
              return <li key={message.id}>
                <button type="button" id={rowPrefix + message.id} className={styles.row}
                  aria-current={selectedId === message.id || undefined} data-unread={isUnread || undefined}
                  onClick={() => select(message)}>
                  <span className={styles.avatar} aria-hidden="true">{initials(name)}</span>
                  <span className={styles.rowText}>
                    <span className={styles.rowMeta}>
                      <strong>{name}</strong>
                      <time dateTime={message.createdAt}>{timestamp(message.createdAt, language)}</time>
                    </span>
                    <span className={styles.rowSubject}>{isUnread && <span className={styles.sr}>{t("Ungelesen. ", "Unread. ")}</span>}{message.subject}</span>
                    <span className={styles.preview}>{message.body}</span>
                  </span>
                  {isUnread && <span className={styles.unreadDot} aria-hidden="true" />}
                </button>
              </li>;
            })}
          </ul>
          {box.nextBefore && <div className={styles.listFooter}>
            <button type="button" className={styles.button} disabled={busy} onClick={() => void loadPage(tab, box.nextBefore)}>
              {box.loadingMore && <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />}
              {t("Ältere Nachrichten laden", "Load older messages")}
            </button>
          </div>}
        </>}
      </section>

      {!empty && <div className={styles.readPane}>
        {selected ? <article className={styles.reader}>
          <div className={styles.readerTools}>
            <button type="button" className={styles.mobileBack} onClick={backToList}
              aria-label={tab === "inbox" ? t("Zurück zum Posteingang", "Back to Inbox") : t("Zurück zu Gesendet", "Back to Sent")}>
              <ArrowLeft size={17} aria-hidden="true" />{tab === "inbox" ? t("Eingang", "Inbox") : t("Gesendet", "Sent")}
            </button>
            <span className={styles.readerFolder}><Folder size={16} aria-hidden="true" />{tab === "inbox" ? t("Eingang", "Inbox") : t("Gesendet", "Sent")}</span>
            {tab === "inbox" && <button type="button" className={styles.iconButton} disabled={marking.includes(selected.id)}
              aria-label={markLabel} title={markLabel} onClick={() => void mark(selected, !selected.read)}>
              {selected.read ? <Mail size={18} aria-hidden="true" /> : <MailOpen size={18} aria-hidden="true" />}
            </button>}
          </div>
          <div className={styles.readerContent}>
            <h2 ref={readingHeading} tabIndex={-1}>{selected.subject}</h2>
            <div className={styles.from}>
              <span className={styles.avatar} aria-hidden="true">{initials(tab === "inbox" ? selectedName ?? "" : selected.audienceLabel)}</span>
              <div>
                <strong>{tab === "inbox" ? selectedName : t("An ", "To ") + selected.audienceLabel}</strong>
                <div className={styles.readerMeta}>
                  <time dateTime={selected.createdAt}>{timestamp(selected.createdAt, language, true)}</time>
                  {tab === "inbox" && <span>{t("An ", "To ") + selected.audienceLabel}</span>}
                </div>
              </div>
              {tab === "sent" && selected.recipientCount !== undefined && <span className={styles.recipientCount}>
                <UsersRound size={15} aria-hidden="true" />
                {selected.recipientCount === 1 ? t("1 Empfänger", "1 recipient") : selected.recipientCount + t(" Empfänger", " recipients")}
              </span>}
            </div>
            <p className={styles.messageBody}>{selected.body}</p>
            {selected.replyToPerson && <button type="button" className={styles.button} onClick={() => setCompose({ reply: selected })}>
              <Reply size={17} aria-hidden="true" />{tab === "inbox" ? t("Antworten", "Reply") : t("Nachfassen", "Follow up")}
            </button>}
          </div>
        </article> : <div className={styles.empty}>
          <span className={styles.emptyIcon}><MailOpen size={28} strokeWidth={1.6} aria-hidden="true" /></span>
          <strong>{t("Wähle eine Nachricht", "Choose a message")}</strong>
        </div>}
      </div>}
    </div>

    {compose && <ClubMessageCompose choices={choices} owner={owner} language={language} reply={compose.reply}
      onClose={() => setCompose(null)} onSent={sent} />}
  </section>;
}
