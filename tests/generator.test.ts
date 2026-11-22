import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import { createSite, normalizeBrief, parseFeatures, projectSlug } from '../scripts/lib/scaffold.mjs';
import { websiteSchema } from '../src/lib/validation';
import { publishIssues } from '../src/lib/publish-check';

const root = fileURLToPath(new URL('../', import.meta.url));
async function temporary<T>(run: (directory: string) => Promise<T>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'website-starter-test-'));
  try { return await run(directory); }
  finally {
    const absolute = path.resolve(directory);
    assert(absolute.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(absolute).startsWith('website-starter-test-'));
    await rm(absolute, { recursive: true, force: true });
  }
}
const exists = async (file: string) => { try { await stat(file); return true; } catch { return false; } };
/** Test only the maintained neutral fixture, even when the suite runs inside a generated customer app. */
async function neutralSource(directory:string){await mkdir(directory,{recursive:true});for(const entry of ['template.manifest.json','profiles','src','scripts','package.json','package-lock.json','.env.example'])await cp(path.join(root,entry),path.join(directory,entry),{recursive:true,filter:candidate=>!path.basename(candidate).startsWith('.env')||path.basename(candidate)==='.env.example'});await cp(path.join(root,'tests/fixtures/starter-content.json'),path.join(directory,'src/data/content.json'));await cp(path.join(root,'tests/fixtures/starter-media.json'),path.join(directory,'src/data/media.json'));await cp(path.join(root,'tests/fixtures/creator-demo.json'),path.join(directory,'src/data/creator-demo.json'));return directory;}


test('every profile generates a valid independent CMS project with the requested identity', async () => {
  await temporary(async directory => {
    const source=await neutralSource(path.join(directory,'neutral-template'));
    for (const profile of ['services', 'portfolio', 'consulting', 'editorial','creator']) {
      const output = path.join(directory, profile);
      const result = await createSite({ sourceRoot: source, outputDir: output, profile, brief: { projectName: 'Neue Hände GmbH', legalName: 'Neue Hände GmbH', email: 'kontakt@example.org', style: 'Warm und ruhig', hero: { heading: 'Wir bauen im Bestand.', text: 'Wir klären früh, was sich erhalten lässt.' }, colors: { primary: '#243a31' }, functions: ['CMS', 'Podcast'] } });
      assert.equal(result.slug, 'neue-hande-gmbh');
      const content = websiteSchema.parse(JSON.parse(await readFile(path.join(output, 'src/data/content.json'), 'utf8')));
      assert.equal(content.config.name, 'Neue Hände GmbH');
      assert.equal(content.config.email, 'kontakt@example.org');
      assert.equal(content.config.theme.primary, '#243a31');
      assert.equal(content.config.theme.presentation, profile === 'creator' ? undefined : profile);
      assert.equal(content.config.theme.aesthetic, undefined);
      assert.equal(content.config.blog?.enabled, profile === 'editorial');
      assert.equal(content.config.modules?.creator?.enabled===true,profile==='creator');
      assert.notEqual(content.config.modules?.commerce?.enabled,true);
      assert.notEqual(content.config.modules?.socialStudio?.enabled,true);
      assert.notEqual(content.config.modules?.aiAssistant?.enabled,true);
      assert.notEqual(content.config.modules?.socialPublishing?.enabled,true);
      assert.notEqual(content.config.modules?.coachStudio?.enabled,true);
      const home=content.pages.find(page=>page.slug==='')!;
      assert.equal(home.sections.some(section=>section.type==='creator-engagement'),profile==='creator');
      const cover = home.sections[0];
      assert.equal(cover.type, profile === 'creator' ? 'creator-hero' : 'showcase-hero');
      assert.equal(cover.design.animation, 'reveal');
      assert.equal(cover.content.heading, 'Wir bauen im Bestand.');
      assert.equal(cover.content.text, 'Wir klären früh, was sich erhalten lässt.');
      const faces: Record<string, string> = { services: 'archivo', portfolio: 'space-grotesk', consulting: 'fraunces', editorial: 'cormorant-garamond' };
      assert.equal(cover.design.headingTypeface, faces[profile]);
      assert.match(cover.content.image?.src ?? '', /^\/placeholders\/visual-starter\/[^/]+\.webp$/);
      if (profile !== 'creator') {
        const featureType = profile === 'services' ? 'scroll-story' : profile === 'consulting' ? 'scene-sequence' : 'project-stage';
        const feature = home.sections.find(section => section.type === featureType);
        const entries = feature?.content.items;
        assert(feature && entries);
        assert(entries.every(item => item.image?.alt));
        assert.equal(entries.length, 3);
        assert.equal(feature.design.animation, 'reveal');
        assert.equal(cover.design.heroLayout, profile === 'portfolio' ? 'panorama' : profile === 'editorial' ? 'portrait' : 'split');
        const projects = content.pages.find(page => page.slug === 'projekte')?.sections[1];
        assert.equal(projects?.type, profile === 'portfolio' ? 'project-index' : 'project-stage');
        assert(projects?.content.items?.every(item => item.meta));
        const offering = content.pages.find(page => page.slug === 'leistungen')?.sections[1];
        if (profile === 'services') assert.equal(offering?.type, 'services');
        if (profile === 'consulting') {
          assert.equal(offering?.type, 'editorial-index');
          assert.equal(feature.design.width, 'full');
          const workflow = content.pages.find(page => page.slug === 'ablauf')?.sections[1];
          assert(workflow);
          assert.equal(workflow.type, 'workflow-demo');
          assert.equal(workflow.content.items?.length, 4);
        }
      }
      if(profile==='creator'){
        const kit=content.pages.find(page=>page.slug==='media-kit');
        assert.equal(kit?.sections[0].content.creatorPartnership,true);
        assert(content.config.navigation.some(link=>link.href==='/media-kit'));
        const engagement=home.sections.find(section=>section.type==='creator-engagement')!;
        assert.equal(engagement.anchor,'inhalte');
        assert.equal(engagement.content.primaryHref,'/kontakt');
        assert.deepEqual(engagement.content,JSON.parse(await readFile(path.join(source,'profiles/creator-engagement.json'),'utf8')));
        assert.equal(home.sections.some(section=>section.type==='creator-remix'),false);
      }
      assert.deepEqual(publishIssues(content), []);
      const brief = JSON.parse(await readFile(path.join(output, 'project/brief.json'), 'utf8'));
      assert.equal(brief.style, 'Warm und ruhig');
      assert.deepEqual(brief.functions, ['CMS', 'Podcast']);
      const pkg = JSON.parse(await readFile(path.join(output, 'package.json'), 'utf8'));
      const lock = JSON.parse(await readFile(path.join(output, 'package-lock.json'), 'utf8'));
      assert.equal(pkg.name, result.slug); assert.equal(lock.packages[''].name, result.slug);
      for (const excluded of ['.git', '.env.local', '.data', '.vercel', 'node_modules', '.next']) assert.equal(await exists(path.join(output, excluded)), false, excluded);
      assert.equal(await exists(path.join(output, 'src/components/admin/admin-app.tsx')), true);
      assert.equal(await exists(path.join(output, 'src/app/api/admin/[...action]/route.ts')), true);
    }
  });
});

test('publishing opt-in requires Social-Studio and rejects private configuration',async()=>{
 assert.deepEqual(parseFeatures('social-publishing,ai-assistant'),['social-publishing','ai-assistant']);
 assert.equal(normalizeBrief({projectName:'Planung',modules:{socialPublishing:true}}).modules?.socialStudio?.enabled,true);
 assert.throws(()=>normalizeBrief({projectName:'Planung',modules:{socialStudio:false,socialPublishing:true}}),/Social-Studio/);
 assert.throws(()=>normalizeBrief({projectName:'Planung',modules:{socialPublishing:{enabled:true,accessToken:'private'}}}));
 await temporary(async directory=>{
  const source=await neutralSource(path.join(directory,'source'));
  const output=path.join(directory,'planned');await createSite({sourceRoot:source,outputDir:output,brief:{projectName:'Planung',modules:{socialPublishing:{enabled:true}}}});
  const content=websiteSchema.parse(JSON.parse(await readFile(path.join(output,'src/data/content.json'),'utf8')));
  assert.equal(content.config.modules?.socialStudio?.enabled,true);assert.equal(content.config.modules?.socialPublishing?.enabled,true);
  assert(!websiteSchema.safeParse({...content,config:{...content.config,modules:{...content.config.modules,socialStudio:{enabled:false}}}}).success);
  assert(!websiteSchema.safeParse({...content,config:{...content.config,modules:{...content.config.modules,socialPublishing:{enabled:true,accessToken:'private'}}}}).success);
  for(const args of [['--social-publishing'],['--features','social-publishing,ai-assistant']]){
   const target=path.join(directory,args.length===1?'alias':'combined');
   await promisify(execFile)(process.execPath,[path.join(source,'scripts/create-site.mjs'),'--name','Planung','--out',target,...args],{windowsHide:true});
   const created=websiteSchema.parse(JSON.parse(await readFile(path.join(target,'src/data/content.json'),'utf8')));
   assert.equal(created.config.modules?.socialPublishing?.enabled,true);assert.equal(created.config.modules?.socialStudio?.enabled,true);assert.equal(created.config.modules?.aiAssistant?.enabled===true,args.length>1);
  }
 });
});

test('the generator excludes credentials, resource links and runtime data even if present in the source', async () => {
  await temporary(async directory => {
    const source=await neutralSource(path.join(directory,'source'));
    for (const entry of ['.env.local', '.data/private.json', '.vercel/project.json', '.git/config', 'src/data/.env.local', 'project/infrastructure.json', 'project/customer-secret.json']) {
      const file = path.join(source, entry); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, 'DO-NOT-COPY');
    }
    const output = path.join(directory, 'new-project');
    await createSite({ sourceRoot: source, outputDir: output, brief: { projectName: 'Sauberer Start', password: 'DO-NOT-COPY' } });
    for (const entry of ['.env.local', '.data', '.vercel', '.git', 'src/data/.env.local','project/infrastructure.json','project/customer-secret.json']) assert.equal(await exists(path.join(output, entry)), false, entry);
    assert.equal((await readFile(path.join(output, 'project/brief.json'), 'utf8')).includes('DO-NOT-COPY'), false);
    assert.equal(await exists(path.join(output, '.env.example')), true);
  });
});

test('existing projects and invalid profiles are rejected before writing', async () => {
  await temporary(async directory => {
    const source=await neutralSource(path.join(directory,'neutral-template'));
    const existing = path.join(directory, 'existing'); await mkdir(existing); await writeFile(path.join(existing, 'keep.txt'), 'preserve');
    await assert.rejects(createSite({ sourceRoot: source, outputDir: existing, brief: { projectName: 'Test' } }), /existiert bereits/);
    assert.equal(await readFile(path.join(existing, 'keep.txt'), 'utf8'), 'preserve');
    await assert.rejects(createSite({ sourceRoot: root, outputDir: path.join(root, 'nested-test'), brief: { projectName: 'Test' } }), /außerhalb/);
    const invalid = path.join(directory, 'invalid');
    await assert.rejects(createSite({ sourceRoot: source, outputDir: invalid, profile: '../../other', brief: { projectName: 'Test' } }), /Unbekanntes Profil/);
    assert.equal(await exists(invalid), false);
  });
});

test('briefing validates contact/domain inputs and never accepts a credential-bearing URL', () => {
  assert.equal(projectSlug('Ähren & Holz'), 'ahren-holz');
  assert.throws(() => projectSlug('CON'));
  assert.throws(() => normalizeBrief({ projectName: 'Test', email: 'no-address' }));
  assert.throws(() => normalizeBrief({ projectName: 'Test', siteUrl: 'https://user:password@example.org' }));
  assert.throws(() => normalizeBrief({ projectName: 'Test', siteUrl: 'http://example.org' }));
  assert.equal(normalizeBrief({ projectName: 'Test', siteUrl: 'https://example.org/' }).siteUrl, 'https://example.org');
});

test('a brief imports its own hero image, alt and crop into the editable cover', async () => {
  await temporary(async directory => {
    const source = await neutralSource(path.join(directory, 'template'));
    const assets = path.join(directory, 'brief', 'bilder');
    await mkdir(assets, { recursive: true });
    const sample = path.join(root, 'public/placeholders/visual-starter/workshop-compact.webp');
    await cp(sample, path.join(assets, 'innenhof.webp'));
    const brief = { projectName: 'Atelier', hero: { heading: 'Innenhof', image: {
      file: 'bilder/innenhof.webp', alt: 'Blick in den Innenhof', position: '100% 50%',
    } } };
    const briefPath = path.join(directory, 'brief', 'auftrag.json');
    await writeFile(briefPath, JSON.stringify(brief));
    const output = path.join(directory, 'atelier');
    await promisify(execFile)(process.execPath, [path.join(source, 'scripts/create-site.mjs'), '--brief', briefPath, '--out', output], { cwd: directory, windowsHide: true });
    const content = websiteSchema.parse(JSON.parse(await readFile(path.join(output, 'src/data/content.json'), 'utf8')));
    const cover = content.pages.find(page => page.slug === '')!.sections[0];
    assert.deepEqual(cover.content.image, { src: '/media/project/hero.webp', alt: brief.hero.image.alt, position: brief.hero.image.position });
    assert.equal(cover.content.caption, undefined);
    assert.deepEqual(await readFile(path.join(output, 'public/media/project/hero.webp')), await readFile(sample));
    assert.throws(() => normalizeBrief({ ...brief, hero: { ...brief.hero, image: { ...brief.hero.image, file: '../innenhof.webp' } } }), /hero.image/);
    await writeFile(path.join(assets, 'innenhof.webp'), 'not an image');
    const rejected = path.join(directory, 'rejected');
    await assert.rejects(createSite({ sourceRoot: source, outputDir: rejected, briefDirectory: path.dirname(briefPath), brief }), /Dateityp/);
    assert.equal(await exists(rejected), false);
  });
});

test('generated customer projects are explicitly rejected as scaffold sources',async()=>{await temporary(async directory=>{const source=await neutralSource(path.join(directory,'customer'));await mkdir(path.join(source,'project'));await writeFile(path.join(source,'project/origin.json'),'{}');await assert.rejects(createSite({sourceRoot:source,outputDir:path.join(directory,'unsafe-copy'),brief:{projectName:'Blocked'}}),/neutralen Starter/);});});

test('Social-Studio opt-in is independent of every profile and does not alter its website content', async()=>{
  await temporary(async directory=>{
    const source=await neutralSource(path.join(directory,'source'));
    for(const profile of ['services','portfolio','consulting','editorial','creator']){
      const baseline=path.join(directory,profile+'-default');
      const enabled=path.join(directory,profile+'-social');
      await createSite({sourceRoot:source,outputDir:baseline,profile,brief:{projectName:'Eigenes Studio'}});
      await createSite({sourceRoot:source,outputDir:enabled,profile,brief:{projectName:'Eigenes Studio',modules:{socialStudio:{enabled:true}}}});
      const base=websiteSchema.parse(JSON.parse(await readFile(path.join(baseline,'src/data/content.json'),'utf8')));
      const content=websiteSchema.parse(JSON.parse(await readFile(path.join(enabled,'src/data/content.json'),'utf8')));
      assert.deepEqual(content.config.modules?.socialStudio,{enabled:true});
      assert.equal(content.config.modules?.creator?.enabled===true,profile==='creator');
      assert.notEqual(content.config.modules?.commerce?.enabled,true);
      const {socialStudio:flag,...otherModules}=content.config.modules!;
      assert.deepEqual(otherModules,base.config.modules??{});
      if(base.config.modules)content.config.modules=base.config.modules;
      else delete content.config.modules;
      assert.deepEqual(content,base);
      const brief=JSON.parse(await readFile(path.join(enabled,'project/brief.json'),'utf8'));
      assert.deepEqual(brief.modules,{socialStudio:{enabled:true}});
    }
    const disabled=path.join(directory,'explicit-off');
    await createSite({sourceRoot:source,outputDir:disabled,brief:{projectName:'Eigenes Studio',modules:{socialStudio:{enabled:false}}}});
    const config=JSON.parse(await readFile(path.join(disabled,'src/data/content.json'),'utf8')).config;
    assert.deepEqual(config.modules,{socialStudio:{enabled:false}});
  });
});

test('Social-Studio brief and public config accept only the activation flag', async()=>{
  assert.deepEqual(normalizeBrief({projectName:'Test',modules:{socialStudio:true}}).modules,{socialStudio:{enabled:true}});
  assert.deepEqual(normalizeBrief({projectName:'Test',modules:{socialStudio:false}}).modules,{socialStudio:{enabled:false}});
  assert.equal(normalizeBrief({projectName:'Test'}).modules,undefined);
  for(const modules of [null,[],{other:true},{socialStudio:'true'},{socialStudio:null},{socialStudio:{}},{socialStudio:{enabled:1}},{socialStudio:{enabled:true,caption:'private'}},{socialStudio:{enabled:true,brand:{name:'private'}}}]){
    assert.throws(()=>normalizeBrief({projectName:'Test',modules}));
  }
  const content=JSON.parse(await readFile(path.join(root,'tests/fixtures/starter-content.json'),'utf8'));
  content.config.modules={socialStudio:{enabled:true}};
  assert.deepEqual(websiteSchema.parse(content).config.modules,{socialStudio:{enabled:true}});
  content.config.modules.socialStudio.caption='private';
  assert.equal(websiteSchema.safeParse(content).success,false);
});

test('CLI enables Social-Studio and Coach Studio explicitly and rejects unknown features before writing', async()=>{
  assert.deepEqual(parseFeatures(' social-studio,social-studio '),['social-studio']);
  assert.deepEqual(normalizeBrief({projectName:'Test',modules:{coachStudio:false}}).modules,{coachStudio:{enabled:false}});
  assert.throws(()=>normalizeBrief({projectName:'Test',modules:{coachStudio:{enabled:true,token:'private'}}}));
  for(const value of ['', 'unknown','social-studio,','social-studio,unknown'])assert.throws(()=>parseFeatures(value));
  await temporary(async directory=>{
    const source=await neutralSource(path.join(directory,'source'));
    const cli=path.join(source,'scripts/create-site.mjs');
    const briefFile=path.join(directory,'brief.json');
    await writeFile(briefFile,JSON.stringify({projectName:'CLI Studio',modules:{socialStudio:{enabled:false},coachStudio:{enabled:false}}}));
    for(const flags of [['--features','social-studio,coach-studio'],['--social-studio','--coach-studio']]){
      const output=path.join(directory,flags[0].slice(2));
      await promisify(execFile)(process.execPath,[cli,'--brief',briefFile,'--out',output,...flags],{cwd:directory,windowsHide:true});
      const content=websiteSchema.parse(JSON.parse(await readFile(path.join(output,'src/data/content.json'),'utf8')));
      assert.deepEqual(content.config.modules?.socialStudio,{enabled:true});
      assert.deepEqual(content.config.modules?.coachStudio,{enabled:true});
      assert.notEqual(content.config.modules?.aiAssistant?.enabled,true);
    }
    for(const flags of [['--features','unknown'],['--features','social-studio,unknown'],['--features'],['--unknown-feature']]){
      const output=path.join(directory,'rejected');
      await assert.rejects(promisify(execFile)(process.execPath,[cli,'--name','Test','--out',output,...flags],{cwd:directory,windowsHide:true}));
      assert.equal(await exists(output),false);
    }
  });
});

test('Creator generation replaces only the Home remix with the shared neutral engagement scene',async()=>{
  await temporary(async directory=>{
    const source=await neutralSource(path.join(directory,'source'));
    const file=path.join(source,'src/data/content.json');
    const content=JSON.parse(await readFile(file,'utf8'));
    const remix={...structuredClone(content.pages[0].sections[1]),type:'creator-remix',id:'home-remix'};
    content.pages[0].sections.splice(1,0,remix);
    content.pages[1].sections.push({...structuredClone(remix),id:'other-page-remix'});
    await writeFile(file,JSON.stringify(content));
    const output=path.join(directory,'creator');
    await createSite({sourceRoot:source,outputDir:output,profile:'creator',brief:{projectName:'Neue Community'}});
    const generated=websiteSchema.parse(JSON.parse(await readFile(path.join(output,'src/data/content.json'),'utf8')));
    const home=generated.pages.find(page=>page.slug==='')!;
    assert.equal(home.sections.filter(section=>section.type==='creator-engagement').length,1);
    assert.equal(home.sections.some(section=>section.type==='creator-remix'),false);
    assert.equal(generated.pages[1].sections.some(section=>section.type==='creator-remix'),true);
    assert.equal(generated.config.modules?.socialStudio,undefined);
  });
});

test('AI assistant is independent, default off and composes with Social-Studio in all five profiles',async()=>{
  assert.deepEqual(parseFeatures('social-studio,ai-assistant'),['social-studio','ai-assistant']);
  assert.deepEqual(normalizeBrief({projectName:'Test',modules:{aiAssistant:false,socialStudio:true}}).modules,{socialStudio:{enabled:true},aiAssistant:{enabled:false}});
  assert.throws(()=>normalizeBrief({projectName:'Test',modules:{aiAssistant:{enabled:true,apiKey:'not-public'}}}));
  await temporary(async directory=>{
    const source=await neutralSource(path.join(directory,'source'));
    for(const profile of ['services','portfolio','consulting','editorial','creator']){
      const output=path.join(directory,profile);
      await createSite({sourceRoot:source,outputDir:output,profile,brief:{projectName:'Unabhaengiger Entwurf',modules:{aiAssistant:true,socialStudio:true}}});
      const content=websiteSchema.parse(JSON.parse(await readFile(path.join(output,'src/data/content.json'),'utf8')));
      assert.deepEqual(content.config.modules?.aiAssistant,{enabled:true});
      assert.deepEqual(content.config.modules?.socialStudio,{enabled:true});
      assert.equal(content.config.modules?.creator?.enabled===true,profile==='creator');
      assert.notEqual(content.config.modules?.commerce?.enabled,true);
    }
    const cli=path.join(source,'scripts/create-site.mjs'),output=path.join(directory,'cli');
    await promisify(execFile)(process.execPath,[cli,'--name','AI Beispiel','--out',output,'--features','social-studio,ai-assistant'],{cwd:directory,windowsHide:true});
    const content=websiteSchema.parse(JSON.parse(await readFile(path.join(output,'src/data/content.json'),'utf8')));
    assert.deepEqual(content.config.modules,{socialStudio:{enabled:true},aiAssistant:{enabled:true}});
    content.config.modules!.aiAssistant={enabled:false};
    assert.deepEqual(websiteSchema.parse(content).config.modules?.aiAssistant,{enabled:false});
    (content.config.modules!.aiAssistant as Record<string,unknown>).apiKey='never-public';
    assert.equal(websiteSchema.safeParse(content).success,false);
  });
});


test('Liquid Glass is an explicit independent aesthetic in briefing and CLI', async () => {
  assert.throws(() => normalizeBrief({ projectName: 'Studio', aesthetic: 'automatic' }), /aesthetic/);
  await temporary(async directory => {
    const source = await neutralSource(path.join(directory, 'source'));
    const output = path.join(directory, 'glass');
    await promisify(execFile)(process.execPath, [path.join(source, 'scripts/create-site.mjs'), '--name', 'Own Studio', '--out', output, '--profile', 'consulting', '--aesthetic', 'liquid-glass'], { windowsHide: true });
    const content = websiteSchema.parse(JSON.parse(await readFile(path.join(output, 'src/data/content.json'), 'utf8')));
    assert.equal(content.config.theme.aesthetic, 'liquid-glass');
    assert.equal(content.config.theme.presentation, 'consulting');
    assert.equal(content.config.designVariant, 1);
    assert.equal(content.config.theme.glass?.background, 'aurora');
    assert.equal(content.config.theme.palettes?.[1]?.text, '#eff3ff');
    assert.equal(JSON.parse(await readFile(path.join(output, 'project/brief.json'), 'utf8')).aesthetic, 'liquid-glass');
    assert.equal(content.config.modules?.scroll3d?.enabled, undefined);
    await assert.rejects(createSite({ sourceRoot: source, outputDir: path.join(directory, 'creator-glass'), profile: 'creator', brief: { projectName: 'Studio', aesthetic: 'liquid-glass' } }), /Creator-Profil/);
    assert.equal(await exists(path.join(directory, 'creator-glass')), false);
  });
});
