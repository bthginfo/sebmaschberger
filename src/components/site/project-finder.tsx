"use client";

import { Bookmark, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ContentItem, SiteLanguage } from "@/lib/types";

type Props = {
  items: ContentItem[];
  editable: boolean;
  language: SiteLanguage;
  brand: "coaching" | "scents";
  media: (item: ContentItem, index: number) => ReactNode;
  copy: (item: ContentItem, index: number) => ReactNode;
};

const interfaceCopy = {
  de: { all: "Alle", saved: "Merkliste", save: "Merken", remove: "Entfernen", reset: "Filter zurücksetzen", empty: "Für diese Auswahl gibt es bisher keinen Vorschlag.", emptySaved: "Hier erscheinen die Vorschläge, die du dir merkst.", single: "Vorschlag", plural: "Vorschläge", coaching: ["Zeitbudget", "Ziel"], scents: ["Duftfamilie", "Anlass"] },
  en: { all: "All", saved: "Saved", save: "Save", remove: "Remove", reset: "Reset filters", empty: "There are no suggestions for this combination yet.", emptySaved: "Suggestions you save will appear here.", single: "suggestion", plural: "suggestions", coaching: ["Time available", "Goal"], scents: ["Scent family", "Occasion"] }
};

export function ProjectFinder({ items, editable, language, brand, media, copy }: Props) {
  const text = interfaceCopy[language];
  const storageKey = `seb-${brand}-saved`;
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    if (editable) return;
    try {
      const values: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(values)) setSaved(values.filter((value): value is string => typeof value === "string"));
    } catch { /* Storage may be unavailable in the current browser. */ }
  }, [editable, storageKey]);

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
    setSaved(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the current selection available. */ }
  }

  const allTagValues = (index: number) => [...new Set(items.flatMap(item => item.tags?.[index] ? [item.tags[index]] : []))];
  const results = editable ? items : items.filter(item =>
    savedOnly ? saved.includes(item.id) : (!first || item.tags?.[0] === first) && (!second || item.tags?.[1] === second)
  );
  const filters = [
    { options: allTagValues(0), selected: first, select: setFirst },
    { options: allTagValues(1), selected: second, select: setSecond },
  ];
  return <div className="seb-finder">
    {!editable && <div className="seb-finder-panel">
      <div className="seb-finder-tabs" role="group" aria-label={language === "de" ? "Ansicht" : "View"}>
        <button type="button" aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}><Sparkles size={17} aria-hidden="true" />{text.all}</button>
        <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><Bookmark size={17} aria-hidden="true" />{text.saved} <span>{saved.filter(id => items.some(item => item.id === id)).length}</span></button>
      </div>
      {!savedOnly && <div className="seb-finder-groups">{filters.map((filter, index) => filter.options.length > 0 &&
        <fieldset key={index}><legend>{text[brand][index]}</legend><div className="seb-finder-options">
          <button type="button" aria-pressed={!filter.selected} onClick={() => filter.select("")}>{text.all}</button>
          {filter.options.map(value => <button type="button" key={value} aria-pressed={filter.selected === value} onClick={() => filter.select(value)}>{value}</button>)}
        </div></fieldset>
      )}</div>}
      <div className="seb-finder-status"><span role="status">{results.length} {results.length === 1 ? text.single : text.plural}</span>
        {!savedOnly && (first || second) && <button type="button" onClick={() => { setFirst(""); setSecond(""); }}>{text.reset}</button>}
      </div>
    </div>}
    {results.length === 0 && <p className="seb-finder-empty">{savedOnly ? text.emptySaved : text.empty}</p>}
    <div className="seb-finder-grid">
      {results.map(item => {
        const index = items.indexOf(item);
        const isSaved = saved.includes(item.id);
        return <article className="seb-finder-card" key={item.id} data-item-id={item.id}>
          {media(item, index)}
          <div className="seb-finder-card-copy">
            {!!item.tags?.length && <div className="seb-finder-tags">{item.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}
            {copy(item, index)}
            {!editable && <button type="button" className="seb-save" aria-label={`${text.save} · ${item.title}`} aria-pressed={isSaved} onClick={() => toggleSaved(item.id)}>
              <Bookmark size={17} aria-hidden="true" fill={isSaved ? "currentColor" : "none"} />{isSaved ? text.remove : text.save}
            </button>}
          </div>
        </article>;
      })}
    </div>
  </div>;
}
