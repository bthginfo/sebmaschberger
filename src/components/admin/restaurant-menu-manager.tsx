"use client";

import { useState } from 'react';
import { BookOpen, Copy, Eye, EyeOff, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useAdminLanguage } from './admin-language';
import { ArrowDown, ArrowUp, Button, EmptyState, Field, IconButton, Input, Modal, Select, Textarea, Toggle, newId } from './admin-ui';
import { HospitalityDraftActions, type DraftActions } from './hospitality-draft-actions';
import { BusinessNumberInput } from './business-number-input';
import { formatMenuPrice, type MenuCategory, type MenuItem, type MenuSelection, type RestaurantMenu } from '@/lib/restaurant-menu/model';

export function moveMenuEntry<T>(items: readonly T[], index: number, offset: number) {
  const next = [...items];
  const target = index + offset;
  if (target >= 0 && target < next.length) [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const makePrice = () => ({ id: newId(), label: '', cents: null });
const makeItem = (): MenuItem => ({ id: newId(), name: '', description: '', details: '', visible: true, featured: false, prices: [makePrice()] });

export function RestaurantMenuManager({ menu, onChange, actions, initialSelection }: {
  menu: RestaurantMenu;
  onChange: (menu: RestaurantMenu) => void;
  actions?: DraftActions;
  initialSelection?: MenuSelection;
}) {
  const { t, language } = useAdminLanguage();
  const [selected, select] = useState(initialSelection?.categoryId ?? menu.categories[0]?.id);
  const [open, setOpen] = useState(initialSelection?.itemId);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<{ kind: 'category' | 'item'; id: string; name: string }>();
  const category = menu.categories.find(entry => entry.id === selected) ?? menu.categories[0];
  const categoryIndex = category ? menu.categories.indexOf(category) : -1;
  const matches = category?.items.filter(item => [item.name, item.description, item.details].join(' ').toLocaleLowerCase(language).includes(query.trim().toLocaleLowerCase(language))) ?? [];
  const total = menu.categories.reduce((count, entry) => count + entry.items.length, 0);
  const updateCategories = (categories: MenuCategory[]) => onChange({ ...menu, categories });
  const updateCategory = (value: MenuCategory) => updateCategories(menu.categories.map(entry => entry.id === value.id ? value : entry));
  function addCategory() {
    const next: MenuCategory = { id: newId(), name: t('Neue Kategorie'), description: '', visible: true, items: [] };
    updateCategories([...menu.categories, next]);
    select(next.id);
    setQuery('');
  }
  function addItem() {
    if (!category) return;
    const item = makeItem();
    updateCategory({ ...category, items: [...category.items, item] });
    setQuery('');
    setOpen(item.id);
  }
  function updateItem(item: MenuItem) {
    if (category) updateCategory({ ...category, items: category.items.map(entry => entry.id === item.id ? item : entry) });
  }
  function remove() {
    if (!deleting || !category) return;
    if (deleting.kind === 'category') updateCategories(menu.categories.filter(entry => entry.id !== deleting.id));
    else updateCategory({ ...category, items: category.items.filter(entry => entry.id !== deleting.id) });
    setDeleting(undefined);
  }
  return <div className={actions ? "cms-page cms-hospitality" : "cms-hospitality"}>
    {actions && <header className="cms-hospitality-head">
      <div><h1>{t('Speisen & Getränke')}</h1><p>{t('Kategorien, Preise und Verfügbarkeit für alle Kartenabschnitte bearbeiten.')}</p></div>
      <HospitalityDraftActions {...actions} />
    </header>}
    <div className="cms-menu-workspace">
      <aside className="cms-hospitality-panel cms-menu-categories" aria-label={t('Kategorien')}>
        <div className="cms-hospitality-panel-title"><h2>{t('Kategorien')}</h2><span>{menu.categories.length}</span></div>
        {menu.categories.map(entry => <button type="button" key={entry.id} aria-pressed={category?.id === entry.id}
          onClick={() => { select(entry.id); setOpen(undefined); setQuery(''); }}>
          <span>{entry.name || t('Unbenannte Kategorie')}</span>
          {!entry.visible && <EyeOff size={15} aria-label={t('Ausgeblendet')} />}
          <small>{entry.items.length}</small>
        </button>)}
        <Button onClick={addCategory} disabled={menu.categories.length >= 24}><Plus size={17} />{t('Kategorie hinzufügen')}</Button>
      </aside>
      <div className="cms-hospitality-panel">
        {category ? <>
          <div className="cms-hospitality-panel-title">
            <h2>{category.name || t('Unbenannte Kategorie')}</h2>
            <div className="cms-hospitality-row-actions">
              <IconButton label={t('Kategorie nach oben verschieben')} disabled={categoryIndex <= 0} onClick={() => updateCategories(moveMenuEntry(menu.categories, categoryIndex, -1))}><ArrowUp size={17} /></IconButton>
              <IconButton label={t('Kategorie nach unten verschieben')} disabled={categoryIndex >= menu.categories.length - 1} onClick={() => updateCategories(moveMenuEntry(menu.categories, categoryIndex, 1))}><ArrowDown size={17} /></IconButton>
              <IconButton label={t('Kategorie entfernen')} onClick={() => setDeleting({ kind: 'category', id: category.id, name: category.name })}><Trash2 size={17} /></IconButton>
            </div>
          </div>
          <details className="cms-details" key={category.id} open={(!category.items.length || (category.id === initialSelection?.categoryId && !initialSelection?.itemId)) || undefined}>
            <summary>{t('Kategorie bearbeiten')}</summary>
            <div className="cms-hospitality-fields">
              <Field label={t('Name der Kategorie')}><Input value={category.name} maxLength={120} onChange={event => updateCategory({ ...category, name: event.target.value })} /></Field>
              <Field label={t('Beschreibung')}><Input value={category.description} maxLength={500} onChange={event => updateCategory({ ...category, description: event.target.value })} /></Field>
              <Toggle label={t('Kategorie anzeigen')} checked={category.visible} onChange={visible => updateCategory({ ...category, visible })} />
            </div>
          </details>
          <div className="cms-hospitality-list-tools">
            <label className="cms-search"><Search size={17} /><input type="search" placeholder={t('Einträge suchen')} aria-label={t('Einträge suchen')} value={query} onChange={event => setQuery(event.target.value)} /></label>
            <Button variant="primary" onClick={addItem} disabled={total >= 500 || category.items.length >= 120}><Plus size={17} />{t('Eintrag hinzufügen')}</Button>
          </div>
          {matches.length === 0 && <EmptyState icon={BookOpen} title={t(query ? 'Keine passenden Einträge' : 'Hier ist noch Platz auf der Karte')}>{t(query ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Fügen Sie Speisen oder Getränke mit ihren Preisen hinzu.')}</EmptyState>}
          <div className="cms-hospitality-entries">
            {matches.map(item => {
              const index = category.items.indexOf(item);
              const expanded = open === item.id;
              const price = item.prices.find(entry => entry.cents !== null && entry.cents >= 0);
              return <article className="cms-hospitality-entry" key={item.id}>
                <div className="cms-hospitality-entry-row">
                  <button type="button" className="cms-hospitality-entry-title" aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : item.id)}>
                    <strong>{item.name || t('Neuer Eintrag')}</strong>
                    <small>{item.description || item.details}</small>
                  </button>
                  {price?.cents != null && <span className="cms-menu-price">{formatMenuPrice(price.cents, language)}</span>}
                  <IconButton label={t(item.visible ? 'Eintrag ausblenden' : 'Eintrag anzeigen')} aria-pressed={item.visible} onClick={() => updateItem({ ...item, visible: !item.visible })}>{item.visible ? <Eye size={17} /> : <EyeOff size={17} />}</IconButton>
                  <IconButton label={t('Eintrag hervorheben')} aria-pressed={item.featured} onClick={() => updateItem({ ...item, featured: !item.featured })}><Star size={17} fill={item.featured ? 'currentColor' : 'none'} /></IconButton>
                </div>
                {expanded && <div className="cms-hospitality-fields cms-hospitality-edit">
                  <Field label={t('Name des Eintrags')}><Input value={item.name} autoFocus maxLength={120} onChange={event => updateItem({ ...item, name: event.target.value })} /></Field>
                  <Field label={t('Beschreibung')}><Textarea rows={2} value={item.description} maxLength={500} onChange={event => updateItem({ ...item, description: event.target.value })} /></Field>
                  <Field label={t('Herkunft, Jahrgang oder Hinweise')}><Input value={item.details} maxLength={240} onChange={event => updateItem({ ...item, details: event.target.value })} /></Field>
                  <div className="cms-menu-prices">
                    <strong>{t('Preise')}</strong>
                    {item.prices.map(price => <div className="cms-menu-price-row" key={price.id}>
                      <Field label={t('Größe oder Portion')}><Input value={price.label} maxLength={60} placeholder={t('z. B. 0,1 l')} onChange={event => updateItem({ ...item, prices: item.prices.map(entry => entry.id === price.id ? { ...price, label: event.target.value } : entry) })} /></Field>
                      <Field label={t('Preis in Euro')} hint={price.cents === -1 ? t('Bitte einen Eurobetrag mit bis zu zwei Nachkommastellen eingeben.') : undefined}><BusinessNumberInput optional money min={0} max={1000000} value={price.cents ?? undefined} onChange={cents => updateItem({ ...item, prices: item.prices.map(entry => entry.id === price.id ? { ...price, cents: cents === undefined ? null : Number.isNaN(cents) ? -1 : cents } : entry) })} /></Field>
                      <IconButton label={t('Preis entfernen')} onClick={() => updateItem({ ...item, prices: item.prices.filter(entry => entry.id !== price.id) })}><Trash2 size={17} /></IconButton>
                    </div>)}
                    <Button disabled={item.prices.length >= 8} onClick={() => updateItem({ ...item, prices: [...item.prices, makePrice()] })}><Plus size={16} />{t('Preis hinzufügen')}</Button>
                  </div>
                  {menu.categories.length > 1 && <Field label={t('In Kategorie verschieben')}><Select value={category.id} onChange={event => {
                    const destination = event.target.value;
                    updateCategories(menu.categories.map(entry => entry.id === category.id ? { ...entry, items: entry.items.filter(other => other.id !== item.id) } : entry.id === destination ? { ...entry, items: [...entry.items, item] } : entry));
                    select(destination);
                    setQuery('');
                  }}>{menu.categories.map(entry => <option key={entry.id} value={entry.id} disabled={entry.id !== category.id && entry.items.length >= 120}>{entry.name}</option>)}</Select></Field>}
                  <div className="cms-hospitality-row-actions">
                    <IconButton label={t('Eintrag nach oben verschieben')} disabled={index <= 0} onClick={() => updateCategory({ ...category, items: moveMenuEntry(category.items, index, -1) })}><ArrowUp size={16} /></IconButton>
                    <IconButton label={t('Eintrag nach unten verschieben')} disabled={index >= category.items.length - 1} onClick={() => updateCategory({ ...category, items: moveMenuEntry(category.items, index, 1) })}><ArrowDown size={16} /></IconButton>
                    <Button disabled={total >= 500 || category.items.length >= 120} onClick={() => {
                      const duplicate = { ...item, id: newId(), prices: item.prices.map(price => ({ ...price, id: newId() })) };
                      updateCategory({ ...category, items: [...category.items.slice(0, index + 1), duplicate, ...category.items.slice(index + 1)] });
                      setOpen(duplicate.id);
                    }}><Copy size={16} />{t('Duplizieren')}</Button>
                    <Button variant="danger" onClick={() => setDeleting({ kind: 'item', id: item.id, name: item.name })}><Trash2 size={16} />{t('Entfernen')}</Button>
                  </div>
                </div>}
              </article>;
            })}
          </div>
        </> : <EmptyState icon={BookOpen} title={t('Karte anlegen')} action={<Button variant="primary" onClick={addCategory}>{t('Erste Kategorie anlegen')}</Button>}>{t('Gliedern Sie Ihre Karte beispielsweise in offene Weine, kleine Speisen und alkoholfreie Getränke.')}</EmptyState>}
      </div>
    </div>
    {deleting && <Modal title={t(deleting.kind === 'category' ? 'Kategorie entfernen?' : 'Eintrag entfernen?')} description={deleting.name}
      onClose={() => setDeleting(undefined)} footer={<><Button data-dialog-close>{t('Abbrechen')}</Button><Button variant="danger" onClick={remove}>{t('Entfernen')}</Button></>}>{null}</Modal>}
  </div>;
}
