"use client";

import { useAdminLanguage } from "./admin-language";
import { createContext, useContext, useState } from 'react';
import { sectionLibraryForModules } from '@/lib/section-library';
import { recentLibraryItems, rememberSectionType, searchSectionLibrary, type SectionPlacement } from '@/lib/assistant/section-search';
import type { SiteConfig, SectionType } from '@/lib/types';
import { Button, EmptyState, Modal, Plus, SearchField, Select } from './admin-ui';

export const CreatorLibraryContext = createContext(false);
export const CommerceLibraryContext = createContext(false);
export const Scroll3dLibraryContext = createContext(false);
export const HospitalityLibraryContext = createContext<SiteConfig['modules']>(undefined);

const previewGroups: Record<string, string> = {
  'restaurant-menu': 'list', reservation: 'contact',
  'showcase-hero': 'hero', 'scroll-story': 'split', 'project-stage': 'gallery', 'project-index': 'cards', 'editorial-index': 'list',
  'scene-sequence': 'gallery', 'workflow-demo': 'steps',
  'editorial-hero': 'hero', 'cinematic-hero': 'hero', 'noir-hero': 'hero',
  'portrait-mosaic': 'team', 'portrait-rail': 'team', 'people-index': 'team',
  'service-explorer': 'services', 'focus-finder': 'services', 'case-deck': 'services',
  'editorial-statement': 'statement', 'kinetic-statement': 'statement', 'noir-manifesto': 'statement',
  'contact-poster': 'cta', 'contact-dock': 'cta', 'noir-contact': 'cta', 'editorial-gallery': 'gallery',
  'announcement': 'notice', 'image-curtain': 'split', 'stacked-panels': 'steps', 'motion-story': 'split', 'scroll-3d': 'split', 'blog-cards': 'cards', 'blog-editorial': 'split', 'blog-list': 'list'
};

export function SectionPreview({ type, mini = false }: { type: string; mini?: boolean }) {
  return <span aria-hidden="true" className={'cms-section-diagram cms-section-diagram--' + (previewGroups[type] || type) + (mini ? ' cms-section-diagram--mini' : '')}><i/><i/><i/><i/><i/></span>;
}

export function SectionLibraryDialog({ onSelect, onClose, title = 'Abschnitt hinzufügen', selectionName, blog = false }: {
  onSelect: (type: SectionType, position: SectionPlacement) => void;
  onClose: () => void;
  title?: string;
  selectionName?: string;
  blog?: boolean;
}) {
  const { t: adminText } = useAdminLanguage();
  const creatorEnabled = useContext(CreatorLibraryContext);
  const commerceConfigured = useContext(CommerceLibraryContext);
  const scroll3dEnabled = useContext(Scroll3dLibraryContext);
  const library = sectionLibraryForModules(creatorEnabled, commerceConfigured && !blog, scroll3dEnabled, useContext(HospitalityLibraryContext));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Alle');
  const [placement, setPlacement] = useState<SectionPlacement>(selectionName ? 'after' : 'end');
  const matches = searchSectionLibrary(library.map(item => ({ ...item, name: adminText(item.name), description: adminText(item.description), category: adminText(item.category), categoryKey: item.category })), search);
  const categories = ['Alle', ...new Set(matches.map(item => item.categoryKey))];
  const active = categories.includes(category) ? category : 'Alle';
  const filtered = active === 'Alle' ? matches : matches.filter(item => item.categoryKey === active);
  const recent = !search.trim() && active === 'Alle' ? recentLibraryItems(library) : [];

  function insert(type: SectionType) {
    rememberSectionType(type);
    onSelect(type, placement);
  }

  return <Modal title={adminText(title)} description={adminText("Suchen Sie nach einem Baustein oder nach seinem Zweck.")} onClose={onClose} wide drawer>
    <div className="cms-library-search">
      <SearchField value={search} onChange={setSearch} placeholder={adminText("Zum Beispiel FAQ, Kontakt oder Preise")} />
      {selectionName && <Select aria-label={adminText("Einfügeposition")} value={placement} onChange={event => setPlacement(event.target.value as SectionPlacement)}>
        <option value="before">{adminText("Vor „{section}“", { section: selectionName })}</option>
        <option value="after">{adminText("Nach „{section}“", { section: selectionName })}</option>
        <option value="end">{adminText("Am Seitenende")}</option>
      </Select>}
    </div>
    {recent.length > 0 && <div className="cms-library-filters" role="group" aria-label={adminText("Zuletzt verwendete Abschnitte")}>
      <span>{adminText("Zuletzt verwendet")}</span>
      {recent.map(item => <button type="button" key={item.type} onClick={() => insert(item.type)}>{adminText(item.name)}</button>)}
    </div>}
    <div className="cms-library-filters" role="group" aria-label={adminText("Abschnittskategorie")}>
      {categories.map(item => <button type="button" key={item} aria-pressed={active === item} onClick={() => setCategory(item)}>{adminText(item)}</button>)}
    </div>
    <p className="cms-hint" aria-live="polite">{filtered.length} {filtered.length === 1 ? adminText("Baustein") : adminText("Bausteine")}</p>
    {!filtered.length
      ? <EmptyState title={adminText("Kein passender Abschnitt")} action={<Button onClick={() => { setSearch(''); setCategory('Alle'); }}>{adminText("Suche zurücksetzen")}</Button>}>{adminText("Probieren Sie einen kürzeren Begriff.")}</EmptyState>
      : <div className="cms-library-groups">
        {[...new Set(filtered.map(item => item.category))].map(group => <section className="cms-library-group" key={group} aria-label={group}><h3>{group}</h3><div className="cms-library-grid">
        {filtered.filter(item => item.category === group).map(item => <button type="button" className="cms-library-item" key={item.type} onClick={() => insert(item.type)}>
          <SectionPreview type={item.type}/>
          <span className="cms-library-item-heading"><strong>{item.name}</strong><Plus size={17}/></span>
          <span>{item.description}</span>
        </button>)}
        </div></section>)}
      </div>}
  </Modal>;
}
