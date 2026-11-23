"use client";

import { Archive, ArrowLeft, CalendarDays, Download, Flag, LayoutGrid, LoaderCircle, Mail, Newspaper, Palette, Plus, RefreshCw, Shield, Target, Trash2, UserPlus, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminLanguageSwitch, useAdminLanguage } from "@/components/admin/admin-language";
import { ClubMessages } from "@/components/club/messages/club-messages";
import type { ClubPerson, ClubRsvp, ClubTraining, ClubWorkspace } from "@/lib/club/model";
import { clubManagementHref, type ClubRecordRef } from "@/lib/club/records";
import {
  canAssignClubPlays, clubRequest, clubView, clubViews, ClubRequestError, isClubAdmin, isClubWide, isRevisionConflict, managesTeam, requestProblem, roleLabels, viewLabels,
  type ClubDialog, type ClubView, type Copy, type EditDialog, type Fields, type Invitation, type InviteFields, type Records, type Resource,
} from "./club-admin-data";
import { AttendanceSheet, TeamRosterSheet } from "./club-admin-details";
import { ClubAppearancePanel } from "./club-appearance-panel";
import { EditForm, InviteForm, InviteResult } from "./club-admin-forms";
import { Action, ActionLink, ClubAvatar, IconAction, Notice, SearchField, Sheet } from "./club-admin-ui";
import { FixturesView, NewsView, OverviewView, PeopleView, TacticsView, TeamsView, TrainingsView } from "./club-admin-views";
import { ClubRecordDetail } from "./club-record-detail";
import styles from "./club-admin.module.css";

const sections = {
  overview: { icon: LayoutGrid, view: OverviewView },
  people: { icon: Users, view: PeopleView },
  teams: { icon: Shield, view: TeamsView },
  trainings: { icon: CalendarDays, view: TrainingsView },
  fixtures: { icon: Flag, view: FixturesView },
  news: { icon: Newspaper, view: NewsView },
  messages: { icon: Mail },
  tactics: { icon: Target, view: TacticsView },
  appearance: { icon: Palette },
};

const savedCopy: Copy = ["Änderungen gespeichert.", "Changes saved."];
const refreshCopy: Copy = ["Die Ansicht wurde aktualisiert.", "Workspace refreshed."];
const savedRefreshCopy: Copy = ["Gespeichert. Lade die Ansicht neu, um den aktuellen Stand zu sehen.", "Saved. Refresh the workspace to see the latest data."];
const teamViews = ["people", "trainings", "fixtures", "news"] as const;
const editKinds = ["people", "teams", "trainings", "matches", "news", "assignments"] as const;
type Status = { copy: Copy; error?: boolean };
type Problem = { copy: Copy; reload?: boolean };
type PrimaryAction = { icon: LucideIcon; label: string; dialog: ClubDialog };

function isEditor(dialog: ClubDialog): dialog is EditDialog {
  return editKinds.some(kind => kind === dialog.kind);
}

function linkedAssignment(view: ClubView, id: string | null | undefined, workspace: ClubWorkspace): ClubDialog | null {
  return view === "tactics" && id && canAssignClubPlays(workspace) && workspace.plays.some(play => play.id === id && play.canAssign)
    ? { kind: "assignments", playId: id } : null;
}

function canDesign(workspace: ClubWorkspace) {
  return workspace.capabilities.design && isClubAdmin(workspace.actor);
}

function canSeeTactics(workspace: ClubWorkspace) {
  return workspace.capabilities.coachStudio && (workspace.capabilities.assign || workspace.plays.length > 0);
}

function visibleView(value: string | null | undefined, workspace: ClubWorkspace): ClubView {
  const view = clubView(value);
  if (view === "messages" && !workspace.capabilities.manage) return "overview";
  if (view === "appearance" && !canDesign(workspace)) return "overview";
  if (view === "tactics" && !canSeeTactics(workspace)) return "overview";
  return view;
}

export function ClubAdmin({ initial, initialView, initialPlayId, initialDetail }: {
  initial: ClubWorkspace; initialView?: string; initialPlayId?: string; initialDetail?: ClubRecordRef;
}) {
  const { language } = useAdminLanguage();
  const t = (de: string, en: string) => language === "de" ? de : en;
  const [workspace, setWorkspace] = useState(initial);
  const [requestedView, setView] = useState<ClubView>(() => visibleView(initialView, initial));
  const [teamId, setTeamId] = useState("");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<ClubDialog | null>(() => linkedAssignment(visibleView(initialView, initial), initialPlayId, initial));
  const [notice, setNotice] = useState<Status | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const owner = initial.actor.owner;
  const rootHref = clubManagementHref(owner);
  const designAllowed = canDesign(workspace);
  const tacticsAllowed = canSeeTactics(workspace);
  const messagesAllowed = workspace.capabilities.manage;
  const view: ClubView = initialDetail ? initialDetail.kind === "matches" ? "fixtures" : initialDetail.kind : visibleView(requestedView, workspace);
  const Content = view === "appearance" || view === "messages" ? null : sections[view].view;
  const availableTeam = workspace.teams.some(team => managesTeam(workspace.actor, team.id));
  const canAssign = canAssignClubPlays(workspace);
  const canCreateAssignment = canAssign && workspace.plays.some(play => play.canAssign);
  const showTeamFilter = teamViews.some(entry => entry === view) && workspace.teams.length > 1;
  const availableViews = clubViews.filter(entry =>
    (entry !== "appearance" || designAllowed) && (entry !== "tactics" || tacticsAllowed) && (entry !== "messages" || messagesAllowed));
  const exportFixtures = !initialDetail && view === "fixtures" && isClubWide(workspace.actor);
  const fixturesExportHref = "/api/club/fixtures-export?" + (owner ? "scope=cms&" : "") + "lang=" + language;

  useEffect(() => {
    if (initialDetail) return;
    function applyLocation() {
      const params = new URLSearchParams(window.location.search);
      const next = visibleView(params.get("view"), initial);
      setView(next);
      setTeamId(params.get("team") ?? "");
      setQuery("");
      setProblem(null);
      setNotice(null);
      setDialog(linkedAssignment(next, params.get("play"), initial));
    }
    applyLocation();
    window.addEventListener("popstate", applyLocation);
    return () => window.removeEventListener("popstate", applyLocation);
  }, [initial, initialDetail]);

  function navigate(next: ClubView, team = "") {
    if (lock.current) return;
    if (next === "appearance" && !designAllowed) return;
    if (next === "messages" && !messagesAllowed) return;
    if (next === "tactics" && !tacticsAllowed) return;
    const url = new URL(rootHref, window.location.origin);
    if (next !== "overview") url.searchParams.set("view", next);
    if (team) url.searchParams.set("team", team);
    if (initialDetail) { window.location.assign(url); return; }
    if (url.href !== window.location.href) window.history.pushState(null, "", url);
    setView(next);
    setQuery("");
    setTeamId(team);
    setNotice(null);
  }

  function open(next: ClubDialog) {
    if (lock.current) return;
    if (!canAssign && (next.kind === "assignments" || next.kind === "remove" && next.resource === "assignments")) return;
    setProblem(null);
    setNotice(null);
    setDialog(next);
  }

  function filterTeam(team: string) {
    const url = new URL(window.location.href);
    if (team) url.searchParams.set("team", team);
    else url.searchParams.delete("team");
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
    setTeamId(team);
  }

  function clearDialog() {
    setDialog(null);
    setProblem(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("play")) {
      url.searchParams.delete("play");
      window.history.replaceState(null, "", url);
    }
  }

  function close() {
    if (!lock.current) clearDialog();
  }

  async function loadWorkspace() {
    const { workspace: latest } = await clubRequest<{ workspace: ClubWorkspace }>("/workspace?mode=manage", owner);
    if (!latest?.actor) throw new ClubRequestError(502);
    setWorkspace(current => current.appearance.revision > latest.appearance.revision ? { ...latest, appearance: current.appearance } : latest);
  }

  async function refresh(closeStale = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice(null);
    try {
      await loadWorkspace();
      if (closeStale) clearDialog();
      else setProblem(null);
      setNotice({ copy: refreshCopy });
    } catch (error) {
      if (dialog) setProblem({ copy: requestProblem(error), reload: true });
      else setNotice({ copy: requestProblem(error), error: true });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function mutate<T>(request: () => Promise<T>, committed?: (result: T) => void, message?: Copy) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      const result = await request();
      committed?.(result);
      if (message) setNotice({ copy: message });
      try {
        await loadWorkspace();
      } catch {
        if (dialog?.kind === "roster" || dialog?.kind === "attendance") setProblem({ copy: savedRefreshCopy, reload: true });
        else setNotice({ copy: savedRefreshCopy, error: true });
      }
    } catch (error) {
      setProblem({ copy: requestProblem(error), reload: !(error instanceof ClubRequestError) || isRevisionConflict(error) });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function write(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body: object) {
    const result = await clubRequest<{ ok: boolean; id?: string }>(path, owner, method, body);
    if (result.ok !== true) throw new ClubRequestError(502);
    return result;
  }

  function save<K extends Resource>(kind: K, fields: Fields[K], item?: Records[K]) {
    if (kind === "assignments" && !canAssign) return;
    const path = "/" + kind + (item ? "/" + encodeURIComponent(item.id) : "");
    const method = kind === "people" ? "PATCH" : item ? "PUT" : "POST";
    void mutate(() => write(path, method, item ? { ...fields, revision: item.revision } : fields), clearDialog, savedCopy);
  }

  function invite(fields: InviteFields) {
    void mutate(async () => {
      const result = await clubRequest<Invitation>("/invites", owner, "POST", fields);
      if (typeof result.link !== "string" || !result.invite) throw new ClubRequestError(502);
      return result;
    }, result => setDialog({ kind: "invited", result }));
  }

  function updateMembership(person: ClubPerson, teamIds: string[]) {
    const validIds = teamIds.filter(id => workspace.teams.some(team => team.id === id));
    void mutate(() => write("/people/" + encodeURIComponent(person.id), "PATCH", { teamIds: validIds, revision: person.revision }),
      undefined, ["Teamzugehörigkeit gespeichert.", "Team membership saved."]);
  }

  function respond(training: ClubTraining, response: ClubRsvp | null) {
    void mutate(() => write("/trainings/" + encodeURIComponent(training.id) + "/rsvp", "POST", { response }), () => {
      setWorkspace(current => ({
        ...current,
        trainings: current.trainings.map(item => {
          if (item.id !== training.id) return item;
          const attendance = item.attendance?.filter(entry => entry.personId !== current.actor.id);
          if (response && attendance) attendance.push({ personId: current.actor.id, response });
          return { ...item, response, attendance };
        }),
      }));
    });
  }

  function removeItem(editor: EditDialog) {
    const { item } = editor;
    if (!item || editor.kind === "people") return;
    const play = "playId" in item ? workspace.plays.find(entry => entry.id === item.playId) : undefined;
    const label = "name" in item ? item.name : "title" in item ? item.title : "opponent" in item ? item.opponent :
      play?.copy?.[language].title ?? play?.title ?? t("Taktik-Zuweisung", "Play assignment");
    open({ kind: "remove", resource: editor.kind, id: item.id, revision: item.revision, label });
  }

  const primaryActions: Record<ClubView, PrimaryAction | null> = {
    overview: null,
    people: workspace.capabilities.invite ? { icon: UserPlus, label: t("Person einladen", "Invite someone"), dialog: { kind: "invite" } } : null,
    teams: workspace.capabilities.manage ? { icon: Plus, label: t("Team anlegen", "Add team"), dialog: { kind: "teams" } } : null,
    trainings: workspace.capabilities.manage && availableTeam ? { icon: Plus, label: t("Training anlegen", "Add training"), dialog: { kind: "trainings" } } : null,
    fixtures: workspace.capabilities.manage && availableTeam ? { icon: Plus, label: t("Spiel anlegen", "Add fixture"), dialog: { kind: "matches" } } : null,
    news: workspace.capabilities.news && (isClubWide(workspace.actor) || availableTeam) ? { icon: Plus, label: t("News anlegen", "Add news"), dialog: { kind: "news" } } : null,
    messages: null,
    tactics: canCreateAssignment ? { icon: Plus, label: t("Taktik zuweisen", "Assign a play"), dialog: { kind: "assignments" } } : null,
    appearance: null,
  };
  const primary = primaryActions[view];

  const rows = {
    overview: 0, people: workspace.people.length + workspace.invites.length, teams: workspace.teams.length,
    trainings: workspace.trainings.length, fixtures: workspace.matches.length, news: workspace.news.length,
    tactics: workspace.assignments.length + workspace.plays.length,
    messages: 0,
    appearance: 0,
  }[view];
  const team = dialog?.kind === "roster" ? workspace.teams.find(item => item.id === dialog.id) : undefined;
  const training = dialog?.kind === "attendance" ? workspace.trainings.find(item => item.id === dialog.id) : undefined;
  const detailsOpen = dialog?.kind === "roster" || dialog?.kind === "attendance";
  const modal = { workspace, t, language, busy, problem: problem?.copy ?? null, close, reload: problem?.reload ? () => void refresh(!detailsOpen) : undefined };
  const revoke = dialog?.kind === "revoke" ? dialog.invite : undefined;
  const removal = dialog?.kind === "remove" && (dialog.resource !== "assignments" || canAssign) ? dialog : undefined;
  const archive = removal?.resource === "teams";
  const editor = dialog && isEditor(dialog) && (dialog.kind !== "assignments" || canAssign) ? dialog : null;

  return <div className={styles.workspace} lang={language}>
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <a href={owner ? "/admin" : "/members"} className={styles.back} aria-label={owner ? t("Zur CMS-Übersicht", "Back to CMS") : t("Zum Mitgliederbereich", "Back to member portal")}>
          <ArrowLeft size={18} aria-hidden="true" /><span>{owner ? "CMS" : t("Mitglieder", "Members")}</span>
        </a>
        <div className={styles.brand}><span className={styles.brandMark}><Shield size={20} aria-hidden="true" /></span>
          <strong>{t("Vereinsverwaltung", "Club administration")}</strong></div>
        <div className={styles.topbarActions}>
          <AdminLanguageSwitch compact className={styles.languageSwitch} />
          <IconAction icon={busy ? LoaderCircle : RefreshCw} label={t("Ansicht aktualisieren", "Refresh workspace")} onClick={() => void refresh()}
            disabled={busy} className={busy ? styles.spin : undefined} />
          <div className={styles.actor}>
            <ClubAvatar person={workspace.actor} />
            <div><strong>{workspace.actor.name}</strong><span>{owner ? t("CMS-Inhaber", "CMS owner") : t(...roleLabels[workspace.actor.role])}</span></div>
          </div>
        </div>
      </div>
    </header>

    <div className={styles.layout}>
      <nav className={styles.navigation} aria-label={t("Vereinsbereiche", "Club workspace sections")}>
        <label className={styles.mobileSection}>
          <span>{t("Vereinsbereich", "Club section")}</span>
          <select value={view} onChange={event => {
            const next = availableViews.find(entry => entry === event.target.value);
            if (next) navigate(next);
          }}>{availableViews.map(entry => <option key={entry} value={entry}>{t(...viewLabels[entry])}</option>)}</select>
        </label>
        <ul>
          {availableViews.map(entry => {
            const Icon = sections[entry].icon;
            const href = rootHref + (entry === "overview" ? "" : "?view=" + entry);
            return <li key={entry}><a href={href} aria-current={view === entry ? "page" : undefined}
              onClick={initialDetail ? undefined : event => {
                if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigate(entry); }
              }}>
              <Icon size={18} aria-hidden="true" /><span>{t(...viewLabels[entry])}</span>
            </a></li>;
          })}
        </ul>
      </nav>

      <main className={styles.main} aria-busy={busy || undefined}>
        {!initialDetail && <div className={styles.viewHeading} data-export={exportFixtures || undefined}>
          <div>
            <h1>{t(...viewLabels[view])}</h1>
            {view === "overview" && <p>{workspace.brandName}</p>}
            {(view === "trainings" || view === "fixtures") && <p>{t("Zeiten in deiner Ortszeit", "Times shown in your local time")}</p>}
          </div>
          {(exportFixtures || primary && rows > 0) && <div className={styles.headingActions}>
            {exportFixtures && <ActionLink icon={Download} href={fixturesExportHref} download>
              {t("CSV exportieren", "Export CSV")}
            </ActionLink>}
            {primary && rows > 0 && <Action tone="primary" icon={primary.icon} disabled={busy} onClick={() => open(primary.dialog)}>{primary.label}</Action>}
          </div>}
        </div>}
        {notice && <Notice message={t(...notice.copy)} error={notice.error}>
          {notice.error && <Action onClick={() => void refresh()} disabled={busy}>{t("Aktualisieren", "Refresh")}</Action>}
        </Notice>}
        {!initialDetail && view !== "overview" && view !== "appearance" && view !== "messages" && (rows > 0 || query || teamId) && <div className={styles.filters}>
          <SearchField value={query} onChange={setQuery} t={t} />
          {showTeamFilter && <select value={teamId} aria-label={t("Nach Team filtern", "Filter by team")} onChange={event => filterTeam(event.target.value)}>
            <option value="">{t("Alle Teams", "All teams")}</option>
            {workspace.teams.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>}
        </div>}
        {initialDetail ? <ClubRecordDetail workspace={workspace} detail={initialDetail} language={language} t={t} open={open} /> :
          view === "appearance" && designAllowed ? <ClubAppearancePanel workspace={workspace} language={language} t={t}
            onSaved={appearance => setWorkspace(current => ({ ...current, appearance }))} /> :
          view === "messages" && messagesAllowed ? <ClubMessages owner={owner} actorId={workspace.actor.id} language={language} /> :
          Content && <Content workspace={workspace} language={language} t={t} query={query} teamId={teamId} open={open} navigate={navigate}
            clearFilters={() => { setQuery(""); filterTeam(""); }} />}
      </main>
    </div>

    {dialog?.kind === "invite" && <InviteForm key={dialog.previous?.id ?? "new"} {...modal} invite={invite}
      previous={dialog.previous} initialTeamIds={dialog.teamIds} />}
    {dialog?.kind === "invited" && <InviteResult result={dialog.result} close={clearDialog} t={t} />}
    {editor && <EditForm key={editor.kind + "-" + (editor.item?.id ?? "new")} dialog={editor} save={save} {...modal}
      remove={editor.item && editor.kind !== "people" ? () => removeItem(editor) : undefined} />}
    {training && <AttendanceSheet key={training.id} training={training} {...modal} respond={response => respond(training, response)} />}
    {team && <TeamRosterSheet key={team.id} team={team} {...modal} update={updateMembership} />}
    {(revoke || removal) && <Sheet t={t} close={close} busy={busy}
      title={revoke ? t("Einladung widerrufen?", "Revoke invitation?") : archive ? t("Team archivieren?", "Archive team?") : t("Eintrag löschen?", "Delete record?")}
      intro={revoke ? revoke.email : removal?.label}>
      <div className={styles.sheetBody}>
        {revoke && <p>{t("Der Einladungslink wird sofort ungültig.", "The invitation link will stop working immediately.")}</p>}
        {archive && <p>{t("Das Team verschwindet aus den aktiven Teamlisten und dem Spielkalender.", "The team will be removed from active team lists and the fixture calendar.")}</p>}
        {problem && <Notice message={t(...problem.copy)} error>
          {problem.reload && <Action onClick={() => void refresh(true)} disabled={busy}>{t("Aktuellen Stand laden", "Reload latest version")}</Action>}
        </Notice>}
      </div>
      <footer className={styles.sheetFooter}><div>
        <Action tone="quiet" onClick={close} disabled={busy}>{t("Abbrechen", "Cancel")}</Action>
        <Action tone="danger" icon={busy ? LoaderCircle : archive ? Archive : Trash2} disabled={busy} onClick={() => {
          if (revoke) void mutate(() => write("/invites/" + encodeURIComponent(revoke.id), "DELETE", {}), clearDialog,
            ["Einladung widerrufen.", "Invitation revoked."]);
          if (removal) void mutate(() => write("/" + removal.resource + "/" + encodeURIComponent(removal.id), "DELETE", { revision: removal.revision }),
            () => {
              clearDialog();
              if (initialDetail?.kind === removal.resource && initialDetail.id === removal.id) window.location.assign(rootHref + "?view=" + view);
            }, archive ? ["Team archiviert.", "Team archived."] : ["Eintrag gelöscht.", "Record deleted."]);
        }}>{busy ? t("Wird verarbeitet …", "Working …") : revoke ? t("Widerrufen", "Revoke") : archive ? t("Archivieren", "Archive") : t("Löschen", "Delete")}</Action>
      </div></footer>
    </Sheet>}
  </div>;
}
