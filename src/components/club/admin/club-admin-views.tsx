"use client";

import {
  ArrowRight, ArrowUpRight, CalendarClock, CalendarDays, ClipboardPenLine, Clock3, Flag, Globe, Layers3, ListChecks, Mail, MailX,
  MapPin, Newspaper, Pencil, Plus, Search, Shield, Target, Trophy, Users, X, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ClubInvite, ClubMatch, ClubPerson, ClubTraining, ClubWorkspace } from "@/lib/club/model";
import { clubAttention, clubManagementHref, clubRecordHref, trainingReadiness, type ClubRecordRef } from "@/lib/club/records";
import {
  attendanceLabel, canAssignClubPlays, editsPerson, isClubWide, managesTeam, matchLabels, roleLabels, statusLabels, textFilter, useClubDates,
  type ClubDialog, type ClubView, type Language, type Text,
} from "./club-admin-data";
import { Action, ActionLink, Chip, ClubAvatar, DateBadge, Empty, IconAction, TeamTag } from "./club-admin-ui";
import styles from "./club-admin.module.css";

type ViewProps = {
  workspace: ClubWorkspace;
  language: Language;
  t: Text;
  query: string;
  teamId: string;
  open: (dialog: ClubDialog) => void;
  navigate: (view: ClubView, teamId?: string) => void;
  clearFilters: () => void;
};

const rsvpKeys = ["yes", "maybe", "no"] as const;

function teamFor(workspace: ClubWorkspace, id: string | null) {
  return workspace.teams.find(team => team.id === id);
}

function RecordLink({ owner, kind, id, children, className = styles.recordLink }: ClubRecordRef & {
  owner: boolean; children: ReactNode; className?: string;
}) {
  return <a className={className} href={clubRecordHref(owner, { kind, id })}>{children}</a>;
}

function TeamLabel({ workspace, id }: { workspace: ClubWorkspace; id: string | null }) {
  const team = teamFor(workspace, id);
  return team ? <RecordLink className={styles.teamLink} owner={workspace.actor.owner} kind="teams" id={team.id}><TeamTag team={team} /></RecordLink> : null;
}

function schedule<T extends { startsAt: string }>(items: T[]) {
  const now = new Date().toISOString();
  return [...items].sort((a, b) => {
    const aUpcoming = a.startsAt >= now;
    const bUpcoming = b.startsAt >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt);
  });
}

function Participation({ training, workspace, t }: { training: ClubTraining; workspace: ClubWorkspace; t: Text }) {
  const { counts } = trainingReadiness(workspace, training);
  const responseOpen = Date.parse(training.startsAt) > Date.now();
  return <div className={styles.participation} role="group" aria-label={t("Teilnahmerückmeldungen", "Attendance responses")}>
    {rsvpKeys.map(value => <span key={value} data-response={value}><i aria-hidden="true" /><strong>{counts[value]}</strong> {attendanceLabel(value, counts[value], t)}</span>)}
    {counts.awaiting > 0 && <span data-response="awaiting"><i aria-hidden="true" /><strong>{counts.awaiting}</strong>{" "}
      {responseOpen ? t("offen", "awaiting") : t("ohne Antwort", "no response")}</span>}
  </div>;
}

function NoResults({ t, clear }: { t: Text; clear: () => void }) {
  return <Empty icon={Search} title={t("Keine Treffer", "No results")}>
    <Action onClick={clear}>{t("Filter zurücksetzen", "Reset filters")}</Action>
  </Empty>;
}

function Metric({ icon: Icon, count, label, onClick }: { icon: LucideIcon; count: number; label: string; onClick: () => void }) {
  return <button type="button" className={styles.metric} onClick={onClick}>
    <Icon size={18} aria-hidden="true" /><strong>{count}</strong><span>{label}</span><ArrowRight size={16} aria-hidden="true" />
  </button>;
}

function AttentionItem({ icon: Icon, title, detail, tone, action }: {
  icon: LucideIcon; title: string; detail?: ReactNode; tone?: "amber" | "blue"; action: ReactNode;
}) {
  return <li className={styles.attentionItem}>
    <span className={styles.attentionIcon} data-tone={tone ?? "blue"}><Icon size={18} aria-hidden="true" /></span>
    <div><strong>{title}</strong>{detail && <small>{detail}</small>}</div>
    {action}
  </li>;
}

function AttentionQueue({ workspace, language, t, open }: Pick<ViewProps, "workspace" | "language" | "t" | "open">) {
  const { shortDate } = useClubDates(language);
  const { pendingInvites, expiredInvites, missingResults, unpublishedResults, training } = clubAttention(workspace);
  const owner = workspace.actor.owner;
  const missing = workspace.capabilities.manage ? missingResults.filter(match => managesTeam(workspace.actor, match.teamId)) : [];
  const unpublished = workspace.capabilities.manage ? unpublishedResults.filter(match => managesTeam(workspace.actor, match.teamId)) : [];
  const firstPending = pendingInvites[0];
  const firstExpired = expiredInvites[0];
  const firstMissing = missing[0];
  const firstUnpublished = unpublished[0];
  if (!training && !firstPending && !firstExpired && !firstMissing && !firstUnpublished) return null;

  function inviteName(invite: ClubInvite) {
    return workspace.people.some(person => person.id === invite.id)
      ? <RecordLink owner={owner} kind="people" id={invite.id}>{invite.name}</RecordLink> : invite.name;
  }

  return <section className={styles.attentionPanel} aria-label={t("Handlungsbedarf", "Needs attention")}>
    <h2><ListChecks size={19} aria-hidden="true" />{t("Handlungsbedarf", "Needs attention")}</h2>
    <ul className={styles.attentionList}>
      {training && <AttentionItem icon={CalendarClock} title={t("Rückmeldungen offen", "RSVPs pending")}
        detail={<>{training.entry.title} · {training.awaiting}/{training.total}</>}
        action={<ActionLink href={clubRecordHref(owner, { kind: "trainings", id: training.entry.id })}>{t("Teilnahmen ansehen", "Review RSVPs")}</ActionLink>} />}
      {firstMissing && <AttentionItem icon={ClipboardPenLine} tone="amber"
        title={missing.length === 1 ? t("Ergebnis fehlt", "Result missing") : missing.length + " " + t("Ergebnisse fehlen", "missing results")}
        detail={<><RecordLink owner={owner} kind="matches" id={firstMissing.id}>{firstMissing.opponent}</RecordLink> · {shortDate(firstMissing.startsAt)}</>}
        action={<Action onClick={() => open({ kind: "matches", item: firstMissing, finish: true })}>{t("Ergebnis erfassen", "Record result")}</Action>} />}
      {firstUnpublished && <AttentionItem icon={Globe}
        title={unpublished.length === 1 ? t("Ergebnis unveröffentlicht", "Unpublished result") : unpublished.length + " " + t("unveröffentlichte Ergebnisse", "unpublished results")}
        detail={<><RecordLink owner={owner} kind="matches" id={firstUnpublished.id}>{firstUnpublished.opponent}</RecordLink> · {shortDate(firstUnpublished.startsAt)}</>}
        action={<Action onClick={() => open({ kind: "matches", item: firstUnpublished })}>{t("Sichtbarkeit prüfen", "Review visibility")}</Action>} />}
      {firstExpired && <AttentionItem icon={MailX} tone="amber"
        title={expiredInvites.length === 1 ? t("Einladung abgelaufen", "Invitation expired") : expiredInvites.length + " " + t("abgelaufene Einladungen", "expired invitations")}
        detail={inviteName(firstExpired)}
        action={<Action onClick={() => open({ kind: "invite", previous: firstExpired })}>{t("Link erneuern", "Renew link")}</Action>} />}
      {firstPending && <AttentionItem icon={Mail}
        title={pendingInvites.length === 1 ? t("Einladung offen", "Pending invitation") : pendingInvites.length + " " + t("offene Einladungen", "pending invitations")}
        detail={inviteName(firstPending)}
        action={<ActionLink href={clubManagementHref(owner) + "?view=people#club-invitations"}>{t("Einladungen ansehen", "Review invites")}</ActionLink>} />}
    </ul>
  </section>;
}

export function OverviewView({ workspace, language, t, open, navigate }: ViewProps) {
  const { eventDate, eventTime } = useClubDates(language);
  const now = new Date().toISOString();
  const next = workspace.trainings.filter(training => training.endsAt >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const fixtures = workspace.matches.filter(match => match.status === "scheduled" && match.startsAt >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 3);
  const results = workspace.matches.filter(match => match.status === "final" && match.ourScore !== null && match.theirScore !== null)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 3);
  const upcoming = workspace.trainings.filter(training => training.endsAt >= now).length;
  const teamAvailable = workspace.teams.some(team => managesTeam(workspace.actor, team.id));
  return <div className={styles.overview}>
    <div className={styles.overviewTop}>
      <section className={styles.nextTraining} aria-label={t("Nächstes Training", "Next training")}>
        <div className={styles.nextLead}><CalendarClock size={18} aria-hidden="true" /><span>{t("Nächstes Training", "Next training")}</span></div>
        {next ? <>
          <div className={styles.nextHeading}>
            <div>
              <h2><RecordLink owner={workspace.actor.owner} kind="trainings" id={next.id}>{next.title}</RecordLink></h2>
              <div className={styles.nextMeta}>
                <span><Clock3 size={15} aria-hidden="true" />{eventDate(next.startsAt)} – {eventTime(next.endsAt)}</span>
                {next.location && <span><MapPin size={15} aria-hidden="true" />{next.location}</span>}
                <TeamLabel workspace={workspace} id={next.teamId} />
              </div>
            </div>
            <DateBadge iso={next.startsAt} language={language} />
          </div>
          <div className={styles.nextActions}>
            <Participation training={next} workspace={workspace} t={t} />
            <Action icon={Users} onClick={() => open({ kind: "attendance", id: next.id })}>{t("Teilnahmen", "Attendance")}</Action>
          </div>
        </> : <>
          <h2>{t("Kein Training geplant", "No training scheduled")}</h2>
          {workspace.capabilities.manage && <div className={styles.nextActions}>
            <Action icon={Plus} onClick={() => open({ kind: teamAvailable ? "trainings" : "teams" })}>
              {teamAvailable ? t("Training anlegen", "Add training") : t("Team anlegen", "Add team")}
            </Action>
          </div>}
        </>}
      </section>
      <div className={styles.metrics}>
        <Metric icon={Users} count={workspace.people.length} label={t("Personen", "People")} onClick={() => navigate("people")} />
        <Metric icon={Shield} count={workspace.teams.length} label={t("Teams", "Teams")} onClick={() => navigate("teams")} />
        <Metric icon={CalendarDays} count={upcoming} label={t("Kommende Trainings", "Upcoming training")} onClick={() => navigate("trainings")} />
      </div>
    </div>
    <AttentionQueue workspace={workspace} language={language} t={t} open={open} />
    <div className={styles.overviewLower}>
      <section className={styles.summaryPanel}>
        <header><h2><Flag size={18} aria-hidden="true" />{t("Nächste Spiele", "Upcoming fixtures")}</h2>
          <IconAction icon={ArrowRight} label={t("Spieltermine öffnen", "Open fixtures")} onClick={() => navigate("fixtures")} /></header>
        {fixtures.length ? <ul className={styles.previewList}>
          {fixtures.map(match => <li key={match.id}><DateBadge iso={match.startsAt} language={language} /><div>
            <strong><RecordLink owner={workspace.actor.owner} kind="matches" id={match.id}>{match.opponent}</RecordLink></strong>
            <span><TeamLabel workspace={workspace} id={match.teamId} /></span></div>
            <time dateTime={match.startsAt}>{eventTime(match.startsAt)}</time></li>)}
        </ul> : <p className={styles.summaryEmpty}>{t("Keine kommenden Spieltermine.", "No upcoming fixtures.")}</p>}
      </section>
      <section className={styles.summaryPanel}>
        <header><h2><Trophy size={18} aria-hidden="true" />{t("Letzte Ergebnisse", "Recent results")}</h2>
          <IconAction icon={ArrowRight} label={t("Ergebnisse öffnen", "Open results")} onClick={() => navigate("fixtures")} /></header>
        {results.length ? <ul className={styles.previewList}>
          {results.map(match => <li key={match.id}><DateBadge iso={match.startsAt} language={language} /><div>
            <strong><RecordLink owner={workspace.actor.owner} kind="matches" id={match.id}>{match.opponent}</RecordLink></strong>
            <span><TeamLabel workspace={workspace} id={match.teamId} /></span></div>
            <strong className={styles.previewScore}>{match.ourScore}–{match.theirScore}</strong></li>)}
        </ul> : <p className={styles.summaryEmpty}>{t("Noch keine Ergebnisse eingetragen.", "No results recorded yet.")}</p>}
      </section>
    </div>
  </div>;
}

function PersonStatus({ person, t }: { person: ClubPerson; t: Text }) {
  const tone = person.status === "active" ? "success" : person.status === "invited" ? "warning" : "neutral";
  return <Chip tone={tone}>{t(...statusLabels[person.status])}</Chip>;
}

function InvitationRow({ invite, workspace, language, open, t }: {
  invite: ClubInvite; workspace: ClubWorkspace; language: Language; open: ViewProps["open"]; t: Text;
}) {
  const { shortDate } = useClubDates(language);
  const expired = Date.parse(invite.expiresAt) <= Date.now();
  const person = workspace.people.find(entry => entry.id === invite.id);
  return <li className={styles.inviteRow}>
    <ClubAvatar person={invite} />
    <div className={styles.rowTitle}><strong>{person ? <RecordLink owner={workspace.actor.owner} kind="people" id={person.id}>{invite.name}</RecordLink> : invite.name}</strong>
      <span>{invite.email}</span></div>
    <span className={styles.rowMeta}>{t(...roleLabels[invite.role])}</span>
    <div className={styles.inviteStatus}><Chip tone={expired ? "neutral" : "warning"}>{expired ? t("Abgelaufen", "Expired") : t("Offen", "Pending")}</Chip>
      <time dateTime={invite.expiresAt}>{shortDate(invite.expiresAt)}</time></div>
    <div className={styles.inviteActions}>
      {expired ? <>
        <Action onClick={() => open({ kind: "invite", previous: invite })}>{t("Erneuern", "Renew")}</Action>
        <IconAction icon={X} label={t("Einladung widerrufen", "Revoke invitation") + " · " + invite.name} onClick={() => open({ kind: "revoke", invite })} />
      </> : <Action tone="quiet" onClick={() => open({ kind: "revoke", invite })}>{t("Widerrufen", "Revoke")}</Action>}
    </div>
  </li>;
}

export function PeopleView({ workspace, language, t, open, query, teamId, clearFilters }: ViewProps) {
  const matches = textFilter(language, query);
  const people = workspace.people.filter(person => (!teamId || person.teamIds.includes(teamId)) &&
    matches(person.name, person.email, person.position, t(...roleLabels[person.role]), ...person.teamIds.map(id => teamFor(workspace, id)?.name)))
    .sort((a, b) => a.name.localeCompare(b.name, language));
  const invites = workspace.invites.filter(invite => (!teamId || workspace.people.some(person => person.id === invite.id && person.teamIds.includes(teamId))) &&
    matches(invite.name, invite.email, t(...roleLabels[invite.role])))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const invitationList = workspace.capabilities.invite && invites.length > 0;
  return <div className={styles.viewStack}>
    {people.length ? <section className={styles.panel} aria-label={t("Mitgliederliste", "People list")}>
      <div className={styles.peopleTableHead} aria-hidden="true">
        <span>{t("Person", "Person")}</span><span>{t("Teams", "Teams")}</span><span>{t("Status", "Status")}</span>
      </div>
      <ul className={styles.recordList}>
        {people.map(person => <li key={person.id} className={styles.personRow}>
          <div className={styles.personIdentity}><ClubAvatar person={person} photo={person.avatar} owner={workspace.actor.owner} />
            <div className={styles.rowTitle}><strong><RecordLink owner={workspace.actor.owner} kind="people" id={person.id}>{person.name}</RecordLink></strong><span>
              {t(...roleLabels[person.role])}{person.position ? " · " + person.position : ""}{person.jersey !== null ? " · #" + person.jersey : ""}
            </span></div>
          </div>
          <div className={styles.rowTags}>{person.teamIds.map(id => <TeamLabel workspace={workspace} id={id} key={id} />)}</div>
          <PersonStatus person={person} t={t} />
          {workspace.capabilities.manage && editsPerson(workspace.actor, person) && <IconAction icon={Pencil}
            label={t("Bearbeiten", "Edit") + " " + person.name} onClick={() => open({ kind: "people", item: person })} />}
        </li>)}
      </ul>
    </section> : (query || teamId) && !invitationList ? <NoResults t={t} clear={clearFilters} /> : !invitationList &&
      <Empty icon={Users} title={t("Noch keine Personen", "No people yet")}>
        {workspace.capabilities.invite && <Action tone="primary" icon={Plus} onClick={() => open({ kind: "invite" })}>{t("Person einladen", "Invite someone")}</Action>}
      </Empty>}
    {invitationList && <section id="club-invitations" className={styles.panel} aria-label={t("Einladungen", "Invitations")}>
      <div className={styles.panelHead}><h2>{t("Einladungen", "Invitations")} <span>{invites.length}</span></h2></div>
      <ul className={styles.recordList}>{invites.map(invite => <InvitationRow key={invite.id} invite={invite} workspace={workspace} language={language} open={open} t={t} />)}</ul>
    </section>}
  </div>;
}

export function TeamsView({ workspace, language, t, open, query, clearFilters }: ViewProps) {
  const matches = textFilter(language, query);
  const teams = workspace.teams.filter(team => matches(team.name, team.shortName, team.description, team.category, team.competition, team.season, team.homeVenue))
    .sort((a, b) => a.name.localeCompare(b.name, language));
  if (!teams.length) return query ? <NoResults t={t} clear={clearFilters} /> : <Empty icon={Shield} title={t("Noch keine Teams", "No teams yet")}>
    {workspace.capabilities.manage && <Action tone="primary" icon={Plus} onClick={() => open({ kind: "teams" })}>{t("Team anlegen", "Add team")}</Action>}
  </Empty>;
  return <ul className={styles.teamGrid}>
    {teams.map(team => {
      const memberCount = workspace.people.filter(person => person.teamIds.includes(team.id)).length;
      const managers = workspace.people.filter(person => person.status === "active" && team.managerIds.includes(person.id));
      const competition = [team.category, team.competition, team.season].filter(Boolean).join(" · ");
      return <li key={team.id} className={styles.teamCard}>
        <div className={styles.teamCardHead}>
          <TeamTag team={team} />
          {workspace.capabilities.manage && managesTeam(workspace.actor, team.id) && <IconAction icon={Pencil}
            label={t("Bearbeiten", "Edit") + " " + team.name} onClick={() => open({ kind: "teams", item: team })} />}
        </div>
        <h2><RecordLink owner={workspace.actor.owner} kind="teams" id={team.id}>{team.name}</RecordLink></h2>
        {competition && <p className={styles.teamCompetition}>{competition}</p>}
        {team.description && <p className={styles.clamp}>{team.description}</p>}
        <div className={styles.teamFooter}>
          <Action tone="quiet" icon={Users} onClick={() => open({ kind: "roster", id: team.id })}>
            {memberCount} {memberCount === 1 ? t("Person", "person") : t("Personen", "people")}
          </Action>
          {managers.length > 0 && <span title={t("Coaches", "Coaches")}>{managers.map((person, index) => <span key={person.id}>
            {index > 0 && ", "}<RecordLink owner={workspace.actor.owner} kind="people" id={person.id}>{person.name}</RecordLink>
          </span>)}</span>}
        </div>
      </li>;
    })}
  </ul>;
}

function EventEmpty({ type, workspace, t, open }: { type: "trainings" | "matches"; workspace: ClubWorkspace; t: Text; open: ViewProps["open"] }) {
  const available = workspace.teams.some(team => managesTeam(workspace.actor, team.id));
  const training = type === "trainings";
  return <Empty icon={training ? CalendarDays : Flag} title={training ? t("Noch keine Trainings", "No training sessions yet") : t("Noch keine Spiele", "No fixtures yet")}>
    {workspace.capabilities.manage && <Action tone="primary" icon={Plus} onClick={() => open({ kind: available ? type : "teams" })}>
      {available ? training ? t("Training anlegen", "Add training") : t("Spiel anlegen", "Add fixture") : t("Team anlegen", "Add team")}
    </Action>}
  </Empty>;
}

export function TrainingsView({ workspace, language, t, open, query, teamId, clearFilters }: ViewProps) {
  const { eventTime } = useClubDates(language);
  const matches = textFilter(language, query);
  const sessions = schedule(workspace.trainings.filter(training => (!teamId || training.teamId === teamId) &&
    matches(training.title, training.location, training.details, training.equipment, teamFor(workspace, training.teamId)?.name)));
  if (!sessions.length) return query || teamId ? <NoResults t={t} clear={clearFilters} /> : <EventEmpty type="trainings" workspace={workspace} t={t} open={open} />;
  return <section className={styles.panel} aria-label={t("Trainingsliste", "Training list")}>
    <ul className={styles.recordList}>
      {sessions.map(training => <li key={training.id} className={styles.eventRow}>
        <DateBadge iso={training.startsAt} language={language} />
        <div className={styles.eventBody}>
          <strong><RecordLink owner={workspace.actor.owner} kind="trainings" id={training.id}>{training.title}</RecordLink></strong>
          <div className={styles.eventMeta}>
            <TeamLabel workspace={workspace} id={training.teamId} />
            <span><Clock3 size={14} aria-hidden="true" />{eventTime(training.startsAt)} – {eventTime(training.endsAt)}</span>
            {training.location && <span><MapPin size={14} aria-hidden="true" />{training.location}</span>}
          </div>
        </div>
        <Participation training={training} workspace={workspace} t={t} />
        <div className={styles.rowActions}>
          <IconAction icon={Users} label={t("Teilnahmen", "Attendance") + " · " + training.title} onClick={() => open({ kind: "attendance", id: training.id })} />
          {workspace.capabilities.manage && managesTeam(workspace.actor, training.teamId) && <IconAction icon={Pencil}
            label={t("Bearbeiten", "Edit") + " " + training.title} onClick={() => open({ kind: "trainings", item: training })} />}
        </div>
      </li>)}
    </ul>
  </section>;
}

function MatchState({ match, t }: { match: ClubMatch; t: Text }) {
  const tone = match.status === "final" ? "success" : match.status === "cancelled" ? "danger" : "neutral";
  return <div className={styles.rowTags}>
    <Chip tone={tone}>{t(...matchLabels[match.status])}</Chip>
    <Chip tone={match.public ? "info" : "neutral"}>{match.public ? t("Öffentlich", "Public") : t("Intern", "Internal")}</Chip>
  </div>;
}

export function FixturesView({ workspace, language, t, open, query, teamId, clearFilters }: ViewProps) {
  const { eventTime } = useClubDates(language);
  const matches = textFilter(language, query);
  const fixtures = schedule(workspace.matches.filter(match => (!teamId || match.teamId === teamId) &&
    matches(match.opponent, match.venue, t(...matchLabels[match.status]), teamFor(workspace, match.teamId)?.name)));
  if (!fixtures.length) return query || teamId ? <NoResults t={t} clear={clearFilters} /> : <EventEmpty type="matches" workspace={workspace} t={t} open={open} />;
  return <section className={styles.panel} aria-label={t("Spielterminliste", "Fixtures list")}>
    <ul className={styles.recordList}>
      {fixtures.map(match => <li key={match.id} className={styles.eventRow} data-match>
        <DateBadge iso={match.startsAt} language={language} />
        <div className={styles.eventBody}>
          <strong><RecordLink owner={workspace.actor.owner} kind="matches" id={match.id}>{match.opponent}</RecordLink></strong>
          <div className={styles.eventMeta}>
            <TeamLabel workspace={workspace} id={match.teamId} />
            <span>{match.home ? t("Heimspiel", "Home") : t("Auswärts", "Away")}</span>
            {match.venue && <span><MapPin size={14} aria-hidden="true" />{match.venue}</span>}
          </div>
        </div>
        <div className={styles.resultBlock}>
          {match.status === "final" && match.ourScore !== null && match.theirScore !== null
            ? <strong className={styles.score} aria-label={t("Endstand", "Final score") + " " + match.ourScore + "–" + match.theirScore}>{match.ourScore}–{match.theirScore}</strong>
            : <time dateTime={match.startsAt}>{eventTime(match.startsAt)}</time>}
          <MatchState match={match} t={t} />
        </div>
        <div className={styles.rowActions}>
          {workspace.capabilities.manage && managesTeam(workspace.actor, match.teamId) && <IconAction icon={Pencil}
            label={t("Bearbeiten", "Edit") + " " + match.opponent} onClick={() => open({ kind: "matches", item: match })} />}
        </div>
      </li>)}
    </ul>
  </section>;
}

export function NewsView({ workspace, language, t, open, query, teamId, clearFilters }: ViewProps) {
  const { shortDate } = useClubDates(language);
  const matches = textFilter(language, query);
  const articles = workspace.news.filter(article => (!teamId || article.teamId === teamId) &&
    matches(article.title, article.titleEn, article.body, article.bodyEn, teamFor(workspace, article.teamId)?.name))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  const canCreate = workspace.capabilities.news && (isClubWide(workspace.actor) || workspace.teams.some(team => managesTeam(workspace.actor, team.id)));
  if (!articles.length) return query || teamId ? <NoResults t={t} clear={clearFilters} /> : <Empty icon={Newspaper} title={t("Noch keine Vereinsnews", "No club news yet")}>
    {canCreate && <Action tone="primary" icon={Plus} onClick={() => open({ kind: "news" })}>{t("News anlegen", "Add news")}</Action>}
  </Empty>;
  return <section className={styles.panel} aria-label={t("Vereinsnews", "Club news")}>
    <ul className={styles.recordList}>
      {articles.map(article => {
        const titleEn = language === "en" && article.titleEn;
        const bodyEn = language === "en" && article.bodyEn;
        const canEdit = workspace.capabilities.news && (article.teamId ? managesTeam(workspace.actor, article.teamId) : isClubWide(workspace.actor));
        return <li key={article.id} className={styles.articleRow}>
          <div className={styles.articleIcon}><Newspaper size={20} aria-hidden="true" /></div>
          <div>
            <h2 lang={titleEn ? "en" : "de"}>{titleEn || article.title}</h2>
            <p className={styles.clamp} lang={bodyEn ? "en" : "de"}>{bodyEn || article.body}</p>
            <div className={styles.eventMeta}>
              {article.teamId ? <TeamLabel workspace={workspace} id={article.teamId} /> : <Chip>{t("Gesamter Verein", "Whole club")}</Chip>}
              <Chip tone={article.published ? "success" : "neutral"}>{article.published ? t("Veröffentlicht", "Published") : t("Entwurf", "Draft")}</Chip>
              {article.pinned && <Chip tone="info">{t("Angeheftet", "Pinned")}</Chip>}
              <time dateTime={article.updatedAt}>{shortDate(article.updatedAt)}</time>
            </div>
          </div>
          {canEdit && <IconAction icon={Pencil} label={t("Bearbeiten", "Edit") + " " + (titleEn || article.title)} onClick={() => open({ kind: "news", item: article })} />}
        </li>;
      })}
    </ul>
  </section>;
}

function assignmentAccess(access: "view" | "edit", t: Text) {
  return access === "edit" ? t("Mitbearbeiten", "Edit access") : t("Ansehen", "View access");
}

export function TacticsView({ workspace, language, t, open, query, clearFilters }: ViewProps) {
  if (!workspace.capabilities.coachStudio) return null;
  const canAssign = canAssignClubPlays(workspace);
  const matches = textFilter(language, query);
  const plays = workspace.plays.map(play => ({ ...play, ...play.copy?.[language] }))
    .filter(play => matches(play.title, play.description));
  const assignments = workspace.assignments.flatMap(assignment => {
    const play = workspace.plays.find(item => item.id === assignment.playId);
    const target = assignment.targetType === "team" ? teamFor(workspace, assignment.targetId)?.name :
      workspace.people.find(person => person.id === assignment.targetId)?.name;
    const title = play?.copy?.[language].title ?? play?.title;
    return matches(title, target, assignment.instructions, assignmentAccess(assignment.access, t)) ? [{ assignment, play, target, title }] : [];
  }).sort((a, b) => b.assignment.updatedAt.localeCompare(a.assignment.updatedAt));
  const coachHref = workspace.actor.owner ? "/admin/coach" : "/members/coach";
  if (!plays.length && !assignments.length) return query ? <NoResults t={t} clear={clearFilters} /> :
    <Empty icon={Layers3} title={t("Noch keine Taktiken", "No plays yet")}>
      {canAssign && <ActionLink href={coachHref} icon={ArrowUpRight}>{t("Coach Studio öffnen", "Open Coach Studio")}</ActionLink>}
    </Empty>;
  return <div className={styles.viewStack}>
    {assignments.length > 0 && <section className={styles.panel}>
      <div className={styles.panelHead}><h2>{t("Zuweisungen", "Assignments")} <span>{assignments.length}</span></h2></div>
      <ul className={styles.recordList}>
        {assignments.map(({ assignment, play, target, title }) => <li key={assignment.id} className={styles.articleRow}>
          <div className={styles.articleIcon}><Target size={20} aria-hidden="true" /></div>
          <div>
            <h2>{play ? <a href={play.href}>{title}</a> : t("Taktik", "Play")}</h2>
            <div className={styles.eventMeta}>
              <span>{assignment.targetType === "team" ? t("Team", "Team") : t("Person", "Person")} {target ? "· " + target : ""}</span>
              <Chip tone={assignment.access === "edit" ? "info" : "neutral"}>{assignmentAccess(assignment.access, t)}</Chip>
            </div>
            {assignment.instructions && <p className={styles.clamp}>{assignment.instructions}</p>}
          </div>
          {canAssign && <IconAction icon={Pencil} label={t("Zuweisung bearbeiten", "Edit assignment")}
            onClick={() => open({ kind: "assignments", item: assignment })} />}
        </li>)}
      </ul>
    </section>}
    {plays.length > 0 && <section className={styles.panel}>
      <div className={styles.panelHead}><h2>Playbook <span>{plays.length}</span></h2>
        {canAssign && <ActionLink icon={ArrowUpRight} href={coachHref}>Coach Studio</ActionLink>}</div>
      <ul className={styles.recordList}>
        {plays.map(play => <li key={play.id} className={styles.articleRow}>
          <div className={styles.articleIcon}><Layers3 size={20} aria-hidden="true" /></div>
          <div>
            <h2><a href={play.href}>{play.title}</a></h2>
            {play.description && <p className={styles.clamp}>{play.description}</p>}
            <div className={styles.eventMeta}><span>{play.phaseCount} {play.phaseCount === 1 ? t("Phase", "phase") : t("Phasen", "phases")}</span></div>
          </div>
          {canAssign && play.canAssign && <Action icon={Plus} onClick={() => open({ kind: "assignments", playId: play.id })}>
            {t("Zuweisen", "Assign")}
          </Action>}
        </li>)}
      </ul>
    </section>}
  </div>;
}
