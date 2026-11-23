import type { CmsAppearance } from "@/lib/cms-typefaces";
import type { Section } from "@/lib/types";

export type TextRole = "heading" | "body";

export function initialTextRole(field?: string): TextRole {
  return !field || field === "heading" || field === "title" ? "heading" : "body";
}

/** A missing entry can occur between selection and undo. Never redirect its edit to the section. */
export function updateCanvasAppearance<K extends keyof CmsAppearance>(
  section: Section, itemId: string | undefined, key: K, value: CmsAppearance[K],
): Section {
  const item = itemId === undefined ? undefined : section.content.items?.find(entry => entry.id === itemId);
  if (itemId !== undefined && !item) return section;
  const current = item ? item.appearance : section.design;
  if (current?.[key] === value) return section;
  function changed<T extends CmsAppearance>(look: T): T {
    const result = { ...look };
    if (value === undefined) delete result[key];
    else Object.assign(result, { [key]: value });
    return result;
  }
  if (!item) return { ...section, design: changed(section.design) };
  const next = changed(item.appearance ?? {});
  const edited = { ...item };
  if (Object.keys(next).length) edited.appearance = next;
  else delete edited.appearance;
  return { ...section, content: { ...section.content, items: section.content.items!.map(entry => entry === item ? edited : entry) } };
}

/** The renderer treats an optional 100% value as inherited. Do not strand a stepper at that stop. */
export function nextCanvasPercent(current: number, direction: -1 | 1, min: number, max: number, inherited: number) {
  let next = current + direction * 5;
  if (next === 100 && inherited !== 100) next += direction * 5;
  return Math.max(min, Math.min(max, next));
}
