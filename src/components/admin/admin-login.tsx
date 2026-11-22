"use client";

import { AdminLanguageSwitch, useAdminLanguage } from "./admin-language";

import { useState, type FormEvent } from "react";
import { Button, Eye, EyeOff, Field, IconButton, Input, Notice, ShieldCheck, api, errorMessage } from "./admin-ui";

export function AdminLogin({ siteName = 'Website', teamLogin }: { siteName?: string; teamLogin?: string }) {
  const { t: adminText } = useAdminLanguage();
  const [team, setTeam] = useState(Boolean(teamLogin));
  const [login, setLogin] = useState(teamLogin ?? '');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password, login: team ? login : undefined }) });
      window.location.assign('/admin');
    } catch (error) { setError(errorMessage(error)); setBusy(false); }
  }
  return <main className="cms-root cms-login">
    <a href="/" className="cms-login-brand">{siteName} <span>CMS</span><span className="cms-brand-sub">{adminText("Verwaltung")}</span></a>
    <AdminLanguageSwitch className="cms-login-language" />
    <section className="cms-login-panel">
      <div className="cms-login-mark"><ShieldCheck size={27} strokeWidth={1.4} /></div>
      <h1>{adminText("Ihre Website.")}<br />{adminText("Alles an einem Ort.")}</h1>
      <p>{team ? adminText("Melden Sie sich mit Ihrem persönlichen Zugang an.") : adminText("Melden Sie sich mit Ihrem Inhaber-Passwort an.")}</p>
      <form onSubmit={submit}>
        {team && <Field label={adminText("Benutzername")}><Input name="username" required autoComplete="username" maxLength={64} value={login} onChange={event => setLogin(event.target.value)} /></Field>}
        <Field label={adminText("Passwort")}><span className="cms-password">
          <Input required type={visible ? 'text' : 'password'} name="password" autoComplete="current-password" autoFocus={!team || Boolean(teamLogin)} value={password} onChange={event => setPassword(event.target.value)} />
          <IconButton label={visible ? adminText("Passwort verbergen") : adminText("Passwort anzeigen")} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</IconButton>
        </span></Field>
        {error && <Notice tone="error">{adminText(error)}</Notice>}
        <Button type="submit" variant="primary" busy={busy} disabled={!password || team && !login.trim()}>{adminText("Anmelden")}</Button>
      </form>
      <button className="cms-text-link" type="button" disabled={busy} onClick={() => { setTeam(!team); setPassword(''); setError(''); }}>{team ? adminText("Als Inhaber anmelden") : adminText("Mit Teamzugang anmelden")}</button>
      <a href="/" className="cms-text-link">{adminText("Zur öffentlichen Website")}</a>
    </section>
    <p className="cms-login-note">{adminText("Verwaltung für Ihre Website")}</p>
  </main>;
}
