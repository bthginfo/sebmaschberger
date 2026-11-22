"use client";

import { Archive, Check, Copy as CopyIcon, Link2, LoaderCircle, Mail, Save, Send, Trash2, type LucideIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { CLUB_ROLES, type ClubInvite, type ClubMatch, type ClubPerson, type ClubRole, type ClubTeam, type ClubTraining, type ClubWorkspace } from "@/lib/club/model";
import {
  clubDateIso, isClubAdmin, isClubWide, localDateInput, managesTeam, matchLabels, roleLabels, statusLabels,
  type Copy, type EditDialog, type Fields, type Invitation, type InviteFields, type SaveResource, type Text,
} from "./club-admin-data";
import { Action, Field, Notice, Sheet } from "./club-admin-ui";
import styles from "./club-admin.module.css";

type FormContext = {
  t: Text;
  busy: boolean;
  problem: Copy | null;
  close: () => void;
  reload?: () => void;
};

type EditorContext = FormContext & { workspace: ClubWorkspace; save: SaveResource };

function Form({ title, intro, wide, submit, label, icon = Save, remove, archive, disabled, children, t, busy, problem, close, reload }: FormContext & {
  title: string; intro?: string; wide?: boolean; submit: () => void; label?: string; icon?: LucideIcon;
  remove?: () => void; archive?: boolean; disabled?: boolean; children: ReactNode;
}) {
  return <Sheet title={title} intro={intro} t={t} close={close} busy={busy} wide={wide}>
    <form className={styles.sheetForm} onSubmit={event => { event.preventDefault(); if (!disabled && !busy) submit(); }}>
      <div className={styles.sheetBody}>
        <fieldset disabled={busy} className={styles.formGrid}>{children}</fieldset>
        {problem && <Notice error message={t(...problem)}>
          {reload && <Action onClick={reload} disabled={busy}>{t("Aktuellen Stand laden", "Reload latest version")}</Action>}
        </Notice>}
      </div>
      <footer className={styles.sheetFooter}>
        {remove && <Action tone="quiet" className={styles.removeButton} icon={archive ? Archive : Trash2} onClick={remove} disabled={busy}>
          {archive ? t("Archivieren", "Archive") : t("Löschen", "Delete")}
        </Action>}
        <div>
          <Action tone="quiet" onClick={close} disabled={busy}>{t("Abbrechen", "Cancel")}</Action>
          <Action tone="primary" type="submit" icon={busy ? LoaderCircle : icon} disabled={busy || disabled} aria-busy={busy || undefined}>
            {busy ? t("Speichert …", "Saving …") : label ?? t("Speichern", "Save")}
          </Action>
        </div>
      </footer>
    </form>
  </Sheet>;
}

function TeamChoices({ teams, selected, onChange, t }: { teams: ClubTeam[]; selected: string[]; onChange: (ids: string[]) => void; t: Text }) {
  return <fieldset className={styles.checkGroup} data-wide>
    <legend>{t("Teamzugehörigkeit", "Team membership")}</legend>
    {teams.length ? teams.map(team => <label key={team.id} className={styles.choice}>
      <input type="checkbox" checked={selected.includes(team.id)} disabled={selected.length >= 20 && !selected.includes(team.id)}
        onChange={event => onChange(event.target.checked ? [...selected, team.id] : selected.filter(id => id !== team.id))} />
      <span>{team.name}</span>
    </label>) : <p className={styles.muted}>{t("Noch keine Teams angelegt.", "No teams have been created yet.")}</p>}
  </fieldset>;
}

function TeamSelect({ teams, value, onChange, t, optional = false }: {
  teams: ClubTeam[]; value: string; onChange: (value: string) => void; t: Text; optional?: boolean;
}) {
  return <select value={value} onChange={event => onChange(event.target.value)} required={!optional}>
    <option value="">{optional ? t("Gesamter Verein", "Whole club") : t("Team auswählen", "Choose a team")}</option>
    {teams.map(team => <option value={team.id} key={team.id}>{team.name}</option>)}
  </select>;
}

function Toggle({ label, detail, checked, onChange }: {
  label: string; detail?: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className={styles.toggle} data-wide>
    <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
    <input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} />
  </label>;
}

export function InviteForm({ workspace, invite, previous, initialTeamIds, ...props }: FormContext & {
  workspace: ClubWorkspace; invite: (fields: InviteFields) => void; previous?: ClubInvite; initialTeamIds?: string[];
}) {
  const { t } = props;
  const previousPerson = previous ? workspace.people.find(person => person.id === previous.id) : undefined;
  const [name, setName] = useState(previous?.name ?? "");
  const [email, setEmail] = useState(previous?.email ?? "");
  const [role, setRole] = useState<ClubRole>(previous?.role ?? "member");
  const [teamIds, setTeamIds] = useState(() => (initialTeamIds ?? previousPerson?.teamIds ?? [])
    .filter(id => workspace.teams.some(team => team.id === id)));
  const [deliver, setDeliver] = useState(false);
  return <Form {...props} title={previous ? t("Einladung erneuern", "Renew invitation") : t("Person einladen", "Invite someone")}
    label={deliver ? t("Einladung senden", "Send invitation") : t("Einladungslink erstellen", "Create invite link")}
    icon={deliver ? Send : Link2} submit={() => invite({ name: name.trim(), email: email.trim(), role, teamIds, deliver })}>
    <Field label={t("Name", "Name")}><input value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoFocus autoComplete="off" /></Field>
    <Field label={t("E-Mail", "Email")}><input value={email} onChange={event => setEmail(event.target.value)} type="email" required maxLength={254}
      autoComplete="off" readOnly={Boolean(previous)} /></Field>
    <Field label={t("Rolle", "Role")} wide>
      <select value={role} onChange={event => setRole(event.target.value as ClubRole)}>
        {CLUB_ROLES.map(option => <option key={option} value={option}>{t(...roleLabels[option])}</option>)}
      </select>
    </Field>
    <TeamChoices teams={workspace.teams} selected={teamIds} onChange={setTeamIds} t={t} />
    {workspace.mailAvailable ? <Toggle label={t("Per E-Mail senden", "Send by email")} detail={t("Du erhältst zusätzlich einen Link zum Kopieren.", "You’ll also get a link to copy.")}
      checked={deliver} onChange={setDeliver} /> : <p className={styles.formNote} data-wide><Mail size={16} aria-hidden="true" />
      {t("Der Link steht nach dem Erstellen zum Kopieren bereit.", "The invite link will be ready to copy after you create it.")}</p>}
  </Form>;
}

export function InviteResult({ result, close, t }: { result: Invitation; close: () => void; t: Text }) {
  const [copied, setCopied] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const link = new URL(result.link, window.location.origin).href;
  const state = {
    sent: t("Die Einladung wurde per E-Mail gesendet.", "The invitation was sent by email."),
    link: t("Teile den Link mit der eingeladenen Person.", "Share the link with the invitee."),
    unavailable: t("Der E-Mail-Versand ist momentan nicht verfügbar. Teile stattdessen den Link.", "Email delivery is unavailable. Share the link directly."),
    failed: t("Die E-Mail konnte nicht gesendet werden. Der Link ist bereit.", "The email could not be sent. The link is ready to share."),
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      input.current?.focus();
      input.current?.select();
    }
  }
  return <Sheet title={t("Einladung erstellt", "Invitation created")} intro={result.invite.email} t={t} close={close}>
    <div className={styles.sheetBody}>
      <Notice message={state[result.delivery]} error={result.delivery === "failed" || result.delivery === "unavailable"} />
      <div className={styles.copyRow}>
        <Field label={t("Einladungslink", "Invitation link")}>
          <input ref={input} value={link} readOnly type="url" spellCheck={false} onFocus={event => event.currentTarget.select()} />
        </Field>
        <Action icon={copied ? Check : CopyIcon} onClick={copy}>{copied ? t("Kopiert", "Copied") : t("Kopieren", "Copy")}</Action>
      </div>
      <p className={styles.muted}>{t("Der Link lässt sich einmal verwenden. Kopiere ihn vor dem Schließen.", "The link works once. Copy it before closing.")}</p>
    </div>
    <footer className={styles.sheetFooter}><div><Action tone="primary" onClick={close}>{t("Fertig", "Done")}</Action></div></footer>
  </Sheet>;
}

function PersonForm({ item, workspace, save, ...props }: EditorContext & { item: ClubPerson }) {
  const { t } = props;
  const [name, setName] = useState(item.name);
  const [position, setPosition] = useState(item.position);
  const [jersey, setJersey] = useState(item.jersey === null ? "" : String(item.jersey));
  const [bio, setBio] = useState(item.bio);
  const activeTeamIds = item.teamIds.filter(id => workspace.teams.some(team => team.id === id));
  const [teamIds, setTeamIds] = useState(activeTeamIds);
  const [role, setRole] = useState(item.role);
  const [status, setStatus] = useState(item.status);
  const canSetRole = isClubAdmin(workspace.actor);
  const canSetTeams = isClubWide(workspace.actor);
  return <Form {...props} title={t("Person bearbeiten", "Edit person")} intro={item.email} submit={() => save("people", {
    name: name.trim(), position: position.trim(), jersey: jersey === "" ? null : Number(jersey), bio: bio.trim(),
    ...(canSetTeams && (teamIds.length !== activeTeamIds.length || teamIds.some(id => !activeTeamIds.includes(id))) && { teamIds }),
    ...(canSetRole && role !== item.role && { role }), ...(canSetRole && status !== item.status && { status }),
  }, item)}>
    <Field label={t("Name", "Name")} wide><input value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoFocus /></Field>
    <Field label={t("Position", "Position")}><input value={position} onChange={event => setPosition(event.target.value)} maxLength={240} /></Field>
    <Field label={t("Trikotnummer", "Jersey number")}><input value={jersey} onChange={event => setJersey(event.target.value)}
      type="number" min={0} max={99} step={1} inputMode="numeric" /></Field>
    <Field label={t("Kurzprofil", "Bio")} wide><textarea value={bio} onChange={event => setBio(event.target.value)} maxLength={800} rows={3} /></Field>
    {canSetTeams && <TeamChoices teams={workspace.teams} selected={teamIds} onChange={setTeamIds} t={t} />}
    {canSetRole && <>
      <Field label={t("Rolle", "Role")}><select value={role} onChange={event => setRole(event.target.value as ClubRole)}>
        {CLUB_ROLES.map(option => <option key={option} value={option}>{t(...roleLabels[option])}</option>)}
      </select></Field>
      <Field label={t("Kontostatus", "Account status")}><select value={status} onChange={event => setStatus(event.target.value as ClubPerson["status"])}>
        {item.status === "invited" && <option value="invited">{t(...statusLabels.invited)}</option>}
        <option value="active">{t(...statusLabels.active)}</option>
        <option value="disabled">{t(...statusLabels.disabled)}</option>
      </select></Field>
    </>}
  </Form>;
}

function TeamForm({ item, workspace, save, remove, ...props }: EditorContext & { item?: ClubTeam; remove?: () => void }) {
  const { t } = props;
  const [name, setName] = useState(item?.name ?? "");
  const [shortName, setShortName] = useState(item?.shortName ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [color, setColor] = useState(item?.color ?? "#2c5143");
  const [category, setCategory] = useState(item?.category ?? "");
  const [competition, setCompetition] = useState(item?.competition ?? "");
  const [season, setSeason] = useState(item?.season ?? "");
  const [homeVenue, setHomeVenue] = useState(item?.homeVenue ?? "");
  const canSetLeads = isClubWide(workspace.actor);
  const eligible = workspace.people.filter(person => person.status === "active" && (person.role === "coach" || person.role === "admin"))
    .sort((a, b) => a.name.localeCompare(b.name));
  const existingLeads = (item?.managerIds ?? []).filter(id => eligible.some(person => person.id === id));
  const [managerIds, setManagerIds] = useState(existingLeads);
  const leadsChanged = managerIds.length !== existingLeads.length || managerIds.some(id => !existingLeads.includes(id));
  return <Form {...props} title={item ? t("Team bearbeiten", "Edit team") : t("Team anlegen", "Add team")} remove={remove} archive
    submit={() => save("teams", {
      name: name.trim(), shortName: shortName.trim(), description: description.trim(), color,
      category: category.trim(), competition: competition.trim(), season: season.trim(), homeVenue: homeVenue.trim(),
      ...(canSetLeads && (!item || leadsChanged) && { managerIds }),
    }, item)}>
    <Field label={t("Teamname", "Team name")}><input value={name} onChange={event => setName(event.target.value)} required maxLength={120} autoFocus /></Field>
    <Field label={t("Kurzname", "Short name")}><input value={shortName} onChange={event => setShortName(event.target.value)} maxLength={35} /></Field>
    <Field label={t("Beschreibung", "Description")} wide><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={6000} rows={4} /></Field>
    <Field label={t("Kategorie", "Category")}><input value={category} onChange={event => setCategory(event.target.value)} maxLength={100} /></Field>
    <Field label={t("Wettbewerb", "Competition")}><input value={competition} onChange={event => setCompetition(event.target.value)} maxLength={140} /></Field>
    <Field label={t("Saison", "Season")}><input value={season} onChange={event => setSeason(event.target.value)} maxLength={80} /></Field>
    <Field label={t("Heimspielstätte", "Home venue")}><input value={homeVenue} onChange={event => setHomeVenue(event.target.value)} maxLength={240} /></Field>
    <Field label={t("Teamfarbe", "Team colour")}><span className={styles.colour}><input type="color" value={color} onChange={event => setColor(event.target.value)} />{color.toUpperCase()}</span></Field>
    {canSetLeads && <fieldset className={styles.checkGroup} data-wide>
      <legend>{t("Verantwortliche Coaches", "Lead coaches")}{eligible.length > 0 && <small> {managerIds.length}/20</small>}</legend>
      {eligible.length ? eligible.map(person => <label key={person.id} className={styles.choice}>
        <input type="checkbox" checked={managerIds.includes(person.id)} disabled={managerIds.length >= 20 && !managerIds.includes(person.id)}
          onChange={event => {
            const checked = event.target.checked;
            setManagerIds(ids => checked ? [...ids, person.id] : ids.filter(id => id !== person.id));
          }} />
        <span>{person.name}</span>
      </label>) : <p className={styles.muted}>{t("Aktive Coaches und Administratoren erscheinen hier.", "Active coaches and administrators appear here.")}</p>}
    </fieldset>}
  </Form>;
}

function TrainingForm({ item, initialTeamId, workspace, save, remove, ...props }: EditorContext & {
  item?: ClubTraining; initialTeamId?: string; remove?: () => void;
}) {
  const { t } = props;
  const teams = workspace.teams.filter(team => managesTeam(workspace.actor, team.id));
  const defaultTeam = teams.find(team => team.id === initialTeamId) ?? (teams.length === 1 ? teams[0] : undefined);
  const [teamId, setTeam] = useState(item?.teamId ?? defaultTeam?.id ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [start, setStart] = useState(localDateInput(item?.startsAt));
  const [end, setEnd] = useState(localDateInput(item?.endsAt));
  const [endEdited, setEndEdited] = useState(Boolean(item));
  const [location, setLocation] = useState(item?.location ?? defaultTeam?.homeVenue ?? "");
  const [details, setDetails] = useState(item?.details ?? "");
  const [equipment, setEquipment] = useState(item?.equipment ?? "");
  const [dateProblem, setDateProblem] = useState<Copy | null>(null);
  function submit() {
    const startsAt = clubDateIso(start, item?.startsAt);
    const endsAt = clubDateIso(end, item?.endsAt);
    if (!startsAt || !endsAt || Date.parse(endsAt) <= Date.parse(startsAt)) {
      setDateProblem(["Wähle eine gültige Anfangszeit und ein späteres Ende.", "Choose a valid start time and a later end time."]);
      return;
    }
    setDateProblem(null);
    save("trainings", { teamId, title: title.trim(), startsAt, endsAt, location: location.trim(), details: details.trim(), equipment: equipment.trim() }, item);
  }
  return <Form {...props} problem={dateProblem ?? props.problem} title={item ? t("Training bearbeiten", "Edit training") : t("Training anlegen", "Add training")}
    remove={remove} submit={submit} disabled={!teams.length}>
    <Field label={t("Titel", "Title")}><input value={title} onChange={event => setTitle(event.target.value)} required maxLength={120} autoFocus /></Field>
    <Field label={t("Team", "Team")}><TeamSelect teams={teams} value={teamId} onChange={setTeam} t={t} /></Field>
    <Field label={t("Beginn", "Starts")} hint={t("Ortszeit dieses Geräts", "Local time on this device")}>
      <input type="datetime-local" value={start} onChange={event => {
        const value = event.target.value;
        setStart(value);
        setDateProblem(null);
        const iso = clubDateIso(value);
        if (!endEdited && iso) setEnd(localDateInput(new Date(Date.parse(iso) + 90 * 60_000).toISOString()));
      }} required />
    </Field>
    <Field label={t("Ende", "Ends")}><input type="datetime-local" value={end} onChange={event => {
      setEnd(event.target.value);
      setEndEdited(Boolean(event.target.value));
      setDateProblem(null);
    }} required /></Field>
    <Field label={t("Ort", "Location")}><input value={location} onChange={event => setLocation(event.target.value)} maxLength={240} /></Field>
    <Field label={t("Ausrüstung", "Equipment")}><input value={equipment} onChange={event => setEquipment(event.target.value)} maxLength={240} /></Field>
    <Field label={t("Details", "Details")} wide><textarea value={details} onChange={event => setDetails(event.target.value)} maxLength={6000} rows={4} /></Field>
  </Form>;
}

function MatchForm({ item, initialTeamId, finish, workspace, save, remove, ...props }: EditorContext & {
  item?: ClubMatch; initialTeamId?: string; finish?: boolean; remove?: () => void;
}) {
  const { t } = props;
  const teams = workspace.teams.filter(team => managesTeam(workspace.actor, team.id));
  const defaultTeam = teams.find(team => team.id === initialTeamId) ?? (teams.length === 1 ? teams[0] : undefined);
  const [teamId, setTeam] = useState(item?.teamId ?? defaultTeam?.id ?? "");
  const [opponent, setOpponent] = useState(item?.opponent ?? "");
  const [start, setStart] = useState(localDateInput(item?.startsAt));
  const [venue, setVenue] = useState(item?.venue ?? defaultTeam?.homeVenue ?? "");
  const [home, setHome] = useState(item?.home ?? true);
  const [status, setStatus] = useState<ClubMatch["status"]>(finish ? "final" : item?.status ?? "scheduled");
  const [ourScore, setOurScore] = useState(item?.ourScore == null ? "" : String(item.ourScore));
  const [theirScore, setTheirScore] = useState(item?.theirScore == null ? "" : String(item.theirScore));
  const [published, setPublished] = useState(item?.public ?? false);
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [dateProblem, setDateProblem] = useState<Copy | null>(null);
  function submit() {
    const startsAt = clubDateIso(start, item?.startsAt);
    if (!startsAt) {
      setDateProblem(["Wähle eine gültige Anstoßzeit.", "Choose a valid kick-off time."]);
      return;
    }
    setDateProblem(null);
    save("matches", { teamId, opponent: opponent.trim(), startsAt, venue: venue.trim(), home, status, public: published, notes: notes.trim(),
      ourScore: status === "final" ? Number(ourScore) : null, theirScore: status === "final" ? Number(theirScore) : null }, item);
  }
  return <Form {...props} problem={dateProblem ?? props.problem}
    title={finish ? t("Ergebnis erfassen", "Record result") : item ? t("Spiel bearbeiten", "Edit fixture") : t("Spiel anlegen", "Add fixture")}
    remove={remove} submit={submit} disabled={!teams.length}>
    <Field label={t("Gegner", "Opponent")}><input value={opponent} onChange={event => setOpponent(event.target.value)} required maxLength={120} autoFocus={!finish} /></Field>
    <Field label={t("Team", "Team")}><TeamSelect teams={teams} value={teamId} onChange={setTeam} t={t} /></Field>
    <Field label={t("Spielbeginn", "Starts")} hint={t("Ortszeit dieses Geräts", "Local time on this device")}>
      <input type="datetime-local" value={start} onChange={event => { setStart(event.target.value); setDateProblem(null); }} required />
    </Field>
    <Field label={t("Spielort", "Venue")}><input value={venue} onChange={event => setVenue(event.target.value)} maxLength={240} /></Field>
    <Field label={t("Heim oder auswärts", "Home or away")}><select value={home ? "home" : "away"} onChange={event => setHome(event.target.value === "home")}>
      <option value="home">{t("Heimspiel", "Home")}</option><option value="away">{t("Auswärtsspiel", "Away")}</option>
    </select></Field>
    <Field label={t("Spielstatus", "Fixture status")}><select value={status} onChange={event => setStatus(event.target.value as ClubMatch["status"])}>
      {(["scheduled", "final", "cancelled"] as const).map(value => <option key={value} value={value}>{t(...matchLabels[value])}</option>)}
    </select></Field>
    {status === "final" && <>
      <Field label={t("Unsere Punkte", "Our score")}><input type="number" inputMode="numeric" min={0} max={999} step={1} required value={ourScore} autoFocus={finish}
        onChange={event => setOurScore(event.target.value)} /></Field>
      <Field label={t("Punkte des Gegners", "Opponent score")}><input type="number" inputMode="numeric" min={0} max={999} step={1} required value={theirScore}
        onChange={event => setTheirScore(event.target.value)} /></Field>
    </>}
    <Field label={t("Notizen", "Notes")} wide><textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={6000} rows={3} /></Field>
    <Toggle label={t("Auf der Website anzeigen", "Show on the public website")} checked={published} onChange={setPublished} />
  </Form>;
}

function NewsForm({ item, workspace, save, remove, ...props }: EditorContext & { item?: Extract<EditDialog, { kind: "news" }>["item"]; remove?: () => void }) {
  const { t } = props;
  const wide = isClubWide(workspace.actor);
  const teams = workspace.teams.filter(team => managesTeam(workspace.actor, team.id));
  const [teamId, setTeam] = useState(item?.teamId ?? (!wide && teams.length === 1 ? teams[0].id : ""));
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [titleEn, setTitleEn] = useState(item?.titleEn ?? "");
  const [bodyEn, setBodyEn] = useState(item?.bodyEn ?? "");
  const [pinned, setPinned] = useState(item?.pinned ?? false);
  const [published, setPublished] = useState(item?.published ?? false);
  return <Form {...props} wide title={item ? t("News bearbeiten", "Edit news") : t("News anlegen", "Add news")} remove={remove}
    disabled={!wide && !teams.length} submit={() => save("news", {
      teamId: teamId || null, title: title.trim(), body: body.trim(), titleEn: titleEn.trim(), bodyEn: bodyEn.trim(), pinned, published,
    }, item)}>
    <Field label={t("Zielgruppe", "Audience")} wide><TeamSelect teams={teams} value={teamId} onChange={setTeam} t={t} optional={wide} /></Field>
    <fieldset className={styles.languageFields}>
      <legend lang="de">Deutsch</legend>
      <Field label={t("Titel", "Title")}><input lang="de" value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required autoFocus /></Field>
      <Field label={t("Meldung", "Message")}><textarea lang="de" value={body} onChange={event => setBody(event.target.value)} maxLength={6000} rows={6} required /></Field>
    </fieldset>
    <fieldset className={styles.languageFields}>
      <legend><span lang="en">English</span> <small>{t("optional", "optional")}</small></legend>
      <Field label={t("Titel", "Title")}><input lang="en" value={titleEn} onChange={event => setTitleEn(event.target.value)} maxLength={120} /></Field>
      <Field label={t("Meldung", "Message")}><textarea lang="en" value={bodyEn} onChange={event => setBodyEn(event.target.value)} maxLength={6000} rows={6} /></Field>
    </fieldset>
    <Toggle label={t("Oben anheften", "Pin to the top")} checked={pinned} onChange={setPinned} />
    <Toggle label={t("Im Mitgliederbereich veröffentlichen", "Publish in the member portal")} checked={published} onChange={setPublished} />
  </Form>;
}

function AssignmentForm({ dialog, workspace, save, remove, ...props }: EditorContext & { dialog: Extract<EditDialog, { kind: "assignments" }>; remove?: () => void }) {
  const { t } = props;
  const item = dialog.item;
  const plays = workspace.plays.filter(play => play.canAssign);
  const teams = workspace.teams.filter(team => managesTeam(workspace.actor, team.id));
  const people = workspace.people.filter(person => person.status !== "disabled" &&
    (person.id === workspace.actor.id || isClubWide(workspace.actor) || person.teamIds.some(id => managesTeam(workspace.actor, id))));
  const [playId, setPlay] = useState(item?.playId ?? dialog.playId ?? (plays.length === 1 ? plays[0].id : ""));
  const [targetType, setTargetType] = useState<Fields["assignments"]["targetType"]>(item?.targetType ?? (teams.length || !people.length ? "team" : "person"));
  const [targetId, setTarget] = useState(item?.targetId ?? "");
  const [access, setAccess] = useState<Fields["assignments"]["access"]>(item?.access ?? "view");
  const [instructions, setInstructions] = useState(item?.instructions ?? "");
  const targets = targetType === "team" ? teams : people;
  return <Form {...props} title={item ? t("Zuweisung bearbeiten", "Edit assignment") : t("Taktik zuweisen", "Assign a play")} remove={remove}
    disabled={!plays.some(play => play.id === playId) || !targets.some(target => target.id === targetId)}
    submit={() => save("assignments", { playId, targetType, targetId, access, instructions: instructions.trim() }, item)}>
    <Field label={t("Taktik", "Play")} wide><select value={playId} onChange={event => setPlay(event.target.value)} required autoFocus>
      <option value="">{t("Taktik auswählen", "Choose a play")}</option>
      {plays.map(play => <option value={play.id} key={play.id}>{play.copy ? t(play.copy.de.title, play.copy.en.title) : play.title}</option>)}
    </select></Field>
    <Field label={t("Zuweisen an", "Assign to")}><select value={targetType} onChange={event => {
      setTargetType(event.target.value as typeof targetType); setTarget("");
    }}>
      <option value="team">{t("Team", "Team")}</option><option value="person">{t("Person", "Person")}</option>
    </select></Field>
    <Field label={targetType === "team" ? t("Team", "Team") : t("Person", "Person")}
      hint={!targets.length ? t("Für diese Zielgruppe sind keine Einträge verfügbar.", "There are no entries in this audience.") : undefined}>
      <select value={targetId} onChange={event => setTarget(event.target.value)} required>
      <option value="">{t("Auswählen", "Choose")}</option>
      {targets.map(target => <option value={target.id} key={target.id}>{target.name}</option>)}
    </select></Field>
    <Field label={t("Zugriff", "Access")} wide><select value={access} onChange={event => setAccess(event.target.value as typeof access)}>
      <option value="view">{t("Ansehen", "View")}</option><option value="edit">{t("Mitbearbeiten", "Edit")}</option>
    </select></Field>
    <Field label={t("Hinweis zum Spielzug", "Instructions")} wide><textarea value={instructions} onChange={event => setInstructions(event.target.value)} maxLength={800} rows={3} /></Field>
  </Form>;
}

export function EditForm({ dialog, remove, ...context }: EditorContext & { dialog: EditDialog; remove?: () => void }) {
  switch (dialog.kind) {
    case "people": return <PersonForm item={dialog.item} {...context} />;
    case "teams": return <TeamForm item={dialog.item} remove={remove} {...context} />;
    case "trainings": return <TrainingForm item={dialog.item} initialTeamId={dialog.teamId} remove={remove} {...context} />;
    case "matches": return <MatchForm item={dialog.item} initialTeamId={dialog.teamId} finish={dialog.finish} remove={remove} {...context} />;
    case "news": return <NewsForm item={dialog.item} remove={remove} {...context} />;
    case "assignments": return <AssignmentForm dialog={dialog} remove={remove} {...context} />;
  }
}
