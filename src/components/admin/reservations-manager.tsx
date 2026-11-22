"use client";

import { useEffect, useState } from 'react';
import { CalendarDays, Mail, RefreshCw } from 'lucide-react';
import { decisionMessage, emptyReservationSettings, isPendingExpired, type Booking, type ReservationStatus, type ReservationsModule } from '@/lib/reservations/model';
import { useAdminLanguage } from './admin-language';
import { Button, EmptyState, Field, Input, Notice, Select, Toggle, api, errorMessage } from './admin-ui';
import { HospitalityDraftActions, type DraftActions } from './hospitality-draft-actions';
import { ReservationSettingsForm } from './reservation-settings';

type BookingAction = 'confirm' | 'decline' | 'cancel' | 'retry-email';
type BookingsResponse = { date: string; bookings: Booking[]; smtp: boolean; smtpVerified?: boolean };

const statusCopy: Record<ReservationStatus, string> = {
  pending: 'Offen', confirmed: 'Zugesagt', declined: 'Abgelehnt', cancelled: 'Storniert',
};

export function ReservationsManager({ module, onChange, actions, brand, onOpenMailSettings }: {
  module: ReservationsModule;
  onChange: (value: ReservationsModule) => void;
  actions: DraftActions;
  brand: string;
  onOpenMailSettings?: () => void;
}) {
  const { t, language } = useAdminLanguage();
  const [tab, setTab] = useState<'requests' | 'settings'>('requests');
  const [date, setDate] = useState('');
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState<BookingsResponse>();
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ booking: Booking; action: 'decline' | 'cancel' }>();

  useEffect(() => {
    if (tab !== 'requests') return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<BookingsResponse>('/api/admin/reservations' + (date ? '?date=' + encodeURIComponent(date) : ''), { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refresh, tab]);

  async function decide(booking: Booking, action: BookingAction) {
    setSaving(booking.id);
    setError('');
    setActionTarget(undefined);
    try {
      const { booking: changed } = await api<{ booking: Booking }>('/api/admin/reservations', {
        method: 'POST', body: JSON.stringify({ date: booking.date, id: booking.id, version: booking.version, action }),
      });
      setData(current => current && { ...current, bookings: current.bookings.map(entry => entry.id === changed.id ? changed : entry) });
    } catch (error) { setError(errorMessage(error)); }
    finally { setSaving(undefined); }
  }

  const entries = (data?.bookings ?? []).filter(booking => filter === 'all' || booking.status === filter);
  const upcoming = data?.bookings.filter(entry => entry.status === 'pending').length ?? 0;
  const now = new Date();
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(value + 'T00:00:00Z'));

  return <div className="cms-page cms-hospitality">
    <header className="cms-hospitality-head">
      <div><h1>{t('Reservierungen')}</h1><p>{t('Anfragen prüfen und verfügbare Tische verwalten.')}</p></div>
      {tab === 'settings' && <HospitalityDraftActions {...actions} />}
    </header>
    <div className="cms-tabs cms-hospitality-tabs" role="group" aria-label={t('Reservierungen')}>
      <button type="button" aria-pressed={tab === 'requests'} onClick={() => setTab('requests')}>{t('Anfragen')}{upcoming ? ` · ${upcoming}` : ''}</button>
      <button type="button" aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>{t('Tische & Buchungszeiten')}</button>
    </div>
    {tab === 'settings' ? <>
      <div className="cms-hospitality-panel">
        <Toggle label={t('Online-Reservierungen öffnen')} checked={module.enabled} onChange={enabled => onChange({ ...module, enabled })} hint={t('Die Website übernimmt Änderungen nach dem Veröffentlichen.')}/>
      </div>
      <ReservationSettingsForm settings={module.settings ?? emptyReservationSettings} onChange={settings => onChange({ ...module, settings })} />
    </> : <section className="cms-hospitality-panel">
      <div className="cms-hospitality-panel-title">
        <div><h2>{t(date ? 'Tagesübersicht' : 'Kommende Anfragen')}</h2><p>{t(date ? 'Anfragen und Tischbelegung für den ausgewählten Tag.' : 'Anfragen und Zusagen innerhalb des Buchungszeitraums.')}</p></div>
        <Button busy={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />{t('Aktualisieren')}</Button>
      </div>
      <div className="cms-hospitality-list-tools">
        <Field label={t('Datum')}><Input type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
        <Field label={t('Status')}><Select value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">{t('Alle Anfragen')}</option>
          {Object.entries(statusCopy).map(([status, label]) => <option key={status} value={status}>{t(label)}</option>)}
        </Select></Field>
        {date && <Button onClick={() => setDate('')}>{t('Alle kommenden Tage')}</Button>}
      </div>
      {data && (!data.smtp || !data.smtpVerified) && <Notice>
        <div className="cms-hospitality-row-actions">
          <span>{t(data.smtp
            ? 'Der Mailserver ist gespeichert. Prüfen Sie die Verbindung mit einer Testnachricht.'
            : 'E-Mail-Versand ist noch nicht eingerichtet. Antworten können Sie per E-Mail-Link öffnen.')}</span>
          {onOpenMailSettings && <Button onClick={onOpenMailSettings}>{t('E-Mail-Einstellungen öffnen')}</Button>}
        </div>
      </Notice>}
      {error && <Notice tone="error">{t(error)}</Notice>}
      {loading ? <p className="cms-hint" role="status">{t('Reservierungen werden geladen …')}</p> :
        entries.length === 0 ? <EmptyState icon={CalendarDays} title={t('Keine Reservierungen gefunden')}>{t('Ändern Sie bei Bedarf Datum oder Status.')}</EmptyState> :
        <div className="cms-hospitality-entries">
          {entries.map(booking => {
            const message = decisionMessage(booking, brand);
            const contact = booking.status === 'pending' ? `mailto:${encodeURIComponent(booking.email)}` : `mailto:${encodeURIComponent(booking.email)}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.text)}`;
            return <article className="cms-hospitality-entry cms-reservation-entry" key={booking.id}>
              <div className="cms-reservation-entry-when"><strong>{booking.time}</strong><span>{formatDate(booking.date)}</span></div>
              <div className="cms-reservation-entry-main">
                <h3>{booking.name}</h3>
                <p>{booking.party} {t(booking.party === 1 ? 'Person' : 'Personen')} · {booking.tableName} · {booking.duration} {t('Minuten')}</p>
                {booking.note && <p className="cms-reservation-note">{booking.note}</p>}
                <a className="cms-text-link" href={contact}><Mail size={15} />{booking.email}</a>
              </div>
              <div className="cms-reservation-entry-actions">
                <span className="cms-reservation-status" data-status={booking.status}>{t(statusCopy[booking.status])}</span>
                {isPendingExpired(booking, now) && <small>{t('Tisch nicht mehr freigehalten')}</small>}
                {booking.delivery && booking.delivery.status !== 'unconfigured' && <small>{t(booking.delivery.status === 'sent' ? 'E-Mail gesendet' : booking.delivery.status === 'sending' ? 'E-Mail wird gesendet' : 'E-Mail-Versand fehlgeschlagen')}</small>}
                <div className="cms-hospitality-row-actions">
                  {booking.status === 'pending' && <>
                    <Button variant="primary" disabled={Boolean(saving)} busy={saving === booking.id} onClick={() => void decide(booking, 'confirm')}>{t('Annehmen')}</Button>
                    <Button disabled={Boolean(saving)} onClick={() => setActionTarget({ booking, action: 'decline' })}>{t('Ablehnen')}</Button>
                  </>}
                  {booking.status === 'confirmed' && <Button disabled={Boolean(saving)} onClick={() => setActionTarget({ booking, action: 'cancel' })}>{t('Stornieren')}</Button>}
                  {data?.smtp && (booking.delivery?.status === 'failed' || booking.delivery?.status === 'unconfigured' || booking.delivery?.status === 'sending' && now.getTime() - Date.parse(booking.delivery.at) > 600000) &&
                    <Button disabled={Boolean(saving)} onClick={() => void decide(booking, 'retry-email')}>{t('E-Mail senden')}</Button>}
                  {booking.delivery?.status === 'failed' && data?.smtpVerified && onOpenMailSettings &&
                    <Button onClick={onOpenMailSettings}>{t('E-Mail-Einstellungen öffnen')}</Button>}
                </div>
                {actionTarget?.booking.id === booking.id && <div className="cms-hospitality-row-actions" role="group" aria-label={t('Entscheidung bestätigen')}>
                  <Button onClick={() => setActionTarget(undefined)}>{t('Zurück')}</Button>
                  <Button variant="danger" onClick={() => void decide(booking, actionTarget.action)}>{t(actionTarget.action === 'cancel' ? 'Stornierung bestätigen' : 'Ablehnung bestätigen')}</Button>
                </div>}
              </div>
            </article>;
          })}
        </div>}
    </section>}
  </div>;
}
