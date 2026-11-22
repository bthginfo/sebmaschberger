"use client";

import { Camera, Check, LogOut, Shield, UserRound } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { ClubPerson, ClubTeam } from "@/lib/club/model";
import { MemberAvatar, MemberEmpty, type MemberLanguage } from "./member-shared";

export type ProfileUpdate = Pick<ClubPerson, "revision" | "name" | "position" | "jersey" | "bio">;

function fields(person: ClubPerson) {
  return { name: person.name, position: person.position, jersey: person.jersey === null ? "" : String(person.jersey), bio: person.bio };
}

const photoTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function MemberProfile({ person, teams, language, pendingKey, stamp, onSave, onUpload, onLogout }: {
  person?: ClubPerson;
  teams: ClubTeam[];
  language: MemberLanguage;
  pendingKey: string | null;
  stamp: number;
  onSave: (person: ClubPerson, update: ProfileUpdate) => Promise<ClubPerson | undefined>;
  onUpload: (person: ClubPerson, file: File) => Promise<ClubPerson | undefined>;
  onLogout: () => void;
}) {
  const en = language === "en";
  if (!person) return <section className="club-member-card club-member-profile-shell">
    <MemberEmpty icon={<UserRound size={21} />} title={en ? "Profile unavailable" : "Profil nicht verfügbar"}
      description={en ? "Try signing in again if your profile does not appear." : "Melde dich erneut an, wenn dein Profil nicht angezeigt wird."}
      action={<button type="button" className="club-member-button club-member-button-neutral" onClick={onLogout} disabled={pendingKey !== null}><LogOut size={17} />{en ? "Sign out" : "Abmelden"}</button>} />
  </section>;
  return <ProfileForm key={person.id} person={person} teams={teams} language={language} pendingKey={pendingKey} stamp={stamp} onSave={onSave} onUpload={onUpload} onLogout={onLogout} />;
}

function ProfileForm({ person, teams, language, pendingKey, stamp, onSave, onUpload, onLogout }: {
  person: ClubPerson;
  teams: ClubTeam[];
  language: MemberLanguage;
  pendingKey: string | null;
  stamp: number;
  onSave: (person: ClubPerson, update: ProfileUpdate) => Promise<ClubPerson | undefined>;
  onUpload: (person: ClubPerson, file: File) => Promise<ClubPerson | undefined>;
  onLogout: () => void;
}) {
  const en = language === "en";
  const text = (de: string, english: string) => en ? english : de;
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(() => fields(person));
  const [base, setBase] = useState(() => ({ revision: person.revision, ...fields(person) }));
  const [fileIssue, setFileIssue] = useState(false);
  const editingLocked = pendingKey === "profile" || pendingKey === "avatar";
  const dirty = draft.name !== base.name || draft.position !== base.position || draft.jersey !== base.jersey || draft.bio !== base.bio;
  const memberships = teams.filter(team => person.teamIds.includes(team.id));

  function edit(key: keyof typeof draft, value: string) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || pendingKey) return;
    const saved = await onSave(person, {
      revision: base.revision,
      name: draft.name.trim(),
      position: draft.position.trim(),
      jersey: draft.jersey === "" ? null : Number(draft.jersey),
      bio: draft.bio.trim(),
    });
    if (saved) {
      const values = fields(saved);
      setDraft(values);
      setBase({ revision: saved.revision, ...values });
    }
  }

  async function upload(file?: File) {
    setFileIssue(false);
    if (!file || pendingKey) return;
    if (!photoTypes.includes(file.type) || file.size < 1 || file.size > 3 * 1024 * 1024) {
      setFileIssue(true);
      return;
    }
    const saved = await onUpload(person, file);
    if (!saved) return;
    const updated = fields(saved);
    if (!dirty) {
      setDraft(updated);
      setBase({ revision: saved.revision, ...updated });
    } else if (updated.name === base.name && updated.position === base.position && updated.jersey === base.jersey && updated.bio === base.bio) {
      setBase(current => ({ ...current, revision: saved.revision }));
    }
  }

  return <div className="club-member-profile-layout">
    <section className="club-member-card club-member-profile-shell">
      <div className="club-member-profile-identity">
        <MemberAvatar person={person} name={person.name} size={72} stamp={stamp} />
        <div><h2>{person.name}</h2>{person.email && <p>{person.email}</p>}</div>
      </div>
      <input ref={fileInput} type="file" accept={photoTypes.join(",")} hidden onChange={event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = "";
        void upload(file);
      }} />
      <button type="button" className="club-member-button club-member-button-neutral" disabled={pendingKey !== null} onClick={() => fileInput.current?.click()}>
        <Camera size={17} aria-hidden="true" />{pendingKey === "avatar" ? text("Wird hochgeladen …", "Uploading…") : text("Profilfoto ändern", "Change profile photo")}
      </button>
      <p className="club-member-muted club-member-photo-hint">{text("JPEG, PNG, WebP oder AVIF. Bis 3 MB.", "JPEG, PNG, WebP or AVIF. Up to 3 MB.")}</p>
      {fileIssue && <p role="alert" className="club-member-alert">{text("Wähle eine Bilddatei im angegebenen Format mit höchstens 3 MB.", "Choose an image in one of the listed formats, up to 3 MB.")}</p>}
      {memberships.length > 0 && <div className="club-member-profile-teams"><span>{text("Deine Teams", "Your teams")}</span>
        <ul>{memberships.map(team => <li className="club-member-pill" key={team.id}>{team.name}</li>)}</ul>
      </div>}
      <button type="button" className="club-member-text-button club-member-signout" disabled={pendingKey !== null} onClick={onLogout}><LogOut size={17} aria-hidden="true" />{text("Abmelden", "Sign out")}</button>
    </section>
    <section className="club-member-card club-member-profile-shell">
      <div className="club-member-card-heading"><h2>{text("Persönliche Angaben", "Personal details")}</h2></div>
      <form className="club-member-profile-form" onSubmit={save}>
        <label>{text("Name", "Name")}<input autoComplete="name" required maxLength={120} disabled={editingLocked} value={draft.name} onChange={event => edit("name", event.target.value)} /></label>
        <div className="club-member-form-row">
          <label>{text("Position", "Position")}<input maxLength={240} disabled={editingLocked} value={draft.position} onChange={event => edit("position", event.target.value)} /></label>
          <label>{text("Trikotnummer", "Shirt number")}<input type="number" inputMode="numeric" min={0} max={99} step={1} disabled={editingLocked} value={draft.jersey} onChange={event => edit("jersey", event.target.value)} /></label>
        </div>
        <label>{text("Über mich", "About me")}<textarea rows={4} maxLength={800} disabled={editingLocked} value={draft.bio} onChange={event => edit("bio", event.target.value)} /></label>
        <p className="club-member-profile-private"><Shield size={15} aria-hidden="true" />{text("Dein Profil ist Teil des privaten Vereinsbereichs.", "Your profile is part of the private club area.")}</p>
        <button type="submit" className="club-member-button club-member-button-primary" disabled={!dirty || pendingKey !== null}>
          <Check size={17} aria-hidden="true" />{pendingKey === "profile" ? text("Wird gespeichert …", "Saving…") : text("Änderungen speichern", "Save changes")}
        </button>
      </form>
    </section>
  </div>;
}
