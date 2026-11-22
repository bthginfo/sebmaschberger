"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, CalendarDays, Check, LoaderCircle } from "lucide-react";
import { validReservationDate, type ReservationLayout } from "@/lib/reservations/model";
import type { SiteLanguage } from "@/lib/types";
import styles from "./reservation-widget.module.css";

type EnabledConfig = { enabled: true; minDate: string; maxDate: string; maxParty: number };
type Config = EnabledConfig | { enabled: false };
type Confirmation = { party: number; date: string; time: string };
type AvailableTimes = { key: string; slots: string[]; error?: boolean };

const endpoint = "/api/reservations";
const previewConfig: EnabledConfig = { enabled: true, minDate: "", maxDate: "", maxParty: 6 };
const previewTimes = ["17:30", "18:00", "18:30"];

const copy = {
  de: {
    party: "Personen",
    date: "Datum",
    time: "Uhrzeit",
    name: "Dein Name",
    email: "E-Mail-Adresse",
    note: "Anmerkung (optional)",
    person: "Person",
    selectDate: "Wähle zuerst ein Datum aus.",
    noTimes: "Für diesen Tag sind keine Zeiten verfügbar. Wähle gern einen anderen Tag.",
    loading: "Verfügbarkeit wird geprüft …",
    setupError: "Tischanfragen konnten gerade nicht geladen werden.",
    timesError: "Die Uhrzeiten konnten gerade nicht geladen werden.",
    disabled: "Online sind gerade keine Tischanfragen möglich.",
    retry: "Erneut versuchen",
    submit: "Tisch anfragen",
    submitting: "Anfrage wird gesendet …",
    failed: "Die Anfrage konnte gerade nicht gesendet werden. Versuche es bitte erneut.",
    conflict: "Diese Uhrzeit ist gerade vergeben worden. Wähle eine andere Zeit.",
    success: "Deine Anfrage ist angekommen.",
    pending: "Wir prüfen deine Anfrage. Dein Tisch ist reserviert, sobald du eine Bestätigung erhalten hast.",
    newRequest: "Weitere Anfrage",
    privacy: "Datenschutz",
    privacyText: "Wir verwenden deine Angaben, um deine Tischanfrage zu bearbeiten.",
  },
  en: {
    party: "Guests",
    date: "Date",
    time: "Time",
    name: "Your name",
    email: "Email address",
    note: "Note (optional)",
    person: "Guest",
    selectDate: "Choose a date to see available times.",
    noTimes: "There are no times available on this date. Please try another day.",
    loading: "Checking availability …",
    setupError: "Reservation requests could not be loaded.",
    timesError: "Available times could not be loaded.",
    disabled: "Online reservation requests are currently unavailable.",
    retry: "Try again",
    submit: "Request a table",
    submitting: "Sending request …",
    failed: "Your request could not be sent. Please try again.",
    conflict: "That time has just been taken. Please choose another time.",
    success: "We received your request.",
    pending: "We’ll review your request. Your table is reserved once you receive a confirmation.",
    newRequest: "Make another request",
    privacy: "Privacy",
    privacyText: "We use your details to process your reservation request.",
  },
};

function validConfig(value: unknown): value is Config {
  if (!value || typeof value !== "object" || !("enabled" in value)) return false;
  if (value.enabled === false) return true;
  return value.enabled === true
    && "minDate" in value && typeof value.minDate === "string" && validReservationDate(value.minDate)
    && "maxDate" in value && typeof value.maxDate === "string" && validReservationDate(value.maxDate)
    && "maxParty" in value && Number.isInteger(value.maxParty)
    && Number(value.maxParty) >= 1 && Number(value.maxParty) <= 24;
}

export function ReservationWidget({ layout, language, editable = false }: {
  layout: ReservationLayout; language: SiteLanguage; editable?: boolean;
}) {
  const labels = copy[language];
  const id = useId();
  const [config, setConfig] = useState<Config | "error" | null>(null);
  const [configRetry, setConfigRetry] = useState(0);
  const [slotRetry, setSlotRetry] = useState(0);
  const [availability, setAvailability] = useState<AvailableTimes>();
  const [party, setParty] = useState(2);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const request = useRef<{ key: string; id: string }>(null);
  const sendingRef = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);

  const currentConfig = editable ? previewConfig : config;
  const configReady = currentConfig !== null && currentConfig !== "error" && currentConfig.enabled;
  const validDate = configReady && date >= currentConfig.minDate && date <= currentConfig.maxDate && validReservationDate(date);
  const queryKey = `${date}:${party}:${slotRetry}`;
  const currentTimes = availability?.key === queryKey ? availability : undefined;
  const slots = editable ? previewTimes : currentTimes?.slots ?? [];

  useEffect(() => {
    if (editable) return;
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        const payload: unknown = await response.json();
        if (!validConfig(payload)) throw new Error();
        if (controller.signal.aborted) return;
        setConfig(payload);
        if (payload.enabled) setParty(current => Math.min(current, payload.maxParty));
      })
      .catch(() => { if (!controller.signal.aborted) setConfig("error"); });
    return () => controller.abort();
  }, [editable, configRetry]);

  useEffect(() => {
    if (editable || !validDate || confirmation) return;
    const controller = new AbortController();
    const parameters = new URLSearchParams({ date, party: String(party) });
    fetch(`${endpoint}?${parameters}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error();
        const payload = await response.json() as { slots?: unknown };
        if (!Array.isArray(payload.slots) || !payload.slots.every(value => typeof value === "string")) throw new Error();
        if (!controller.signal.aborted) setAvailability({ key: queryKey, slots: payload.slots });
      })
      .catch(() => { if (!controller.signal.aborted) setAvailability({ key: queryKey, slots: [], error: true }); });
    return () => controller.abort();
  }, [editable, validDate, date, party, queryKey, confirmation]);

  useEffect(() => { if (confirmation) successHeading.current?.focus(); }, [confirmation]);

  function changeParty(next: number) {
    setParty(next);
    setTime("");
    setError("");
  }

  function changeDate(next: string) {
    setDate(next);
    setTime("");
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editable || !validDate || !slots.includes(time) || sendingRef.current) return;
    const fields = new FormData(event.currentTarget);
    const body = {
      date, party, time, language,
      name: String(fields.get("name") ?? "").trim(),
      email: String(fields.get("email") ?? "").trim(),
      note: String(fields.get("note") ?? "").trim(),
    };
    const key = JSON.stringify(body);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, requestId: request.current.id }),
      });
      if (response.status === 409) {
        setError(labels.conflict);
        setTime("");
        setSlotRetry(value => value + 1);
        request.current = null;
        return;
      }
      const data = await response.json().catch(() => null) as { status?: string; error?: string } | null;
      if (!response.ok || data?.status !== "pending") {
        setError(response.status >= 400 && response.status < 500 && language === "de" && data?.error ? data.error : labels.failed);
        return;
      }
      setConfirmation({ date, party, time });
    } catch {
      setError(labels.failed);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function reset() {
    changeDate("");
    changeParty(Math.min(2, configReady ? currentConfig.maxParty : 2));
    setConfirmation(undefined);
    request.current = null;
  }

  const retryConfig = () => {
    setConfig(null);
    setConfigRetry(value => value + 1);
  };
  const labelDate = (value: string) => new Intl.DateTimeFormat(language === "en" ? "en-GB" : "de-DE", {
    dateStyle: "long", timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
  const partyLabel = (count: number) => count + " " + (count === 1 ? labels.person : labels.party);

  if (currentConfig === null) return <div className={styles.widget} data-layout={layout}>
    <p className={styles.status} role="status"><LoaderCircle className={styles.spinner} size={17} aria-hidden="true" />{labels.loading}</p>
  </div>;
  if (currentConfig === "error") return <div className={styles.widget} data-layout={layout}>
    <p className={styles.status} role="alert">{labels.setupError}</p>
    <button className={styles.retry} onClick={retryConfig} type="button">{labels.retry}</button>
  </div>;
  if (!currentConfig.enabled) return <div className={styles.widget} data-layout={layout}><p role="status">{labels.disabled}</p></div>;
  if (confirmation) return <div className={styles.widget} data-layout={layout}>
    <div className={styles.confirmation}>
      <span className={styles.check}><Check size={20} aria-hidden="true" /></span>
      <h3 ref={successHeading} tabIndex={-1}>{labels.success}</h3>
      <p>{partyLabel(confirmation.party)} · {labelDate(confirmation.date)} · {confirmation.time}</p>
      <p>{labels.pending}</p>
      <button className={styles.retry} type="button" onClick={reset}>{labels.newRequest}</button>
    </div>
  </div>;

  return <form className={styles.widget} data-layout={layout} onSubmit={submit}>
    <fieldset className={styles.form} disabled={editable || sending}>
      <div className={styles.details}>
        <label className={styles.field} htmlFor={id + "-party"}>
          {labels.party}
          <select id={id + "-party"} name="party" value={party} onChange={event => changeParty(Number(event.target.value))}>
            {Array.from({ length: currentConfig.maxParty }, (_, index) => index + 1).map(count =>
              <option key={count} value={count}>{partyLabel(count)}</option>)}
          </select>
        </label>
        <label className={styles.field} htmlFor={id + "-date"}>
          {labels.date}
          <input id={id + "-date"} name="date" type="date" required value={date} min={currentConfig.minDate}
            max={currentConfig.maxDate} onChange={event => changeDate(event.target.value)} />
        </label>
      </div>
      <fieldset className={styles.timeField}>
        <legend><CalendarDays size={16} aria-hidden="true" />{labels.time}</legend>
        {slots.length > 0 && <div className={styles.slots}>
          {slots.map(slot => <label className={styles.slot} key={slot}>
            <input type="radio" name={id + "-time"} value={slot} checked={time === slot} onChange={() => { setTime(slot); setError(""); }} required />
            <span>{slot}</span>
          </label>)}
        </div>}
        {!editable && !validDate && <p className={styles.status}>{labels.selectDate}</p>}
        {!editable && validDate && !currentTimes && <p className={styles.status} role="status"><LoaderCircle className={styles.spinner} size={16} aria-hidden="true" />{labels.loading}</p>}
        {currentTimes?.error && <div>
          <p className={styles.status} role="alert">{labels.timesError}</p>
          <button type="button" className={styles.retry} onClick={() => setSlotRetry(value => value + 1)}>{labels.retry}</button>
        </div>}
        {validDate && currentTimes && !currentTimes.error && !slots.length && <p className={styles.status} role="status">{labels.noTimes}</p>}
      </fieldset>
      <div className={styles.details}>
        <label className={styles.field}>{labels.name}<input name="name" autoComplete="name" required maxLength={100} /></label>
        <label className={styles.field}>{labels.email}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      </div>
      <label className={styles.field}>{labels.note}<textarea name="note" rows={2} maxLength={700} /></label>
      <p className={styles.privacy}>{labels.privacyText} <a href={language === "en" ? "/en/privacy" : "/datenschutz"}>{labels.privacy}</a></p>
      <button className={`ws-button ws-button-primary ${styles.submit}`} type="submit" disabled={!slots.includes(time)} aria-busy={sending}>
        {sending ? labels.submitting : labels.submit}
        {sending ? <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}
      </button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </fieldset>
  </form>;
}
