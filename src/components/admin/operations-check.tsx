"use client";
import { useEffect, useState } from 'react';
import { Activity, ArrowRight, RefreshCw } from 'lucide-react';
import type { OperationAction, OperationCheck } from '@/lib/operations/model';
import { Button, Notice, api, errorMessage, formatDate } from './admin-ui';
import { useAdminLanguage } from "@/components/admin/admin-language";

const stateLabels = { confirmed: 'Bestätigt', waiting: 'Einrichten oder prüfen', attention: 'Aktion nötig' };
const actionLabels = { email: 'E-Mail-Einstellungen', commerce: 'Shop öffnen', planner: 'Kalender öffnen', channels: 'Kanäle prüfen' };

export function OperationsCheck({ onAction }: { onAction: (action: OperationAction) => void }) {
  const { language, t } = useAdminLanguage();
  const [checks, setChecks] = useState<OperationCheck[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!refresh) return;
    const abort = new AbortController();
    setLoading(true); setError('');
    void api<{ checks: OperationCheck[] }>('/api/admin/operations', { signal: abort.signal })
      .then(data => setChecks(data.checks)).catch(error => { if (!abort.signal.aborted) setError(errorMessage(error)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [refresh]);
  return <details className="cms-system cms-system--optional cms-operations" onToggle={event => {
    if (event.currentTarget.open) setRefresh(value => value || 1);
  }}>
    <summary><Activity size={17} />{t("Betriebscheck")}</summary>
    <section className="cms-launch-check">
      <div className="cms-operations-heading"><p>{t("Versand, Bestellungen und Kanäle anhand der letzten gespeicherten Vorgänge prüfen.")}</p>
        <Button onClick={() => setRefresh(value => value + 1)} busy={loading}><RefreshCw size={16} />{t("Aktualisieren")}</Button></div>
      {error && <Notice tone="error">{t(error)}</Notice>}
      {loading && !checks && <p role="status">{t("Betriebsdaten werden geladen …")}</p>}
      {checks && <div className="cms-operation-cards">{checks.map(check => <article key={check.id}>
        <div><h3>{t(check.label)}</h3><span data-state={check.state}>{t(stateLabels[check.state])}</span></div>
        <p>{t(check.detail)}</p>{check.at && <small>{formatDate(check.at, true, language)}</small>}
        <Button variant="quiet" onClick={() => onAction(check.action)}>{t(actionLabels[check.action])}<ArrowRight size={15} /></Button>
      </article>)}</div>}
    </section>
  </details>;
}
