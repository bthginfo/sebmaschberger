import type { PageContent, Section, WebsiteContent } from "./types";
type FieldChange = { name: string; before?: string; after?: string };
type Change = { id: string; name: string; kind: "added" | "removed" | "changed"; fields: FieldChange[] };
type DisplayValue = string | boolean | number | null | undefined;
type RouteTemplate = Pick<PageContent, "seo" | "sections">;
type Snapshot = WebsiteContent & { templates?: Record<string, RouteTemplate | undefined> };

const templateNames: Record<string, string> = {
  "blog-index": "Blog · Alle Beiträge",
  "blog-post": "Blog · Beitragsdetail",
  "shop-product": "Shop · Produktdetail",
  "shop-category": "Shop · Kategorie",
  "shop-search": "Shop · Suchergebnisse",
};

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, i) => equal(value, b[i]));
  }
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const first = a as Record<string, unknown>, second = b as Record<string, unknown>;
  return [...new Set([...Object.keys(first), ...Object.keys(second)])].every(key => equal(first[key], second[key]));
}

function scalar(name: string, before: DisplayValue, after: DisplayValue): FieldChange[] {
  return before === after ? [] : [{
    name,
    before: typeof before === "string" || typeof before === "number" ? String(before) : undefined,
    after: typeof after === "string" || typeof after === "number" ? String(after) : undefined,
  }];
}

function sectionFields(before: Section[], after: Section[]): FieldChange[] {
  const changes: FieldChange[] = [];
  const previous = new Map(before.map(section => [section.id, section]));
  const next = new Map(after.map(section => [section.id, section]));
  for (const id of new Set([...next.keys(), ...previous.keys()])) {
    const a = previous.get(id), b = next.get(id);
    const name = (b ?? a)?.name || (b ?? a)?.content.heading || id;
    if (!a || !b) {
      changes.push({ name: a ? "Abschnitt entfernt" : "Abschnitt hinzugefügt", before: a ? name : undefined, after: b ? name : undefined });
      continue;
    }
    if (equal(a, b)) continue;
    changes.push({ name: "Abschnitt geändert", after: name });
    changes.push(...scalar("Überschrift", a.content.heading, b.content.heading),
      ...scalar("Text", a.content.text, b.content.text),
      ...scalar("Sprungmarke", a.anchor, b.anchor),
      ...scalar("Erster Link", a.content.primaryHref, b.content.primaryHref),
      ...scalar("Zweiter Link", a.content.secondaryHref, b.content.secondaryHref));
    if (!equal(a.content.items, b.content.items)) changes.push({ name: "Einträge geändert" });
    if (!equal(a.content.image, b.content.image) || !equal(a.content.items?.map(item => item.image), b.content.items?.map(item => item.image)) ||
      !equal(a.content.videoUrl, b.content.videoUrl)) changes.push({ name: "Medien geändert" });
    if (!equal(a.design, b.design)) changes.push({ name: "Gestaltung geändert" });
    if (a.visible !== b.visible) changes.push({ name: b.visible ? "Abschnitt eingeblendet" : "Abschnitt ausgeblendet" });
  }
  const shared = (sections: Section[]) => sections.filter(section => previous.has(section.id) && next.has(section.id)).map(section => section.id);
  if (!equal(shared(before), shared(after))) changes.push({ name: "Reihenfolge der Abschnitte geändert" });
  return changes;
}

function pageFields(before: PageContent, after: PageContent, beforePath: string, afterPath: string) {
  return [...scalar("Seitenadresse", beforePath, afterPath),
    ...scalar("Seitentitel", before.title, after.title),
    ...scalar("SEO-Titel", before.seo.title, after.seo.title),
    ...scalar("Meta-Beschreibung", before.seo.description, after.seo.description),
    ...scalar("Sprache", before.locale, after.locale),
    ...(!equal(before.seo.image, after.seo.image) ? [{ name: "Vorschaubild geändert" }] : []),
    ...(!equal(Boolean(before.seo.noindex), Boolean(after.seo.noindex)) ? [{ name: "Indexierung geändert" }] : []),
    ...sectionFields(before.sections, after.sections)];
}

export function publicationChanges(published: Snapshot, draft: Snapshot, pathFor: (page: PageContent, snapshot: WebsiteContent) => string = page => "/" + page.slug): Change[] {
  const changes: Change[] = [];
  const before = new Map(published.pages.map(page => [page.id, page]));
  const after = new Map(draft.pages.map(page => [page.id, page]));
  for (const id of new Set([...after.keys(), ...before.keys()])) {
    const a = before.get(id), b = after.get(id), name = (b ?? a)?.title || id;
    const oldPath = a && pathFor(a, published);
    const newPath = b && pathFor(b, draft);
    if (a && b) {
      if (!equal(a, b) || oldPath !== newPath) changes.push({
        id, name, kind: "changed", fields: pageFields(a, b, oldPath!, newPath!),
      });
    } else {
      changes.push({ id, name, kind: b ? "added" : "removed", fields: scalar("Seitenadresse", oldPath, newPath) });
    }
  }
  for (const key of new Set([...Object.keys(draft.templates ?? {}), ...Object.keys(published.templates ?? {})])) {
    const a = published.templates?.[key], b = draft.templates?.[key];
    if (equal(a, b)) continue;
    changes.push({ id: "template:" + key, name: templateNames[key] ?? key, kind: "changed", fields: [
      ...scalar("SEO-Titel", a?.seo?.title, b?.seo?.title),
      ...scalar("Meta-Beschreibung", a?.seo?.description, b?.seo?.description),
      ...sectionFields(a?.sections ?? [], b?.sections ?? []),
    ] });
  }
  const allConfig = new Set([...Object.keys(published.config), ...Object.keys(draft.config)] as (keyof WebsiteContent["config"])[]);
  const changed = [...allConfig].filter(key => !equal(published.config[key], draft.config[key]));
  if (changed.length) {
    const labels: Record<string, string> = {
      navigation: "Navigation", footer: "Fußzeile", footerText: "Fußzeile", theme: "Gestaltung", designVariant: "Gestaltung",
      modules: "Module", consent: "Einwilligung", analytics: "Analyse", blog: "Blog",
      locales: "Sprachfassungen", defaultAdminLanguage: "Sprache", defaultWebsiteLanguage: "Sprache",
    };
    changes.push({ id: "config", name: "Website-Einstellungen", kind: "changed",
      fields: [...new Set(changed.map(key => labels[key] ?? "Unternehmensdaten"))].map(name => ({ name })) });
  }
  const oldPosts = (published.posts ?? []).filter(post => post.status === "published");
  const nextPosts = (draft.posts ?? []).filter(post => post.status === "published");
  for (const id of new Set([...nextPosts.map(post => post.id), ...oldPosts.map(post => post.id)])) {
    const a = oldPosts.find(post => post.id === id), b = nextPosts.find(post => post.id === id);
    if (equal(a, b)) continue;
    changes.push({ id: "post:" + id, name: (b ?? a)!.title, kind: !a ? "added" : !b ? "removed" : "changed", fields: [
      ...scalar("Seitentitel", a?.title, b?.title), ...scalar("Seitenadresse", a?.slug, b?.slug),
      ...sectionFields(a?.sections ?? [], b?.sections ?? []),
    ] });
  }
  return changes;
}
