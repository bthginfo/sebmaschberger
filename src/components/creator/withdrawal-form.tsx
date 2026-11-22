"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, Download } from 'lucide-react';
import { WITHDRAWAL_DECLARATION } from '@/lib/commerce/withdrawal';
import styles from './withdrawal.module.css';

type Receipt = { id: string; receivedAt: string; confirmation: string; delivery: 'sent' | 'pending' | 'failed' | 'not-configured' };

export function WithdrawalForm() {
  const [details, setDetails] = useState({ name: '', contract: '', email: '', website: '' });
  const [reviewing, setReviewing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef('');
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);
  useEffect(() => {
    if (reviewing || receipt) nextHeading.current?.focus();
  }, [reviewing, receipt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    if (!reviewing) { setReviewing(true); return; }
    sending.current = true;
    setBusy(true);
    setError('');
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/commerce/withdrawal', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...details, email: details.email.trim(), requestId: requestId.current })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Der Eingang konnte gerade nicht bestätigt werden.');
      setReceipt(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Der Eingang konnte gerade nicht bestätigt werden. Bitte versuchen Sie es erneut.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function download() {
    if (!receipt) return;
    const url = URL.createObjectURL(new Blob([receipt.confirmation], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bestaetigung-' + receipt.id + '.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (receipt) return <section className={styles.form} aria-labelledby="withdrawal-confirmed">
    <CheckCircle2 size={26} aria-hidden="true" />
    <h2 ref={nextHeading} tabIndex={-1} id="withdrawal-confirmed">Ihr Widerruf ist eingegangen</h2>
    <p>{receipt.delivery === 'sent' ? 'Die Eingangsbestätigung wurde an Ihre E-Mail-Adresse gesendet.' : 'Die Bestätigung konnte noch nicht per E-Mail zugestellt werden. Sie können sie hier speichern.'}</p>
    <p>Vorgang <strong>{receipt.id}</strong></p>
    <button type="button" className={styles.primary} onClick={download}><Download size={18} aria-hidden="true" />Bestätigung speichern</button>
  </section>;

  return <form className={styles.form} onSubmit={submit}>
    {reviewing ? <>
      <h2 ref={nextHeading} tabIndex={-1}>Angaben prüfen</h2>
      <p>{WITHDRAWAL_DECLARATION}</p>
      <dl className={styles.review}>
        <div><dt>Name</dt><dd>{details.name}</dd></div>
        <div><dt>Vertrag oder Vertragsteil</dt><dd>{details.contract}</dd></div>
        <div><dt>E-Mail für die Bestätigung</dt><dd>{details.email}</dd></div>
      </dl>
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Widerruf wird gesendet …' : 'Widerruf bestätigen'}</button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setReviewing(false); setError(''); }}>Angaben ändern</button>
      </div>
    </> : <>
      <label>Name<input autoComplete="name" required minLength={2} maxLength={150} value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} /></label>
      <label>Vertrag oder Vertragsteil<textarea required minLength={2} maxLength={1800} rows={4} aria-describedby="withdrawal-contract-help" value={details.contract} onChange={event => setDetails({ ...details, contract: event.target.value })} /><small id="withdrawal-contract-help">Zum Beispiel Bestellnummer und die Artikel, auf die sich Ihr Widerruf bezieht.</small></label>
      <label>E-Mail für die Bestätigung<input autoComplete="email" type="email" required maxLength={254} value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} /></label>
      <label className={styles.honeypot} aria-hidden="true">Website<input autoComplete="off" tabIndex={-1} value={details.website} onChange={event => setDetails({ ...details, website: event.target.value })} /></label>
      <button type="submit" className={styles.primary}>Angaben prüfen<ArrowRight size={18} aria-hidden="true" /></button>
    </>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </form>;
}
