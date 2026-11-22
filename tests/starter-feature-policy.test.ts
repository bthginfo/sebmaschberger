import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import manifest from '../template.manifest.json';
import { createSite, normalizeBrief } from '../scripts/lib/scaffold.mjs';
import { parseFeatures, scaffoldFeatureModules } from '../scripts/lib/starter-features.mjs';
import { websiteSchema } from '../src/lib/validation';
import { projectPublicSiteConfig } from '../src/lib/public-projection';
import { initialAnalyticsSettings } from '../src/lib/server/analytics/settings';
import { seedFirstPartyAnalytics } from '../src/data/seed';
import { availableSectionLibrary, createSection } from '../src/lib/section-library';
import { publishIssues } from '../src/lib/publish-check';
import { scroll3dStops } from '../src/lib/scroll-3d';

const projectAlreadyGenerated = existsSync(path.join(process.cwd(), 'project/origin.json'));

test('every scaffold feature has a maintained activation guide and an accepted CLI flag', async () => {
  const modules = Object.values(manifest.activation.modules);
  assert.deepEqual(
    modules.flatMap(entry => 'flag' in entry ? [entry.flag] : []).sort(),
    Object.keys(scaffoldFeatureModules).sort(),
  );
  for (const entry of modules) {
    await access(path.join(process.cwd(), entry.guide));
    if ('flag' in entry) assert.deepEqual(parseFeatures(entry.flag), [entry.flag]);
  }
  assert.equal(manifest.activation.modules['coach-studio'].policy, 'explicit');
  assert.equal(manifest.activation.modules['club-management'].policy, 'brief');
  assert.equal(manifest.activation.modules['scroll-3d'].policy, 'explicit');
  assert.equal(manifest.activation.modules.invoicing.policy, 'explicit-recipe');
  assert.equal(manifest.activation.modules.commerce.policy, 'explicit');
});

test('club generation adds only its own module and links; published links disappear when the module is disabled', { skip: projectAlreadyGenerated }, async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'starter-club-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'club');
  await createSite({
    sourceRoot: process.cwd(), outputDir: output, profile: 'services',
    brief: { projectName: 'Example Rowing Club', modules: { clubManagement: true } },
  });
  const content = websiteSchema.parse(JSON.parse(await readFile(path.join(output, 'src/data/content.json'), 'utf8')));
  assert.deepEqual(content.config.modules, { clubManagement: { enabled: true } });
  assert(!availableSectionLibrary(content.config).some(entry => entry.type === 'scroll-3d'));
  assert(content.config.navigation.some(item => item.href === '/members'));
  assert(content.config.consent.enabled && seedFirstPartyAnalytics && initialAnalyticsSettings(true).enabled);
  const timeline = createSection('timeline');
  timeline.content = { heading: 'Club fixtures', clubFixtures: { mode: 'results', limit: 4 } };
  content.pages[0].sections.push(timeline);
  assert.deepEqual(publishIssues(content), []);
  const disabled = projectPublicSiteConfig({ ...content.config, modules: { clubManagement: { enabled: false } } });
  assert(!disabled.navigation.some(item => item.href === '/members'));
  assert(publishIssues({ ...content, config: disabled }).some(issue => issue.includes('mindestens einen Eintrag')));
  const both = normalizeBrief({ projectName: 'Example Club', modules: { clubManagement: true, coachStudio: true } });
  assert.deepEqual(both.modules, { clubManagement: { enabled: true }, coachStudio: { enabled: true } });
});

test('opt-in 3D stories keep their chapter design through CMS validation', { skip: projectAlreadyGenerated }, async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'starter-scroll-3d-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'portfolio');
  await createSite({
    sourceRoot: process.cwd(), outputDir: output, profile: 'portfolio',
    brief: { projectName: 'Design Studio', modules: { scroll3d: true } },
  });
  const content = websiteSchema.parse(JSON.parse(await readFile(path.join(output, 'src/data/content.json'), 'utf8')));
  assert.deepEqual(content.config.modules, { scroll3d: { enabled: true } });
  assert(availableSectionLibrary(content.config).some(entry => entry.type === 'scroll-3d'));
  assert(!content.pages.some(page => page.sections.some(section => section.type === 'scroll-3d')));

  const scene = createSection('scroll-3d');
  scene.design.scroll3dLength = 1.4;
  scene.content.items![1].scroll3d!.start = 80;
  assert.deepEqual(scroll3dStops(scene.content.items!), [0, .4, .8]);
  content.pages[0].sections.push(scene);
  const saved = websiteSchema.parse(content).pages[0].sections.at(-1)!;
  assert.deepEqual(saved, scene);
  assert.deepEqual(publishIssues(content), []);

  scene.content.items![0].scroll3d!.start = 90;
  assert(publishIssues(content).some(issue => issue.includes('aufsteigend')));
  content.config.modules!.scroll3d!.enabled = false;
  assert.deepEqual(publishIssues(content), []);
});
