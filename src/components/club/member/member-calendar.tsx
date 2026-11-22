"use client";

import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, HelpCircle, List, MapPin, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ClubMatch, ClubRsvp, ClubTeam, ClubTraining } from "@/lib/club/model";
import { MemberEmpty, clubDate, clubDayKey, clubTime, useMemberTimeZone, type MemberLanguage } from "./member-shared";

const rsvpChoices = [
  { value: "yes", de: "Dabei", en: "Going", icon: Check },
  { value: "maybe", de: "Vielleicht", en: "Maybe", icon: HelpCircle },
  { value: "no", de: "Nicht dabei", en: "Can’t go", icon: X },
] as const;

type ResponseProps = {
  pendingKey: string | null;
  onRsvp: (training: ClubTraining, response: ClubRsvp | null) => void;
};

function CalendarFile({ kind, id, language }: { kind: "training" | "match"; id: string; language: MemberLanguage }) {
  return <a href={`/api/club/calendar?kind=${kind}&event=${encodeURIComponent(id)}`} download className="club-member-text-button club-member-event-export">
    <CalendarPlus size={16} aria-hidden="true" />{language === "en" ? "Add to calendar" : "In Kalender übernehmen"}
  </a>;
}

export function TrainingCard({ training, team, language, featured = false, teamMember, now, pendingKey, onRsvp }: ResponseProps & {
  training: ClubTraining;
  team?: ClubTeam;
  language: MemberLanguage;
  featured?: boolean;
  teamMember: boolean;
  now: number;
}) {
  const english = language === "en";
  const zone = useMemberTimeZone();
  const waiting = pendingKey === `rsvp:${training.id}`;
  const month = clubDate(training.startsAt, language, { month: "short" }, zone).replace(/\.$/, "");
  const Heading = featured ? "h2" : "h3";
  const closed = Date.parse(training.startsAt) <= now;
  const response = rsvpChoices.find(choice => choice.value === training.response);
  return <article className={`club-member-training${featured ? " club-member-training-featured" : ""}`} aria-busy={waiting}>
    {featured && <p className="club-member-training-label"><CalendarDays size={16} aria-hidden="true" />{english ? "Next training" : "Nächstes Training"}</p>}
    <div className="club-member-training-main">
      <time className="club-member-date-block" dateTime={training.startsAt} aria-label={clubDate(training.startsAt, language, { dateStyle: "full" }, zone)}>
        <strong>{clubDate(training.startsAt, language, { day: "numeric" }, zone)}</strong><span>{month}</span>
      </time>
      <div className="club-member-training-info">
        <Heading>{training.title}</Heading>
        {team && <p className="club-member-training-team">{team.name}</p>}
        <div className="club-member-event-meta">
          <span><Clock3 size={15} aria-hidden="true" />{clubTime(training.startsAt, language, zone)}–{clubTime(training.endsAt, language, zone)}</span>
          {training.location && <span><MapPin size={15} aria-hidden="true" />{training.location}</span>}
        </div>
      </div>
    </div>
    {teamMember && (closed ? <p className="club-member-rsvp-closed">
      {response
        ? (english ? `Your response: ${response.en}` : `Deine Rückmeldung: ${response.de}`)
        : (english ? "Responses closed" : "Rückmeldungen geschlossen")}
    </p> : <div className="club-member-rsvp">
      <div className="club-member-rsvp-head">
        <span>{response
          ? (english ? `Your response: ${response.en}` : `Deine Rückmeldung: ${response.de}`)
          : (english ? "Can you make it?" : "Bist du dabei?")}</span>
        {waiting && <small role="status">{english ? "Saving…" : "Wird gespeichert …"}</small>}
      </div>
      <div role="group" aria-label={english ? "Training response" : "Rückmeldung zum Training"}>
        {rsvpChoices.map(({ value, de, en, icon: Icon }) => <button key={value} type="button"
          data-response={value} aria-pressed={training.response === value} disabled={pendingKey !== null}
          onClick={() => onRsvp(training, training.response === value ? null : value)}>
          <Icon size={17} aria-hidden="true" />{english ? en : de}
        </button>)}
      </div>
    </div>)}
    {!closed && <CalendarFile kind="training" id={training.id} language={language} />}
    {(training.details || training.equipment) && <details className="club-member-event-detail">
      <summary>{english ? "Training details" : "Trainingsdetails"}</summary>
      {training.details && <p>{training.details}</p>}
      {training.equipment && <p><strong>{english ? "Bring" : "Mitbringen"}</strong> {training.equipment}</p>}
    </details>}
  </article>;
}

export function MatchCard({ match, team, language, now, compact = false }: { match: ClubMatch; team?: ClubTeam; language: MemberLanguage; now: number; compact?: boolean }) {
  const english = language === "en";
  const zone = useMemberTimeZone();
  const score = match.ourScore !== null && match.theirScore !== null;
  const scored = score && match.status === "final";
  const cancelled = match.status === "cancelled";
  return <article className={`club-member-match${compact ? " club-member-match-compact" : ""}`}>
    <div className="club-member-match-top">
      <span className="club-member-pill" data-state={cancelled ? "cancelled" : scored ? "final" : "scheduled"}>
        {cancelled ? (english ? "Cancelled" : "Abgesagt") : scored ? (english ? "Final" : "Endstand") : match.home ? (english ? "Home" : "Heimspiel") : (english ? "Away" : "Auswärts")}
      </span>
      <time dateTime={match.startsAt}>{clubDate(match.startsAt, language, { weekday: "short", day: "numeric", month: "short" }, zone)}{!scored && ` · ${clubTime(match.startsAt, language, zone)}`}</time>
    </div>
    <div className="club-member-match-line">
      <div>
        {team && <p>{team.name}</p>}
        <h3>{english ? "vs " : "gegen "}{match.opponent}</h3>
      </div>
      {scored && <strong className="club-member-score" aria-label={english ? `Score ${match.ourScore} to ${match.theirScore}` : `Ergebnis ${match.ourScore} zu ${match.theirScore}`}>{match.ourScore}{english ? "–" : ":"}{match.theirScore}</strong>}
    </div>
    {match.venue && <div className="club-member-event-meta"><span><MapPin size={15} aria-hidden="true" />{match.venue}</span></div>}
    {match.status === "scheduled" && Date.parse(match.startsAt) > now && <CalendarFile kind="match" id={match.id} language={language} />}
    {!compact && match.notes && <p className="club-member-match-notes">{match.notes}</p>}
  </article>;
}

type CalendarEvent = { kind: "training"; value: ClubTraining } | { kind: "match"; value: ClubMatch };

function monthDate(key: string) {
  return new Date(`${key.slice(0, 7)}-01T12:00:00Z`);
}

function prefixOf(month: Date) {
  return month.toISOString().slice(0, 7);
}

export function MemberCalendar({ trainings, matches, teams, teamIds, now, language, pendingKey, onRsvp }: ResponseProps & {
  trainings: ClubTraining[];
  matches: ClubMatch[];
  teams: ClubTeam[];
  teamIds: string[];
  now: number;
  language: MemberLanguage;
}) {
  const english = language === "en";
  const zone = useMemberTimeZone();
  const today = clubDayKey(now, zone);
  const [chosenMonth, setMonth] = useState<Date | null>(null);
  const month = chosenMonth ?? monthDate(today);
  const [day, setDay] = useState("");
  const [view, setView] = useState<"upcoming" | "replies" | "month">("upcoming");
  const agendaHeading = useRef<HTMLHeadingElement>(null);
  const submittedId = useRef<string | null>(null);
  const prefix = prefixOf(month);
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const offset = (month.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const allEvents: CalendarEvent[] = [
    ...trainings.map(value => ({ kind: "training" as const, value })),
    ...matches.map(value => ({ kind: "match" as const, value })),
  ].sort((a, b) => Date.parse(a.value.startsAt) - Date.parse(b.value.startsAt));
  const upcoming = allEvents.filter(event => Date.parse(event.value.startsAt) > now
    && (event.kind === "training" || event.value.status === "scheduled"));
  const replies = upcoming.filter(event => event.kind === "training" && teamIds.includes(event.value.teamId) && !event.value.response);
  const events = allEvents.filter(event => clubDayKey(event.value.startsAt, zone).startsWith(prefix));
  const dayCounts = new Map<string, number>();
  for (const event of events) {
    const key = clubDayKey(event.value.startsAt, zone);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const monthEvents = day ? events.filter(event => clubDayKey(event.value.startsAt, zone) === day) : events;
  const visibleEvents = view === "month" ? monthEvents : view === "replies" ? replies : upcoming;
  const teamsById = new Map(teams.map(team => [team.id, team]));
  const monthLabel = clubDate(month.getTime(), language, { month: "long", year: "numeric" });
  const activeDayLabel = view === "upcoming" ? (english ? "Upcoming events" : "Kommende Termine")
    : view === "replies" ? (english ? "Awaiting your reply" : "Deine offenen Rückmeldungen")
    : day
    ? clubDate(day + "T12:00:00Z", language, { weekday: "long", day: "numeric", month: "long" })
    : english ? "Events" : "Termine";

  useEffect(() => {
    const id = submittedId.current;
    if (!id || pendingKey) return;
    if (view === "replies" && trainings.some(training => training.id === id && training.response)
      && document.activeElement === document.body) agendaHeading.current?.focus({ preventScroll: true });
    submittedId.current = null;
  }, [pendingKey, trainings, view]);

  function shift(amount: number) {
    setMonth(new Date(Date.UTC(year, monthIndex + amount, 1, 12)));
    setDay("");
  }

  return <div className="club-member-schedule">
    <div className="club-member-schedule-views" role="group" aria-label={english ? "Calendar view" : "Kalenderansicht"}>
      <button type="button" aria-pressed={view === "upcoming"} onClick={() => setView("upcoming")}><List size={17} aria-hidden="true" />{english ? "Upcoming" : "Demnächst"}</button>
      <button type="button" aria-pressed={view === "replies"} onClick={() => setView("replies")}><ClipboardList size={17} aria-hidden="true" />{english ? "To reply" : "Offen"} <span>{replies.length}</span></button>
      <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}><CalendarDays size={17} aria-hidden="true" />{english ? "Month" : "Monat"}</button>
    </div>
    <div className="club-member-calendar-layout" data-view={view}>
    {view === "month" && <section className="club-member-card club-member-calendar" aria-label={english ? "Club calendar" : "Vereinskalender"}>
      <div className="club-member-calendar-head">
        <h2 aria-live="polite">{monthLabel}</h2>
        <div>
          <button type="button" className="club-member-icon-button" aria-label={english ? "Previous month" : "Vorheriger Monat"} onClick={() => shift(-1)}><ChevronLeft size={19} /></button>
          <button type="button" className="club-member-icon-button" aria-label={english ? "Next month" : "Nächster Monat"} onClick={() => shift(1)}><ChevronRight size={19} /></button>
        </div>
      </div>
      <div className="club-member-calendar-grid">
        {Array.from({ length: 7 }, (_, index) => <span key={`weekday-${index}`} className="club-member-weekday">
          {clubDate(Date.UTC(2024, 0, index + 1, 12), language, { weekday: "short" }).replace(/\.$/, "")}
        </span>)}
        {Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const number = index + 1;
          const key = `${prefix}-${String(number).padStart(2, "0")}`;
          const count = dayCounts.get(key) ?? 0;
          const date = clubDate(Date.UTC(year, monthIndex, number, 12), language, { weekday: "long", day: "numeric", month: "long" });
          return count ? <button type="button" key={key} className="club-member-calendar-day" data-today={key === today}
            aria-current={key === today ? "date" : undefined} aria-pressed={day === key} aria-label={english ? `${date}, ${count} ${count === 1 ? "event" : "events"}` : `${date}, ${count} ${count === 1 ? "Termin" : "Termine"}`}
            onClick={() => setDay(value => value === key ? "" : key)}><span>{number}</span><i aria-hidden="true" /></button>
            : <span key={key} className="club-member-calendar-day" data-today={key === today} aria-current={key === today ? "date" : undefined}>{number}</span>;
        })}
      </div>
      <div className="club-member-calendar-foot">
        <span><i aria-hidden="true" />{english ? "Event day" : "Mit Termin"}</span>
        <button type="button" className="club-member-text-button" onClick={() => { setMonth(monthDate(today)); setDay(""); }}>{english ? "This month" : "Dieser Monat"}</button>
      </div>
    </section>}
    <section className="club-member-card club-member-agenda">
      <div className="club-member-card-heading"><h2 tabIndex={-1} ref={agendaHeading}>{activeDayLabel}</h2>
        {view === "month" && day && <button type="button" className="club-member-text-button" onClick={() => setDay("")}>{english ? "Show full month" : "Ganzer Monat"}</button>}
      </div>
      {visibleEvents.length ? <div className="club-member-agenda-list">
        {visibleEvents.map(event => event.kind === "training"
          ? <TrainingCard key={`training-${event.value.id}`} training={event.value} team={teamsById.get(event.value.teamId)}
              teamMember={teamIds.includes(event.value.teamId)} now={now} language={language} pendingKey={pendingKey}
              onRsvp={(training, response) => {
                if (view === "replies" && response) submittedId.current = training.id;
                onRsvp(training, response);
              }} />
          : <MatchCard now={now} key={`match-${event.value.id}`} match={event.value} team={teamsById.get(event.value.teamId)} language={language} />)}
      </div> : <MemberEmpty icon={<CalendarDays size={20} />} title={view === "replies" ? (english ? "No replies due" : "Keine Rückmeldung offen")
          : view === "upcoming" ? (english ? "No upcoming events" : "Keine kommenden Termine")
          : (english ? "No events this month" : "Keine Termine in diesem Monat")}
        description={view === "replies"
          ? (english ? "Training sessions waiting for your response will appear here." : "Hier erscheinen Trainings, für die dein Team noch auf deine Antwort wartet.")
          : (english ? "Browse the monthly calendar for other dates." : "Weitere Termine findest du in der Monatsansicht.")} />}
    </section>
    </div>
  </div>;
}

export function MatchList({ matches, teams, now, language }: { matches: ClubMatch[]; teams: ClubTeam[]; now: number; language: MemberLanguage }) {
  const english = language === "en";
  const teamsById = new Map(teams.map(team => [team.id, team]));
  const scheduled = matches.filter(match => match.status !== "final").sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const final = matches.filter(match => match.status === "final").sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const sections = [
    { title: english ? "Fixtures" : "Spielplan", items: scheduled, empty: english ? "No fixtures scheduled" : "Keine Spiele angesetzt" },
    { title: english ? "Results" : "Ergebnisse", items: final, empty: english ? "No results yet" : "Noch keine Ergebnisse" },
  ];
  return <div className="club-member-match-layout">
    {sections.map(section => <section className="club-member-card club-member-agenda" key={section.title}>
      <div className="club-member-card-heading"><h2>{section.title}</h2></div>
      {section.items.length ? <div className="club-member-agenda-list">{section.items.map(match => <MatchCard now={now} key={match.id} match={match} team={teamsById.get(match.teamId)} language={language} />)}</div>
        : <MemberEmpty icon={<Trophy size={20} />} title={section.empty} description={english ? "Club fixtures and scores will appear here." : "Hier erscheinen die Spiele und Ergebnisse deiner Teams."} />}
    </section>)}
  </div>;
}

export function memberTeamStyle(color?: string): CSSProperties {
  return { "--club-member-team": /^#[\da-f]{6}$/i.test(color ?? "") ? color : "#587497" } as CSSProperties;
}
