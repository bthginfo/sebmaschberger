"use client";

import { useState, type ReactNode } from "react";
import type { ContentItem, SiteLanguage } from "@/lib/types";

type Panel = "image" | "poster";
type Props = {
  items: ContentItem[];
  editable: boolean;
  language: SiteLanguage;
  renderImage: (item: ContentItem, index: number, panel: Panel) => ReactNode;
  renderCopy: (item: ContentItem, index: number) => ReactNode;
};

const panelLabels = {
  de: { image: "Vorher", poster: "Nachher", select: "Coaching-Vergleich auswählen", empty: "Füge zwei Bilder für den ersten Vergleich hinzu." },
  en: { image: "Before", poster: "After", select: "Choose a coaching comparison", empty: "Add two photos for the first comparison." },
};

export function CoachingComparison({ items, editable, language, renderImage, renderCopy }: Props) {
  const [selectedId, setSelectedId] = useState<string>();
  const labels = panelLabels[language];
  const cases = editable ? items : items.filter(item => item.image?.src && item.poster?.src);
  const selected = cases.find(item => item.id === selectedId) ?? cases[0];
  if (!selected) return editable ? <p>{labels.empty}</p> : null;
  const index = items.indexOf(selected);

  return <div className="seb-comparison">
    <article key={selected.id} className="seb-comparison-case" aria-label={selected.title} data-item-id={selected.id}>
      <div className="seb-comparison-pair">
        {(["image", "poster"] as const).map(panel => (
          <div className="seb-comparison-frame" data-panel={panel} key={panel}>
            {renderImage(selected, index, panel)}
            <span className="seb-comparison-phase">{labels[panel]}</span>
          </div>
        ))}
      </div>
      {(editable || selected.text) && <div className="seb-comparison-copy">{renderCopy(selected, index)}</div>}
    </article>
    {cases.length > 1 && (
      <div className="seb-comparison-choices" role="group" aria-label={labels.select}>
        {cases.map(item => (
          <button type="button" key={item.id} aria-pressed={selected.id === item.id} onClick={() => setSelectedId(item.id)}>
            {item.image?.src && item.poster?.src && <span className="seb-comparison-thumb" aria-hidden="true">
              <img src={item.image.src} alt="" width={27} height={40} loading="lazy" />
              <img src={item.poster.src} alt="" width={27} height={40} loading="lazy" />
            </span>}
            <span>{item.title}</span>
          </button>
        ))}
      </div>
    )}
  </div>;
}
