"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Plus, ShieldCheck, Users } from 'lucide-react';
import { activityLabels, staffRoleLabels, type AdminActivity, type StaffView } from '@/lib/team/model';
import type { StaffRole } from '@/lib/auth-session';
import { Button, EmptyState, Field, Input, Modal, Notice, Select, api, errorMessage, formatDate } from './admin-ui';
import { useAdminLanguage } from "@/components/admin/admin-language";

type TeamData = { accounts: StaffView[]; activity: AdminActivity[] };
type OneTimeAccess = { account: StaffView; password: string };
const initial = { name: '', login: '', role: 'editor' as StaffRole };

export function TeamPanel() {
  const { language, t } = useAdminLanguage();
  const [data, setData] = useState<TeamData>();
  const [form, setForm] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<OneTimeAccess>();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<{ account: StaffView; action: 'enable' | 'disable' | 'reset' }>();

  async function load(signal?: AbortSignal) {
    try { setData(await api<TeamData>('/api/admin/team', { signal })); }
    catch (error) { if (!signal?.aborted) setError(errorMessage(error)); }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setCopied(false);
    try {
      const result = await api<{ account: StaffView; password?: string }>('/api/admin/team', {
        method: pending ? 'PATCH' : 'POST',
        body: JSON.stringify(pending ? { login: pending.account.login, version: pending.account.version, action: pending.action } : form)
      });
      if (result.password) setIssued({ account: result.account, password: result.password });
      setAdding(false); setPending(undefined); setForm(initial);
      await load();
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function copyAccess(access: OneTimeAccess) {
    const login = new URL('/admin/login', window.location.origin);
    login.searchParams.set('konto', access.account.login);
    try {
      await navigator.clipboard.writeText(`${t("CMS-Zugang")}\n${login.href}\n${t("Benutzername")} ${access.account.login}\n${t("Passwort")} ${access.password}`);
      setCopied(true);
    } catch { setError('Die Zugangsdaten lassen sich hier markieren und manuell kopieren.'); }
  }

  return <div className="cms-page cms-team">
    <div className="cms-page-heading">
      <div><h1>{t("Team & Zugänge")}</h1><p>{t("Persönliche Zugänge für die Menschen, die mit Ihrer Website arbeiten.")}</p></div>
      <Button variant="primary" onClick={() => { setError(''); setAdding(true); }}><Plus size={17} />{t("Zugang anlegen")}</Button>
    </div>
    <div className="cms-team-cards">
      <div><Users size={20} /><strong>{t("Redaktion")}</strong><p>{t("Seiten, Beiträge und Bilder im Entwurf bearbeiten.")}</p></div>
      <div><ShieldCheck size={20} /><strong>{t("Shop-Team")}</strong><p>{t("Bestellungen bearbeiten, Belege öffnen und den Versand markieren.")}</p></div>
    </div>
    {error && !adding && !pending && !issued && <Notice tone="error">{t(error)}</Notice>}
    {data ? <section className="cms-team-list" aria-label={t("Persönliche Zugänge")}>
      {!data.accounts.length ? <EmptyState icon={Users} title={t("Noch keine Teamzugänge")}>{t("Legen Sie für jedes Teammitglied einen eigenen Zugang an.")}</EmptyState> :
        data.accounts.map(account => <article key={account.login} className="cms-team-row">
          <div><strong>{account.name}</strong><span>{account.login} · {t(staffRoleLabels[account.role])}</span></div>
          <span className="cms-team-status">{account.enabled ? t("Aktiv") : t("Gesperrt")}</span>
          <div className="cms-team-actions">
            {account.enabled && <Button onClick={() => { setError(''); setPending({ account, action: 'reset' }); }}>{t("Passwort neu")}</Button>}
            <Button onClick={() => { setError(''); setPending({ account, action: account.enabled ? 'disable' : 'enable' }); }}>{account.enabled ? t("Sperren") : t("Aktivieren")}</Button>
          </div>
        </article>)}
      <details className="cms-system cms-system--optional"><summary>{t("Letzte Aktivitäten")}</summary>
        {data.activity.length ? <ol className="cms-team-history">{data.activity.map(entry => <li key={entry.id}>
          <strong>{t(activityLabels[entry.action])}</strong><span>{entry.actor} · {formatDate(entry.at, true, language)}</span>
        </li>)}</ol> : <p>{t("Erfolgreiche Änderungen erscheinen hier, sobald das Team mit dem CMS arbeitet.")}</p>}
      </details>
    </section> : !error && <p role="status">{t("Zugänge werden geladen …")}</p>}
    {adding && <Modal title={t("Persönlichen Zugang anlegen")} onClose={() => { if (!busy) setAdding(false); }} busy={busy}
      footer={<Button type="submit" form="cms-team-add" variant="primary" busy={busy}>{t("Zugang erstellen")}</Button>}>
      <form id="cms-team-add" onSubmit={save} className="cms-team-form">
        <Field label="Name"><Input value={form.name} required minLength={2} maxLength={80} onChange={event => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label={t("Benutzername")} hint={t("Zum Beispiel anna.redaktion")}><Input value={form.login} required autoComplete="off" pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,63}" onChange={event => setForm({ ...form, login: event.target.value })} /></Field>
        <Field label={t("Rolle")}><Select value={form.role} onChange={event => setForm({ ...form, role: event.target.value as StaffRole })}><option value="editor">{t("Redaktion")}</option><option value="shop">{t("Shop-Team")}</option></Select></Field>
        {error && <Notice tone="error">{t(error)}</Notice>}
      </form>
    </Modal>}
    {pending && <Modal title={pending.action === 'reset' ? t("Neues Passwort erstellen?") : pending.action === 'disable' ? t("Zugang sperren?") : t("Zugang wieder aktivieren?")}
      onClose={() => { if (!busy) setPending(undefined); }} busy={busy}
      footer={<Button variant="primary" onClick={() => void save()} busy={busy}>{t("Bestätigen")}</Button>}>
      <p>{pending.account.name}. {pending.action === 'enable' ? t("Die Person kann sich wieder mit ihrem Passwort anmelden.") : t("Alle bestehenden Sitzungen dieses Zugangs werden ungültig.")}</p>
      {error && <Notice tone="error">{t(error)}</Notice>}
    </Modal>}
    {issued && <Modal title={t("Zugangsdaten teilen")} onClose={() => { setIssued(undefined); setError(''); }}
      footer={<Button variant="primary" onClick={() => void copyAccess(issued)}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t("Kopiert") : t("Zugangsdaten kopieren")}</Button>}>
      <p>{t("Das Passwort erscheint nur hier. Teilen Sie den Zugang über einen geschützten Weg. Die Person kann ihr Passwort unter „Mein Zugang“ ändern.")}</p>
      <dl className="cms-team-credentials"><div><dt>{t("Benutzername")}</dt><dd>{issued.account.login}</dd></div><div><dt>{t("Passwort")}</dt><dd>{issued.password}</dd></div></dl>
      {error && <Notice tone="error">{t(error)}</Notice>}
    </Modal>}
  </div>;
}

export function PersonalAccount({ name }: { name?: string }) {
  const { t } = useAdminLanguage();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try {
      await api('/api/admin/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrent(''); setNext(''); setSaved(true);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="cms-page cms-team"><div className="cms-page-heading"><div><h1>{t("Mein Zugang")}</h1><p>{name || t("Persönlicher Zugang")}</p></div><KeyRound size={23} /></div>
    <form className="cms-team-form cms-team-personal" onSubmit={submit}>
      <Field label={t("Aktuelles Passwort")}><Input type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrent(event.target.value)} /></Field>
      <Field label={t("Neues Passwort")} hint={t("Mindestens 12 Zeichen")}><Input type="password" autoComplete="new-password" required minLength={12} maxLength={200} value={newPassword} onChange={event => setNext(event.target.value)} /></Field>
      {error && <Notice tone="error">{t(error)}</Notice>}{saved && <Notice tone="success">{t("Ihr Passwort wurde geändert.")}</Notice>}
      <Button type="submit" variant="primary" busy={busy}>{t("Passwort ändern")}</Button>
    </form>
  </div>;
}
