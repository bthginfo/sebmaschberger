/** @import {ImageValue, SectionContent} from './types' */

/**
 * @param {string} name
 * @param {string} alt
 * @param {number} width
 * @param {number} height
 * @param {number} compactWidth
 * @returns {ImageValue}
 */
function exampleImage(name, alt, width, height, compactWidth) {
  const path = '/placeholders/visual-starter/' + name;
  return {
    src: path + '.webp',
    srcSet: `${path}-compact.webp ${compactWidth}w, ${path}.webp ${width}w`,
    width, height, alt, position: '50% 50%',
  };
}

export const starterArtwork = {
  workshop: exampleImage('workshop', 'Holzwerkbank mit Materialproben im Licht eines hohen Atelierfensters', 1056, 1320, 608),
  architecture: exampleImage('architecture', 'Heller Treppenaufgang aus Naturstein neben einer Wand aus Holzlamellen', 1536, 1024, 720),
  planning: exampleImage('planning', 'Zwei Personen betrachten Entwurfsskizzen an einem Tisch', 1536, 1024, 720),
  editorial: exampleImage('editorial', 'Offenes Fotobuch mit blauem Glasobjekt auf einer Terrazzo-Platte', 1056, 1320, 608),
  creator: { ...exampleImage('creator', 'Person in grüner Jacke und Kopfhörern in einem blau beleuchteten Studio', 1056, 1320, 608), position: /** @type {const} */ ('50% 0%') },
};

/**
 * @param {'showcase-hero' | 'scroll-story' | 'scene-sequence' | 'workflow-demo' | 'project-stage' | 'project-index' | 'editorial-index'} type
 * @returns {SectionContent}
 */
export function createStarterVisualContent(type) {
  if (type === 'showcase-hero') return {
    heading: 'Raum für Ihre Ideen.',
    text: 'Entdecken Sie unser Angebot und finden Sie den passenden Einstieg für Ihr Vorhaben.',
    image: { ...starterArtwork.workshop },
    caption: 'Beispielmotiv',
    primaryLabel: 'Leistungen ansehen',
    primaryHref: '/leistungen',
  };
  if (type === 'scene-sequence') return {
    heading: 'Von der Frage zum Entwurf.',
    text: 'Drei Stationen eines beispielhaften Projekts.',
    items: [
      { id: 'ausgangslage', title: 'Zuerst verstehen.', text: 'Wir sortieren die Ausgangslage und finden heraus, was sich im Alltag ändern soll.', image: { ...starterArtwork.planning } },
      { id: 'entwurf', title: 'Ideen greifbar machen.', text: 'Ein Entwurf zeigt, wie sich die Idee in der Praxis anfühlen kann.', image: { ...starterArtwork.editorial } },
      { id: 'entscheidung', title: 'Gemeinsam entscheiden.', text: 'Wir wählen eine Richtung und halten die nächsten Schritte fest.', image: { ...starterArtwork.architecture } },
    ],
  };
  if (type === 'workflow-demo') return {
    heading: 'Wie aus einer Anfrage ein Angebot wird.',
    text: 'In diesem fiktiven Beispiel bereitet das System einen Entwurf vor. Eine Person prüft und gibt ihn frei.',
    items: [
      { id: 'anfrage', title: 'Anfrage erhalten', meta: 'Eingang', text: 'Eine Kundin fragt nach einem Angebot. Der Vorgang sammelt ihren Terminwunsch und die Unterlagen an einem Ort.', image: { ...starterArtwork.planning } },
      { id: 'entwurf', title: 'Entwurf vorbereiten', meta: 'Automatisierung', text: 'Aus den Angaben entsteht ein Angebotsentwurf mit Leistungen und offenen Fragen.', image: { ...starterArtwork.workshop } },
      { id: 'freigabe', title: 'Angebot prüfen', meta: 'Persönliche Freigabe', text: 'Das Team prüft Umfang, Preis und Termin. Bei Bedarf ergänzt es fehlende Angaben.', image: { ...starterArtwork.editorial } },
      { id: 'versand', title: 'Angebot bereitstellen', meta: 'Ergebnis', text: 'Die Kundin erhält im Beispiel das freigegebene Angebot und einen Überblick über die nächsten Schritte.', image: { ...starterArtwork.architecture } },
    ],
  };
  if (type === 'scroll-story') return {
    heading: 'So kann die Zusammenarbeit aussehen.',
    text: 'Ein Beispielablauf vom ersten Gespräch bis zur Umsetzung.',
    items: [
      { id: 'gespraech', title: 'Das Vorhaben verstehen', text: 'Im ersten Gespräch geht es um die Ausgangslage, die Ziele und die Fragen, die zuerst geklärt werden müssen.', image: { ...starterArtwork.planning } },
      { id: 'entwurf', title: 'Eine Richtung finden', text: 'Erste Entwürfe machen die Möglichkeiten greifbar. Gemeinsam lässt sich entscheiden, welche Richtung zum Vorhaben passt.', image: { ...starterArtwork.editorial } },
      { id: 'umsetzung', title: 'Die Details ausarbeiten', text: 'Aus dem abgestimmten Entwurf wird ein konkretes Ergebnis. Die Übergabe hält fest, wie es weitergeht.', image: { ...starterArtwork.architecture } },
    ],
  };
  if (type === 'editorial-index') return {
    heading: 'Angebote im Überblick.',
    text: 'Drei Beispiele, wie sich Leistungen und ihr Nutzen vorstellen lassen.',
    items: [
      { id: 'beratung', title: 'Beratung', text: 'Im Gespräch lässt sich klären, was bereits funktioniert und wo sich eine Veränderung lohnt.', image: { ...starterArtwork.planning } },
      { id: 'konzeption', title: 'Konzeption', text: 'Skizzen und Varianten machen unterschiedliche Möglichkeiten sichtbar, bevor eine Entscheidung fällt.', image: { ...starterArtwork.editorial } },
      { id: 'begleitung', title: 'Begleitung', text: 'Bei der Umsetzung hilft ein fester Ansprechpartner dabei, Entscheidungen und nächste Schritte im Blick zu behalten.', image: { ...starterArtwork.architecture } },
    ],
  };
  return {
    heading: type === 'project-index' ? 'Ausgewählte Arbeiten.' : 'Arbeiten im Detail.',
    text: type === 'project-index' ? 'Beispielprojekte aus Architektur, Handwerk und Gestaltung.' : 'Drei Beispielmotive zeigen, wie sich ein Projekt vorstellen lässt.',
    items: [
      { id: 'raumstudie', title: 'Raumstudie', meta: 'Architektur', text: 'Licht, klare Linien und ein ruhiger Übergang zwischen Stein und Holz.', image: { ...starterArtwork.architecture } },
      { id: 'materialproben', title: 'Materialproben', meta: 'Handwerk', text: 'Holz, Papier und erste Muster machen eine Idee greifbar.', image: { ...starterArtwork.workshop } },
      { id: 'publikation', title: 'Publikation', meta: 'Editorial', text: 'Eine Bildstrecke, die Materialien und Details aus einer anderen Nähe zeigt.', image: { ...starterArtwork.editorial } },
    ],
  };
}
