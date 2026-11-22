"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAdminLanguage } from "@/components/admin/admin-language";
import { MemberBrand, MemberLanguageToggle, MemberRequestError, memberWrite } from "./member-shared";

type AuthMode = "login" | "join";
type AuthIssue = "invalid" | "invite" | "limit" | "network";

function invitationToken() {
  const hash = window.location.hash.slice(1);
  if (!hash) return "";
  try {
    const value = hash.startsWith("token=") ? new URLSearchParams(hash).get("token") : decodeURIComponent(hash);
    return value && value.length <= 120 && /^[A-Za-z0-9._~-]+$/u.test(value) ? value : "";
  } catch {
    return "";
  }
}

const authFeedback = {
  de: {
    invalid: "E-Mail-Adresse oder Passwort stimmen nicht. Prüfe deine Eingaben.",
    invite: "Dieser Einladungslink ist abgelaufen oder wurde schon verwendet. Bitte deinen Verein um einen neuen Link.",
    limit: "Zu viele Versuche. Warte kurz und versuche es erneut.",
    network: "Der Mitgliederbereich ist gerade nicht erreichbar. Versuche es erneut.",
  },
  en: {
    invalid: "The email address or password doesn’t match. Check your details and try again.",
    invite: "This invitation has expired or has already been used. Ask your club for a new link.",
    limit: "Too many attempts. Wait a moment and try again.",
    network: "The member area is currently unavailable. Try again in a moment.",
  },
} as const;

export function MemberAuth({ mode, brandName }: { mode: AuthMode; brandName: string }) {
  const { language } = useAdminLanguage();
  const english = language === "en";
  const joining = mode === "join";
  const text = (de: string, en: string) => english ? en : de;
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [issue, setIssue] = useState<AuthIssue | null>(null);
  const writing = useRef(false);

  useEffect(() => {
    if (!joining) return;
    const read = () => setToken(invitationToken());
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [joining]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (writing.current || (joining && !token)) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    writing.current = true;
    setPending(true);
    setIssue(null);
    try {
      await memberWrite(joining ? "/join" : "/login", "POST", joining ? { token, password } : {
        email: String(form.get("email") ?? "").trim(),
        password,
      });
      window.location.replace("/members");
    } catch (error) {
      const status = error instanceof MemberRequestError ? error.status : 0;
      setIssue(status === 429 ? "limit" : status >= 400 && status < 500 ? joining ? "invite" : "invalid" : "network");
      writing.current = false;
      setPending(false);
    }
  }

  const memberArea = text("Mitgliederbereich", "Member area");
  const missingInvite = joining && token === "";
  return <div className="club-member club-member-auth" lang={language}>
    <div className="club-member-auth-art">
      <MemberBrand href="/" brandName={brandName} subtitle={memberArea} />
      <div className="club-member-auth-art-copy">
        <span>{text("Dein Verein.", "Your club.")}<br />{text("Dein Spieltag.", "Your match day.")}</span>
        <p>{text("Trainings, Spielpläne und Neuigkeiten deiner Mannschaften.", "Training, fixtures and updates for your teams.")}</p>
      </div>
    </div>
    <main className="club-member-auth-main">
      <div className="club-member-auth-top"><MemberLanguageToggle /></div>
      <div className="club-member-auth-form-wrap">
        <div className="club-member-auth-symbol" aria-hidden="true">{joining ? <KeyRound size={24} /> : <LockKeyhole size={23} />}</div>
        <h1>{joining ? text("Einladung annehmen", "Accept your invitation") : text("Anmelden", "Sign in to your club")}</h1>
        <p className="club-member-auth-intro">{joining
          ? text("Lege ein Passwort fest, um deinen Vereinszugang zu aktivieren.", "Set a password to activate your club account.")
          : text("Melde dich mit der E-Mail-Adresse an, an die deine Vereinseinladung ging.", "Sign in with the email address that received your club invitation.")}</p>
        {missingInvite ? <div className="club-member-alert" role="status">{text("Öffne den vollständigen Einladungslink, den du vom Verein erhalten hast.", "Open the full invitation link sent by your club.")}</div> :
          joining && token === null ? <p role="status" className="club-member-muted">{text("Einladung wird geöffnet …", "Opening invitation…")}</p> :
          <form onSubmit={submit} className="club-member-auth-form">
            {!joining && <label>{text("E-Mail-Adresse", "Email address")}
              <input name="email" type="email" autoComplete="username" required maxLength={254} disabled={pending} placeholder={text("name@beispiel.de", "name@example.com")} />
            </label>}
            <div className="club-member-password-field">
              <label htmlFor="club-member-password">{text("Passwort", "Password")}</label>
              <div className="club-member-password">
                <input id="club-member-password" name="password" type={showPassword ? "text" : "password"} autoComplete={joining ? "new-password" : "current-password"}
                  required minLength={joining ? 12 : 1} maxLength={200} disabled={pending} aria-describedby={joining ? "club-member-password-hint" : undefined} />
                <button type="button" className="club-member-icon-button" aria-pressed={showPassword}
                  aria-label={showPassword ? text("Passwort verbergen", "Hide password") : text("Passwort anzeigen", "Show password")}
                  onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
            </div>
            {joining && <small id="club-member-password-hint" className="club-member-muted">{text("Mindestens 12 Zeichen.", "At least 12 characters.")}</small>}
            {issue && <p className="club-member-alert" role="alert">{authFeedback[language][issue]}</p>}
            <button type="submit" className="club-member-button club-member-button-primary" disabled={pending}>
              {pending ? text("Wird geladen …", "Working…") : joining ? text("Zugang aktivieren", "Activate account") : text("Anmelden", "Sign in")}<ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>}
        <div className="club-member-auth-foot">
          {joining ? <Link href="/members/login"><ArrowLeft size={16} aria-hidden="true" />{text("Zur Anmeldung", "Back to sign in")}</Link> :
            <><span>{text("Neu im Verein? Dein Zugang startet mit einer Einladung.", "New to the club? Your account starts with an invitation.")}</span>
              <Link href="/"><ArrowLeft size={16} aria-hidden="true" />{text("Zur Vereinswebsite", "Back to club website")}</Link></>}
        </div>
      </div>
    </main>
  </div>;
}
