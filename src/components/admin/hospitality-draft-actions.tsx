"use client";

import { useAdminLanguage } from './admin-language';
import { ArrowLeft, ArrowRight, Button, IconButton } from './admin-ui';

export type DraftActions = {
  dirty: boolean;
  busy: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => Promise<void>;
  onPublish?: () => Promise<void>;
  undo: () => void;
  redo: () => void;
};

export function HospitalityDraftActions({ dirty, busy, canUndo, canRedo, onSave, onPublish, undo, redo }: DraftActions) {
  const { t } = useAdminLanguage();
  return <div className="cms-hospitality-actions">
    <span role="status" className="cms-hint">{t(dirty ? 'Ungespeicherte Änderungen' : 'Entwurf gespeichert')}</span>
    <IconButton label={t('Rückgängig')} disabled={!canUndo || Boolean(busy)} onClick={undo}><ArrowLeft size={17} /></IconButton>
    <IconButton label={t('Wiederholen')} disabled={!canRedo || Boolean(busy)} onClick={redo}><ArrowRight size={17} /></IconButton>
    <Button disabled={!dirty || Boolean(busy)} busy={busy === 'save'} onClick={() => void onSave()}>{t('Entwurf speichern')}</Button>
    {onPublish && <Button variant="primary" disabled={dirty || Boolean(busy)} busy={busy === 'publish'} onClick={() => void onPublish()}>{t('Veröffentlichen')}</Button>}
  </div>;
}
