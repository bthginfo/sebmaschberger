'use client';

import { useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Check, ChevronRight, LoaderCircle, X } from 'lucide-react';
import type { Language } from '@/lib/coaching-portal/model';
import styles from './portal.module.css';

export type Text = (de: string, en: string) => string;
export function translator(language: Language): Text { return (de, en) => language === 'en' ? en : de; }
export const uid = () => crypto.randomUUID();
const api = '/api/coaching-portal/';
export async function request<T>(action: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  const body = data instanceof FormData ? data : data === undefined ? undefined : JSON.stringify(data);
  const response = await fetch(api + action, {
    cache: 'no-store', method: body === undefined ? 'GET' : 'POST', signal, body,
    headers: typeof body === 'string' ? { 'Content-Type': 'application/json' } : undefined
  });
  const parsed = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(parsed.error || ('Anfrage fehlgeschlagen · ' + response.status));
  return parsed as T;
}
export function prettyDate(value: string, language: Language, long = false) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'de-DE', {
    weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC'
  }).format(new Date(value + 'T12:00:00Z'));
}
export function errorText(error: unknown) { return error instanceof Error ? error.message : 'Bitte versuche es erneut.'; }
export function Button({ children, primary, quiet, loading, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; quiet?: boolean; loading?: boolean }) {
  return <button type="button" {...props} disabled={props.disabled || loading} className={[styles.button, primary ? styles.primary : quiet ? styles.quiet : '', className].join(' ')}>
    {loading && <LoaderCircle size={17} className={styles.spin} aria-hidden="true"/>}{children}</button>;
}
export function Field({ label, children, className = '' }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <label className={styles.field + ' ' + className}><span>{label}</span>{children}</label>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props}/>; }
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={styles.panel + ' ' + className}>{children}</section>;
}
export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <Panel><header className={styles.panelHeading}><h2>{title}</h2>{action}</header>{children}</Panel>;
}
export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return <div className={styles.empty}><strong>{title}</strong>{text && <p>{text}</p>}{action}</div>;
}
export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog ref={ref} className={styles.modal} aria-label={title} onCancel={close}>
    <header className={styles.panelHeading}><h2>{title}</h2><Button quiet aria-label="Schließen / Close" onClick={close}><X size={19}/></Button></header>
    {children}
  </dialog>;
}
export function Switch({ label, checked, change }: { label: string; checked: boolean; change: (value: boolean) => void }) {
  return <label className={styles.switch}><span>{label}</span><input type="checkbox" role="switch" checked={checked} onChange={event => change(event.target.checked)}/><i aria-hidden="true"/></label>;
}
export function Status({ text, bad = false }: { text: string; bad?: boolean }) {
  return <div className={bad ? styles.alert : styles.notice} role={bad ? 'alert' : 'status'}>{!bad && <Check size={17} aria-hidden="true"/>}{text}</div>;
}
export function ActionRow({ title, sub, icon, action }: { title: string; sub?: string; icon: ReactNode; action: () => void }) {
  return <button type="button" className={styles.actionRow} onClick={action}><span className={styles.rowIcon}>{icon}</span>
    <span><strong>{title}</strong>{sub && <small>{sub}</small>}</span><ChevronRight size={18} aria-hidden="true"/></button>;
}
export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
