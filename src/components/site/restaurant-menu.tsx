"use client";

import { useId } from 'react';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { useAdminLanguage } from '@/components/admin/admin-language';
import { formatMenuPrice, selectMenuCategories, type MenuSelection, type RestaurantMenu as MenuData } from '@/lib/restaurant-menu/model';
import type { Section, SectionContent, SiteLanguage } from '@/lib/types';
import { ContentLink, EditableText } from './editable';
import { useSectionContentEditable, useSectionHeadingLevel } from './heading-level';
import styles from './restaurant-menu.module.css';

export function RestaurantMenu({ section, menu, language, editable, onChange, onEditMenu }: {
  section: Section;
  menu?: MenuData;
  language: SiteLanguage;
  editable?: boolean;
  onChange?: (section: Section) => void;
  onEditMenu?: (selection: MenuSelection) => void;
}) {
  const id = useId();
  const heading = useSectionHeadingLevel(section.id);
  const canEditMenu = useSectionContentEditable(editable) && onEditMenu;
  const { t } = useAdminLanguage();
  const { content } = section;
  const placement = content.restaurantMenu ?? { layout: 'full' };
  const categories = selectMenuCategories(menu, placement);
  const de = language === 'de';
  const update = (key: keyof SectionContent, value: string) => onChange?.({ ...section, content: { ...content, [key]: value } });
  if (!categories.length && !editable) return null;

  return <div className={`${styles.menu} ws-restaurant-menu`} data-menu-layout={placement.layout}>
    <header className={styles.header}>
      <EditableText as={heading} className="ws-section-heading" value={content.heading} editable={editable} onChange={value => update('heading', value)} />
      <EditableText className={styles.lead} value={content.text} editable={editable} onChange={value => update('text', value)} />
    </header>
    {placement.layout === 'full' && categories.length > 1 && <nav className={styles.index} aria-label={de ? 'Kategorien der Karte' : 'Menu categories'}>
      {categories.map(category => <a key={category.id} href={`#${id}-${category.id}`}>{category.name}</a>)}
    </nav>}
    <div className={styles.categories}>
      {categories.map(category => <div className={styles.category} key={category.id} id={`${id}-${category.id}`}>
        <h3>{canEditMenu ? <button type="button" className={styles.editLink}
          aria-label={t('Kategorie {p1} bearbeiten', { p1: category.name })}
          onClick={event => { event.stopPropagation(); canEditMenu({ categoryId: category.id }); }}>
          {category.name}<Pencil size={14} aria-hidden="true" />
        </button> : category.name}</h3>
        {category.description && <p className={styles.description}>{category.description}</p>}
        <ul className={styles.items}>
          {category.items.map(item => <li key={item.id} className={styles.item} data-menu-editable={canEditMenu ? "" : undefined}>
            <div>
              <h4>{canEditMenu ? <button type="button" className={styles.editLink}
                aria-label={t('Eintrag {p1} bearbeiten', { p1: item.name })}
                onClick={event => { event.stopPropagation(); canEditMenu({ categoryId: category.id, itemId: item.id }); }}>
                {item.name}<Pencil size={14} aria-hidden="true" />
              </button> : item.name}</h4>
              {item.description && <p>{item.description}</p>}
              {item.details && <p className={styles.details}>{item.details}</p>}
            </div>
            {item.prices.some(price => price.cents !== null) && <ul className={styles.prices} aria-label={de ? 'Preise' : 'Prices'}>
              {item.prices.filter(price => price.cents !== null).map(price => <li key={price.id}>
                {price.label && <span>{price.label}</span>}<strong>{formatMenuPrice(price.cents!, language)}</strong>
              </li>)}
            </ul>}
          </li>)}
        </ul>
      </div>)}
    </div>
    {editable && !categories.length && <p className={styles.empty}>{de ? 'Sichtbare Einträge aus dem Bereich Speisen & Getränke erscheinen hier.' : 'Visible items from Food & drinks will appear here.'}</p>}
    {content.primaryLabel && content.primaryHref && <ContentLink href={content.primaryHref} editField="primaryHref" editable={editable} className="ws-button ws-button-primary">
      <EditableText as="span" value={content.primaryLabel} editable={editable} onChange={value => update('primaryLabel', value)} />
      <ArrowUpRight size={18} />
    </ContentLink>}
  </div>;
}
