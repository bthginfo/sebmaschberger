import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const base = new URL(process.argv[2] || 'http://localhost:3000');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Diese Prüfung arbeitet ausschließlich gegen eine lokale Testumgebung.');
const access = JSON.parse(await readFile('.data/admin-access.json', 'utf8'));
let cookie = '';
async function api(action, method = 'GET', body, origin = base.origin) {
  const response = await fetch(new URL('/api/admin/' + action, base), { method, signal: AbortSignal.timeout(60000), headers: { ...(cookie ? { cookie } : {}), origin, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
  const data = await response.json();
  return { response, data };
}
assert.equal((await api('bootstrap')).response.status, 401);
assert.equal((await api('login', 'POST', { password: access.password }, 'https://other.invalid')).response.status, 403);
const login = await api('login', 'POST', { password: access.password });
assert.equal(login.response.status, 200);
const session = login.response.headers.get('set-cookie');
assert(session?.includes('HttpOnly') && session.includes('SameSite=strict'));
cookie = session.split(';')[0];
const bootstrap = await api('bootstrap');
assert.equal(bootstrap.response.status, 200);
assert.equal(bootstrap.data.settings.smtp.enabled, false, 'Für diese Prüfung muss SMTP deaktiviert sein.');
const original = structuredClone(bootstrap.data.state);
const originalSettings = structuredClone(bootstrap.data.settings);
const bilingual = original.published.pages.some(page => page.slug === 'en')
  && !original.published.pages.some(page => page.slug === 'de');
const testHome = bilingual ? '/de' : '/';
const marker = 'Pruefung-' + randomUUID();
const metadataSlug = 'cache-pruefung-' + randomUUID();
const inquiryMessage = 'Lokale technische Testanfrage ohne E-Mail-Versand: ' + marker;
let current = original;
let changed = false;
let settingsChanged = false;
let inquiryId;
async function metadata() {
  return Object.fromEntries(await Promise.all(['/sitemap.xml', '/robots.txt', '/llms.txt'].map(async pathname => {
    const response = await fetch(new URL(pathname, base), { signal: AbortSignal.timeout(60000) });
    assert.equal(response.status, 200, pathname);
    return [pathname, await response.text()];
  })));
}
async function verifyMetadata(predicate, message) {
  for (let attempt = 0; attempt < 15; attempt++) {
    if (predicate(await metadata())) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.fail(message);
}
async function expectWebsiteHome(path) {
  const response = await fetch(new URL('/', base), { redirect: 'manual', signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location'), base).pathname, path);
}
try {
  const initialMetadata = await metadata();
  assert(!initialMetadata['/sitemap.xml'].includes(metadataSlug));
  const draft = structuredClone(original.draft);
  const publishedDefault = original.published.config.defaultWebsiteLanguage === 'de' ? 'de' : 'en';
  const nextDefault = publishedDefault === 'en' ? 'de' : 'en';
  if (bilingual) {
    await expectWebsiteHome('/' + publishedDefault);
    draft.config.defaultWebsiteLanguage = nextDefault;
  }
  draft.pages.find(page => page.slug === '').sections[0].content.heading = marker;
  const metadataPage = structuredClone(draft.pages.find(page => page.slug === ''));
  metadataPage.id = randomUUID(); metadataPage.slug = metadataSlug;
  delete metadataPage.translationKey;
  metadataPage.title = 'Lokale Cachepruefung'; metadataPage.seo.noindex = false;
  draft.pages.push(metadataPage);
  const saved = await api('content', 'PUT', { content: draft, revision: current.revision });
  assert.equal(saved.response.status, 200); changed = true; current = saved.data.state;
  assert.equal((await api('content', 'PUT', { content: draft, revision: original.revision })).response.status, 409);
  if (bilingual) await expectWebsiteHome('/' + publishedDefault);
  assert(!(await (await fetch(new URL(testHome, base), { signal: AbortSignal.timeout(60000) })).text()).includes(marker), 'Ein unveröffentlichter Entwurf darf öffentlich nicht sichtbar sein.');
  assert(!(await metadata())['/sitemap.xml'].includes(metadataSlug), 'Draft-only pages must stay out of metadata.');
  const published = await api('publish', 'POST', { revision: current.revision });
  assert.equal(published.response.status, 200); current = published.data.state;
  if (bilingual) await expectWebsiteHome('/' + nextDefault);
  let visible = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    if ((await (await fetch(new URL(testHome, base), { signal: AbortSignal.timeout(60000) })).text()).includes(marker)) { visible = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(visible, 'Eine Veröffentlichung muss im öffentlichen Ergebnis erscheinen.');
  await verifyMetadata(data => data['/sitemap.xml'].includes(metadataSlug) && data['/llms.txt'].includes(metadataSlug), 'Published additions must invalidate sitemap and llms caches.');
  const removed = structuredClone(current.draft);
  removed.pages = removed.pages.filter(page => page.slug !== metadataSlug);
  const savedRemoval = await api('content', 'PUT', { content: removed, revision: current.revision });
  assert.equal(savedRemoval.response.status, 200); current = savedRemoval.data.state;
  const publishedRemoval = await api('publish', 'POST', { revision: current.revision });
  assert.equal(publishedRemoval.response.status, 200); current = publishedRemoval.data.state;
  await verifyMetadata(data => !data['/sitemap.xml'].includes(metadataSlug) && !data['/llms.txt'].includes(metadataSlug), 'Removed published pages must disappear from primed metadata caches.');
  const temporarySiteUrl = `https://cache-${randomUUID()}.example.invalid`;
  settingsChanged = true;
  const settingsUpdate = await api('settings', 'PUT', { settings: { ...originalSettings, siteUrl: temporarySiteUrl } });
  assert.equal(settingsUpdate.response.status, 200);
  assert.deepEqual(settingsUpdate.data.settings.smtp, originalSettings.smtp, 'Changing the canonical URL must preserve all SMTP settings.');
  await verifyMetadata(data => data['/sitemap.xml'].includes(temporarySiteUrl + '/') && data['/llms.txt'].includes(temporarySiteUrl + '/') && data['/robots.txt'].includes(temporarySiteUrl + '/sitemap.xml'), 'Canonical URL changes must refresh all public metadata routes.');
  const message = await fetch(new URL('/api/contact', base), { method: 'POST', signal: AbortSignal.timeout(60000), headers: { origin: base.origin, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Lokale Testperson', email: 'qa@example.invalid', message: inquiryMessage, consent: true }) });
  assert.equal(message.status, 201);
  const inquiries = await api('inquiries');
  const inquiry = inquiries.data.inquiries.find(entry => entry.email === 'qa@example.invalid' && entry.message === inquiryMessage);
  assert(inquiry); inquiryId = inquiry.id;
  assert.equal(inquiry.emailStatus, 'not-configured');
  const exportResult = await api('export');
  assert.equal(exportResult.data.format, 'ws-content-backup-v1');
  console.log('Login, Herkunftsschutz, Entwurf, Konfliktschutz, Veröffentlichung/Cache, Kontaktpostfach und Export erfolgreich geprüft.');
} finally {
  if (changed) {
    current = (await api('bootstrap')).data.state;
    current = (await api('content', 'PUT', { content: original.published, revision: current.revision })).data.state;
    current = (await api('publish', 'POST', { revision: current.revision })).data.state;
    if (JSON.stringify(original.draft) !== JSON.stringify(original.published)) await api('content', 'PUT', { content: original.draft, revision: current.revision });
  }
  if (settingsChanged) {
    const restoredSettings = await api('settings', 'PUT', { settings: originalSettings });
    assert.equal(restoredSettings.response.status, 200);
    assert.deepEqual(restoredSettings.data.settings.smtp, originalSettings.smtp);
  }
  if (inquiryId) await api('inquiries', 'DELETE', { id: inquiryId });
  await api('logout', 'POST');
}
