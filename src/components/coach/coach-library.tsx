"use client";

import { ArrowRight, ArrowUpRight, Check, CircleHelp, Copy, Ellipsis, Pause, Play, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { CoachAssistantFab } from "@/components/coach-assistant/coach-assistant-fab";
import { COACH_CATEGORIES, makeCoachPlay, playDuration } from "@/lib/coach/model";
import type { CoachPlay, CoachRecord } from "@/lib/coach/model";
import { coachTemplates, localizeCoachPreset } from "@/lib/coach/presets";
import { renderCoachBoard } from "@/lib/coach/scene";
import { CoachGuide } from "./coach-guide";
import { CoachMotionPitch } from "./coach-motion-pitch";
import { timeLabel, useCoachPlayback } from "./coach-playback";
import { Action, CoachDialog, CoachEmpty, CoachPitch, IconButton, StudioHeader, categoryLabels, coachError, coachRequest, coachText, pitchLabels } from "./coach-ui";
import type { CoachLocale } from "./coach-ui";
import styles from "./studio.module.css";

type Category = CoachPlay["category"] | "all";

function phaseCount(count: number, locale: CoachLocale) {
  return count + " " + (count === 1 ? coachText(locale, "Phase", "phase") : coachText(locale, "Phasen", "phases"));
}

function playSearchText(play: CoachPlay) {
  const { plan } = play;
  return [
    play.title, play.description, plan?.objective, plan?.players, plan?.area, plan?.equipment, plan?.progression,
    ...play.frames.flatMap((frame) => [frame.title, frame.notes, ...frame.items.map((item) => item.label)]),
  ].join(" ");
}

export function CoachLibrary({ initial, assistantAvailable = false, club = false }: { initial: CoachRecord[]; assistantAvailable?: boolean; club?: boolean }) {
  const { language } = useAdminLanguage();
  const t = (de: string, en: string) => coachText(language, de, en);
  const apiPath = club ? "/api/club/plays" : "/api/coach/plays";
  const recordPath = (id: string) => (club ? "/members/plays/" : "/admin/coach/") + encodeURIComponent(id);
  const [records, setRecords] = useState(initial);
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [remove, setRemove] = useState<CoachRecord | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const sorted = useMemo(() => records.map((record) => {
    const play = localizeCoachPreset(record, language);
    return play === record.play ? record : { ...record, play };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [language, records]);
  const normalized = query.trim().toLocaleLowerCase(language);
  const featured = category === "all" && !normalized ? sorted[0] : undefined;
  const filtered = sorted.filter(({ play, id }) => id !== featured?.id &&
    (category === "all" || play.category === category) &&
    (!normalized || playSearchText(play).toLocaleLowerCase(language).includes(normalized)));

  const create = async (play: CoachPlay, source: "dialog" | "duplicate" | "assistant") => {
    if (working) return false;
    setWorking(true);
    setError("");
    setDialogError("");
    try {
      const { record } = await coachRequest<{ record: CoachRecord }>(apiPath, "POST", { play });
      window.location.assign(recordPath(record.id));
      return true;
    } catch (caught) {
      setWorking(false);
      if (source === "assistant") throw new Error(coachError(caught, language));
      (source === "dialog" ? setDialogError : setError)(coachError(caught, language));
      return false;
    }
  };

  function duplicate(play: CoachPlay) {
    void create({ ...play, title: play.title.slice(0, 92) + coachText(play.locale, " – Kopie", " – copy") }, "duplicate");
  }

  const removePlay = async () => {
    if (!remove || working) return;
    setWorking(true);
    setDialogError("");
    try {
      await coachRequest(apiPath + "/" + encodeURIComponent(remove.id), "DELETE", { revision: remove.revision });
      setRecords((previous) => previous.filter((record) => record.id !== remove.id));
      setRemove(null);
    } catch (caught) {
      setDialogError(coachError(caught, language));
    } finally {
      setWorking(false);
    }
  };

  return <div className={styles.studio} lang={language}>
    <StudioHeader back={club ? { href: "/members", label: t("Mitgliederbereich", "Members") } : { href: "/admin", label: "CMS" }} languageSwitch>
      <Action icon={CircleHelp} variant="ghost" className={styles.guideButton} aria-label={t("So funktioniert’s", "How it works")} onClick={() => setGuideOpen(true)}>
        <span>{t("So funktioniert’s", "How it works")}</span>
      </Action>
    </StudioHeader>
    <main className={styles.library}>
      <div className={styles.libraryHeading}>
        <div>
          <h1>Playbook</h1>
          <p>{records.length === 1 ? t("1 Taktik", "1 play") : records.length + t(" Taktiken", " plays")} <span aria-hidden="true">·</span> Rugby Union</p>
        </div>
        <Action variant="primary" icon={Plus} onClick={() => { setDialogError(""); setCreateOpen(true); }}>{t("Neue Taktik", "New play")}</Action>
      </div>
      {featured && <div className={styles.featureWrap}>
        <FeaturedPlay key={featured.id} record={featured} language={language} href={recordPath(featured.id)} />
        <PlayActions play={featured.play} working={working} language={language}
          onDuplicate={() => duplicate(featured.play)} onRemove={() => { setDialogError(""); setRemove(featured); }} />
      </div>}
      <section className={styles.libraryCollection} aria-labelledby="coach-library-title">
        <div className={styles.collectionTitle}>
          <h2 id="coach-library-title">{featured ? t("Weitere Taktiken", "More plays") : t("Taktiken", "Plays")}</h2>
          <label className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <input type="search" placeholder={t("Taktik suchen", "Find a play")} value={query}
              onChange={(event) => setQuery(event.target.value)} aria-label={t("Taktik suchen", "Find a play")} />
            {query && <button type="button" aria-label={t("Suche leeren", "Clear search")} onClick={() => setQuery("")}><X size={15} aria-hidden="true" /></button>}
          </label>
        </div>
        <div className={styles.filters} role="group" aria-label={t("Kategorie filtern", "Filter by category")}>
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>{t("Alle", "All")}</button>
          {COACH_CATEGORIES.map((entry) => <button type="button" key={entry} aria-pressed={category === entry} onClick={() => setCategory(entry)}>{categoryLabels[entry][language]}</button>)}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {filtered.length ? <ul className={styles.playList}>
          {filtered.map((record) => <PlayRow key={record.id} record={record} working={working} language={language} href={recordPath(record.id)}
            onDuplicate={() => duplicate(record.play)} onRemove={() => { setDialogError(""); setRemove(record); }} />)}
        </ul> : <CoachEmpty title={records.length ? featured ? t("Platz für deinen nächsten Spielzug", "Room for your next play") : t("Keine Taktiken gefunden", "No plays found") : t("Dein Playbook ist noch leer", "Your playbook is empty")}
          detail={records.length ? featured ? t("Lege eine neue Taktik an, um sie hier zu sammeln.", "Create a play to keep it here.") : t("Ändere den Filter oder suche nach einem anderen Titel.", "Change the filter or try a different search.") : t("Beginne auf einem leeren Feld oder mit einer Rugby-Vorlage.", "Start with a blank pitch or a rugby template.")}>
          {!records.length && <Action icon={Plus} onClick={() => setCreateOpen(true)}>{t("Erste Taktik anlegen", "Create your first play")}</Action>}
          {records.length > 0 && !featured && <Action onClick={() => { setCategory("all"); setQuery(""); }}>{t("Filter zurücksetzen", "Reset filters")}</Action>}
        </CoachEmpty>}
      </section>
    </main>
    {guideOpen && <CoachGuide locale={language} close={() => setGuideOpen(false)} />}
    {createOpen && <CreatePlayDialog language={language} busy={working} error={dialogError} close={() => { if (!working) setCreateOpen(false); }} onCreate={(play) => create(play, "dialog")} />}
    {remove && <CoachDialog locale={language} title={t("Taktik löschen?", "Delete this play?")}
      intro={t("Die Taktik und ihre Freigaben werden gelöscht.", "This play and its shared links will be deleted.")} close={() => { if (!working) setRemove(null); }}>
      <p className={styles.deleteName} lang={remove.play.locale}>{remove.play.title}</p>
      {dialogError && <p className={styles.error} role="alert">{dialogError}</p>}
      <div className={styles.dialogActions}>
        <Action onClick={() => setRemove(null)} disabled={working}>{t("Abbrechen", "Cancel")}</Action>
        <Action variant="danger" icon={Trash2} onClick={removePlay} disabled={working}>{working ? t("Wird gelöscht …", "Deleting …") : t("Taktik löschen", "Delete play")}</Action>
      </div>
    </CoachDialog>}
    {!club && <CoachAssistantFab available={assistantAvailable} onApply={(next) => create(next, "assistant")} />}
  </div>;
}

function FeaturedPlay({ record, language, href }: { record: CoachRecord; language: CoachLocale; href: string }) {
  const { play } = record;
  const playback = useCoachPlayback(play);
  const t = (de: string, en: string) => coachText(language, de, en);
  const label = playback.playing ? t("Vorschau pausieren", "Pause preview") : t("Vorschau abspielen", "Play preview");
  return <article className={styles.feature}>
    <div className={styles.featureMedia}>
      <CoachMotionPitch className={styles.featurePitch} play={play} time={playback.time} locale={language} aria-hidden="true" />
      {playback.duration > 0 && <div className={styles.featurePreview}>
        <IconButton icon={playback.playing ? Pause : Play} label={label} onClick={playback.toggle} />
        <span>{timeLabel(playback.time || playback.duration)}</span>
      </div>}
    </div>
    <div className={styles.featureContent}>
      <div className={styles.featureMeta}>
        <span className={styles.category} data-category={play.category}>{categoryLabels[play.category][language]}</span>
        <span>{phaseCount(play.frames.length, language)} <span aria-hidden="true">·</span> {timeLabel(playDuration(play))}</span>
      </div>
      <h2 lang={play.locale}>{play.title}</h2>
      {play.description && <p lang={play.locale}>{play.description}</p>}
      <a className={styles.featureAction} href={href}>{t("Im Editor öffnen", "Open in editor")} <ArrowUpRight size={17} aria-hidden="true" /></a>
    </div>
  </article>;
}

function PlayRow({ record, working, language, href, onDuplicate, onRemove }: {
  record: CoachRecord; working: boolean; language: CoachLocale; href: string; onDuplicate: () => void; onRemove: () => void;
}) {
  const { play } = record;
  const date = new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Berlin" });
  return <li className={styles.playRow}>
    <a href={href} className={styles.playRowLink}>
      <CoachPitch className={styles.rowPitch} svg={renderCoachBoard(play, 0, { frameIndex: 0, routes: false, locale: language })} aria-hidden="true" />
      <span className={styles.rowTitle}>
        <strong lang={play.locale}>{play.title}</strong>
        <span>{pitchLabels[play.pitch][language]} <span aria-hidden="true">·</span> {phaseCount(play.frames.length, language)}</span>
      </span>
      <span className={styles.category} data-category={play.category}>{categoryLabels[play.category][language]}</span>
      <time dateTime={record.updatedAt}>{date.format(new Date(record.updatedAt))}</time>
      <ArrowRight className={styles.rowArrow} size={18} aria-hidden="true" />
    </a>
    <PlayActions play={play} working={working} language={language} onDuplicate={onDuplicate} onRemove={onRemove} />
  </li>;
}

function PlayActions({ play, working, language, onDuplicate, onRemove }: {
  play: CoachPlay; working: boolean; language: CoachLocale; onDuplicate: () => void; onRemove: () => void;
}) {
  const t = (de: string, en: string) => coachText(language, de, en);
  return <details className={styles.rowMenu}
    onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}
    onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary aria-label={t("Aktionen für ", "Actions for ") + play.title} title={t("Aktionen", "Actions")}><Ellipsis size={20} aria-hidden="true" /></summary>
      <div className={styles.menuSheet}>
        <button type="button" disabled={working} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onDuplicate(); }}><Copy size={16} aria-hidden="true" /> {t("Duplizieren", "Duplicate")}</button>
        <button type="button" data-danger disabled={working} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onRemove(); }}><Trash2 size={16} aria-hidden="true" /> {t("Löschen", "Delete")}</button>
      </div>
    </details>;
}

function CreatePlayDialog({ language, busy, error, close, onCreate }: {
  language: CoachLocale; busy: boolean; error: string; close: () => void; onCreate: (play: CoachPlay) => void;
}) {
  const t = (de: string, en: string) => coachText(language, de, en);
  const [locale, setLocale] = useState<CoachLocale>(language);
  const [selected, setSelected] = useState(0);
  const [name, setName] = useState("");
  const templates = useMemo(() => [makeCoachPlay(locale), ...coachTemplates(locale)], [locale]);
  const template = templates[selected] ?? templates[0];
  return <CoachDialog locale={language} title={t("Neue Taktik", "New play")}
    intro={t("Wähle ein leeres Feld oder beginne mit einer Vorlage.", "Choose a blank pitch or start with a template.")} close={close} className={styles.createDialog}>
    <form onSubmit={(event) => { event.preventDefault(); onCreate({ ...template, title: name.trim() || template.title }); }}>
      <div className={styles.createFields}>
        <label className={styles.field}>{t("Name", "Name")}<input autoFocus value={name} lang={locale} maxLength={100} placeholder={template.title} onChange={(event) => setName(event.target.value)} /></label>
        <label className={styles.field}>{t("Sprache der Taktik", "Play language")}<select value={locale} onChange={(event) => setLocale(event.target.value as CoachLocale)}><option value="de">Deutsch</option><option value="en">English</option></select></label>
      </div>
      <fieldset className={styles.templates}>
        <legend>{t("Vorlage", "Template")}</legend>
        {templates.map((play, index) => <button type="button" className={styles.template} aria-pressed={selected === index}
          key={index} onClick={() => setSelected(index)}>
          <CoachPitch svg={renderCoachBoard(play, 0, { frameIndex: 0, routes: true, locale: language })} aria-hidden="true" />
          <span><strong lang={index === 0 ? language : locale}>{index === 0 ? t("Leeres Feld", "Blank pitch") : play.title}</strong><small>{index === 0 ? t("Selbst aufstellen", "Set up from scratch") : categoryLabels[play.category][language]}</small></span>
          {selected === index && <Check size={17} aria-hidden="true" />}
        </button>)}
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.dialogActions}>
        <Action onClick={close} disabled={busy}>{t("Abbrechen", "Cancel")}</Action>
        <Action type="submit" variant="primary" icon={Plus} disabled={busy}>{busy ? t("Wird angelegt …", "Creating …") : t("Taktik anlegen", "Create play")}</Action>
      </div>
    </form>
  </CoachDialog>;
}
