"use client";

import Link from "next/link";
import {
  ArrowLeft, CalendarClock, CalendarDays, Check, ChevronRight, CircleHelp, ClipboardList, Clock3,
  Flag, Globe, LockKeyhole, Mail, MapPin, Minus, Pencil, Plus, Shield, Shirt, Trophy, UserPlus,
  UserRound, UsersRound, X, type LucideIcon,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { ClubMatch, ClubPerson, ClubTeam, ClubTraining, ClubWorkspace } from "@/lib/club/model";
import { clubManagementHref, clubRecordHref, trainingReadiness, type ClubRecordRef } from "@/lib/club/records";
import {
  editsPerson, isClubWide, managesTeam, matchLabels, responseLabels, roleLabels, statusLabels, textFilter, useClubDates,
  type ClubDialog, type Language, type Text,
} from "./club-admin-data";
import { Action, Chip, ClubAvatar, DateBadge, SearchField } from "./club-admin-ui";
import styles from "./club-record-detail.module.css";

type Props = {
  workspace: ClubWorkspace;
  detail: ClubRecordRef;
  language: Language;
  t: Text;
  open: (dialog: ClubDialog) => void;
};
type Context = Omit<Props, "detail">;
type Kind = ClubRecordRef["kind"];
type Readiness = ReturnType<typeof trainingReadiness>;

const collections = {
  teams: { view: "teams", label: ["Alle Teams", "All teams"], icon: UsersRound },
  people: { view: "people", label: ["Alle Personen", "All people"], icon: UserRound },
  trainings: { view: "trainings", label: ["Alle Trainings", "All training sessions"], icon: CalendarClock },
  matches: { view: "fixtures", label: ["Alle Spieltermine", "All fixtures"], icon: Trophy },
} as const;

const responses = ["yes", "maybe", "no", "awaiting"] as const;
type ResponseGroup = (typeof responses)[number];
type ResponseFilter = ResponseGroup | "all";
const responseIcons = { yes: Check, maybe: CircleHelp, no: X, awaiting: Minus };

function responseLabel(response: ResponseGroup, t: Text, closed = false) {
  switch (response) {
    case "yes": return t("Zusagen", "Going");
    case "maybe": return t("Vielleicht", "Maybe");
    case "no": return t("Absagen", "Declined");
    case "awaiting": return closed ? t("Ohne Antwort", "No response") : t("Ausstehend", "Awaiting");
  }
}

function clubListHref(owner: boolean, kind: Kind, teamId?: string) {
  const list = clubManagementHref(owner) + "?view=" + collections[kind].view;
  return teamId ? list + "&team=" + encodeURIComponent(teamId) : list;
}

function DetailHeading({ kind, owner, title, mark, meta, children, t }: {
  kind: Kind; owner: boolean; title: string; mark?: ReactNode; meta?: ReactNode; children?: ReactNode; t: Text;
}) {
  const { icon: Icon, label } = collections[kind];
  return <header className={styles.detailHeading}>
    <Link href={clubListHref(owner, kind)} className={styles.backLink} prefetch={false}>
      <ArrowLeft size={16} aria-hidden="true" />{t(label[0], label[1])}
    </Link>
    <div className={styles.headingRow}>
      <div className={styles.identity}>
        {mark ?? <span className={styles.headingIcon}><Icon size={26} aria-hidden="true" /></span>}
        <div className={styles.headingText}><h1>{title}</h1>{meta && <div className={styles.badges}>{meta}</div>}</div>
      </div>
      {children && <div className={styles.headingActions}>{children}</div>}
    </div>
  </header>;
}

function Panel({ icon: Icon, title, action, children, className }: {
  icon: LucideIcon; title: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={[styles.panel, className].filter(Boolean).join(" ")}>
    <header className={styles.panelHeader}><h2><Icon size={18} aria-hidden="true" />{title}</h2>{action}</header>
    {children}
  </section>;
}

function TeamMark({ team }: { team: ClubTeam }) {
  const color = /^#[\da-f]{6}$/iu.test(team.color) ? team.color : "#426655";
  const initials = team.name.trim().split(/\s+/u).slice(0, 3).map(part => Array.from(part)[0]).join("");
  const abbreviation = Array.from(team.shortName || initials).slice(0, 3).join("").toLocaleUpperCase();
  return <span className={styles.teamMark} aria-hidden="true" style={{ "--record-team": color } as CSSProperties}>{abbreviation}</span>;
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return <div className={styles.fact}>
    <dt><Icon size={16} aria-hidden="true" />{label}</dt><dd>{children}</dd>
  </div>;
}

function TeamLink({ team, owner }: { team: ClubTeam; owner: boolean }) {
  return <Link href={clubRecordHref(owner, { kind: "teams", id: team.id })} prefetch={false} className={styles.textLink}>{team.name}</Link>;
}

function PersonRow({ person, owner, meta, end }: { person: ClubPerson; owner: boolean; meta: string; end?: ReactNode }) {
  return <li>
    <Link href={clubRecordHref(owner, { kind: "people", id: person.id })} prefetch={false} className={styles.personRow}>
      <ClubAvatar person={person} photo={person.avatar} owner={owner} />
      <span className={styles.rowCopy}><strong>{person.name}</strong><small>{meta}</small></span>
      {end && <span className={styles.rowEnd}>{end}</span>}
      <ChevronRight className={styles.chevron} size={16} aria-hidden="true" />
    </Link>
  </li>;
}

function StatusChip({ status, t }: { status: ClubPerson["status"]; t: Text }) {
  const tone = status === "active" ? "success" : status === "invited" ? "warning" : "neutral";
  return <Chip tone={tone}>{t(...statusLabels[status])}</Chip>;
}

function ResponseSummary({ readiness, t, closed, filter, onFilter }: {
  readiness: Readiness; t: Text; closed?: boolean; filter?: ResponseFilter; onFilter?: (key: ResponseGroup) => void;
}) {
  return <div className={styles.responseSummary}>
    {readiness.total > 0 && <div className={styles.responseTrack} aria-hidden="true">
      {responses.filter(key => readiness.counts[key] > 0).map(key =>
        <span key={key} data-response={key} style={{ flexGrow: readiness.counts[key] }} />)}
    </div>}
    <div className={styles.responseGrid}>
      {responses.map(key => {
        const Icon = responseIcons[key];
        const label = responseLabel(key, t, closed);
        const content = <><span className={styles.responseCount}><Icon size={14} aria-hidden="true" /><strong>{readiness.counts[key]}</strong></span><span>{label}</span></>;
        return onFilter
          ? <button className={styles.responseStat} key={key} type="button" data-response={key} aria-pressed={filter === key} onClick={() => onFilter(key)}>{content}</button>
          : <div className={styles.responseStat} key={key} data-response={key}>{content}</div>;
      })}
    </div>
  </div>;
}

function EventRow({ item, kind, owner, language, title, location, score }: {
  item: ClubTraining | ClubMatch; kind: "trainings" | "matches"; owner: boolean; language: Language; title: string; location?: string; score?: string;
}) {
  const { eventTime } = useClubDates(language);
  return <li>
    <Link className={styles.eventRow} href={clubRecordHref(owner, { kind, id: item.id })} prefetch={false}>
      <DateBadge iso={item.startsAt} language={language} />
      <span className={styles.rowCopy}><strong>{title}</strong>
        {score ? location && <small>{location}</small> : <small>{eventTime(item.startsAt)}{location && <span> · {location}</span>}</small>}
      </span>
      {score && <strong className={styles.rowScore}>{score}</strong>}
      <ChevronRight className={styles.chevron} size={16} aria-hidden="true" />
    </Link>
  </li>;
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className={styles.emptyLine}>{children}</p>;
}

function Score({ match, t }: { match: ClubMatch; t: Text }) {
  if (match.ourScore === null || match.theirScore === null) {
    return <span className={styles.noScore}>{match.status === "cancelled" ? t("Abgesagt", "Cancelled") : t("vs.", "vs")}</span>;
  }
  return <strong className={styles.scoreNumber}>
    <span className={styles.visuallyHidden}>{t(`Ergebnis ${match.ourScore} zu ${match.theirScore}`, `Score ${match.ourScore} to ${match.theirScore}`)}</span>
    <span aria-hidden="true">{match.ourScore}<span className={styles.scoreSeparator}>:</span>{match.theirScore}</span>
  </strong>;
}

function TeamDetail({ team, workspace, language, t, open }: Context & { team: ClubTeam }) {
  const { eventDate } = useClubDates(language);
  const { actor, people, trainings, matches, capabilities } = workspace;
  const owner = actor.owner;
  const canEdit = managesTeam(actor, team.id);
  const [query, setQuery] = useState("");
  const roster = people.filter(person => person.teamIds.includes(team.id)).sort((a, b) =>
    Number(b.status === "active") - Number(a.status === "active") || a.name.localeCompare(b.name, language));
  const coaches = people.filter(person => team.managerIds.includes(person.id)).sort((a, b) => a.name.localeCompare(b.name, language));
  const matchesQuery = textFilter(language, query);
  const filteredRoster = roster.filter(person => matchesQuery(person.name, person.position, person.jersey?.toString()));
  const now = Date.now();
  const upcomingTrainings = trainings.filter(item => item.teamId === team.id && Date.parse(item.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const upcomingMatches = matches.filter(item => item.teamId === team.id && item.status === "scheduled" && Date.parse(item.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const results = matches.filter(item => item.teamId === team.id && item.status === "final")
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const next = upcomingTrainings[0];
  const readiness = next?.attendance ? trainingReadiness(workspace, next) : null;
  const metadata = [
    { icon: UsersRound, label: t("Kategorie", "Category"), value: team.category },
    { icon: Trophy, label: t("Wettbewerb", "Competition"), value: team.competition },
    { icon: CalendarDays, label: t("Saison", "Season"), value: team.season },
    { icon: MapPin, label: t("Heimspielort", "Home venue"), value: team.homeVenue },
  ].filter(field => field.value);
  const rosterCount = roster.length === 1 ? t("1 Person", "1 person") : t(`${roster.length} Personen`, `${roster.length} people`);
  return <article className={styles.record}>
    <DetailHeading kind="teams" owner={owner} title={team.name} mark={<TeamMark team={team} />} t={t}>
      {canEdit && <Action icon={Pencil} tone="primary" onClick={() => open({ kind: "teams", item: team })}>{t("Team bearbeiten", "Edit team")}</Action>}
    </DetailHeading>
    <Panel icon={Shield} title={t("Teamprofil", "Team profile")} className={styles.teamProfile}>
      <div className={styles.panelBody}>
        {team.description && <p className={styles.prose}>{team.description}</p>}
        {metadata.length > 0 && <dl className={styles.facts}>{metadata.map(({ icon, label, value }) => <Fact key={label} icon={icon} label={label}>{value}</Fact>)}</dl>}
        <div className={styles.coaches}>
          <h3>{t("Coaches", "Coaches")}</h3>
          {coaches.length > 0 ? <ul className={styles.coachList}>
            {coaches.map(person => <li key={person.id}><Link href={clubRecordHref(owner, { kind: "people", id: person.id })} prefetch={false}>
              <ClubAvatar person={person} photo={person.avatar} owner={owner} /><span>{person.name}</span><ChevronRight size={14} aria-hidden="true" />
            </Link></li>)}
          </ul> : <p className={styles.muted}>{team.managerIds.length
            ? t("Für deinen Zugang sind keine Coachprofile sichtbar.", "No coach profiles are visible for your account.")
            : t("Noch keine Coaches zugewiesen.", "No coaches assigned yet.")}</p>}
        </div>
      </div>
    </Panel>
    <div className={styles.detailGrid}>
      <Panel icon={UsersRound} title={t("Kader", "Roster")} action={
        isClubWide(actor) && <Action icon={UsersRound} className={styles.smallAction} onClick={() => open({ kind: "roster", id: team.id })}>{t("Kader verwalten", "Manage roster")}</Action>
      }>
        <div className={styles.listTools}>
          <span>{rosterCount}</span>
          {roster.length > 5 && <SearchField value={query} onChange={setQuery} t={t} />}
        </div>
        {filteredRoster.length > 0 ? <ul className={styles.recordList} role="list">
          {filteredRoster.map(person => <PersonRow key={person.id} person={person} owner={owner}
            meta={person.position || t(...roleLabels[person.role])}
            end={<>{person.jersey !== null && <span className={styles.jersey}>
              <span className={styles.visuallyHidden}>{t("Trikotnummer", "Shirt number")} </span>{person.jersey}
            </span>}
              {person.status !== "active" && <StatusChip status={person.status} t={t} />}</>} />)}
        </ul> : <div className={styles.emptyBlock}>
          <p>{roster.length ? t("Keine passenden Personen im Kader.", "No matching people in the roster.") : t("Diesem Team sind noch keine Personen zugeordnet.", "No one has been assigned to this team yet.")}</p>
          {!roster.length && capabilities.invite && <Action icon={UserPlus} onClick={() => open({ kind: "invite", teamIds: [team.id] })}>{t("Person einladen", "Invite someone")}</Action>}
        </div>}
      </Panel>
      <div className={styles.stack}>
        {next && readiness && <section className={styles.readinessCard}>
          <h2><ClipboardList size={18} aria-hidden="true" />{t("Rückmeldungen zum nächsten Training", "Next training responses")}</h2>
          <Link className={styles.readinessLink} href={clubRecordHref(owner, { kind: "trainings", id: next.id })} prefetch={false}>
            <span><strong>{next.title}</strong><time dateTime={next.startsAt}>{eventDate(next.startsAt)}</time></span>
            <ChevronRight size={19} aria-hidden="true" />
          </Link>
          <ResponseSummary readiness={readiness} t={t} />
        </section>}
        <Panel icon={CalendarClock} title={t("Nächste Trainings", "Upcoming training")}
          action={canEdit && <Action icon={Plus} className={styles.smallAction} onClick={() => open({ kind: "trainings", teamId: team.id })}>{t("Training anlegen", "Add training")}</Action>}>
          {upcomingTrainings.length ? <ul className={styles.recordList} role="list">
            {upcomingTrainings.slice(0, 3).map(item => <EventRow key={item.id} item={item} kind="trainings" owner={owner} language={language} title={item.title} location={item.location} />)}
          </ul> : <EmptyLine>{t("Für dieses Team ist kein Training geplant.", "No training is scheduled for this team.")}</EmptyLine>}
          {upcomingTrainings.length > 3 && <Link className={styles.panelLink} href={clubListHref(owner, "trainings", team.id)} prefetch={false}>{t("Alle Trainings des Teams", "All team training sessions")}<ChevronRight size={16} aria-hidden="true" /></Link>}
        </Panel>
        <Panel icon={Trophy} title={t("Nächste Spiele", "Upcoming matches")}
          action={canEdit && <Action icon={Plus} className={styles.smallAction} onClick={() => open({ kind: "matches", teamId: team.id })}>{t("Spiel anlegen", "Add match")}</Action>}>
          {upcomingMatches.length ? <ul className={styles.recordList} role="list">
            {upcomingMatches.slice(0, 3).map(item => <EventRow key={item.id} item={item} kind="matches" owner={owner} language={language} title={item.opponent} location={item.venue} />)}
          </ul> : <EmptyLine>{t("Für dieses Team ist kein Spiel angesetzt.", "No match is scheduled for this team.")}</EmptyLine>}
          {upcomingMatches.length > 3 && <Link className={styles.panelLink} href={clubListHref(owner, "matches", team.id)} prefetch={false}>{t("Alle Spieltermine des Teams", "All team fixtures")}<ChevronRight size={16} aria-hidden="true" /></Link>}
        </Panel>
        <Panel icon={Flag} title={t("Letzte Ergebnisse", "Recent results")}>
          {results.length ? <ul className={styles.recordList} role="list">
            {results.slice(0, 3).map(item => <EventRow key={item.id} item={item} kind="matches" owner={owner} language={language} title={item.opponent} location={item.venue}
              score={item.ourScore !== null && item.theirScore !== null ? `${item.ourScore}:${item.theirScore}` : undefined} />)}
          </ul> : <EmptyLine>{t("Für dieses Team sind noch keine Ergebnisse erfasst.", "No results have been recorded for this team.")}</EmptyLine>}
        </Panel>
      </div>
    </div>
  </article>;
}

function PersonDetail({ person, workspace, t, open }: Context & { person: ClubPerson }) {
  const owner = workspace.actor.owner;
  const teams = workspace.teams.filter(team => person.teamIds.includes(team.id) || team.managerIds.includes(person.id));
  return <article className={styles.record}>
    <DetailHeading kind="people" owner={owner} title={person.name} t={t}
      mark={<span className={styles.personMark}><ClubAvatar key={`${person.id}:${person.revision}`} person={person} photo={person.avatar} owner={owner} /></span>}
      meta={<><Chip tone="info">{t(...roleLabels[person.role])}</Chip><StatusChip status={person.status} t={t} /></>}>
      {editsPerson(workspace.actor, person) && <Action icon={Pencil} tone="primary" onClick={() => open({ kind: "people", item: person })}>{t("Profil bearbeiten", "Edit profile")}</Action>}
    </DetailHeading>
    <div className={styles.detailGrid}>
      <Panel icon={UserRound} title={t("Sportliches Profil", "Sporting profile")}>
        <div className={styles.panelBody}>
          <dl className={styles.facts}>
            <Fact icon={Flag} label={t("Position", "Position")}>{person.position || t("Offen", "Pending")}</Fact>
            <Fact icon={Shirt} label={t("Trikotnummer", "Shirt number")}>{person.jersey ?? "–"}</Fact>
          </dl>
          <div className={styles.sectionCopy}>
            <h3>{t("Kurzprofil", "About")}</h3>
            <p className={person.bio ? styles.prose : styles.muted}>{person.bio || t("Hier ist Platz für eine kurze Vorstellung.", "A short introduction can be added here.")}</p>
          </div>
        </div>
      </Panel>
      <div className={styles.stack}>
        <Panel icon={UsersRound} title={t("Mannschaften", "Teams")}>
          {teams.length > 0 ? <ul className={styles.recordList} role="list">
            {teams.map(team => <li key={team.id}>
              <Link className={styles.teamRow} href={clubRecordHref(owner, { kind: "teams", id: team.id })} prefetch={false}>
                <TeamMark team={team} />
                <span className={styles.rowCopy}><strong>{team.name}</strong>{team.category && <small>{team.category}</small>}</span>
                {team.managerIds.includes(person.id) && <Chip tone="info">Coach</Chip>}
                <ChevronRight className={styles.chevron} size={16} aria-hidden="true" />
              </Link>
            </li>)}
          </ul> : <EmptyLine>{t("Für dieses Profil ist noch kein Team hinterlegt.", "This profile has no teams assigned yet.")}</EmptyLine>}
        </Panel>
        {person.email && <Panel icon={Mail} title={t("Kontakt", "Contact")}>
          <div className={styles.panelBody}>
            <dl className={styles.facts}>
              <Fact icon={Mail} label={t("E-Mail-Adresse", "Email address")}><a href={`mailto:${person.email}`} className={styles.textLink}>{person.email}</a></Fact>
            </dl>
          </div>
        </Panel>}
      </div>
    </div>
  </article>;
}

function TrainingAttendance({ training, workspace, language, t }: Pick<Context, "workspace" | "language" | "t"> & { training: ClubTraining }) {
  const [filter, setFilter] = useState<ResponseFilter>("all");
  if (!training.attendance) return <Panel icon={ClipboardList} title={t("Rückmeldungen", "Responses")} className={styles.trainingAttendance}>
    <EmptyLine>{t("Für diese Ansicht sind keine Rückmeldungen verfügbar.", "Responses are unavailable in this view.")}</EmptyLine>
  </Panel>;
  const readiness = trainingReadiness(workspace, training);
  const closed = Date.parse(training.startsAt) <= Date.now();
  const rows = readiness.rows.filter(row => filter === "all" || (row.response ?? "awaiting") === filter)
    .sort((a, b) => a.person.name.localeCompare(b.person.name, language));
  return <Panel icon={ClipboardList} title={t("Rückmeldungen", "Responses")} className={styles.trainingAttendance}
    action={<Action type="button" className={styles.smallAction} tone={filter === "all" ? "secondary" : "quiet"}
      aria-pressed={filter === "all"} onClick={() => setFilter("all")}>{t("Alle", "All")} · {readiness.total}</Action>}>
    <div className={styles.attendanceIntro}>
      <ResponseSummary readiness={readiness} t={t} closed={closed} filter={filter} onFilter={key => setFilter(current => current === key ? "all" : key)} />
    </div>
    {rows.length ? <ul className={styles.recordList} role="list">
      {rows.map(({ person, response }) => {
        const key = response ?? "awaiting";
        const Icon = responseIcons[key];
        return <PersonRow key={person.id} person={person} owner={workspace.actor.owner}
          meta={person.position || t(...roleLabels[person.role])}
          end={<span className={styles.responseChip} data-response={key}><Icon size={14} aria-hidden="true" />
            {response ? t(...responseLabels[response]) : responseLabel("awaiting", t, closed)}</span>} />;
      })}
    </ul> : <EmptyLine>{readiness.total
      ? t("In dieser Gruppe ist niemand eingetragen.", "No one is in this group.")
      : t("Für dieses Training gibt es noch keinen aktiven Kader.", "There is no active roster for this training yet.")}</EmptyLine>}
  </Panel>;
}

function TrainingDetail({ training, workspace, language, t, open }: Context & { training: ClubTraining }) {
  const { formatClubDate, eventTime } = useClubDates(language);
  const owner = workspace.actor.owner;
  const team = workspace.teams.find(item => item.id === training.teamId);
  const canEdit = managesTeam(workspace.actor, training.teamId);
  const day = formatClubDate(training.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const endDay = formatClubDate(training.endsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const endsNextDay = day !== endDay;
  return <article className={styles.record}>
    <DetailHeading kind="trainings" owner={owner} title={training.title} t={t}>
      {training.attendance && <Action icon={ClipboardList} onClick={() => open({ kind: "attendance", id: training.id })}>{t("Teilnahme öffnen", "Open attendance")}</Action>}
      {canEdit && <Action icon={Pencil} tone="primary" onClick={() => open({ kind: "trainings", item: training })}>{t("Training bearbeiten", "Edit training")}</Action>}
    </DetailHeading>
    <dl className={styles.sessionFacts}>
      <Fact icon={CalendarDays} label={t("Datum", "Date")}><time dateTime={training.startsAt}>{day}</time></Fact>
      <Fact icon={Clock3} label={t("Ortszeit", "Local time")}><time dateTime={training.startsAt}>{eventTime(training.startsAt)}</time>
        <span>–</span><time dateTime={training.endsAt}>{eventTime(training.endsAt)}</time>
        {endsNextDay && <span className={styles.endDate}>{endDay}</span>}
      </Fact>
      <Fact icon={MapPin} label={t("Treffpunkt", "Meeting point")}>{training.location || t("Ort offen", "Venue pending")}</Fact>
      {team && <Fact icon={UsersRound} label={t("Mannschaft", "Team")}><TeamLink team={team} owner={owner} /></Fact>}
    </dl>
    <div className={styles.trainingGrid}>
      <TrainingAttendance key={training.id} training={training} workspace={workspace} language={language} t={t} />
      <Panel icon={CalendarClock} title={t("Trainingsdetails", "Session details")} className={styles.trainingNotes}>
        <div className={styles.panelBody}>
          <div className={styles.sectionCopy}><h3>{t("Ablauf", "Plan")}</h3>
            <p className={training.details ? styles.prose : styles.muted}>{training.details || t("Der Ablauf kann über die Trainingsdaten ergänzt werden.", "Add a session plan in the training details.")}</p>
          </div>
          <div className={styles.sectionCopy}><h3>{t("Ausrüstung", "Equipment")}</h3>
            <p className={training.equipment ? styles.prose : styles.muted}>{training.equipment || t("Ausrüstung noch offen.", "Equipment to be confirmed.")}</p>
          </div>
        </div>
      </Panel>
    </div>
  </article>;
}

function MatchDetail({ match, workspace, language, t, open }: Context & { match: ClubMatch }) {
  const { formatClubDate } = useClubDates(language);
  const owner = workspace.actor.owner;
  const team = workspace.teams.find(item => item.id === match.teamId);
  const canEdit = managesTeam(workspace.actor, match.teamId);
  const statusTone = match.status === "final" ? "success" : match.status === "cancelled" ? "danger" : "info";
  const publicMatch = match.public && match.status !== "cancelled";
  const visibility = publicMatch ? t("Für Website freigegeben", "Published for club website") :
    match.public ? t("Nach Absage ausgeblendet", "Hidden after cancellation") : t("Nur im Vereinsbereich", "Club workspace only");
  return <article className={styles.record}>
    <DetailHeading kind="matches" owner={owner} title={t(`Spiel gegen ${match.opponent}`, `Match against ${match.opponent}`)} t={t}
      meta={<><Chip tone={statusTone}>{t(...matchLabels[match.status])}</Chip><Chip>{match.home ? t("Heimspiel", "Home") : t("Auswärtsspiel", "Away")}</Chip></>}>
      {canEdit && <Action icon={Pencil} tone="primary" onClick={() => open({ kind: "matches", item: match })}>{t("Spiel bearbeiten", "Edit match")}</Action>}
    </DetailHeading>
    <section className={styles.scoreboard} aria-label={t("Spielstand", "Scoreboard")}>
      <div className={styles.scoreTeam}>
        {team ? <TeamMark team={team} /> : <span className={styles.opponentMark}><Shield size={23} aria-hidden="true" /></span>}
        {team ? <TeamLink team={team} owner={owner} /> : <strong>{t("Unser Team", "Our team")}</strong>}
      </div>
      <div className={styles.scoreCenter}>
        <Score match={match} t={t} />
        {match.status === "final" && <span>{t("Endstand", "Final score")}</span>}
      </div>
      <div className={styles.scoreTeam}>
        <span className={styles.opponentMark}><Shield size={23} aria-hidden="true" /></span>
        <strong>{match.opponent}</strong>
      </div>
    </section>
    <div className={styles.detailGrid}>
      <Panel icon={CalendarDays} title={t("Spieldaten", "Match details")}>
        <div className={styles.panelBody}>
          <dl className={styles.facts}>
            <Fact icon={Clock3} label={t("Spielbeginn · Ortszeit", "Start · local time")}>
              <time dateTime={match.startsAt}>{formatClubDate(match.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
            </Fact>
            <Fact icon={MapPin} label={t("Spielort", "Venue")}>{match.venue || t("Ort offen", "Venue pending")}</Fact>
            <Fact icon={publicMatch ? Globe : LockKeyhole} label={t("Sichtbarkeit", "Visibility")}>
              <Chip tone={publicMatch ? "success" : "neutral"}>{visibility}</Chip>
            </Fact>
          </dl>
        </div>
      </Panel>
      <Panel icon={LockKeyhole} title={t("Interne Notizen", "Internal notes")}>
        <div className={styles.panelBody}>
          <p className={match.notes ? styles.prose : styles.muted}>{match.notes || t("Für Anreise, Aufstellung oder Absprachen ist hier Platz.", "Use this space for travel, lineup or match arrangements.")}</p>
        </div>
      </Panel>
    </div>
  </article>;
}

export function ClubRecordDetail({ detail, ...context }: Props) {
  const { workspace, t } = context;
  switch (detail.kind) {
    case "teams": {
      const team = workspace.teams.find(item => item.id === detail.id);
      if (team) return <TeamDetail key={team.id} team={team} {...context} />;
      break;
    }
    case "people": {
      const person = workspace.people.find(item => item.id === detail.id);
      if (person) return <PersonDetail person={person} {...context} />;
      break;
    }
    case "trainings": {
      const training = workspace.trainings.find(item => item.id === detail.id);
      if (training) return <TrainingDetail key={training.id} training={training} {...context} />;
      break;
    }
    case "matches": {
      const match = workspace.matches.find(item => item.id === detail.id);
      if (match) return <MatchDetail match={match} {...context} />;
      break;
    }
  }
  return <article className={styles.record}>
    <DetailHeading kind={detail.kind} owner={workspace.actor.owner} title={t("Eintrag nicht verfügbar", "Record unavailable")} t={t} />
  </article>;
}
