import { useId, useRef, useState, type ReactNode } from "react";
import { Check, CircleDashed, FileCheck2, Globe, LoaderCircle, Search, X } from "lucide-react";
import type { Section } from "@/lib/types";
import styles from "./editor-feedback.module.css";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss");
}

export function SectionOutline({ sections, typeLabel, english = false, children }: {
  sections: Section[];
  typeLabel: (section: Section) => string;
  english?: boolean;
  children: (section: Section, index: number, searching: boolean) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  const matches = sections.map((section, index) => ({ section, index })).filter(({ section }) => {
    if (!searching) return true;
    const text = normalize([section.name, section.content.heading, section.anchor, section.type, typeLabel(section)].join(" "));
    return terms.every(term => text.includes(term));
  });
  const label = english ? "Find a section" : "Abschnitt finden";

  function clear() {
    setQuery("");
    input.current?.focus();
  }

  return <>
    {(sections.length > 1 || query) && <div className={styles.search}>
      <Search size={16} aria-hidden="true" />
      <input ref={input} aria-label={label} aria-controls={listId} placeholder={label}
        value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Escape" && query) { event.preventDefault(); event.stopPropagation(); clear(); }
        }} />
      {query && <button type="button" onClick={clear} aria-label={english ? "Clear search" : "Suche leeren"}>
        <X size={16} aria-hidden="true" />
      </button>}
    </div>}
    <div role="status" className={styles.count}>{searching && (matches.length
      ? (english ? `${matches.length} of ${sections.length} · Clear search to reorder.` : `${matches.length} von ${sections.length} · Zum Sortieren Suche leeren.`)
      : (english ? "No matching sections." : "Kein passender Abschnitt."))}</div>
    <ol id={listId} className="cms-section-list">
      {matches.map(({ section, index }) => children(section, index, searching))}
    </ol>
  </>;
}

export function DraftStatus({ busy, dirty, pending, local = false, english = false }: {
  busy: string | null;
  dirty: boolean;
  pending: boolean;
  local?: boolean;
  english?: boolean;
}) {
  const text = (de: string, en: string) => english ? en : de;
  let label = local ? text("Beispiel aktuell", "Example up to date") : text("Veröffentlichter Stand", "Published version");
  let Icon = local ? Check : Globe;
  if (busy === "save" || busy === "publish") {
    Icon = LoaderCircle;
    label = busy === "save" ? text("Entwurf wird gespeichert …", "Saving draft …")
      : local ? text("Beispiel wird aktualisiert …", "Updating example …") : text("Wird veröffentlicht …", "Publishing …");
  } else if (dirty) {
    Icon = CircleDashed;
    label = text("Ungespeicherte Änderungen", "Unsaved changes");
  } else if (pending) {
    Icon = FileCheck2;
    label = local ? text("Gespeichert · noch nicht angewendet", "Saved · not applied yet")
      : text("Entwurf gespeichert · noch nicht veröffentlicht", "Draft saved · not published yet");
  }
  return <span className={styles.status} role="status" aria-atomic="true">
    <Icon key={label} size={15} className={Icon === LoaderCircle ? styles.spinning : styles.mark} aria-hidden="true" />
    {label}
  </span>;
}
