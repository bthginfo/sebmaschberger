import 'server-only';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { getRecord, getState, mutateRecord, publish, restoreRevision, saveDraft } from '@/lib/db';
import { attemptOrderMail, fulfillOrder } from '@/lib/commerce/service';
import type { CommerceStore } from '@/lib/commerce/model';
import { getBusinessSettings, saveBusinessSettings } from '@/lib/business/service';
import { availableSectionLibrary, createSection } from '@/lib/section-library';
import { publishIssues } from '@/lib/publish-check';
import { revalidatePublishedSite } from '@/lib/publishing-cache';
import { websiteSchema } from '@/lib/validation';
import type { CommerceProduct, Inquiry, MediaAsset, PageContent, SiteConfig, WebsiteContent } from '@/lib/types';
import { assistantPagePlanSchema } from '@/lib/assistant/model';
import { applyAssistantPagePlan } from '@/lib/assistant/pages';
import { agentTextPatchSchema, plainAgentText } from '@/lib/agents/model';
import { patchAgentText } from '@/lib/agents/text';
import {
  inquiryUpdate, pageSectionInsert, shopFulfill, shopProductFields, shopProductUpdate, workspaceRecordId, workspaceTarget
} from '@/lib/assistant/workspace-actions';
import type { WorkspaceField } from '@/lib/assistant/workspace';
import { workspaceField as field, workspaceMoney, WorkspaceError, type PreparedAction, type WorkspaceAction } from './workspace-core';

const pageFields = z.object({
  pageId: workspaceRecordId, title: plainAgentText(180).optional(),
  seoTitle: plainAgentText(180).optional(), seoDescription: plainAgentText(500).optional(), noindex: z.boolean().optional()
}).strict();
const textPatch = agentTextPatchSchema.omit({ operationId: true, baseRevision: true });
const order = async (id: string) => {
  const current = (await getRecord<CommerceStore>('commerce', 'state'))?.orders.find(item => item.id === id);
  if (!current) throw new WorkspaceError('Diese Bestellung wurde nicht gefunden.', 404);
  return current;
};

function definition<S extends z.ZodType>(id: string, area: string, label: string, effect: string, schema: S,
  prepare: (input: z.output<S>) => Promise<PreparedAction>, execute: WorkspaceAction['execute']): WorkspaceAction {
  return { info: { id, area, label, effect }, schema, prepare: input => prepare(schema.parse(input)), execute };
}

async function assertDraft(revision: number) {
  const state = await getState();
  if (state.revision !== revision) throw new WorkspaceError('Der gespeicherte Entwurf wurde inzwischen geändert. Bitte die Aktion neu vorbereiten.', 409);
  return state;
}

async function saveContent(content: WebsiteContent, revision: number, message: string, href = '/admin?view=editor') {
  await saveDraft(websiteSchema.parse(content), revision);
  return { message, href };
}

function changePage<S extends z.ZodType<{ pageId: string }>>(id: string, label: string, schema: S,
  change: (page: PageContent, input: z.output<S>, config: SiteConfig) => { page: PageContent; fields: WorkspaceField[] }): WorkspaceAction {
  return definition(id, 'pages', label, 'Speichert die Änderung im Websiteentwurf.', schema, async input => {
    const state = await getState();
    const page = state.draft.pages.find(item => item.id === input.pageId);
    if (!page) throw new WorkspaceError('Die Seite wurde nicht gefunden.', 404);
    const proposed = change(page, input, state.draft.config);
    return { payload: { input, revision: state.revision }, fields: [field('Seite', page.title), ...proposed.fields] };
  }, async payload => {
    const saved = payload as { input: z.output<S>; revision: number };
    const state = await assertDraft(saved.revision);
    const current = state.draft.pages.find(item => item.id === saved.input.pageId);
    if (!current) throw new WorkspaceError('Die Seite wurde nicht gefunden.', 404);
    const next = change(current, saved.input, state.draft.config).page;
    return saveContent({ ...state.draft, pages: state.draft.pages.map(page => page.id === next.id ? next : page) }, saved.revision, 'Websiteentwurf gespeichert.');
  });
}

type ProductInput = z.output<typeof shopProductFields> | z.output<typeof shopProductUpdate>;

function productChange(label: string, schema: z.ZodType<ProductInput>, update: boolean): WorkspaceAction {
  return definition(update ? 'product.update' : 'product.create', 'products', label,
    'Speichert das Sortiment im Websiteentwurf. Die Änderungen werden bei der nächsten Website-Veröffentlichung sichtbar.', schema, async input => {
      const state = await getState();
      const commerce = state.draft.config.modules?.commerce;
      if (!commerce) throw new WorkspaceError('Der Shop wurde noch nicht eingerichtet.', 409);
      const existing = 'id' in input ? commerce.products.find(product => product.id === input.id) : undefined;
      if (update && !existing) throw new WorkspaceError('Das Produkt wurde nicht gefunden.', 404);
      const next: CommerceProduct = {
        ...(existing || { id: randomUUID() }), ...shopProductFields.parse({
          ...(existing && {
            title: existing.title, slug: existing.slug, description: existing.description, kind: existing.kind,
            priceCents: existing.priceCents, stock: existing.stock, groupId: existing.groupId,
            taxRuleId: existing.taxRuleId, active: existing.active, variants: existing.variants
          }),
          ...Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'id'))
        }),
        stock: 'stock' in input ? input.stock ?? undefined : existing?.stock,
        groupId: 'groupId' in input ? input.groupId ?? undefined : existing?.groupId,
        taxRuleId: 'taxRuleId' in input ? input.taxRuleId ?? undefined : existing?.taxRuleId
      };
      if (commerce.products.some(product => product.id !== next.id && product.slug === next.slug)) throw new WorkspaceError('Diese Produktadresse ist bereits vergeben.', 409);
      const group = commerce.productGroups?.find(item => item.id === next.groupId);
      const tax = commerce.taxRules?.find(item => item.id === next.taxRuleId);
      if (next.groupId && !group || next.taxRuleId && !tax) throw new WorkspaceError('Die Produktgruppe oder Steuerregel ist nicht verfügbar.', 409);
      return {
        payload: { product: next, revision: state.revision },
        fields: [field('Produkt', next.title), field('Adresse', next.slug), field('Art', next.kind),
          field('Preis', workspaceMoney(next.priceCents)), field('Bestand', next.stock ?? 'Unbegrenzt'),
          field('Gruppe', group ? next.groupId : 'Ohne Gruppe'), field('Steuerregel', tax ? next.taxRuleId : 'Standard'),
          field('Aktiv', next.active), field('Varianten', next.variants?.join(', ')), field('Beschreibung', next.description)]
      };
    }, async payload => {
      const saved = payload as { product: CommerceProduct; revision: number };
      const state = await assertDraft(saved.revision);
      const modules = state.draft.config.modules;
      const commerce = modules?.commerce;
      if (!commerce) throw new WorkspaceError('Der Shop ist nicht verfügbar.', 409);
      const products = update ? commerce.products.map(product => product.id === saved.product.id ? saved.product : product)
        : [...commerce.products, saved.product];
      return saveContent({
        ...state.draft, config: { ...state.draft.config, modules: { ...modules, commerce: { ...commerce, products } } }
      }, saved.revision, 'Sortiment im Websiteentwurf gespeichert.', '/admin?view=commerce');
    });
}

export function nextWorkspaceActions(config: SiteConfig): WorkspaceAction[] {
  const actions = [
    definition('inquiry.update', 'inquiries', 'Anfrage bearbeiten', 'Speichert den angegebenen Status und die interne Notiz.', inquiryUpdate, async input => {
      if (input.status === undefined && input.note === undefined) throw new WorkspaceError('Bitte einen Status oder eine Notiz angeben.');
      const inquiry = await getRecord<Inquiry>('inquiries', input.id);
      if (!inquiry) throw new WorkspaceError('Die Anfrage wurde nicht gefunden.', 404);
      return {
        payload: { input, expected: inquiry },
        fields: [field('Anfrage', inquiry.subject), field('Von', inquiry.name), field('Bisheriger Status', inquiry.status),
          field('Neuer Status', input.status ?? inquiry.status), field('Notiz', input.note ?? inquiry.note)]
      };
    }, async payload => {
      const saved = payload as { input: z.output<typeof inquiryUpdate>; expected: Inquiry };
      await mutateRecord<Inquiry | null>('inquiries', saved.input.id, null, current => {
        if (!current || !isDeepStrictEqual(current, saved.expected)) throw new WorkspaceError('Die Anfrage wurde inzwischen geändert.', 409);
        return { ...current, ...saved.input };
      });
      return { message: 'Anfrage gespeichert.', href: '/admin?view=inquiries' };
    }),
    definition('page.create', 'pages', 'Neue Seite als Entwurf anlegen', 'Erstellt die Seite aus den angegebenen Abschnitten.', assistantPagePlanSchema, async input => {
      const state = await getState();
      applyAssistantPagePlan(state.draft, input, 'approved', 'approved');
      return {
        payload: { input, revision: state.revision }, fields: [field('Seite', input.title), field('Adresse', '/' + input.slug),
          field('SEO-Beschreibung', input.description), ...input.sections.map(section => field(section.type,
            [section.heading, section.text, ...(section.items || []).map(item => item.title + ' · ' + item.text)].join('\n')))]
      };
    }, async payload => {
      const saved = payload as { input: z.output<typeof assistantPagePlanSchema>; revision: number };
      const state = await assertDraft(saved.revision);
      const { content } = applyAssistantPagePlan(state.draft, saved.input, 'approved', 'approved');
      return saveContent(content, saved.revision, 'Seite im Websiteentwurf angelegt.');
    }),
    changePage('page.text', 'Abschnittstext ändern', textPatch, (page, input) => {
      const section = page.sections.find(section => section.id === input.sectionId);
      if (!section) throw new WorkspaceError('Dieser Abschnitt wurde nicht gefunden.', 404);
      const content = patchAgentText(section.content, input);
      return { page: { ...page, sections: page.sections.map(item => item.id === section.id ? { ...section, content } : item) },
        fields: [field('Abschnitt', section.name), field('Bisher', input.previousText), field('Neu', input.text)] };
    }),
    changePage('page.settings', 'Seitenangaben ändern', pageFields, (page, input) => ({
      page: { ...page, title: input.title ?? page.title, seo: { ...page.seo, title: input.seoTitle ?? page.seo.title,
        description: input.seoDescription ?? page.seo.description, noindex: input.noindex ?? page.seo.noindex } },
      fields: Object.entries({ Titel: input.title, 'SEO-Titel': input.seoTitle, 'SEO-Beschreibung': input.seoDescription,
        'Suchmaschinen ausschließen': input.noindex }).flatMap(([label, value]) => value === undefined ? [] : [field(label, value)])
    })),
    changePage('page.add-section', 'Abschnitt einfügen', pageSectionInsert, (page, input, config) => {
      const definition = availableSectionLibrary(config).find(item => item.type === input.type);
      if (!definition) throw new WorkspaceError('Dieser Abschnitt ist für die Website nicht verfügbar.', 409);
      const after = input.afterId ? page.sections.findIndex(section => section.id === input.afterId) : page.sections.length - 1;
      if (input.afterId && after < 0) throw new WorkspaceError('Die Einfügeposition ist nicht mehr vorhanden.', 409);
      const added = createSection(definition.type);
      if (input.heading !== undefined) added.content.heading = input.heading;
      if (input.text !== undefined) added.content.text = input.text;
      const sections = page.sections.slice();
      sections.splice(after + 1, 0, added);
      return { page: { ...page, sections }, fields: [field('Abschnitt', definition.name), field('Position', after + 2),
        field('Überschrift', added.content.heading), field('Text', added.content.text)] };
    }),
    changePage('page.remove-section', 'Abschnitt entfernen', z.object({ pageId: workspaceRecordId, sectionId: workspaceRecordId }).strict(), (page, input) => {
      const section = page.sections.find(item => item.id === input.sectionId);
      if (!section) throw new WorkspaceError('Dieser Abschnitt wurde nicht gefunden.', 404);
      return { page: { ...page, sections: page.sections.filter(item => item.id !== section.id) }, fields: [field('Abschnitt', section.name)] };
    }),
    definition('cms.publish', 'pages', 'Gesamte Website veröffentlichen', 'Veröffentlicht den gesamten gespeicherten Websiteentwurf.', z.object({}).strict(), async () => {
      const state = await getState();
      const before = new Map(state.published.pages.map(page => [page.id, JSON.stringify(page)]));
      return { payload: state.revision, fields: [field('Revision', state.revision),
        field('Seiten geändert', state.draft.pages.filter(page => before.get(page.id) !== JSON.stringify(page)).map(page => page.title).join(', ') || 'Keine'),
        field('Seiten entfernt', state.published.pages.filter(page => !state.draft.pages.some(draft => draft.id === page.id)).map(page => page.title).join(', ') || 'Keine'),
        field('Website-Einstellungen geändert', JSON.stringify(state.published.config) !== JSON.stringify(state.draft.config))] };
    }, async payload => {
      const revision = Number(payload);
      const state = await assertDraft(revision);
      const issues = publishIssues(state.draft);
      if (issues.length) throw new WorkspaceError(issues.slice(0, 3).join('\n'));
      await publish(revision);
      revalidatePublishedSite();
      return { message: 'Website veröffentlicht.', href: '/admin?view=editor' };
    }),
    definition('cms.restore', 'pages', 'Websiteversion wiederherstellen', 'Übernimmt diese gespeicherte Version als neuen Entwurf.', workspaceTarget, async input => {
      const state = await getState();
      const revision = state.revisions.find(item => item.id === input.id);
      if (!revision) throw new WorkspaceError('Die Websiteversion wurde nicht gefunden.', 404);
      return { payload: { id: input.id, revision: state.revision }, fields: [field('Version', revision.label), field('Datum', revision.createdAt)] };
    }, async payload => {
      const saved = payload as { id: string; revision: number };
      await restoreRevision(saved.id, saved.revision);
      return { message: 'Websiteversion im Entwurf wiederhergestellt.', href: '/admin?view=editor' };
    }),
    definition('media.alt', 'media', 'Bildbeschreibung ändern', 'Speichert den Alternativtext in der Mediathek.',
      z.object({ id: workspaceRecordId, alt: plainAgentText(500) }).strict(), async input => {
        const asset = await getRecord<MediaAsset>('media', input.id);
        if (!asset) throw new WorkspaceError('Das Bild wurde nicht gefunden.', 404);
        return { payload: { input, previous: asset.alt }, fields: [field('Bild', asset.name), field('Bisher', asset.alt), field('Neu', input.alt)] };
      }, async payload => {
        const saved = payload as { input: { id: string; alt: string }; previous: string };
        await mutateRecord<MediaAsset | null>('media', saved.input.id, null, asset => {
          if (!asset || asset.alt !== saved.previous) throw new WorkspaceError('Das Bild wurde inzwischen geändert.', 409);
          return { ...asset, alt: saved.input.alt };
        });
        return { message: 'Alternativtext gespeichert.', href: '/admin?view=media' };
      }),
    definition('email.template', 'emails', 'E-Mail-Vorlage speichern', 'Ändert die Vorlage für künftige Nachrichten.',
      z.object({ template: z.enum(['contact', 'order', 'refund', 'partialRefund']), subject: plainAgentText(200), body: plainAgentText(10000) }).strict(), async input => {
        const settings = await getBusinessSettings();
        return { payload: { input, revision: settings.revision }, fields: [
          field('Vorlage', input.template), field('Betreff', input.subject), field('Text', input.body)
        ] };
      }, async payload => {
        const saved = payload as { input: { template: string; subject: string; body: string }; revision: number };
        const { revision, ...settings } = await getBusinessSettings();
        if (revision !== saved.revision) throw new WorkspaceError('Die Vorlagen wurden inzwischen geändert.', 409);
        await saveBusinessSettings({ ...settings, templates: { ...settings.templates,
          [saved.input.template + 'Subject']: saved.input.subject, [saved.input.template + 'Body']: saved.input.body } }, revision);
        return { message: 'E-Mail-Vorlage gespeichert.', href: '/admin?view=documents' };
      })
  ];

  if (config.modules?.commerce) {
    actions.push(
      productChange('Shop-Produkt anlegen', shopProductFields, false),
      productChange('Shop-Produkt aktualisieren', shopProductUpdate, true),
      definition('order.fulfill', 'orders', 'Bestellung als ausgeliefert markieren', 'Speichert die Auslieferung und die angegebene Sendungsverfolgung.',
        shopFulfill, async input => {
          const current = await order(input.id);
          if (current.status !== 'paid' || current.fulfillment !== 'pending') throw new WorkspaceError('Diese Bestellung ist nicht zur Auslieferung offen.', 409);
          return { payload: input, fields: [field('Bestellung', current.documentNumber || current.id),
            field('Empfänger', current.billing?.name || current.email), field('Sendungsverfolgung', input.tracking),
            field('Betrag', workspaceMoney(current.totalCents, current.currency))] };
        }, async payload => {
          const input = shopFulfill.parse(payload);
          await fulfillOrder(input.id, input.tracking);
          return { message: 'Bestellung als ausgeliefert gespeichert.', href: '/admin?view=commerce' };
        }),
      definition('order.retry-mail', 'orders', 'Bestellmail erneut versuchen', 'Startet den Versand der hinterlegten Bestellmail erneut.',
        workspaceTarget, async input => {
          const current = await order(input.id);
          if (!current.email || !['paid', 'refunded'].includes(current.status) || !['failed', 'not-configured'].includes(current.mail.status)) {
            throw new WorkspaceError('Diese Bestellmail kann aktuell nicht erneut gesendet werden.', 409);
          }
          return { payload: input, fields: [field('Bestellung', current.documentNumber || current.id), field('Empfänger', current.email),
            field('Mailstatus', current.mail.status), field('Art', current.mail.kind)] };
        }, async payload => {
          const input = workspaceTarget.parse(payload);
          await attemptOrderMail(input.id);
          const current = await order(input.id);
          return { message: current.mail.status === 'sent' ? 'Bestellmail versendet.' : 'Bestellmail geprüft. Aktueller Status: ' + current.mail.status + '.', href: '/admin?view=commerce' };
        })
    );
  }
  return actions;
}
