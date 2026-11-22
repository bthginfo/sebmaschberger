import test from 'node:test';
import assert from 'node:assert/strict';
import starterContent from './fixtures/starter-content.json';
import { defaultBlog } from '../src/lib/site-config';
import { createSection } from '../src/lib/section-library';
import { resolvePage, publicPages } from '../src/lib/blog';
import { productSlug, categorySlug, shopSearchPath } from '../src/lib/commerce/route-pages';
import { defaultRouteTemplate, templateEditorPages } from '../src/lib/route-templates';
import { TEMPLATE_CONTENT_ID } from '../src/lib/route-template-keys';
import { routeTemplatePreview } from '../src/lib/route-template-preview';
import { websiteSchema } from '../src/lib/validation';
import { projectPublicContent } from '../src/lib/public-projection';
import { blogRouteIssues, publishIssues } from '../src/lib/publish-check';
import type { BlogPost, CommerceProduct, WebsiteContent } from '../src/lib/types';

const group = { id: 'sommer / studio', name: 'Studio-Zubehör' };
const notebook: CommerceProduct = {
  id: 'notebook', slug: 'notizbuch', title: 'Notizbuch aus Büttenpapier', kind: 'physical', active: true,
  groupId: group.id, priceCents: 1290, description: 'Ein Heft für unterwegs.', variants: ['Sand', 'Blau']
};
const mug: CommerceProduct = {
  ...notebook, id: 'mug', slug: 'becher', title: 'Becher', priceCents: 1800
};

function fixture(): WebsiteContent {
  const site = structuredClone(starterContent) as WebsiteContent;
  site.config.blog = { ...defaultBlog, enabled: true, slug: 'journal' };
  site.config.modules = {
    ...site.config.modules,
    commerce: { enabled: true, currency: 'EUR', shippingCents: 490, productGroups: [group], products: [
      notebook, mug, { ...notebook, id: 'draft-product', slug: 'unsichtbar', title: 'Verstecktes Heft', active: false }
    ] }
  };
  site.posts = [post('alt', '2026-01-01'), post('neu', '2026-06-01'), post('privat', '2026-07-01', 'draft')];
  return site;
}

function post(slug: string, date: string, status: BlogPost['status'] = 'published'): BlogPost {
  const body = createSection('richtext');
  body.content = { heading: 'Inhalt ' + slug, text: 'Ein eigener Text zu ' + slug + '.' };
  return { id: slug, title: 'Beitrag ' + slug, slug, date, updatedAt: date, status, author: 'Team',
    excerpt: 'Kurzfassung ' + slug, seo: { title: '', description: '' }, sections: [body] };
}

test('home feed follows publication, configured limit and current archive URL', () => {
  const site = fixture();
  const feed = createSection('blog-cards');
  feed.content.blogFeed = { limit: 1, archiveLink: true };
  site.pages.find(page => page.slug === '')!.sections.push(feed);
  const page = resolvePage(site, '')!;
  const section = page.sections.find(section => section.id === feed.id)!;
  assert.deepEqual(section.content.items?.map(item => item.id), ['neu']);
  assert.equal(section.content.primaryHref, '/journal');
  assert.equal(section.content.primaryLabel, 'Alle Beiträge');
  assert.equal(resolvePage(site, 'journal')?.sections[0].content.items?.length, 2);
  assert.equal(resolvePage(site, 'journal/privat'), undefined);
});

test('shared blog layouts bind each article and preserve existing per-post data', () => {
  const site = fixture();
  const layout = defaultRouteTemplate('blog-post', site);
  const callout = createSection('announcement');
  callout.content = { heading: 'Sommerpause', subheading: '12.–26. August', text: 'Ab dem 27. sind wir wieder erreichbar.' };
  layout.sections.push(callout);
  layout.seo.title = '{{titel}} im Journal';
  const index = defaultRouteTemplate('blog-index', site);
  index.sections[0].type = 'blog-list';
  site.templates = { 'blog-index': index, 'blog-post': layout };
  const persisted = websiteSchema.parse(site);
  for (const slug of ['alt', 'neu']) {
    const page = resolvePage(persisted, 'journal/' + slug)!;
    assert.equal(page.seo.title, 'Beitrag ' + slug + ' im Journal');
    assert.equal(page.sections[0].content.heading, 'Beitrag ' + slug);
    assert.equal(page.sections[1].content.heading, 'Inhalt ' + slug);
    assert.equal(page.sections[2].content.heading, 'Sommerpause');
    assert.deepEqual(resolvePage(projectPublicContent(persisted, page.slug), page.slug), page);
  }
  assert.equal(resolvePage(persisted, 'journal')?.sections[0].type, 'blog-list');
  assert.deepEqual(Object.keys(projectPublicContent(persisted, 'journal').templates!), ['blog-index']);
  assert.equal(projectPublicContent(persisted).templates?.['blog-post']?.sections.length, 0);
});

test('shop layout routes expose active products, groups and accent-insensitive search', () => {
  const site = fixture();
  const layout = defaultRouteTemplate('shop-product', site);
  const cta = createSection('cta');
  layout.sections.push(cta);
  site.templates = { 'shop-product': layout };
  for (const product of [notebook, mug]) {
    const slug = productSlug(product);
    const page = resolvePage(site, slug)!;
    assert.equal(page.title, product.title);
    assert.deepEqual(page.sections[0].content.items?.map(item => item.productId), [product.id]);
    assert.equal(page.sections[1].type, 'cta');
    assert.deepEqual(resolvePage(projectPublicContent(site, slug), slug), page);
  }
  const category = resolvePage(site, categorySlug(group))!;
  assert.deepEqual(category.sections[0].content.items?.map(item => item.productId), ['notebook', 'mug']);
  const slug = shopSearchPath.slice(1);
  const search = resolvePage(site, slug, 'BUTTEN sand')!;
  assert.equal(search.seo.noindex, true);
  assert.deepEqual(search.sections[0].content.items?.map(item => item.productId), ['notebook']);
  assert.equal(resolvePage(site, slug, 'Verstecktes')?.sections[0].content.items?.length, 0);
  assert.equal(resolvePage(site, 'shop/produkt/unsichtbar'), undefined);
  assert.deepEqual(projectPublicContent(site, slug).config.modules?.commerce?.products.map(product => product.id), ['notebook', 'mug']);
  assert(!publicPages(site).some(page => page.slug === slug));
  assert(publicPages(site).some(page => page.slug === categorySlug(group)));
});

test('template draft protects required slots and keeps example data transient', () => {
  const site = fixture();
  const templates = templateEditorPages(site);
  const product = templates.find(page => page.id === 'shop-product')!;
  const preview = routeTemplatePreview(site, product, 'mug');
  assert.equal(preview.page.title, mug.title);
  assert(preview.readOnlySectionIds.includes(TEMPLATE_CONTENT_ID));
  assert.equal(site.templates, undefined);
  const layout = defaultRouteTemplate('blog-post', site);
  layout.sections = layout.sections.filter(section => section.id !== TEMPLATE_CONTENT_ID);
  site.templates = { 'blog-post': layout };
  assert.equal(websiteSchema.safeParse(site).success, false);
});

test('selective publication rejects an address collision and validates optional announcement links', () => {
  const site = fixture();
  site.pages.push({ ...site.pages[0], id: 'custom', slug: 'journal/neu' });
  assert.deepEqual(blogRouteIssues(site), ['Die Adresse /journal/neu ist bereits vergeben.']);
  const callout = createSection('announcement');
  callout.content = { heading: 'Sommerpause', primaryLabel: 'Kontakt', text: 'Am 27. sind wir wieder erreichbar.' };
  site.pages[0].sections.push(callout);
  assert(publishIssues(site).some(issue => issue.includes('Linkziel der Schaltfläche')));
});
