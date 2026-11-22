import 'server-only';
import { getDraftConfig, getRecord, getSettings, getState, listInquiries, listMedia } from '@/lib/db';
import { getBusinessSettings } from '@/lib/business/service';
import type { CommerceStore, CommerceOrder } from '@/lib/commerce/model';
import { commerceStatusLabel } from '@/lib/commerce/contracts';
import { availableSectionLibrary } from '@/lib/section-library';
import type { Inquiry, MediaAsset, SiteConfig } from '@/lib/types';
import { agentTextTargets } from '@/lib/agents/text';
import { defaultAnalyticsFilters } from '@/lib/analytics/model';
import type { WorkspaceArea, WorkspaceFacts, WorkspaceQuery, WorkspaceRow, WorkspaceField } from '@/lib/assistant/workspace';
import { analytics } from '../analytics/store';
import { selectWorkspaceFacts, workspaceField as field, workspaceMoney, workspaceText, WorkspaceError } from './workspace-core';

const area = (id: string, label: string, description: string, href = '/admin?view=' + id): WorkspaceArea =>
  ({ id, label, href, description });

const areas = {
  pages: area('pages', 'Seiten', 'Gespeicherte Seiten, SEO, Abschnitts-IDs und bearbeitbare Texte', '/admin?view=editor'),
  sections: area('sections', 'Abschnittsbibliothek', 'Verfügbare Bausteine für diese Website', '/admin?view=editor'),
  posts: area('posts', 'Beiträge', 'Blogbeiträge, Inhalt und Veröffentlichungsstatus', '/admin?view=blog'),
  media: area('media', 'Medien', 'Dateien, Bildbeschreibungen und Abmessungen'),
  inquiries: area('inquiries', 'Anfragen', 'Postfach, Betreff, Nachricht, Status und interne Notiz'),
  orders: area('orders', 'Bestellungen', 'Shop-Bestellungen, Zahlstatus, Waren, Versand und Rückerstattungsstatus', '/admin?view=commerce'),
  products: area('products', 'Shop-Produkte', 'Sortiment, Preise, Varianten, Bestand und Gruppen', '/admin?view=commerce'),
  shipping: area('shipping', 'Versand & Steuern', 'Liefergebiete, Versandkosten und Steuerregeln', '/admin?view=commerce'),
  documents: area('documents', 'Belege & Vorlagen', 'Rechnungs- und Belegnummern zu Bestellungen, Dokumentvorlagen', '/admin?view=documents'),
  emails: area('emails', 'E-Mail-Vorlagen', 'Gespeicherte Vorlagen für Kontakt und Shop', '/admin?view=documents'),
  settings: area('settings', 'Einstellungen', 'Module, Website-Adresse und Einrichtungsstatus'),
  analytics: area('analytics', 'Webanalyse', 'Kennzahlen aus zugestimmten Besuchen im gewählten Zeitraum', '/admin/analytics'),
  agents: area('agents', 'KI & Agenten', 'Aktivierungsstatus und Zahl gespeicherter Agentenzugänge', '/admin/agents')
};

export function nextWorkspaceAreas(config: SiteConfig): WorkspaceArea[] {
  return Object.values(areas).filter(entry =>
    !['orders', 'products', 'shipping'].includes(entry.id) || Boolean(config.modules?.commerce));
}

const entry = (id: string, label: string, fields: WorkspaceField[], status?: string, date?: string): WorkspaceRow =>
  ({ id, label, status, date, fields });

const json = (value: unknown, limit = 1600) => workspaceText(JSON.stringify(value), limit);

function orderView(order: CommerceOrder, detail: boolean) {
  const documentNumber = order.documentNumber || order.id;
  return {
    ...entry(order.id, documentNumber, [
      field('Status', commerceStatusLabel(order)), field('Gesamtbetrag', workspaceMoney(order.totalCents, order.currency)),
      field('Versand', workspaceMoney(order.shippingCents, order.currency)),
      field('Erstattet', workspaceMoney(order.refundedCents || 0, order.currency)),
      field('Auslieferung', order.fulfillment), field('Mailstatus', order.mail.status),
      field('Versandland', order.shippingCountry), field('Positionen', json(order.items.map(item => ({
        produkt: item.title, menge: item.quantity, variante: item.variant, einzelpreisCent: item.unitPriceCents
      })), detail ? 6000 : 650)),
      ...(detail ? [field('Bezahlzeit', order.paidAt), field('Sendungsverfolgung', order.tracking),
        field('Empfänger', order.email), field('Rechnungsempfänger', order.billing?.name)] : [])
    ], order.status, order.createdAt)
  };
}

async function orders(): Promise<CommerceOrder[]> {
  return (await getRecord<CommerceStore>('commerce', 'state'))?.orders ?? [];
}

export async function readNextWorkspace(query: WorkspaceQuery): Promise<WorkspaceFacts> {
  const definition = areas[query.area as keyof typeof areas];
  if (!definition) throw new WorkspaceError('Dieser Bereich ist nicht verfügbar.', 404);
  let records: WorkspaceRow[];
  switch (query.area) {
    case 'pages': {
      const state = await getState();
      const document = query.stage === 'published' ? state.published : state.draft;
      records = document.pages.map(page => entry(page.id, page.title, [
        field('Stand', query.stage === 'published' ? 'Veröffentlicht' : 'Gespeicherter Entwurf'),
        field('Adresse', '/' + page.slug), field('Revision', state.revision),
        field('SEO-Titel', page.seo.title), field('SEO-Beschreibung', page.seo.description),
        field('Abschnitte', json(page.sections.filter(section => !query.sectionId || section.id === query.sectionId).map(section => ({
          id: section.id, type: section.type, name: section.name, visible: section.visible,
          ...(query.id === page.id ? { texte: agentTextTargets(section.content).slice(0, 18) } : {})
        })), query.id ? 15000 : 1600))
      ]));
      break;
    }
    case 'sections':
      records = availableSectionLibrary(await getDraftConfig()).map(section => entry(section.type, section.name,
        [field('Kategorie', section.category), field('Einsatz', section.description)]));
      break;
    case 'posts': {
      const state = await getState();
      records = (state.draft.posts || []).map(post => entry(post.id, post.title, [
        field('Adresse', post.slug), field('Verfasser', post.author), field('Kurztext', post.excerpt),
        field('Revision', state.revision),
        ...(query.id === post.id ? [field('Inhalt', json(post.sections.map(section => agentTextTargets(section.content)), 14000))] : [])
      ], post.status, post.date));
      break;
    }
    case 'inquiries': {
      const matches = query.id ? [await getRecord<Inquiry>('inquiries', query.id)].filter((record): record is Inquiry => Boolean(record)) : await listInquiries();
      records = matches.map(inquiry => entry(inquiry.id, inquiry.subject || 'Anfrage', [
        field('Von', inquiry.name), field('Mailstatus', inquiry.emailStatus),
        ...(query.id ? [field('E-Mail', inquiry.email), field('Telefon', inquiry.phone),
          field('Nachricht', workspaceText(inquiry.message, 10000)), field('Notiz', workspaceText(inquiry.note, 4000))]
          : [field('Vorschau', workspaceText(inquiry.message, 180))])
      ], inquiry.status, inquiry.createdAt));
      break;
    }
    case 'media': {
      const matches = query.id ? [await getRecord<MediaAsset>('media', query.id)].filter((record): record is MediaAsset => Boolean(record)) : await listMedia();
      records = matches.map(asset => entry(asset.id, asset.name,
        [field('Alternativtext', asset.alt), field('Typ', asset.type), field('Bytes', asset.size)], undefined, asset.createdAt));
      break;
    }
    case 'orders': {
      const all = (await orders()).slice().reverse();
      records = all.map(order => orderView(order, query.id === order.id));
      if (query.search) {
        const search = query.search.trim().toLocaleLowerCase('de-DE');
        const ids = new Set(all.filter(order => [order.id, order.documentNumber, order.billing?.name, order.email,
          ...order.items.map(item => item.title)].some(value => value?.toLocaleLowerCase('de-DE').includes(search))).map(order => order.id));
        return selectWorkspaceFacts(definition, { ...query, search: undefined }, records.filter(order => ids.has(order.id)));
      }
      break;
    }
    case 'products': {
      const commerce = (await getDraftConfig()).modules?.commerce;
      records = (commerce?.products || []).map(product => entry(product.id, product.title, [
        field('Adresse', product.slug), field('Art', product.kind), field('Preis (Cent)', product.priceCents),
        field('Bestand', product.stock), field('Gruppe', commerce?.productGroups?.find(group => group.id === product.groupId)?.name),
        field('Varianten', product.variants?.join(', ')), field('Beschreibung', workspaceText(product.description, query.id ? 3500 : 350)),
        field('Steuerregel-ID', product.taxRuleId), field('Gruppen-ID', product.groupId)
      ], product.active ? 'active' : 'inactive'));
      break;
    }
    case 'shipping': {
      const commerce = (await getDraftConfig()).modules?.commerce;
      records = [
        ...(commerce?.shippingZones || []).map(zone => entry(zone.id, zone.name, [field('Liefergebiet', json(zone))])),
        ...(commerce?.taxRules || []).map(rule => entry(rule.id, rule.name, [field('Steuerregel', json(rule))]))
      ];
      break;
    }
    case 'documents': {
      const settings = await getBusinessSettings();
      const all = (await orders()).filter(order => ['paid', 'refunded'].includes(order.status));
      records = [
        entry('settings', 'Dokumentvorlage', [
          field('Shop-Rechnungen aktiv', settings.invoiceEnabled), field('Revision', settings.revision),
          field('Anbieter', settings.profile.name), field('Steuerprofil', settings.profile.taxMode)
        ]),
        ...all.reverse().map(order => ({ ...orderView(order, query.id === order.id),
          href: '/api/admin/business-documents/order/' + encodeURIComponent(order.id) }))
      ];
      break;
    }
    case 'emails': {
      const settings = await getBusinessSettings();
      records = ['contact', 'order', 'refund', 'partialRefund'].map(key => {
        const templates = settings.templates as Record<string, string | undefined>;
        return entry(key, { contact: 'Kontakt', order: 'Bestellung', refund: 'Erstattung', partialRefund: 'Teilerstattung' }[key] || key, [
          field('Betreff', templates[key + 'Subject']), field('Text', query.id === key ? templates[key + 'Body'] : undefined),
          field('Revision', settings.revision)
        ]);
      });
      break;
    }
    case 'settings': {
      const [settings, config] = await Promise.all([getSettings(), getDraftConfig()]);
      records = [entry('site', config.name, [
        field('Website', settings.siteUrl), field('Mail aktiv', settings.smtp.enabled),
        field('Mail-Zugang hinterlegt', Boolean(settings.smtp.password)), field('Shop aktiv', Boolean(config.modules?.commerce?.enabled)),
        field('Text-KI aktiv', Boolean(config.modules?.aiAssistant?.enabled)),
        field('Aufbewahrung Anfragen (Tage)', settings.retentionDays)
      ])];
      break;
    }
    case 'analytics': {
      const config = await analytics.publicConfig();
      const filters = defaultAnalyticsFilters();
      const report = config.everEnabled ? await analytics.report({ ...filters, from: query.from || filters.from, to: query.to || filters.to }) : null;
      return { area: definition, total: 1, rows: [entry('analytics', 'Webanalyse', [
        field('Messung aktiv', config.enabled), field('Kennzahlen', report ? json(report.current) : 'Keine Messung eingerichtet'),
        field('Zeitraum', report ? report.filters.from + ' bis ' + report.filters.to : undefined)
      ])] };
    }
    case 'agents': {
      const config = await getRecord<{ enabled: boolean; keys: unknown[] }>('mcp-control', 'main');
      records = [entry('mcp', 'Agentenzugang', [
        field('Aktiv', Boolean(config?.enabled)), field('Gespeicherte Schlüssel', config?.keys.length || 0)
      ])];
      break;
    }
    default:
      throw new WorkspaceError('Dieser Bereich ist nicht verfügbar.', 404);
  }
  return selectWorkspaceFacts(definition, query, records, records.length >= 3000);
}
