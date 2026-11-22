import { createStarterVisualContent, starterArtwork } from '../../src/lib/starter-visuals.mjs';

const profileDesigns = {
  services: {
    theme: { primary: '#203329', accent: '#e5efa4', background: '#f4f2e9', radius: 24 },
    headingTypeface: 'archivo',
    image: 'workshop',
    layout: 'split',
    heroDesign: { theme: 'soft' },
    intro: 'Wir klären zuerst, was Sie brauchen. Dann planen wir die Arbeit mit Ihnen und bleiben bis zur Übergabe erreichbar.',
    feature: 'scroll-story',
    featureDesign: { theme: 'dark', imageSide: 'left' },
  },
  portfolio: {
    theme: { primary: '#17252f', accent: '#f2c591', background: '#f3f1ea', radius: 18 },
    headingTypeface: 'space-grotesk',
    image: 'architecture',
    layout: 'panorama',
    intro: 'Ich zeige ausgewählte Arbeiten und die Entscheidungen hinter Material, Form und Bild.',
    feature: 'project-stage',
    featureDesign: { theme: 'light', imageSide: 'left' },
  },
  consulting: {
    theme: { primary: '#25294b', accent: '#d6d9ff', background: '#f0f1f8', radius: 24 },
    headingTypeface: 'fraunces',
    image: 'planning',
    layout: 'split',
    heroDesign: { theme: 'soft', imageSide: 'left' },
    intro: 'Wir sortieren mit Ihnen die Ausgangslage, machen Optionen vergleichbar und halten fest, womit Sie beginnen können.',
    feature: 'scene-sequence',
    featureDesign: { theme: 'dark', width: 'full' },
  },
  editorial: {
    theme: { primary: '#322a36', accent: '#f0cf85', background: '#f8f4eb', radius: 10 },
    headingTypeface: 'cormorant-garamond',
    image: 'editorial',
    layout: 'portrait',
    intro: 'Wir schreiben über Räume, Material und die Menschen, die daraus etwas machen.',
    feature: 'project-stage',
    featureDesign: { theme: 'dark', imageSide: 'right' },
  },
  creator: {
    image: 'creator',
    intro: 'Hier findest du meine neuesten Inhalte und siehst, wie du mit mir zusammenarbeiten kannst.',
  },
};

const innerPageMotifs = {
  leistungen: 'planning',
  'ueber-uns': 'workshop',
  projekte: 'architecture',
};

const innerPageIntros = {
  leistungen: ['Was wir für Sie übernehmen.', 'Vom ersten Gespräch bis zur Übergabe stimmen wir mit Ihnen ab, welche Leistungen zu Ihrem Vorhaben passen.'],
  'ueber-uns': ['So arbeiten wir.', 'Uns interessiert, wie sich eine Idee im Alltag bewährt. Deshalb sprechen wir früh über die Details, die später den Unterschied machen.'],
  team: ['Wer an Ihrem Vorhaben arbeitet.', 'Wir klären zu Beginn, wer Ihr Ansprechpartner ist und wer welche Aufgabe übernimmt.'],
  projekte: ['Arbeiten im Detail.', 'Schauen Sie sich an, wie aus einer Ausgangslage ein Entwurf und daraus eine konkrete Lösung wird.'],
  ablauf: ['Vom Gespräch zur Übergabe.', 'Sie wissen bei jedem Schritt, was entschieden ist und welche Fragen wir als Nächstes gemeinsam klären.'],
  kontakt: ['Erzählen Sie uns, was Sie vorhaben.', 'Schreiben Sie uns, worum es geht und wann Sie starten möchten. Wir besprechen mit Ihnen, was als Erstes sinnvoll ist.'],
};

function visualSection(id, type, name, design) {
  return { id, type, name, visible: true, design, content: createStarterVisualContent(type) };
}

export function applyStarterLayout(content, profile, aesthetic = 'standard') {
  const selected = profileDesigns[profile];
  const home = content.pages.find(page => page.slug === '');
  const hero = home.sections.find(section => section.id === 'home-hero');
  const contact = home.sections.find(section => section.id === 'home-cta');

  Object.assign(content.config.theme, selected.theme);
  if (profile !== 'creator') {
    content.config.theme.presentation = profile;
    content.config.theme.font = 'manrope';
    content.config.designVariant = 1;
  }
  const type = selected.headingTypeface && aesthetic !== 'liquid-glass'
    ? { headingTypeface: selected.headingTypeface }
    : {};
  const design = { ...hero.design, ...type, radius: content.config.theme.radius, spacing: 'compact', animation: 'reveal' };
  const cta = {
    ...contact,
    design: { ...design, theme: 'accent' },
    content: {
      ...contact.content,
      heading: profile === 'creator' ? 'Lass uns etwas zusammen machen.' : 'Was haben Sie vor?',
      text: profile === 'creator' ? 'Schreib mir, wenn du eine Idee oder eine Anfrage für eine Kooperation hast.' : 'Erzählen Sie uns kurz, worum es geht. Dann besprechen wir die nächsten Schritte.',
    },
  };
  const cover = {
    ...hero,
    type: profile === 'creator' ? 'creator-hero' : 'showcase-hero',
    name: profile === 'creator' ? 'Creator · Auftakt' : 'Bildbühne',
    design: {
      ...design, heroLayout: selected.layout, ...selected.heroDesign,
      ...(profile === 'portfolio' && aesthetic === 'standard' ? { radius: 0 } : {}),
    },
    content: {
      ...hero.content,
      text: selected.intro,
      image: { ...starterArtwork[selected.image] },
      caption: 'Beispielmotiv',
    },
  };

  if (profile === 'creator') {
    Object.assign(cover.content, { primaryLabel: 'Inhalte entdecken', primaryHref: '#inhalte', secondaryLabel: 'Media Kit', secondaryHref: '/media-kit' });
    home.sections = [cover, cta];
    return;
  }

  const story = selected.feature !== 'project-stage';
  const featureName = selected.feature === 'scene-sequence' ? 'Szenenwechsel beim Scrollen' : story ? 'Fotogeschichte' : 'Projektgalerie';
  const feature = visualSection(story ? 'home-story' : 'home-project-stage', selected.feature,
    featureName, { ...design, spacing: 'normal', ...selected.featureDesign });
  if (profile === 'services') {
    Object.assign(cover.content, { secondaryLabel: 'So arbeiten wir', secondaryHref: '#home-story' });
  }
  if (profile === 'portfolio') {
    Object.assign(cover.content, { primaryLabel: 'Arbeiten ansehen', primaryHref: '#home-project-stage' });
    const [firstProject, ...otherProjects] = feature.content.items;
    feature.content.items = [...otherProjects, firstProject];
  }
  if (profile === 'consulting') {
    Object.assign(cover.content, { primaryLabel: 'Ablauf kennenlernen', primaryHref: '#home-story' });
    Object.assign(feature.content, { primaryLabel: 'Ablauf ansehen', primaryHref: '/ablauf' });
  }
  if (profile === 'editorial') {
    Object.assign(cover.content, { primaryLabel: 'Zum Magazin', primaryHref: '/' + content.config.blog.slug });
    feature.content.heading = 'Drei Themen für den Anfang.';
    feature.content.text = 'Beispielbilder für Geschichten über Räume, Handwerk und Gestaltung.';
    home.sections = [
      cover,
      {
        id: 'home-magazine',
        type: 'blog-editorial',
        name: 'Leitbeitrag und Liste',
        visible: true,
        content: { heading: 'Neu im Magazin', blogFeed: { limit: 4, archiveLink: true } },
        design,
      },
      feature,
      cta,
    ];
  } else {
    home.sections = [cover, feature, cta];
  }

  for (const page of content.pages) {
    if (page === home) continue;
    const lead = page.sections[0];
    if (lead?.type !== 'hero') continue;
    const motif = innerPageMotifs[page.slug];
    lead.type = 'showcase-hero';
    lead.design = { ...lead.design, ...type, radius: design.radius, animation: 'reveal', spacing: 'compact',
      heroLayout: page.slug === 'projekte' ? 'panorama' : 'split', imageSide: page.slug === 'ueber-uns' ? 'left' : 'right' };
    lead.content.image = motif ? { ...starterArtwork[motif] } : undefined;
    lead.content.caption = motif ? 'Beispielmotiv' : undefined;
    if (Object.hasOwn(innerPageIntros, page.slug)) {
      const [heading, text] = innerPageIntros[page.slug];
      Object.assign(lead.content, { heading, text });
    }

    if (page.slug === 'projekte') {
      const gallery = visualSection('projects-gallery', profile === 'portfolio' ? 'project-index' : 'project-stage',
        profile === 'portfolio' ? 'Filterbare Projektübersicht' : 'Projektgalerie',
        { ...design, spacing: 'normal', theme: 'dark', imageSide: 'left', columns: 2 });
      page.sections.splice(1, 1, gallery);
    }
    if (page.slug === 'leistungen' && (profile === 'services' || profile === 'consulting')) {
      const directory = visualSection('services-cards', 'editorial-index', 'Themenverzeichnis',
        { ...design, spacing: 'normal', theme: 'soft' });
      if (profile === 'services') {
        directory.type = 'services';
        directory.name = 'Leistungen';
        const icons = ['MessagesSquare', 'Layers', 'Compass'];
        directory.content.items = directory.content.items.map((item, index) => ({...item, icon: icons[index]}));
      }
      page.sections.splice(1, 1, directory);
    }
    if (page.slug === 'ablauf') {
      const workflow = profile === 'consulting';
      const timeline = visualSection('process-steps', workflow ? 'workflow-demo' : 'scroll-story', workflow ? 'Animierter Ablauf' : 'Fotogeschichte',
        { ...design, spacing: 'normal', theme: workflow ? 'soft' : 'dark', imageSide: 'left' });
      page.sections.splice(1, 1, timeline);
    }
  }
}
