"use client";

import { useAdminLanguage } from './admin-language';
import { Field, Input, Select } from './admin-ui';
import type { MenuPlacement, RestaurantMenu } from '@/lib/restaurant-menu/model';

export function RestaurantMenuFields({ value, menu, onChange }: { value?: MenuPlacement; menu?: RestaurantMenu; onChange: (placement: MenuPlacement) => void }) {
  const { t } = useAdminLanguage();
  const placement = value ?? { layout: 'full' };
  const categories = menu?.categories ?? [];
  const selected = new Set(placement.categoryIds);
  return <div className="cms-inspector-group">
    <Field label={t('Darstellung der Karte')}>
      <Select value={placement.layout} onChange={event => onChange({ ...placement, layout: event.target.value as MenuPlacement['layout'] })}>
        <option value="full">{t('Vollständige Karte')}</option>
        <option value="compact">{t('Kompakte Vorschau')}</option>
        <option value="feature">{t('Hervorgehobene Auswahl')}</option>
      </Select>
    </Field>
    {categories.length > 0 && <fieldset className="cms-menu-selection">
      <legend>{t('Kategorien')}</legend>
      <p className="cms-hint">{t('Ohne Auswahl erscheinen alle sichtbaren Kategorien.')}</p>
      {categories.map(category => <label key={category.id}>
        <input type="checkbox" checked={selected.has(category.id)} onChange={event => {
          const next = new Set(selected);
          if (event.target.checked) next.add(category.id); else next.delete(category.id);
          onChange({ ...placement, categoryIds: [...next] });
        }} />
        {category.name || t('Unbenannte Kategorie')}
      </label>)}
    </fieldset>}
    <Field label={t('Einträge pro Kategorie')} hint={t('Leer lassen für den Standard des Layouts.')}>
      <Input type="number" min={1} max={50} value={placement.limitPerCategory ?? ''} onChange={event => {
        const limit = event.target.valueAsNumber;
        onChange({ ...placement, limitPerCategory: Number.isInteger(limit) ? Math.min(50, Math.max(1, limit)) : undefined });
      }} />
    </Field>
    <a className="cms-text-link" href="/admin?view=restaurant-menu">{t('Zentrale Karte öffnen')}</a>
  </div>;
}
