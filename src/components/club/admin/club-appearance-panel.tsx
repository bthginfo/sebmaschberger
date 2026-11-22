"use client";

import {
  ArrowDown, ArrowUp, CalendarDays, Check, Flag, Image as ImageIcon, ImageOff, Layers3, LoaderCircle,
  Monitor, Newspaper, Save, Shield, Smartphone, Upload, UsersRound, type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CLUB_LAYOUTS, CLUB_THEMES, DEFAULT_CLUB_APPEARANCE, type ClubAppearance, type ClubAppearanceInput,
  type ClubHomeBlock, type ClubLayout, type ClubTheme,
} from "@/lib/club/appearance-model";
import type { ClubWorkspace } from "@/lib/club/model";
import { MemberHomeGrid, memberCoverSource, memberThemeStyle, memberThemes, memberWelcomeTitle } from "../member/member-appearance";
import { ClubRequestError, clubRequest, requestProblem, useClubDates, type Copy, type Language, type Text } from "./club-admin-data";
import { Action, Notice } from "./club-admin-ui";
import styles from "./club-appearance-panel.module.css";

const themeLabels: Record<ClubTheme, Copy> = {
  pitch: ["Rasen", "Pitch"], coast: ["Küste", "Coast"], dusk: ["Abendlicht", "Dusk"], sand: ["Sand", "Sand"],
};
const layoutLabels: Record<ClubLayout, Copy> = {
  balanced: ["Zwei Spalten", "Two columns"], focus: ["Erste Karte groß", "Featured first"], stack: ["Eine Spalte", "One column"],
};
const cards: Record<ClubHomeBlock, { label: Copy; icon: LucideIcon }> = {
  training: { label: ["Training", "Training"], icon: CalendarDays },
  news: { label: ["Vereinsnews", "Club news"], icon: Newspaper },
  fixtures: { label: ["Spiele", "Matches"], icon: Flag },
  tactics: { label: ["Taktiken", "Tactics"], icon: Layers3 },
  teams: { label: ["Teams", "Teams"], icon: UsersRound },
};
const imageChoices = [
  { mode: "default", label: ["Vereinsmotiv", "Club cover"], icon: ImageIcon },
  { mode: "none", label: ["Ohne Bild", "No photo"], icon: ImageOff },
  { mode: "upload", label: ["Eigenes Foto", "Custom photo"], icon: Upload },
] as const;
const photoTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
type Feedback = { tone: "saved" | "error" | "conflict"; message: Copy };

function editableAppearance(value: ClubAppearance): ClubAppearanceInput {
  const { imageVersion: _imageVersion, ...input } = value;
  return input;
}

function availableHomeCards(home: ClubAppearanceInput["home"], coachStudio: boolean) {
  return coachStudio ? home : home.filter(block => block.id !== "tactics");
}

async function saveAppearance(draft: ClubAppearanceInput, photo: File | null, owner: boolean) {
  if (!photo) return clubRequest<{ appearance: ClubAppearance }>("/appearance", owner, "PUT", draft);
  const form = new FormData();
  form.set("settings", JSON.stringify(draft));
  form.set("file", photo);
  const response = await fetch("/api/club/appearance", {
    method: "PUT", body: form, cache: "no-store", credentials: "same-origin",
    headers: owner ? { "x-club-workspace": "cms" } : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new ClubRequestError(response.status, typeof payload?.error === "string" ? payload.error : "");
  if (!payload?.appearance) throw new ClubRequestError(502);
  return payload as { appearance: ClubAppearance };
}

function Panel({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  return <section className={styles.panel}>
    <h2>{title}</h2>{description && <p className={styles.description}>{description}</p>}{children}
  </section>;
}

function Choice({ name, value, checked, onChange, children }: {
  name: string; value: string; checked: boolean; onChange: () => void; children: ReactNode;
}) {
  return <label className={styles.choice} data-selected={checked || undefined}>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
    {children}
    {checked && <Check size={15} className={styles.choiceCheck} aria-hidden="true" />}
  </label>;
}

function Preview({ draft, cover, workspace, language, t, compact }: {
  draft: ClubAppearanceInput; cover?: string; workspace: ClubWorkspace; language: Language; t: Text; compact: boolean;
}) {
  const { formatClubDate } = useClubDates(language);
  const now = Date.now();
  const greeting = draft.copy[language];
  const date = formatClubDate(now, { weekday: "long", day: "numeric", month: "long" });
  const training = workspace.trainings.find(entry => Date.parse(entry.startsAt) > now);
  const fixture = workspace.matches.find(entry => entry.status === "scheduled" && Date.parse(entry.startsAt) > now);
  const news = workspace.news.find(entry => entry.published);
  const play = workspace.capabilities.coachStudio ? workspace.plays[0] : undefined;
  const titles: Record<ClubHomeBlock, string> = {
    training: training?.title || t("Kein kommendes Training", "No upcoming training"),
    news: (language === "en" && news?.titleEn) || news?.title || t("Noch keine Meldungen", "No news yet"),
    fixtures: fixture ? t("Gegen ", "vs ") + fixture.opponent : t("Keine kommenden Spiele", "No upcoming matches"),
    tactics: play?.copy?.[language]?.title || play?.title || t("Noch keine Taktiken", "No tactics yet"),
    teams: workspace.teams[0]?.name || t("Noch keine Teams", "No teams yet"),
  };
  const blocks = availableHomeCards(draft.home, workspace.capabilities.coachStudio).filter(block => block.enabled).map(block => block.id);

  function previewCard(block: ClubHomeBlock) {
    const { icon: Icon, label } = cards[block];
    return <article className={styles.previewCard} data-feature={block === "training" || undefined}>
      <span><Icon size={14} aria-hidden="true" />{t(...label)}</span><strong>{titles[block]}</strong>
    </article>;
  }

  return <div className={styles.previewFrame} data-compact={compact || undefined} lang={language} style={memberThemeStyle(draft.theme)}>
    <div className={styles.previewTop}>
      <span className={styles.previewMark} aria-hidden="true"><Shield size={16} /></span>
      <strong>{workspace.brandName}</strong><span className={styles.previewLanguage}>{language.toUpperCase()}</span>
    </div>
    <div className={styles.previewBody}>
      <div className={styles.previewHero} data-cover={Boolean(cover) || undefined}>
        {cover && <img src={cover} alt="" decoding="async" />}
        <div><strong>{memberWelcomeTitle(greeting.title, workspace.actor.name, language)}</strong><p>{greeting.subtitle || date}</p></div>
      </div>
      {blocks.length ? <MemberHomeGrid layout={draft.layout} blocks={blocks} render={previewCard} compact={compact} /> :
        <p className={styles.emptyPreview}>{t("Keine Startkarten eingeblendet.", "No home cards are shown.")}</p>}
    </div>
  </div>;
}

export function ClubAppearancePanel({ workspace, language, t, onSaved }: {
  workspace: ClubWorkspace; language: Language; t: Text; onSaved: (appearance: ClubAppearance) => void;
}) {
  const current = workspace.appearance ?? DEFAULT_CLUB_APPEARANCE;
  const [saved, setSaved] = useState(current);
  const [draft, setDraft] = useState(() => editableAppearance(current));
  const [copyLanguage, setCopyLanguage] = useState<Language>(language);
  const [compact, setCompact] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [localCover, setLocalCover] = useState<string>();
  const [busy, setBusy] = useState<"save" | "reload" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formId = useId();
  const previewId = formId + "-preview";
  const hasPhoto = Boolean(photo || saved.imageVersion);
  const dirty = (draft.imageMode === "upload" && Boolean(photo)) || JSON.stringify(draft) !== JSON.stringify(editableAppearance(saved));
  const cover = draft.imageMode === "upload" && localCover
    ? localCover : memberCoverSource({ imageMode: draft.imageMode, imageVersion: saved.imageVersion }, workspace.actor.owner);
  const previewText: Text = (de, en) => copyLanguage === "de" ? de : en;
  const homeCards = availableHomeCards(draft.home, workspace.capabilities.coachStudio);

  useEffect(() => {
    if (!photo) {
      setLocalCover(undefined);
      return;
    }
    const url = URL.createObjectURL(photo);
    setLocalCover(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (current.revision === saved.revision || dirty || busy) return;
    setSaved(current);
    setDraft(editableAppearance(current));
  }, [busy, current, dirty, saved.revision]);

  useEffect(() => {
    setCopyLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!dirty) return;
    function keepDraft(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", keepDraft);
    return () => window.removeEventListener("beforeunload", keepDraft);
  }, [dirty]);

  function change<K extends keyof ClubAppearanceInput>(key: K, value: ClubAppearanceInput[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setFeedback(previous => previous?.tone === "conflict" ? previous : null);
  }

  function moveCard(index: number, offset: -1 | 1, button: HTMLButtonElement) {
    const current = homeCards[index];
    const next = homeCards[index + offset];
    if (!current || !next) return;
    change("home", draft.home.map(block => block.id === current.id ? next : block.id === next.id ? current : block));
    requestAnimationFrame(() => {
      if (!button.disabled) button.focus();
      else button.closest("li")?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    });
  }

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!photoTypes.has(file.type) || file.size > 3 * 1024 * 1024 || file.size === 0) {
      setFeedback({ tone: "error", message: ["Wähle ein JPEG, PNG, WebP oder AVIF bis 3 MB.", "Choose a JPEG, PNG, WebP or AVIF up to 3 MB."] });
      return;
    }
    setPhoto(file);
    change("imageMode", "upload");
  }

  function resetTo(appearance: ClubAppearance) {
    setSaved(appearance);
    setDraft(editableAppearance(appearance));
    setPhoto(null);
    setFeedback(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !dirty || !workspace.capabilities.design || (draft.imageMode === "upload" && !hasPhoto)) return;
    setBusy("save");
    setFeedback(null);
    try {
      const { appearance } = await saveAppearance(draft, draft.imageMode === "upload" ? photo : null, workspace.actor.owner);
      if (!appearance) throw new ClubRequestError(502);
      resetTo(appearance);
      onSaved(appearance);
      setFeedback({ tone: "saved", message: ["Die Änderungen sind im Mitgliederbereich sichtbar.", "Your changes are visible in the member area."] });
    } catch (error) {
      if (error instanceof ClubRequestError && error.status === 409) {
        setFeedback({ tone: "conflict", message: ["Das Design wurde inzwischen geändert. Lade die aktuelle Version, um weiterzuarbeiten.", "The design was changed elsewhere. Load the latest version to continue."] });
      } else if (error instanceof ClubRequestError && [400, 413].includes(error.status) && photo) {
        setFeedback({ tone: "error", message: ["Das Foto konnte nicht gespeichert werden. Wähle ein anderes Bild bis 3 MB.", "The photo could not be saved. Choose a different image up to 3 MB."] });
      } else {
        setFeedback({ tone: "error", message: requestProblem(error) });
      }
    } finally {
      setBusy(null);
    }
  }

  async function reload() {
    if (busy) return;
    setBusy("reload");
    try {
      const result = await clubRequest<{ workspace: ClubWorkspace }>("/workspace?mode=manage", workspace.actor.owner);
      const appearance = result.workspace.appearance ?? DEFAULT_CLUB_APPEARANCE;
      resetTo(appearance);
      onSaved(appearance);
    } catch (error) {
      setFeedback({ tone: "conflict", message: requestProblem(error) });
    } finally {
      setBusy(null);
    }
  }

  if (!workspace.capabilities.design) return null;
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.editor}>
      <aside className={styles.preview} id={previewId} aria-labelledby={previewId + "-title"}>
        <header className={styles.previewHead}>
          <h2 id={previewId + "-title"}>{t("Live-Vorschau", "Live preview")}</h2>
          <div className={styles.devicePicker} role="group" aria-label={t("Vorschaugröße", "Preview size")}>
            <button type="button" aria-label={t("Desktop-Vorschau", "Desktop preview")} aria-pressed={!compact}
              title={t("Desktop", "Desktop")} onClick={() => setCompact(false)}><Monitor size={16} aria-hidden="true" /></button>
            <button type="button" aria-label={t("Mobil-Vorschau", "Mobile preview")} aria-pressed={compact}
              title={t("Mobil", "Mobile")} onClick={() => setCompact(true)}><Smartphone size={16} aria-hidden="true" /></button>
          </div>
        </header>
        <Preview draft={draft} cover={cover} workspace={workspace} language={copyLanguage} t={previewText} compact={compact} />
      </aside>

      <div className={styles.settings}>
        <Panel title={t("Farbschema", "Color scheme")}>
          <fieldset className={styles.themeChoices} aria-label={t("Farbschema wählen", "Choose a color scheme")} disabled={Boolean(busy)}>
            {CLUB_THEMES.map(theme => <Choice key={theme} name={formId + "-theme"} value={theme} checked={draft.theme === theme} onChange={() => change("theme", theme)}>
              <span className={styles.themeSwatches} style={memberThemeStyle(theme)} aria-hidden="true"><i /><i /><i /></span>
              <strong>{t(...themeLabels[theme])}</strong>
            </Choice>)}
          </fieldset>
        </Panel>

        <Panel title={t("Titelbild", "Cover photo")}>
          <fieldset className={styles.imageChoices} aria-label={t("Titelbild wählen", "Choose a cover photo")} disabled={Boolean(busy)}>
            {imageChoices.map(({ mode, label, icon: Icon }) => <Choice key={mode} name={formId + "-image"} value={mode} checked={draft.imageMode === mode} onChange={() => change("imageMode", mode)}>
              <Icon size={17} aria-hidden="true" /><strong>{t(label[0], label[1])}</strong>
            </Choice>)}
          </fieldset>
          {draft.imageMode === "upload" && <div className={styles.upload}>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden
              onChange={event => { selectPhoto(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
            <Action icon={Upload} disabled={Boolean(busy)} onClick={() => fileInput.current?.click()}>
              {hasPhoto ? t("Foto ersetzen", "Replace photo") : t("Foto wählen", "Choose photo")}
            </Action>
            <p>{photo?.name || (saved.imageVersion ? t("Eigenes Foto gespeichert", "Custom photo saved") : t("JPEG, PNG, WebP oder AVIF bis 3 MB", "JPEG, PNG, WebP or AVIF up to 3 MB"))}</p>
          </div>}
        </Panel>

        <Panel title={t("Aufbau der Startseite", "Home layout")} description={t("Wähle, welche Karten erscheinen und in welcher Reihenfolge.", "Choose which cards appear and set their order.")}>
          <fieldset className={styles.layoutChoices} aria-label={t("Kartenlayout wählen", "Choose a card layout")} disabled={Boolean(busy)}>
            {CLUB_LAYOUTS.map(layout => <Choice key={layout} name={formId + "-layout"} value={layout} checked={draft.layout === layout} onChange={() => change("layout", layout)}>
              <span className={styles.layoutSketch} data-layout={layout} aria-hidden="true"><i /><i /><i /></span>
              <strong>{t(...layoutLabels[layout])}</strong>
            </Choice>)}
          </fieldset>
          <ol className={styles.cardOrder} aria-label={t("Reihenfolge der Startkarten", "Home card order")}>
            {homeCards.map(({ id, enabled }, index) => {
              const { label, icon: Icon } = cards[id];
              const name = t(...label);
              return <li key={id} data-enabled={enabled || undefined}>
                <Icon size={18} aria-hidden="true" /><strong>{name}</strong>
                <div className={styles.move}>
                  <button type="button" disabled={Boolean(busy) || index === 0}
                    title={t("Nach oben", "Move up")} aria-label={t(name + " nach oben verschieben", "Move " + name + " up")}
                    onClick={event => moveCard(index, -1, event.currentTarget)}><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" disabled={Boolean(busy) || index === homeCards.length - 1}
                    title={t("Nach unten", "Move down")} aria-label={t(name + " nach unten verschieben", "Move " + name + " down")}
                    onClick={event => moveCard(index, 1, event.currentTarget)}><ArrowDown size={16} aria-hidden="true" /></button>
                </div>
                <label className={styles.switch}>
                  <input type="checkbox" role="switch" aria-label={t(name + " anzeigen", "Show " + name)} checked={enabled} disabled={Boolean(busy)}
                    onChange={event => change("home", draft.home.map(block => block.id === id ? { ...block, enabled: event.target.checked } : block))} />
                  <span aria-hidden="true" />
                </label>
              </li>;
            })}
          </ol>
        </Panel>

        <Panel title={t("Begrüßung", "Welcome text")}>
          <div className={styles.textLanguages} role="group" aria-label={t("Sprache der Begrüßung", "Welcome text language")}>
            <button type="button" lang="de" aria-pressed={copyLanguage === "de"} onClick={() => setCopyLanguage("de")}>Deutsch</button>
            <button type="button" lang="en" aria-pressed={copyLanguage === "en"} onClick={() => setCopyLanguage("en")}>English</button>
          </div>
          <div className={styles.copyFields}>
            <label>{t("Überschrift", "Headline")}
              <input maxLength={100} value={draft.copy[copyLanguage].title} disabled={Boolean(busy)} lang={copyLanguage}
                placeholder={previewText("Hallo, {name}.", "Hi, {name}.")}
                onChange={event => change("copy", { ...draft.copy, [copyLanguage]: { ...draft.copy[copyLanguage], title: event.target.value } })} />
            </label>
            <label>{t("Unterzeile", "Subtitle")}
              <textarea maxLength={200} rows={2} value={draft.copy[copyLanguage].subtitle} disabled={Boolean(busy)} lang={copyLanguage}
                placeholder={previewText("Das aktuelle Datum", "Today’s date")}
                onChange={event => change("copy", { ...draft.copy, [copyLanguage]: { ...draft.copy[copyLanguage], subtitle: event.target.value } })} />
            </label>
          </div>
          <p className={styles.description}>{t("Ein leeres Feld verwendet den Standardtext. {name} setzt den Vornamen in die Überschrift ein.", "Leave a field blank to use its default. Add {name} to include the member’s first name in the headline.")}</p>
        </Panel>
      </div>

    </div>

    <footer className={styles.footer}>
      {feedback && <Notice error={feedback.tone !== "saved"} message={t(...feedback.message)}>
        {feedback.tone === "conflict" && <Action disabled={Boolean(busy)} onClick={() => void reload()}>{t("Aktuelle Version laden", "Load latest version")}</Action>}
      </Notice>}
      <div className={styles.footerRow}>
        <span>{dirty ? t("Ungespeicherte Änderungen", "Unsaved changes") : t("Aktueller Stand", "Up to date")}</span>
        <div className={styles.footerActions}>
          <Action tone="quiet" disabled={!dirty || Boolean(busy)} onClick={() => resetTo(saved)}>{t("Zurücksetzen", "Reset")}</Action>
          <Action tone="primary" type="submit" icon={busy === "save" ? LoaderCircle : Save} aria-busy={busy === "save" || undefined}
            disabled={!dirty || Boolean(busy) || feedback?.tone === "conflict" || (draft.imageMode === "upload" && !hasPhoto)}>
            {busy === "save" ? t("Speichert …", "Saving…") : t("Speichern", "Save")}
          </Action>
        </div>
      </div>
    </footer>
  </form>;
}
