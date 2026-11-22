import { cp, lstat, mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as waitForFileLock } from 'node:timers/promises';
import { cleanSourceCommit } from './starter-upgrade.mjs';
import { creatorMediaKitContent } from '../../src/lib/creator/media-kit.mjs';
import { applyLiquidGlass } from '../../src/lib/liquid-glass.mjs';
import { applyStarterLayout } from './starter-layouts.mjs';
import { scaffoldFeatureModules } from './starter-features.mjs';
export { parseFeatures } from './starter-features.mjs';

const entries = ['src', 'public', 'scripts', 'tests', 'docs', 'profiles', 'skills', '.github', '.gitignore', '.gitattributes', '.vercelignore', 'AGENTS.md', 'README.md', 'START-HERE.md', 'DESIGN.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'vercel.json', '.env.example', 'template.manifest.json'];
const excluded = new Set(['node_modules', '.git', '.next', '.vercel', '.data', '.local', '.checks', '.impeccable', 'test-results', 'playwright-report', 'coverage']);
const parseJson = async file => JSON.parse(await readFile(file, 'utf8'));
const saveJson = async (file, value) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value, null, 2) + '\n'); };
const exists = async file => { try { await stat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const destinationExists = async file => { try { await lstat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
/**
 * Finalize the sibling staging directory without masking permanent failures or an occupied destination.
 * @param {string} stage
 * @param {string} output
 * @param {{platform?: NodeJS.Platform, move?: (source: string, target: string) => Promise<void>, occupied?: (file: string) => Promise<boolean>, wait?: (milliseconds: number) => Promise<void>}} [options]
 */
export async function finalizeScaffold(stage, output, { platform = process.platform, move = rename, occupied = destinationExists, wait = waitForFileLock } = {}) {
  const delays = [25, 50, 100, 200, 400, 800];
  for (let attempt = 0; ; attempt++) {
    if (await occupied(output)) throw Object.assign(new Error('Das Ziel existiert bereits. Es werden keine vorhandenen Dateien überschrieben.'), { code: 'EEXIST' });
    try { await move(stage, output); return; }
    catch (error) {
      // Windows scanners may briefly hold the completed tree after all copy handles have closed.
      if (platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code) || attempt === delays.length) throw error;
      await wait(delays[attempt]);
    }
  }
}
export function projectSlug(value) {
  const slug = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '');
  if (!slug || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(slug)) throw new Error('Bitte einen gültigen Projektnamen angeben.');
  return slug;
}
/** @typedef {{file:string, alt:string, position?:string}} BriefImage */
/** @typedef {{ schemaVersion: number, projectName: string, legalName?: string, audience?: string, offer?: string, style?: string, aesthetic?: 'standard'|'liquid-glass', hero?: {heading:string, text?:string, image?:BriefImage}, email?: string, phone?: string, address?: string, city?: string, postalCode?: string, siteUrl?: string, voice?: string, searchAudience?: string, verifiedProof?: string[], pages: string[], functions: string[], contentSources: string[], assets: string[], openQuestions: string[], colors?: Partial<Record<'primary'|'accent'|'background', string>>, modules?: {socialStudio?:{enabled:boolean},aiAssistant?:{enabled:boolean},socialPublishing?:{enabled:boolean},coachStudio?:{enabled:boolean},clubManagement?:{enabled:boolean},scroll3d?:{enabled:boolean},restaurantMenu?:{enabled:boolean},reservations?:{enabled:boolean}} }} SiteBrief */
/** @returns {SiteBrief} */
export function normalizeBrief(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Das Briefing muss ein JSON-Objekt sein.');
  /** @type {SiteBrief} */
  const result = { schemaVersion: 1, projectName: '', pages: [], functions: [], contentSources: [], assets: [], openQuestions: [] };
  for (const key of ['projectName', 'legalName', 'audience', 'offer', 'style', 'email', 'phone', 'address', 'city', 'postalCode', 'siteUrl', 'voice', 'searchAudience']) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'string' || input[key].length > 3000) throw new Error(`Ungültiger Briefingwert: ${key}`);
      result[key] = input[key].trim();
    }
  }
  if (!result.projectName) throw new Error('Ein Projektname ist erforderlich (--name oder projectName im Briefing).');
  if (input.aesthetic !== undefined) {
    if (!['standard','liquid-glass'].includes(input.aesthetic)) throw new Error('aesthetic muss standard oder liquid-glass sein.');
    result.aesthetic = input.aesthetic;
  }
  if (input.hero !== undefined) {
    const { hero } = input;
    if (!hero || typeof hero !== 'object' || Array.isArray(hero) ||
        typeof hero.heading !== 'string' || !hero.heading.trim() || hero.heading.length > 500 ||
        (hero.text !== undefined && (typeof hero.text !== 'string' || hero.text.length > 3000))) {
      throw new Error('hero benötigt eine Überschrift und optional einen kurzen Einleitungstext.');
    }
    result.hero = { heading: hero.heading.trim(), ...(hero.text !== undefined ? { text: hero.text.trim() } : {}) };
    if (hero.image !== undefined) {
      const image = hero.image;
      if (!image || typeof image.file !== 'string' || /[:\\]/.test(image.file) ||
          image.file.startsWith('/') || image.file.split('/').includes('..') || !/\.(webp|jpe?g|png)$/i.test(image.file) ||
          typeof image.alt !== 'string' || !image.alt.trim() || image.alt.length > 500 ||
          (image.position !== undefined && !/^(0|50|100)% (0|50|100)%$/.test(image.position))) {
        throw new Error('hero.image benötigt eine relative WebP-, JPEG- oder PNG-Datei beim Briefing und einen Alternativtext. Der optionale Fokus verwendet 0%, 50% oder 100% pro Achse.');
      }
      result.hero.image = { file: image.file, alt: image.alt.trim(), position: image.position ?? '50% 50%' };
    }
  }
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Die E-Mail-Adresse im Briefing ist ungültig.');
  if (result.siteUrl) {
    const url = new URL(result.siteUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('siteUrl muss eine reine HTTPS-Domain ohne Zugangsdaten sein.');
    result.siteUrl = url.origin;
  }
  for (const key of ['pages', 'functions', 'contentSources', 'assets', 'openQuestions']) {
    if (input[key] !== undefined) {
      if (!Array.isArray(input[key]) || input[key].some(entry => typeof entry !== 'string')) throw new Error(`${key} muss eine Liste von Texten sein.`);
      result[key] = input[key];
    } else result[key] = [];
  }
  if (input.verifiedProof !== undefined) {
    if (!Array.isArray(input.verifiedProof) || input.verifiedProof.length > 60 || input.verifiedProof.some(entry => typeof entry !== 'string' || entry.length > 1000)) throw new Error('verifiedProof muss eine Liste belegbarer Aussagen sein.');
    result.verifiedProof = input.verifiedProof.map(entry => entry.trim()).filter(Boolean);
  }
  if (input.colors !== undefined) {
    result.colors = {};
    for (const key of ['primary', 'accent', 'background']) {
      if (input.colors[key] !== undefined) {
        if (!/^#[\da-f]{6}$/i.test(input.colors[key])) throw new Error(`Ungültige Farbe: ${key}`);
        result.colors[key] = input.colors[key];
      }
    }
  }
  if (input.modules !== undefined) {
    const allowedModules=Object.values(scaffoldFeatureModules);
    if (!input.modules || typeof input.modules !== 'object' || Array.isArray(input.modules) || Object.keys(input.modules).some(key => !allowedModules.includes(key))) throw new Error('Briefing-Module unterstützen ' + allowedModules.join(', ') + '.');
    for(const name of allowedModules){
      const value=input.modules[name];
      if(value===undefined)continue;
      const enabled=typeof value==='boolean'?value:value?.enabled;
      if(typeof enabled!=='boolean'||typeof value==='object'&&(!value||Array.isArray(value)||Object.keys(value).some(key=>key!=='enabled')))throw new Error('modules.'+name+' benoetigt enabled: true oder false.');
      result.modules={...result.modules,[name]:{enabled}};
    }
  }
  if(result.modules?.socialPublishing?.enabled){if(result.modules.socialStudio?.enabled===false)throw new Error('Der Post-Planer benoetigt Social-Studio. socialStudio:false widerspricht socialPublishing:true.');result.modules={...result.modules,socialStudio:{enabled:true}};}
  return result;
}
function renameBrand(value, name) {
  if (typeof value === 'string') return value.replaceAll('Musterstudio', name);
  if (Array.isArray(value)) return value.map(entry => renameBrand(entry, name));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, renameBrand(entry, name)]));
  return value;
}
async function readBriefImage(directory, image) {
  const root = await realpath(directory);
  const file = await realpath(path.resolve(root, image.file));
  const relative = path.relative(root, file);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Das Titelbild muss im Briefing-Ordner liegen.');
  const info = await stat(file);
  if (!info.isFile() || info.size > 16 * 1024 * 1024) throw new Error('Das Titelbild muss eine Bilddatei bis 16 MiB sein.');
  const bytes = await readFile(file);
  const extension = path.extname(file).toLowerCase().slice(1).replace('jpeg', 'jpg');
  const matches = {
    png: bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')),
    jpg: bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')),
    webp: bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
  };
  if (!matches[extension]) throw new Error('Dateityp und Erweiterung des Titelbilds stimmen nicht überein.');
  return { bytes, filename: 'hero.' + extension };
}

export async function createSite({ sourceRoot, outputDir, brief: input, briefDirectory = process.cwd(), profile = 'services' }) {
  const source = path.resolve(sourceRoot);
  const output = path.resolve(outputDir);
  const relation = path.relative(source, output);
  if (!relation || (!relation.startsWith('..' + path.sep) && relation !== '..' && !path.isAbsolute(relation))) throw new Error('Das neue Projekt muss außerhalb des Starter-Verzeichnisses liegen.');
  if (await exists(output)) throw new Error('Das Ziel existiert bereits. Es werden keine vorhandenen Dateien überschrieben.');
  if (await exists(path.join(source,'project/origin.json'))) throw new Error('Neue Websites nur aus dem neutralen Starter erzeugen, nicht aus einem Kundenprojekt.');
  const manifest = await parseJson(path.join(source, 'template.manifest.json'));
  if (!manifest.profiles.includes(profile)) throw new Error(`Unbekanntes Profil: ${profile}`);
  const selected = await parseJson(path.join(source, 'profiles', profile + '.json'));
  const brief = normalizeBrief(input);
  const artwork = brief.hero?.image && await readBriefImage(briefDirectory, brief.hero.image);
  if (brief.aesthetic === 'liquid-glass' && selected.creator) throw new Error('Liquid Glass ist für services, portfolio, consulting und editorial verfügbar. Das Creator-Profil verwendet seine eigene Gestaltung.');
  const slug = projectSlug(brief.projectName);
  const content = renameBrand(await parseJson(path.join(source, 'src/data/content.json')), brief.projectName);
  for (const key of ['legalName', 'email', 'phone', 'address', 'city', 'postalCode']) if (brief[key]) content.config[key] = brief[key];
  applyStarterLayout(content, profile, brief.aesthetic);
  if (brief.aesthetic === 'liquid-glass') content.config = applyLiquidGlass(content.config, brief.colors);
  else if (brief.colors) Object.assign(content.config.theme, brief.colors);
  delete content.config.modules;
  if(selected.creator){
    content.config.modules={creator:{enabled:true,surface:'profile',demoBasePath:'/demo/creator'},commerce:{enabled:false,currency:'EUR',shippingCents:0,products:[]}};
    const home=content.pages.find(page=>page.slug==='');
    home.sections[0].design.creatorHero='gaming';
    const engagement={
      id:'home-creator-engagement',type:'creator-engagement',name:'Creator · Engagement',visible:true,anchor:'inhalte',
      content:await parseJson(path.join(source,'profiles/creator-engagement.json')),
      design:{...home.sections[0].design,theme:'dark',width:'full',spacing:'compact',animation:'none'}
    };
    home.sections.splice(1,0,engagement);
    if(!content.pages.some(page=>page.slug==='media-kit'))content.pages.push({
      id:'creator-media-kit',slug:'media-kit',title:'Media Kit',locale:'de',
      seo:{title:'Media Kit | '+brief.projectName,description:'Kooperationen und gemeinsame Inhalte mit '+brief.projectName+'.',noindex:false},
      sections:[{id:'creator-media-kit-body',type:'creator-media-kit',name:'Media Kit',visible:true,content:creatorMediaKitContent(),design:{...home.sections[0].design,width:'full',theme:'light'}}]
    });
  }
  for (const name of Object.values(scaffoldFeatureModules)) {
    if (brief.modules?.[name]) content.config.modules = { ...content.config.modules, [name]: { enabled: brief.modules[name].enabled } };
  }
  if (content.config.modules?.restaurantMenu) content.config.modules.restaurantMenu.categories = [];
  content.config.blog.enabled = selected.blog;
  content.config.blog.showInNavigation = selected.blog;
  content.config.navigation = structuredClone(selected.navigation);
  if (selected.blog) content.config.navigation.splice(-1, 0, { label: content.config.blog.navLabel, href: '/' + content.config.blog.slug });
  if (brief.modules?.clubManagement?.enabled) {
    content.config.navigation.splice(-1, 0, { label: 'Mitglieder', href: '/members' });
    const en = content.config.locales?.en?.navigation;
    if (en && !en.some(item => item.href === '/members')) en.push({ label: 'Members', href: '/members' });
  }
  content.config.footer.columns[0].links = structuredClone(content.config.navigation);
  const hero = content.pages.find(page => page.slug === '').sections[0];
  hero.content.heading = brief.hero?.heading ?? selected.heroHeading;
  if (brief.hero?.text !== undefined) hero.content.text = brief.hero.text;
  if (artwork) {
    hero.content.image = { src: '/media/project/' + artwork.filename, alt: brief.hero.image.alt, position: brief.hero.image.position };
    delete hero.content.caption;
  }
  hero.content.subheading = selected.creator ? brief.projectName : '';
  const entranceSections = new Set(['statement', 'services', 'team', 'split', 'cta', 'cards', 'gallery', 'quote',
    'steps', 'comparison', 'columns', 'timeline', 'blog-cards', 'blog-editorial', 'creator-links', 'creator-media-kit']);
  for (const page of content.pages) for (const section of page.sections) {
    if (entranceSections.has(section.type)) section.design.animation = 'reveal';
  }
  const stage = path.join(path.dirname(output), '.website-starter-' + randomUUID());
  await mkdir(stage, { recursive: true });
  // Copy only maintained template files. Credentials, histories and resource links never enter a new project.
  for (const entry of entries) {
    const origin = path.join(source, entry);
    if (!await exists(origin)) continue;
    await cp(origin, path.join(stage, entry), { recursive: true, filter: async candidate => {
      const name = path.basename(candidate);
      return !excluded.has(name) && (!name.startsWith('.env') || name === '.env.example') && !name.endsWith('.tsbuildinfo') && !(await lstat(candidate)).isSymbolicLink();
    } });
  }
  for(const entry of ['brief.example.json','infrastructure.example.json'])if(await exists(path.join(source,'project',entry))){await mkdir(path.join(stage,'project'),{recursive:true});await cp(path.join(source,'project',entry),path.join(stage,'project',entry));}
  await saveJson(path.join(stage, 'src/data/content.json'), content);
  if (artwork) {
    const mediaDirectory = path.join(stage, 'public/media/project');
    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(path.join(mediaDirectory, artwork.filename), artwork.bytes, { flag: 'wx' });
  }
  const pkg = await parseJson(path.join(stage, 'package.json'));
  pkg.name = slug; pkg.version = '0.1.0';
  await saveJson(path.join(stage, 'package.json'), pkg);
  const lockFile = path.join(stage, 'package-lock.json');
  if (await exists(lockFile)) {
    const lock = await parseJson(lockFile);
    lock.name = slug; lock.version = '0.1.0';
    lock.packages[''].name = slug; lock.packages[''].version = '0.1.0';
    await saveJson(lockFile, lock);
  }
  await saveJson(path.join(stage, 'project/brief.json'), { ...brief, profile });
  await saveJson(path.join(stage, 'project/origin.json'), { template: manifest.repository, version: manifest.version, sourceCommit: cleanSourceCommit(source), generatedAt: new Date().toISOString(), profile });
  await writeFile(path.join(stage, 'README.md'), `# ${brief.projectName}\n\nEigenständiges Website-Projekt auf Basis von [Website Starter](${manifest.repository}), Version ${manifest.version}.\n\nDas verbindliche Projektbriefing steht in [project/brief.json](project/brief.json). Einstieg und Architektur: [START-HERE.md](START-HERE.md).\n\n\x60npm ci\x60 installiert die Abhängigkeiten. \x60npm run setup\x60 richtet einen eigenen Erstzugang ein, \x60npm run dev\x60 startet die lokale Vorschau.\n\nVor dem öffentlichen Start: [Startprüfung](docs/launch.md).\n`);
  await finalizeScaffold(stage, output);
  return { directory: output, slug, profile, templateVersion: manifest.version };
}
