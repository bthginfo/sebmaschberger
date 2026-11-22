export type LibraryItem = { type: string; name: string; category: string; description: string };
export type SectionPlacement = 'before' | 'after' | 'end';

const synonyms = [
  ['fragen', 'faq', 'antworten', 'haeufig', 'accordion', 'akkordeon'],
  ['kontakt', 'formular', 'anfrage', 'termin', 'cta', 'button'],
  ['bild', 'bilder', 'galerie', 'foto', 'gallery', 'portfolio'],
  ['team', 'menschen', 'personen', 'ansprechpartner', 'portrait'],
  ['preise', 'pakete', 'vergleich', 'tarife', 'angebot', 'pricing'],
  ['ablauf', 'schritt', 'prozess', 'zeitstrahl', 'timeline', 'steps'],
  ['start', 'einstieg', 'kopf', 'titelbild', 'hero'],
  ['shop', 'sortiment', 'produkte', 'warenkorb'],
  ['leistungen', 'angebote', 'services', 'kacheln', 'cards'],
  ['text', 'inhalt', 'absatz', 'richtext', 'statement']
];

const normalize = (value: string) => value.toLocaleLowerCase('de-DE')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const recent: string[] = [];

export function rememberSectionType(type: string) {
  const index = recent.indexOf(type);
  if (index >= 0) recent.splice(index, 1);
  recent.unshift(type);
  recent.splice(4);
}

export function recentLibraryItems<T extends LibraryItem>(library: readonly T[]): T[] {
  return recent.flatMap(type => {
    const item = library.find(entry => entry.type === type);
    return item ? [item] : [];
  });
}

export function searchSectionLibrary<T extends LibraryItem>(library: readonly T[], search: string): T[] {
  const terms = normalize(search).split(' ').filter(Boolean).slice(0, 12);
  if (!terms.length) return [...library];
  return library.flatMap(item => {
    const name = normalize(item.name);
    const text = normalize([item.type, item.name, item.category, item.description].join(' '));
    let score = 0;
    for (const term of terms) {
      if (name.includes(term)) score += 4;
      else if (text.includes(term)) score += 2;
      else {
        const equivalents = synonyms.find(group => group.includes(term));
        if (!equivalents?.some(word => text.includes(word))) return [];
        score += 1;
      }
    }
    return [{ item, score }];
  }).sort((a, b) => b.score - a.score).map(result => result.item);
}
