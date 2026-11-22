import type { ContentItem, Section } from "@/lib/types";

/** Public interface wording is a normal editable item detail, `key|wording`. */
export function creatorCopy(section: Section, group = "ui") {
  const result: Record<string, string> = {};
  for (const item of section.content.items ?? []) {
    if (!item.tags?.includes(group)) continue;
    for (const detail of item.details ?? []) {
      const split = detail.indexOf("|");
      if (split > 0) result[detail.slice(0, split)] = detail.slice(split + 1);
    }
  }
  return (key: string) => result[key] ?? "";
}

export function itemCopy(item: ContentItem) {
  const result: Record<string, string> = {};
  for (const detail of item.details ?? []) {
    const split = detail.indexOf("|");
    if (split > 0) result[detail.slice(0, split)] = detail.slice(split + 1);
  }
  return (key: string) => result[key] ?? "";
}

export function updateCreatorItem(section: Section, index: number, patch: Partial<ContentItem>): Section {
  return { ...section, content: { ...section.content, items: section.content.items?.map((item, n) => n === index ? { ...item, ...patch } : item) } };
}
