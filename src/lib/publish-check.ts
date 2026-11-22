import { interpolateAdminMessage, type AdminMessage } from './admin-i18n/locale';
import type { WebsiteContent } from './types';
import { TEMPLATE_CONTENT_ID, TEMPLATE_INTRO_ID, TEMPLATE_LABELS, type RouteTemplateKey } from './route-template-keys';
import { PROPOSAL_PATH } from './proposals/model';
import { scroll3dStops } from './scroll-3d';

export function publicationIssueText({ message, values }: AdminMessage): string {
  return interpolateAdminMessage(message, values);
}

export function blogRouteIssueMessages(content: WebsiteContent): AdminMessage[] {
  const blog = content.config.blog;
  if (!blog?.enabled) return [];
  const addresses = new Set(content.pages.map(page => page.slug));
  const issues: AdminMessage[] = [];
  if (addresses.has(blog.slug)) issues.push({ message: 'Die Adresse der Beitragsübersicht ist bereits vergeben.' });
  for (const post of content.posts ?? []) {
    if (post.status !== 'published') continue;
    const slug = blog.slug + '/' + post.slug;
    if (addresses.has(slug)) issues.push({ message: 'Die Adresse /{slug} ist bereits vergeben.', values: { slug } });
    addresses.add(slug);
  }
  return issues;
}

export function blogRouteIssues(content: WebsiteContent): string[] {
  return blogRouteIssueMessages(content).map(publicationIssueText);
}

export function publishIssueMessages(content: WebsiteContent): AdminMessage[] {
  const issues = blogRouteIssueMessages(content);
  const { config } = content;
  if (config.modules?.proposals?.enabled && (content.pages.some(page => '/' + page.slug === PROPOSAL_PATH) || config.blog?.enabled && '/' + config.blog.slug === PROPOSAL_PATH)) {
    issues.push({ message: 'Bitte wählen Sie eine andere Seitenadresse. /projektfreigabe wird für persönliche Freigabelinks verwendet.' });
  }
  if (config.modules?.commerce?.consumerSales && content.pages.some(page => page.slug === 'shop/widerruf')) {
    issues.push({ message: 'Bitte geben Sie der eigenen Seite eine andere Adresse. /shop/widerruf gehört zur Widerrufsfunktion.' });
  }
  if (config.modules?.commerce?.enabled && config.modules.commerce.consumerSales && !config.modules.commerce.products.some(product => product.active)) {
    issues.push({ message: 'Der aktivierte Shop braucht mindestens ein aktives Produkt.' });
  }
  if (config.navigation.some(link => !link.label.trim() || !link.href.trim())) {
    issues.push({ message: 'Bitte ergänzen Sie den Namen und das Linkziel aller Navigationspunkte.' });
  }
  const footer = config.footer;
  if (footer) {
    const links = [...footer.legalLinks, ...footer.columns.flatMap(column => column.links)];
    if (links.some(link => !link.label.trim() || !link.href.trim())) {
      issues.push({ message: 'Bitte ergänzen Sie die Bezeichnungen und Linkziele im Fußbereich.' });
    }
    if (footer.columns.some(column => !column.title.trim())) {
      issues.push({ message: 'Bitte ergänzen Sie die Überschriften Ihrer Linkspalten im Fußbereich.' });
    }
    if (footer.ctaLabel.trim() && !footer.ctaHref.trim()) {
      issues.push({ message: 'Bitte ergänzen Sie das Linkziel des Kontaktaufrufs im Fußbereich.' });
    }
  }
  const listTypes = new Set(['services', 'team', 'faq', 'steps', 'stats', 'cards', 'list', 'downloads', 'timeline', 'accordion', 'comparison', 'columns', 'portrait-mosaic', 'service-explorer', 'focus-finder', 'portrait-rail', 'stacked-panels', 'case-deck', 'people-index']);
  const pages = [...content.pages, ...(content.posts ?? []).filter(post => post.status === 'published').map(post => ({ ...post, locale: 'de' }))];
  for (const [key, template] of Object.entries(content.templates ?? {})) {
    if ((key.startsWith('shop-') && !config.modules?.commerce?.enabled) || (key.startsWith('blog-') && !config.blog?.enabled)) continue;
    pages.push({
      id: key, slug: '', locale: 'de', title: TEMPLATE_LABELS[key as RouteTemplateKey], seo: template.seo,
      sections: template.sections.filter(section => section.id !== TEMPLATE_CONTENT_ID && section.id !== TEMPLATE_INTRO_ID)
    });
  }
  for (const page of pages) {
    for (const section of page.sections) {
      if (!section.visible || section.type === 'divider') continue;
      if (section.type === 'scroll-3d' && !config.modules?.scroll3d?.enabled) continue;
      const values = { page: page.title, section: section.name };
      if (!section.content.heading.trim() && !['quote', 'logos'].includes(section.type)) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte ergänzen Sie eine Überschrift.', values });
      }
      if (section.type === 'announcement' && !section.content.text?.trim() && !section.content.subheading?.trim()) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte ergänzen Sie den Zeitraum oder einen kurzen Hinweis.', values });
      }
      if (section.type === 'announcement' && section.content.primaryLabel?.trim() && !section.content.primaryHref) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte ergänzen Sie das Linkziel der Schaltfläche.', values });
      }
      if (section.type === 'scroll-3d') {
        const chapters = section.content.items ?? [];
        if (!chapters.length) {
          issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte ergänzen Sie mindestens ein 3D-Kapitel.', values });
        }
        if (!scroll3dStops(chapters)) {
          issues.push({ message: '„{page}“, Abschnitt „{section}“: Die Startpunkte der 3D-Kapitel müssen aufsteigend sein.', values });
        }
        if (section.content.motionModel && (!section.content.image?.src || !section.content.image.alt.trim())) {
          issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte wählen Sie ein Standbild mit Alternativtext für das 3D-Modell.', values });
        }
      }
      const clubFeed = config.modules?.clubManagement?.enabled === true && section.type === 'timeline' && section.content.clubFixtures;
      if (!clubFeed && listTypes.has(section.type) && !section.content.items?.length) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte ergänzen Sie mindestens einen Eintrag oder blenden Sie den Abschnitt aus.', values });
      }
      if (!clubFeed && section.content.items?.some(item => !item.title.trim())) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Ein Eintrag hat noch keine Überschrift.', values });
      }
      if (section.type === 'quote' && !section.content.quote?.trim()) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte tragen Sie das Zitat ein oder blenden Sie den Abschnitt aus.', values });
      }
      if (section.type === 'video' && !section.content.videoUrl?.trim()) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte hinterlegen Sie ein Video oder blenden Sie den Abschnitt aus.', values });
      }
      if (['gallery', 'editorial-gallery', 'image-curtain'].includes(section.type) && !section.content.images?.length) {
        issues.push({ message: '„{page}“, Abschnitt „{section}“: Bitte wählen Sie Bilder für die Galerie aus.', values });
      }
    }
  }
  return [...new Map(issues.map(issue => [publicationIssueText(issue), issue])).values()];
}

export function publishIssues(content: WebsiteContent): string[] {
  return publishIssueMessages(content).map(publicationIssueText);
}
