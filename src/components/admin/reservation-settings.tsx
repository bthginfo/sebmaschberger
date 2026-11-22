"use client";

import { Plus, Trash2 } from 'lucide-react';
import { RESERVATION_DAYS, reservationClock, type ReservationSettings } from '@/lib/reservations/model';
import { useAdminLanguage } from './admin-language';
import { Button, Field, IconButton, Input, Select, Toggle, newId } from './admin-ui';

const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const englishDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ReservationSettingsForm({ settings, onChange }: { settings: ReservationSettings; onChange: (settings: ReservationSettings) => void }) {
  const { t, language } = useAdminLanguage();
  const dayNames = language === 'de' ? days : englishDays;
  const update = <K extends keyof ReservationSettings>(key: K, value: ReservationSettings[K]) => onChange({ ...settings, [key]: value });
  const number = (value: number, min: number, max: number, onInput: (value: number) => void) =>
    <Input type="number" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={1} onChange={event => onInput(event.target.valueAsNumber)} />;
  function addClosure() {
    let today: string;
    try { today = reservationClock(new Date(), settings.timeZone).date; }
    catch { today = new Date().toISOString().slice(0, 10); }
    update('closures', [...settings.closures, { id: newId(), name: '', from: today, to: today }]);
  }

  return <div className="cms-hospitality-settings">
    <section className="cms-hospitality-panel">
      <div className="cms-hospitality-panel-title"><div><h2>{t('Tische')}</h2><p>{t('Gäste erhalten den kleinsten freien Tisch mit genügend Plätzen.')}</p></div>
        <Button disabled={settings.tables.length >= 80} onClick={() => update('tables', [...settings.tables, { id: newId(), name: t('Neuer Tisch'), capacity: 2, active: true }])}><Plus size={16} />{t('Tisch hinzufügen')}</Button></div>
      <div className="cms-hospitality-entries">
        {settings.tables.map(table => <div className="cms-hospitality-form-row" key={table.id}>
          <Field label={t('Tischname')}><Input value={table.name} maxLength={100} onChange={event => update('tables', settings.tables.map(entry => entry.id === table.id ? { ...entry, name: event.target.value } : entry))} /></Field>
          <Field label={t('Plätze')}>{number(table.capacity, 1, 24, capacity => update('tables', settings.tables.map(entry => entry.id === table.id ? { ...entry, capacity } : entry)))}</Field>
          <Toggle label={t('Buchbar')} checked={table.active} onChange={active => update('tables', settings.tables.map(entry => entry.id === table.id ? { ...entry, active } : entry))} />
          <IconButton label={t('Tisch entfernen')} onClick={() => update('tables', settings.tables.filter(entry => entry.id !== table.id))}><Trash2 size={17} /></IconButton>
        </div>)}
      </div>
    </section>
    <section className="cms-hospitality-panel">
      <div className="cms-hospitality-panel-title"><div><h2>{t('Buchungsfenster')}</h2><p>{t('Legen Sie pro Wochentag fest, wann ein Tisch buchbar ist und wie lange er belegt bleibt.')}</p></div>
        <Button disabled={settings.windows.length >= 42} onClick={() => update('windows', [...settings.windows, { id: newId(), day: 'mon', start: '17:30', end: '22:00', duration: 90 }])}><Plus size={16} />{t('Fenster hinzufügen')}</Button></div>
      <div className="cms-hospitality-entries">
        {settings.windows.map(window => {
          const change = (patch: Partial<typeof window>) => update('windows', settings.windows.map(entry => entry.id === window.id ? { ...entry, ...patch } : entry));
          return <div className="cms-hospitality-form-row" key={window.id}>
            <Field label={t('Wochentag')}><Select value={window.day} onChange={event => change({ day: event.target.value as typeof window.day })}>{RESERVATION_DAYS.map((day, index) => <option value={day} key={day}>{dayNames[index]}</option>)}</Select></Field>
            <Field label={t('Von')}><Input type="time" value={window.start} onChange={event => change({ start: event.target.value })} /></Field>
            <Field label={t('Bis')}><Input type="time" value={window.end} onChange={event => change({ end: event.target.value })} /></Field>
            <Field label={t('Dauer in Minuten')}>{number(window.duration, 15, 360, duration => change({ duration }))}</Field>
            <IconButton label={t('Fenster entfernen')} onClick={() => update('windows', settings.windows.filter(entry => entry.id !== window.id))}><Trash2 size={17} /></IconButton>
          </div>;
        })}
      </div>
    </section>
    <section className="cms-hospitality-panel">
      <div className="cms-hospitality-panel-title"><div><h2>{t('Schließtage')}</h2><p>{t('Sperren Sie einzelne Tage oder Zeiträume, etwa für Urlaub und private Veranstaltungen.')}</p></div>
        <Button disabled={settings.closures.length >= 100} onClick={addClosure}><Plus size={16} />{t('Schließzeit hinzufügen')}</Button></div>
      <div className="cms-hospitality-entries">
        {settings.closures.map(closure => {
          const change = (patch: Partial<typeof closure>) => update('closures', settings.closures.map(entry => entry.id === closure.id ? { ...entry, ...patch } : entry));
          return <div className="cms-hospitality-form-row" key={closure.id}>
            <Field label={t('Bezeichnung')}><Input value={closure.name} maxLength={100} onChange={event => change({ name: event.target.value })} /></Field>
            <Field label={t('Von')}><Input type="date" value={closure.from} onChange={event => change({ from: event.target.value })} /></Field>
            <Field label={t('Bis')}><Input type="date" min={closure.from} value={closure.to} onChange={event => change({ to: event.target.value })} /></Field>
            <IconButton label={t('Schließzeit entfernen')} onClick={() => update('closures', settings.closures.filter(entry => entry.id !== closure.id))}><Trash2 size={17} /></IconButton>
          </div>;
        })}
      </div>
    </section>
    <section className="cms-hospitality-panel">
      <div className="cms-hospitality-panel-title"><div><h2>{t('Buchungsregeln')}</h2></div></div>
      <div className="cms-hospitality-form-row">
        <Field label={t('Zeitzone')}><Input value={settings.timeZone} maxLength={80} onChange={event => update('timeZone', event.target.value)} /></Field>
        <Field label={t('Zeitabstand in Minuten')}>{number(settings.interval, 5, 120, interval => update('interval', interval))}</Field>
        <Field label={t('Vorlauf in Minuten')}>{number(settings.minNotice, 0, 1440, minNotice => update('minNotice', minNotice))}</Field>
        <Field label={t('Tage im Voraus')}>{number(settings.advanceDays, 1, 120, advanceDays => update('advanceDays', advanceDays))}</Field>
        <Field label={t('Tisch freihalten (Stunden)')}>{number(settings.holdHours, 1, 48, holdHours => update('holdHours', holdHours))}</Field>
      </div>
    </section>
  </div>;
}
