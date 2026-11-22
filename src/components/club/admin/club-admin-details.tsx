"use client";

import { CalendarClock, Check, CircleHelp, MapPin, Minus, UserMinus, UserPlus, X } from "lucide-react";
import { useState } from "react";
import type { ClubPerson, ClubRsvp, ClubTeam, ClubTraining, ClubWorkspace } from "@/lib/club/model";
import { attendanceCounts, attendanceLabel, isClubWide, responseLabels, roleLabels, statusLabels, useClubDates, type Copy, type Language, type Text } from "./club-admin-data";
import { Action, Chip, ClubAvatar, Field, IconAction, Notice, Sheet } from "./club-admin-ui";
import styles from "./club-admin.module.css";

type DetailProps = {
  workspace: ClubWorkspace;
  t: Text;
  language: Language;
  busy: boolean;
  problem: Copy | null;
  close: () => void;
  reload?: () => void;
};

const responses = ["yes", "maybe", "no"] as const;
const responseIcons = { yes: Check, maybe: CircleHelp, no: X };
const responseTones = { yes: "success", maybe: "warning", no: "danger" } as const;

export function AttendanceSheet({ training, workspace, t, language, busy, problem, close, reload, respond }: DetailProps & {
  training: ClubTraining; respond: (response: ClubRsvp | null) => void;
}) {
  const { eventDate, eventTime } = useClubDates(language);
  const replies = new Map(training.attendance?.map(entry => [entry.personId, entry.response]));
  const totals = attendanceCounts(training);
  const participants = workspace.people.filter(person => person.status === "active" && person.teamIds.includes(training.teamId))
    .sort((a, b) => a.name.localeCompare(b.name, language));
  const canReply = !workspace.actor.owner && workspace.actor.teamIds.includes(training.teamId) && Date.parse(training.startsAt) > Date.now();
  const team = workspace.teams.find(entry => entry.id === training.teamId);
  return <Sheet title={t("Teilnahmen", "Attendance")} intro={training.title} t={t} close={close} busy={busy}>
    <div className={styles.sheetBody}>
      <div className={styles.attendanceMeta}>
        <span><CalendarClock size={16} aria-hidden="true" />{eventDate(training.startsAt)} – {eventTime(training.endsAt)} · {t("Ortszeit", "Local time")}</span>
        {training.location && <span><MapPin size={16} aria-hidden="true" />{training.location}</span>}
        {team && <Chip>{team.name}</Chip>}
      </div>
      {training.details && <p className={styles.trainingDetail}>{training.details}</p>}
      {training.equipment && <p className={styles.trainingDetail}><strong>{t("Ausrüstung", "Equipment")}</strong> {training.equipment}</p>}
      {canReply && <div className={styles.rsvpControl}>
        <h3>{t("Deine Teilnahme", "Your attendance")}</h3>
        <div role="group" aria-label={t("Deine Teilnahme", "Your attendance")}>
          {responses.map(value => <Action key={value} icon={responseIcons[value]} aria-pressed={training.response === value} data-response={value}
            disabled={busy} onClick={() => respond(value)}>{t(...responseLabels[value])}</Action>)}
          {training.response && <IconAction icon={Minus} label={t("Antwort zurücksetzen", "Clear response")} disabled={busy} onClick={() => respond(null)} />}
        </div>
      </div>}
      <div className={styles.attendanceTotals}>
        {responses.map(value => <Chip key={value} tone={responseTones[value]}>
          {totals[value]} {attendanceLabel(value, totals[value], t)}
        </Chip>)}
        <Chip>{participants.filter(person => !replies.has(person.id)).length} {t("Offen", "Pending")}</Chip>
      </div>
      {participants.length ? <ul className={styles.detailList}>
        {participants.map(person => {
          const response = replies.get(person.id);
          return <li key={person.id}>
            <ClubAvatar person={person} photo={person.avatar} owner={workspace.actor.owner} /><strong>{person.name}</strong>
            {response ? <Chip tone={responseTones[response]}>{t(...responseLabels[response])}</Chip> : <Chip>{t("Offen", "Pending")}</Chip>}
          </li>;
        })}
      </ul> : <p className={styles.muted}>{t("Dieses Team hat noch keine aktiven Mitglieder.", "This team has no active members yet.")}</p>}
      {problem && <Notice error message={t(...problem)}>
        {reload && <Action onClick={reload} disabled={busy}>{t("Aktuellen Stand laden", "Reload latest version")}</Action>}
      </Notice>}
    </div>
    <footer className={styles.sheetFooter}><div><Action onClick={close} disabled={busy}>{t("Schließen", "Close")}</Action></div></footer>
  </Sheet>;
}

export function TeamRosterSheet({ team, workspace, t, language, busy, problem, close, reload, update }: DetailProps & {
  team: ClubTeam; update: (person: ClubPerson, teamIds: string[]) => void;
}) {
  const canAssign = isClubWide(workspace.actor);
  const [candidate, setCandidate] = useState("");
  const roster = workspace.people.filter(person => person.teamIds.includes(team.id)).sort((a, b) => a.name.localeCompare(b.name, language));
  const activeIds = new Set(workspace.teams.map(item => item.id));
  const available = workspace.people.filter(person => !person.teamIds.includes(team.id) && person.teamIds.filter(id => activeIds.has(id)).length < 20)
    .sort((a, b) => a.name.localeCompare(b.name, language));
  const selected = available.find(person => person.id === candidate);
  return <Sheet title={t("Teammitglieder", "Team members")} intro={team.name} t={t} close={close} busy={busy}>
    <div className={styles.sheetBody}>
      {canAssign && available.length > 0 && <form className={styles.rosterAdd} onSubmit={event => {
        event.preventDefault();
        if (selected) update(selected, [...selected.teamIds, team.id]);
      }}>
        <Field label={t("Person hinzufügen", "Add a person")}>
          <select value={selected?.id ?? ""} onChange={event => setCandidate(event.target.value)} disabled={busy}>
            <option value="">{t("Person auswählen", "Choose a person")}</option>
            {available.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
        <Action type="submit" icon={UserPlus} tone="primary" disabled={!selected || busy}>{t("Hinzufügen", "Add")}</Action>
      </form>}
      {roster.length ? <ul className={styles.detailList}>
        {roster.map(person => <li key={person.id}>
          <ClubAvatar person={person} photo={person.avatar} owner={workspace.actor.owner} />
          <div className={styles.rowTitle}><strong>{person.name}</strong><span>{t(...roleLabels[person.role])} · {t(...statusLabels[person.status])}</span></div>
          {canAssign && <IconAction icon={UserMinus} label={person.name + " " + t("aus dem Team entfernen", "remove from team")}
            disabled={busy} onClick={() => update(person, person.teamIds.filter(id => id !== team.id))} />}
        </li>)}
      </ul> : <p className={styles.muted}>{t("Dieses Team hat noch keine Mitglieder.", "This team has no members yet.")}</p>}
      {problem && <Notice error message={t(...problem)}>
        {reload && <Action onClick={reload} disabled={busy}>{t("Aktuellen Stand laden", "Reload latest version")}</Action>}
      </Notice>}
    </div>
    <footer className={styles.sheetFooter}><div><Action onClick={close} disabled={busy}>{t("Schließen", "Close")}</Action></div></footer>
  </Sheet>;
}
