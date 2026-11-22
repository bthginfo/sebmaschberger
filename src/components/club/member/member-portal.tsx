"use client";

import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CircleEllipsis, Download, House, Layers3, LogOut, MessageCircle, Newspaper,
  Palette, Pin, Settings2, Shield, Trophy, UserRound, UsersRound, type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { ClubMessages } from "@/components/club/messages/club-messages";
import { WorkspaceAppSettings } from "@/components/workspace-app/workspace-app-settings";
import { DEFAULT_CLUB_APPEARANCE, type ClubHomeBlock } from "@/lib/club/appearance-model";
import type { ClubAssignment, ClubNews, ClubPerson, ClubPlayItem, ClubRole, ClubRsvp, ClubTeam, ClubTraining, ClubWorkspace } from "@/lib/club/model";
import { MemberHomeGrid, memberCoverSource, memberThemeStyle, memberWelcomeTitle } from "./member-appearance";
import { MatchCard, MatchList, MemberCalendar, memberTeamStyle, TrainingCard } from "./member-calendar";
import { MemberOnboarding, memberTourSteps, memberTourStorageKey } from "./member-onboarding";
import { MemberProfile, type ProfileUpdate } from "./member-profile";
import { MemberAvatar, MemberBrand, MemberEmpty, MemberLanguageToggle, MemberRequestError, clubDate, memberRequest, memberWrite, useMemberTimeZone, type MemberLanguage } from "./member-shared";

const views = ["overview", "calendar", "teams", "scores", "messages", "news", "tactics", "profile", "settings"] as const;
type MemberView = (typeof views)[number];
const labels: Record<MemberView, { de: string; en: string; icon: LucideIcon }> = {
  overview: { de: "Übersicht", en: "Overview", icon: House },
  calendar: { de: "Kalender", en: "Calendar", icon: CalendarDays },
  teams: { de: "Teams", en: "Teams", icon: UsersRound },
  scores: { de: "Spiele", en: "Matches", icon: Trophy },
  messages: { de: "Nachrichten", en: "Messages", icon: MessageCircle },
  news: { de: "Vereinsnews", en: "Club news", icon: Newspaper },
  tactics: { de: "Taktiken", en: "Tactics", icon: Layers3 },
  profile: { de: "Profil", en: "Profile", icon: UserRound },
  settings: { de: "Einstellungen", en: "Settings", icon: Settings2 },
};
const roleLabels: Record<ClubRole, Record<MemberLanguage, string>> = {
  member: { de: "Mitglied", en: "Member" },
  coach: { de: "Coach", en: "Coach" },
  board: { de: "Vorstand", en: "Board member" },
  admin: { de: "Administration", en: "Administrator" },
};

const messages = {
  de: {
    response: "Deine Rückmeldung wurde gespeichert.",
    profile: "Dein Profil wurde gespeichert.",
    avatar: "Dein Profilfoto wurde aktualisiert.",
    refresh: "Die Änderung wurde gespeichert. Lade die Ansicht für den aktuellen Stand neu.",
    conflict: "Die Daten wurden inzwischen geändert. Lade die Ansicht vor dem nächsten Speichern neu.",
    responseClosed: "Für dieses Training sind Rückmeldungen geschlossen.",
    invalid: "Prüfe deine Eingaben und versuche es erneut.",
    forbidden: "Die Aktion ist für deinen Zugang nicht verfügbar.",
    limit: "Warte kurz und versuche es erneut.",
    error: "Die Aktion konnte gerade nicht abgeschlossen werden. Versuche es erneut.",
  },
  en: {
    response: "Your response was saved.",
    profile: "Your profile was saved.",
    avatar: "Your profile photo was updated.",
    refresh: "Your change was saved. Reload the page to get the latest information.",
    conflict: "The details have changed. Reload before saving again.",
    responseClosed: "Responses for this training are closed.",
    invalid: "Check your details and try again.",
    forbidden: "This action is unavailable for your account.",
    limit: "Wait a moment and try again.",
    error: "The action could not be completed. Try again in a moment.",
  },
} as const;
type Notice = keyof typeof messages.de;
type Success = "response" | "profile" | "avatar";
const validView = (value: string, coachStudio: boolean): value is MemberView =>
  views.includes(value as MemberView) && (value !== "tactics" || coachStudio);
const viewHref = (view: MemberView) => view === "overview" ? "/members" : `/members#${view}`;

function errorNotice(error: unknown): Notice {
  const status = error instanceof MemberRequestError ? error.status : 0;
  if (status === 409) return "conflict";
  if (status === 403 || status === 404) return "forbidden";
  if (status === 429) return "limit";
  if (status === 400 || status === 413 || status === 422) return "invalid";
  return "error";
}

function NewsList({ items, language, preview = false }: { items: ClubNews[]; language: MemberLanguage; preview?: boolean }) {
  const english = language === "en";
  const zone = useMemberTimeZone();
  const Heading = preview ? "h3" : "h2";
  if (!items.length) return <MemberEmpty icon={<Newspaper size={19} />} title={english ? "No news yet" : "Noch keine Meldungen"}
    description={english ? "Club updates for you and your teams will appear here." : "Hier erscheinen Neuigkeiten für dich und deine Teams."} />;
  return <div className={`club-member-news-list${preview ? " club-member-list-preview" : ""}`}>
    {items.map(item => <article className="club-member-news-item" key={item.id}>
      <div className="club-member-news-meta">
        <time dateTime={item.updatedAt}>{clubDate(item.updatedAt, language, { day: "numeric", month: "short" }, zone)}</time>
        {item.pinned && <span><Pin size={14} aria-hidden="true" />{english ? "Pinned" : "Angepinnt"}</span>}
      </div>
      <Heading lang={english && item.titleEn ? "en" : "de"}>{english && item.titleEn ? item.titleEn : item.title}</Heading>
      <p lang={english && item.bodyEn ? "en" : "de"}>{english && item.bodyEn ? item.bodyEn : item.body}</p>
    </article>)}
  </div>;
}

function TeamList({ teams, people, language }: { teams: ClubTeam[]; people: ClubPerson[]; language: MemberLanguage }) {
  const english = language === "en";
  if (!teams.length) return <section className="club-member-card"><MemberEmpty icon={<UsersRound size={20} />} title={english ? "No team assigned yet" : "Noch keinem Team zugeordnet"}
    description={english ? "Ask your club’s team manager about joining a squad." : "Wende dich an die Teamleitung, wenn du einer Mannschaft beitreten möchtest."} /></section>;
  return <div className="club-member-team-list">
    {teams.map(team => {
      const roster = people.filter(person => person.status === "active" && person.teamIds.includes(team.id));
      const badge = Array.from(team.shortName || team.name).slice(0, 3).join("").toLocaleUpperCase(language);
      return <section className="club-member-card club-member-team-card" key={team.id} style={memberTeamStyle(team.color)}>
        <div className="club-member-team-heading"><span className="club-member-team-badge" aria-hidden="true">{badge}</span>
          <div><h2>{team.name}</h2>{team.description && <p>{team.description}</p>}</div>
        </div>
        {roster.length ? <ul className="club-member-roster" role="list">
          {roster.map(person => <li key={person.id}><MemberAvatar person={person} name={person.name} size={36} lazy />
            <div><strong>{person.name}</strong><span>{person.position || roleLabels[person.role][language]}</span></div>
            {person.jersey !== null && <span className="club-member-jersey" aria-label={english ? `Shirt number ${person.jersey}` : `Trikotnummer ${person.jersey}`}>{person.jersey}</span>}
          </li>)}
        </ul> : <MemberEmpty icon={<UsersRound size={19} />} title={english ? "No roster yet" : "Noch kein Kader"}
          description={english ? "The roster appears here when the club adds active members." : "Der Kader erscheint hier, sobald der Verein aktive Mitglieder hinzufügt."} />}
      </section>;
    })}
  </div>;
}

function TacticList({ plays, assignments, actor, language, preview = false }: {
  plays: ClubPlayItem[];
  assignments: ClubAssignment[];
  actor: ClubWorkspace["actor"];
  language: MemberLanguage;
  preview?: boolean;
}) {
  const english = language === "en";
  const Heading = preview ? "h3" : "h2";
  if (!plays.length) return <MemberEmpty icon={<Layers3 size={20} />} title={english ? "No tactics assigned yet" : "Noch keine Taktiken zugewiesen"}
    description={english ? "Plays shared with you or your squad appear here." : "Hier erscheinen Spielzüge, die für dich oder dein Team freigegeben sind."} />;
  return <div className="club-member-tactic-list">
    {plays.map(play => {
      const { title, description } = play.copy?.[language] ?? play;
      const instructions = assignments.filter(assignment => assignment.playId === play.id &&
        (assignment.targetType === "person" ? assignment.targetId === actor.id : actor.teamIds.includes(assignment.targetId)))
        .map(assignment => assignment.instructions).filter(Boolean);
      return <article className="club-member-tactic" key={play.id}>
        <div className="club-member-play-symbol" aria-hidden="true"><Layers3 size={21} /></div>
        <div className="club-member-tactic-copy">
          <Heading>{title}</Heading>
          <p>{english ? `${play.phaseCount} ${play.phaseCount === 1 ? "phase" : "phases"}` : `${play.phaseCount} ${play.phaseCount === 1 ? "Phase" : "Phasen"}`} · {play.access === "edit" ? (english ? "Can edit" : "Bearbeitbar") : (english ? "View only" : "Zum Ansehen")}</p>
          {!preview && description && <p className="club-member-play-detail">{description}</p>}
          {!preview && [...new Set(instructions)].map(instruction => <p className="club-member-play-instructions" key={instruction}>{instruction}</p>)}
        </div>
        <Link href={play.href} className="club-member-text-button club-member-open-tactic" aria-label={english ? `Open ${title}` : `${title} öffnen`}>
          <span>{english ? "Open" : "Öffnen"}</span><ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </article>;
    })}
  </div>;
}

export function MemberPortal({ initial }: { initial: ClubWorkspace }) {
  const { language } = useAdminLanguage();
  const zone = useMemberTimeZone();
  const english = language === "en";
  const t = (de: string, en: string) => english ? en : de;
  const [workspace, setWorkspace] = useState(initial);
  const [selectedView, setSelectedView] = useState<MemberView>("overview");
  const [more, setMore] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ notice: Notice; view: MemberView; language: MemberLanguage } | null>(null);
  const [avatarStamp, setAvatarStamp] = useState(0);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const activeWrite = useRef<string | null>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const moreMenu = useRef<HTMLElement>(null);
  const mobileNavigation = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const tourReturnView = useRef<MemberView>("overview");
  const { brandName, actor, teams, people, trainings, matches, plays, assignments, capabilities } = workspace;
  const coachStudio = capabilities.coachStudio;
  const canOpenStudio = coachStudio && capabilities.assign;
  const showTools = capabilities.manage || canOpenStudio;
  const availableViews = coachStudio ? views : views.filter(destination => destination !== "tactics");
  const view = selectedView === "tactics" && !coachStudio ? "overview" : selectedView;
  const tour = memberTourSteps(coachStudio);
  const appearance = workspace.appearance ?? DEFAULT_CLUB_APPEARANCE;
  const person = people.find(entry => entry.id === actor.id);
  const memberName = person?.name || actor.name;
  const welcomeCopy = appearance.copy[language];
  const homeCover = view === "overview" ? memberCoverSource(appearance) : undefined;
  const homeBlocks = appearance.home.filter(block => block.enabled && (block.id !== "tactics" || coachStudio)).map(block => block.id);
  const news = workspace.news.filter(item => item.published).sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const nextTraining = trainings.filter(training => Date.parse(training.startsAt) > now).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  const nextMatch = matches.filter(match => match.status === "scheduled" && Date.parse(match.startsAt) >= now).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  const latestMatch = matches.filter(match => match.status === "final").sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0];
  const featuredMatch = nextMatch ?? latestMatch;
  const findTeam = (id: string) => teams.find(team => team.id === id);
  const notice = feedback?.view === view && feedback.language === language ? feedback.notice : null;
  const showNotice = (nextNotice: Notice) => setFeedback({ notice: nextNotice, view, language });

  useEffect(() => {
    const readView = () => {
      const fragment = window.location.hash.slice(1);
      if (fragment === "tactics" && !coachStudio) history.replaceState(null, "", "/members");
      setSelectedView(validView(fragment, coachStudio) ? fragment : "overview");
      setMore(false);
      setFeedback(null);
    };
    readView();
    window.addEventListener("hashchange", readView);
    window.addEventListener("popstate", readView);
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.removeEventListener("hashchange", readView);
      window.removeEventListener("popstate", readView);
      window.clearInterval(timer);
    };
  }, [coachStudio]);

  useEffect(() => {
    try {
      if (localStorage.getItem(memberTourStorageKey) === "done") return;
    } catch { /* The tour still works if storage is disabled. */ }
    const fragment = window.location.hash.slice(1);
    tourReturnView.current = validView(fragment, coachStudio) ? fragment : "overview";
    setSelectedView("overview");
    setTourStep(0);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [coachStudio]);

  useEffect(() => {
    if (!more) return;
    moreMenu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMore(false); moreButton.current?.focus(); }
    };
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !mobileNavigation.current?.contains(event.target)) setMore(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", dismissOutside);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", dismissOutside);
    };
  }, [more]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, destination: MemberView) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setSelectedView(destination);
    setMore(false);
    if (view !== destination) {
      setFeedback(null);
      history.pushState(null, "", viewHref(destination));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
  }

  function showTourStep(index: number) {
    const step = tour[index];
    if (!step) return;
    setTourStep(index);
    setSelectedView(step.view);
    setMore(false);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function restartTour() {
    tourReturnView.current = view;
    showTourStep(0);
  }

  function finishTour(openSettings: boolean) {
    try {
      localStorage.setItem(memberTourStorageKey, "done");
    } catch { /* The current tour still closes. */ }
    const destination = openSettings ? "settings" : tourReturnView.current;
    setTourStep(null);
    setSelectedView(destination);
    const href = viewHref(destination);
    if (window.location.pathname + window.location.hash !== href) history.pushState(null, "", href);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() => main.current?.focus({ preventScroll: true }));
  }

  async function commit(key: string, write: () => Promise<void>, success: Success) {
    if (activeWrite.current) return undefined;
    activeWrite.current = key;
    setPendingKey(key);
    setFeedback(null);
    let committed = false;
    try {
      await write();
      committed = true;
      const next = await memberRequest<{ workspace: ClubWorkspace }>("/workspace?mode=member");
      if (!next.workspace) throw new MemberRequestError(500);
      setWorkspace(next.workspace);
      showNotice(success);
      return next.workspace;
    } catch (error) {
      if (error instanceof MemberRequestError && error.status === 401) window.location.replace("/members/login");
      else if (success === "response" && error instanceof MemberRequestError && error.status === 409) {
        setNow(Date.now());
        showNotice("responseClosed");
      }
      else showNotice(committed ? "refresh" : errorNotice(error));
      return undefined;
    } finally {
      activeWrite.current = null;
      setPendingKey(null);
    }
  }

  function rsvp(training: ClubTraining, response: ClubRsvp | null) {
    void commit(`rsvp:${training.id}`, () => memberWrite(`/trainings/${encodeURIComponent(training.id)}/rsvp`, "POST", { response }), "response");
  }

  async function saveProfile(person: ClubPerson, update: ProfileUpdate) {
    const next = await commit("profile", () => memberWrite(`/people/${encodeURIComponent(person.id)}`, "PATCH", update), "profile");
    return next?.people.find(entry => entry.id === person.id);
  }

  async function uploadAvatar(person: ClubPerson, file: File) {
    const next = await commit("avatar", async () => {
      const body = new FormData();
      body.set("file", file);
      const result = await memberRequest<{ ok?: boolean }>(`/avatar/${encodeURIComponent(person.id)}`, { method: "POST", body });
      if (result.ok !== true) throw new MemberRequestError(500);
    }, "avatar");
    if (next) setAvatarStamp(value => value + 1);
    return next?.people.find(entry => entry.id === person.id);
  }

  async function logout() {
    if (activeWrite.current) return;
    activeWrite.current = "logout";
    setPendingKey("logout");
    setFeedback(null);
    try {
      await memberWrite("/logout", "POST", {});
      window.location.replace("/members/login");
    } catch (error) {
      if (error instanceof MemberRequestError && error.status === 401) window.location.replace("/members/login");
      else showNotice(errorNotice(error));
      activeWrite.current = null;
      setPendingKey(null);
    }
  }

  const link = (destination: MemberView, className: string, children?: ReactNode) => {
    const Icon = labels[destination].icon;
    return <a key={destination} href={viewHref(destination)} onClick={event => navigate(event, destination)}
      className={className} aria-current={view === destination ? "page" : undefined}>
      {children ?? <><Icon size={19} aria-hidden="true" /><span>{labels[destination][language]}</span></>}
    </a>;
  };
  const tools = <>
    {capabilities.manage && <Link href="/members/manage"><Settings2 size={18} aria-hidden="true" />{t("Verein verwalten", "Manage club")}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
    {canOpenStudio && <Link href="/members/coach"><Layers3 size={18} aria-hidden="true" />Coach Studio<ArrowUpRight size={15} aria-hidden="true" /></Link>}
    {capabilities.design && <Link href="/members/manage?view=appearance"><Palette size={18} aria-hidden="true" />{t("Mitgliederdesign", "Member design")}<ArrowUpRight size={15} aria-hidden="true" /></Link>}
  </>;
  const summary: Record<MemberView, string> = {
    overview: welcomeCopy.subtitle || clubDate(now, language, { weekday: "long", day: "numeric", month: "long" }, zone),
    calendar: t("Training und Spiele deiner Mannschaften.", "Training and matches for your squads."),
    teams: t("Kader und Positionen deiner Mannschaften.", "Squad lists and player positions."),
    scores: t("Kommende Spiele und Ergebnisse deiner Teams.", "Upcoming fixtures and results for your squads."),
    messages: t("Deine privaten Unterhaltungen im Verein.", "Your private conversations in the club."),
    news: t("Meldungen für dich und deine Mannschaften.", "Updates for you and your squads."),
    tactics: t("Spielzüge, die dein Verein mit dir geteilt hat.", "Plays your club has shared with you."),
    profile: t("Dein Foto und deine Angaben im Verein.", "Your photo and details in the club."),
    settings: t("Installation und Mitteilungen für dieses Gerät.", "Installation and notifications for this device."),
  };
  const primaryMobile: MemberView[] = ["overview", "calendar", "teams", "messages"];
  const otherMobile: MemberView[] = coachStudio ? ["scores", "news", "tactics", "profile", "settings"] : ["scores", "news", "profile", "settings"];
  const successNotice = notice === "response" || notice === "profile" || notice === "avatar" || notice === "refresh";

  function homeBlock(block: ClubHomeBlock) {
    switch (block) {
      case "training":
        return nextTraining ? <TrainingCard training={nextTraining} team={findTeam(nextTraining.teamId)} language={language} featured
          teamMember={actor.teamIds.includes(nextTraining.teamId)} now={now} pendingKey={pendingKey} onRsvp={rsvp} /> :
          <section className="club-member-card"><MemberEmpty icon={<CalendarDays size={21} />} title={t("Kein kommendes Training", "No upcoming training")}
            description={t("Neue Trainingstermine deiner Teams erscheinen im Kalender.", "New sessions for your squads will appear in the calendar.")}
            action={link("calendar", "club-member-text-button", <>{t("Zum Kalender", "Open calendar")}<ArrowRight size={17} aria-hidden="true" /></>)} /></section>;
      case "news":
        return <section className="club-member-card club-member-news-card">
          <div className="club-member-card-heading"><h2>{labels.news[language]}</h2>{link("news", "club-member-text-button", <>{t("Alle Meldungen", "All news")}<ArrowRight size={16} aria-hidden="true" /></>)}</div>
          <NewsList items={news.slice(0, 2)} language={language} preview />
        </section>;
      case "fixtures":
        return <section className="club-member-card club-member-side-card">
          <div className="club-member-card-heading"><h2>{nextMatch ? t("Nächstes Spiel", "Next match") : t("Letztes Spiel", "Latest match")}</h2>{link("scores", "club-member-text-button", <>{t("Spiele", "Matches")}<ArrowRight size={15} aria-hidden="true" /></>)}</div>
          {featuredMatch ? <MatchCard now={now} match={featuredMatch} team={findTeam(featuredMatch.teamId)} language={language} compact />
            : <MemberEmpty icon={<Trophy size={19} />} title={t("Keine Spiele eingetragen", "No matches listed")} description={t("Spieltermine und Ergebnisse erscheinen hier.", "Fixtures and results will appear here.")} />}
        </section>;
      case "tactics":
        return <section className="club-member-card club-member-side-card">
          <div className="club-member-card-heading"><h2>{labels.tactics[language]}</h2>{link("tactics", "club-member-text-button", <>{t("Alle", "All")}<ArrowRight size={15} aria-hidden="true" /></>)}</div>
          <TacticList plays={plays.slice(0, 2)} assignments={assignments} actor={actor} language={language} preview />
        </section>;
      case "teams":
        return <section className="club-member-card">
          <div className="club-member-card-heading"><h2>{labels.teams[language]}</h2>{link("teams", "club-member-text-button", <>{t("Zu den Teams", "View teams")}<ArrowRight size={15} aria-hidden="true" /></>)}</div>
          {teams.length ? <ul className="club-member-home-team-list">
            {teams.slice(0, 4).map(team => {
              const members = people.filter(person => person.status === "active" && person.teamIds.includes(team.id)).length;
              return <li key={team.id} style={memberTeamStyle(team.color)}>
                <span className="club-member-home-team-dot" aria-hidden="true" />
                <strong>{team.name}</strong><span>{members} {members === 1 ? t("Mitglied", "member") : t("Mitglieder", "members")}</span>
              </li>;
            })}
          </ul> : <MemberEmpty icon={<UsersRound size={19} />} title={t("Noch keinem Team zugeordnet", "No team assigned yet")}
            description={t("Deine Mannschaften erscheinen hier.", "Your squads will appear here.")} />}
        </section>;
    }
  }

  return <div className="club-member club-member-portal" lang={language} data-theme={appearance.theme} style={memberThemeStyle(appearance.theme)}>
    <a href="#club-member-content" className="club-member-skip" onClick={event => { event.preventDefault(); main.current?.focus(); }}>{t("Zum Inhalt", "Skip to content")}</a>
    <header className="club-member-header">
      <div className="club-member-header-inner">
        <MemberBrand brandName={brandName} subtitle={t("Mitgliederbereich", "Member area")} onClick={event => navigate(event, "overview")} />
        <div className="club-member-header-actions">
          <MemberLanguageToggle onChange={() => setFeedback(null)} />
          {link("profile", "club-member-profile-link", <>
            <MemberAvatar person={person} name={memberName} stamp={avatarStamp} size={36} />
            <span><strong>{memberName}</strong><small>{roleLabels[actor.role][language]}</small></span>
          </>)}
        </div>
      </div>
    </header>
    <div className="club-member-shell">
      <aside className="club-member-sidebar">
        <nav aria-label={t("Mitgliederbereich", "Member area")}>{availableViews.map(destination => link(destination, "club-member-nav-link"))}</nav>
        {showTools && <div className="club-member-sidebar-tools">{tools}</div>}
        <div className="club-member-sidebar-bottom">
          <Link href="/"><ArrowUpRight size={17} aria-hidden="true" />{t("Vereinswebsite", "Club website")}</Link>
          <button type="button" className="club-member-text-button" disabled={pendingKey !== null} onClick={() => void logout()}><LogOut size={17} aria-hidden="true" />{t("Abmelden", "Sign out")}</button>
        </div>
      </aside>
      <main id="club-member-content" ref={main} tabIndex={-1} className="club-member-main">
        <div className="club-member-page-heading" data-cover={homeCover ? true : undefined} data-member-tour-target={view}>
          {homeCover && <img className="club-member-welcome-cover" src={homeCover} alt="" decoding="async" />}
          <div className="club-member-heading-copy"><h1>{view === "overview" ? memberWelcomeTitle(welcomeCopy.title, memberName, language) : labels[view][language]}</h1><p>{summary[view]}</p></div>
          {view === "overview" && capabilities.manage && <Link href="/members/manage" className="club-member-button club-member-button-neutral club-member-overview-manage"><Settings2 size={17} aria-hidden="true" />{t("Verein verwalten", "Manage club")}</Link>}
          {view === "calendar" && <a href="/api/club/calendar" download className="club-member-button club-member-button-neutral club-member-calendar-download">
            <Download size={17} aria-hidden="true" />{t("Kalender laden", "Download calendar")}
          </a>}
        </div>
        {notice && <div className={`club-member-alert${successNotice ? " club-member-alert-success" : ""}`} role={successNotice ? "status" : "alert"}>
          <span>{messages[language][notice]}</span>
          {(notice === "refresh" || notice === "conflict") && <button type="button" className="club-member-text-button" onClick={() => window.location.reload()}>{t("Neu laden", "Reload")}</button>}
          <button type="button" className="club-member-text-button" onClick={() => setFeedback(null)}>{t("Schließen", "Dismiss")}</button>
        </div>}
        {view === "overview" && (homeBlocks.length > 0
          ? <MemberHomeGrid layout={appearance.layout} blocks={homeBlocks} render={homeBlock} />
          : <section className="club-member-card"><MemberEmpty icon={<House size={21} />} title={t("Willkommen im Mitgliederbereich", "Welcome to the member area")}
            description={t("Im Kalender findest du die nächsten Termine deines Vereins.", "Find your club’s upcoming events in the calendar.")}
            action={link("calendar", "club-member-text-button", <>{t("Zum Kalender", "Open calendar")}<ArrowRight size={17} aria-hidden="true" /></>)} /></section>)}
        {view === "calendar" && <MemberCalendar trainings={trainings} matches={matches} teams={teams} teamIds={actor.teamIds}
          now={now} language={language} pendingKey={pendingKey} onRsvp={rsvp} />}
        {view === "teams" && <TeamList teams={teams} people={people} language={language} />}
        {view === "scores" && <MatchList now={now} matches={matches} teams={teams} language={language} />}
        {view === "messages" && <ClubMessages owner={false} actorId={actor.id} language={language} />}
        {view === "news" && <section className="club-member-card club-member-news-card"><NewsList items={news} language={language} /></section>}
        {coachStudio && view === "tactics" && <section className="club-member-card club-member-tactics-card"><TacticList plays={plays} assignments={assignments} actor={actor} language={language} /></section>}
        {view === "settings" && <WorkspaceAppSettings scope="member" language={language} onRestartTour={restartTour} />}
        <div hidden={view !== "profile"}><MemberProfile person={person} teams={teams} language={language} pendingKey={pendingKey} stamp={avatarStamp} onSave={saveProfile} onUpload={uploadAvatar} onLogout={() => void logout()} /></div>
      </main>
    </div>
    <div className="club-member-mobile-navigation" ref={mobileNavigation}>
      <nav id="club-member-more" ref={moreMenu} className="club-member-more-menu" aria-label={t("Weitere Bereiche", "More areas")} hidden={!more}>
        {otherMobile.map(destination => link(destination, "club-member-nav-link"))}
        {showTools && <div className="club-member-sidebar-tools">{tools}</div>}
        <button type="button" className="club-member-text-button" disabled={pendingKey !== null} onClick={() => void logout()}><LogOut size={17} aria-hidden="true" />{t("Abmelden", "Sign out")}</button>
      </nav>
      <nav className="club-member-mobile-tabs" aria-label={t("Mitgliedernavigation", "Member navigation")}>
        {primaryMobile.map(destination => link(destination, "club-member-mobile-tab"))}
        <button ref={moreButton} type="button" className="club-member-mobile-tab" data-current={otherMobile.includes(view)} aria-controls="club-member-more" aria-expanded={more}
          onClick={() => setMore(value => !value)}><CircleEllipsis size={20} aria-hidden="true" /><span>{t("Mehr", "More")}</span></button>
      </nav>
    </div>
    <span className="club-member-private"><Shield size={14} aria-hidden="true" />{t("Privater Vereinsbereich", "Private club area")}</span>
    {tourStep !== null && <MemberOnboarding index={tourStep} steps={tour} language={language}
      onStep={showTourStep} onSkip={() => finishTour(false)} onDone={() => finishTour(true)} />}
  </div>;
}
