import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import content from '../src/data/content.json';
import {websiteSchema,inquirySchema,sectionSchema} from '../src/lib/validation';
import {publishIssues} from '../src/lib/publish-check';
import {createSection,sectionLibrary} from '../src/lib/section-library';
import {SECTION_TYPES,type WebsiteContent} from '../src/lib/types';
import {sectionCapabilities} from '../src/components/admin/section-capabilities';
import {motionStoryModelUrl,motionStoryObject,motionStoryPoster,motionStoryScenes,motionStoryStudioModel,motionStoryStudioPoster,motionStoryVideoUrl} from '../src/lib/motion-story';
import {hasBilingualHomepage,languageSwitchSlugs,languageUrls,publishedPagePath,websiteHomeSlug} from '../src/lib/site-languages';
import {projectPublicSiteConfig} from '../src/lib/public-projection';

test('all imported pages satisfy the schema and publication checks',()=>{
  const site=websiteSchema.parse(content);assert(site.pages.length>=1);assert.deepEqual(publishIssues(site),[]);
});
test('language defaults preserve single-language routes and link bilingual homepages independently of CMS language',()=>{
  const site=websiteSchema.parse(content);
  const german={...site.pages.find(page=>page.slug==='')!,translationKey:'home',seo:{title:'Startseite',description:'Start'}};
  const english={...german,id:'home-en',slug:'en',locale:'en-GB',seo:{title:'Home',description:'Home'}};
  assert.equal(websiteHomeSlug({defaultWebsiteLanguage:'en'},[german]),'');
  assert.equal(websiteHomeSlug({},[german,english]),'en');
  assert.equal(websiteHomeSlug({defaultWebsiteLanguage:'de'},[german,english]),'de');
  assert.equal(publishedPagePath(german.slug,true),'/de');
  assert.deepEqual(languageSwitchSlugs(english,[german,english]),{en:'en',de:'de'});
  assert.deepEqual(languageUrls(english,[german,english],'https://example.test'),{
    'de-DE':'https://example.test/de','en-GB':'https://example.test/en','x-default':'https://example.test/',
  });
  const config=projectPublicSiteConfig({...site.config,defaultAdminLanguage:'de',defaultWebsiteLanguage:'en',modules:{coachStudio:{enabled:true}}});
  assert.equal(config.defaultWebsiteLanguage,'en');
  assert.equal(config.defaultAdminLanguage,undefined);
  assert.equal(config.modules?.coachStudio,undefined);
});
test('every rendered section type is available exactly once in the section library',()=>{
  assert.deepEqual([...sectionLibrary.map(section=>section.type)].sort(),[...SECTION_TYPES].sort());
  for(const type of SECTION_TYPES){const section=createSection(type);assert.equal(section.type,type);assert(section.id);assert(section.name);assert(section.content);}
});
test('animated hero keeps authored scenes, older images and the trigger across schema parsing',()=>{
  const site=structuredClone(content) as WebsiteContent;
  const story=createSection('motion-story');
  const capabilities=sectionCapabilities(story.type);
  assert(capabilities.image && capabilities.items && capabilities.itemImages);
  assert.equal(story.content.items?.length,0);
  assert.equal(story.design.motionTrigger,"loop");
  assert.equal(story.design.motionEffect,"studio");
  assert.equal(story.content.image?.src,motionStoryStudioPoster.src);
  assert.equal(motionStoryScenes(story.content).length,0);
  site.pages[0].sections.push(story);
  assert.deepEqual(publishIssues(websiteSchema.parse(site)),[]);
  delete story.design.motionText;
  delete story.design.motionEffect;
  story.content.image={src:'/media/object.webp',alt:'Früheres Vordergrundmotiv',position:'50% 50%'};
  story.content.items=[{id:'legacy-chapter',title:'Ein genauer Blick.',text:'Der bereits veröffentlichte Text.',
    image:{src:'/media/scene.webp',alt:'Früheres Szenenbild',position:'0% 50%'}}];
  assert.deepEqual(websiteSchema.parse(site).pages[0].sections.at(-1),story);
  story.content.videoUrl='/assets/custom-film.webm';
  story.design.motionTrigger='scroll';
  const parsed=websiteSchema.parse(site);
  assert.deepEqual(parsed.pages[0].sections.at(-1),story);
  assert.deepEqual(publishIssues(parsed),[]);
  for(const asset of [motionStoryPoster.src,motionStoryObject.src,motionStoryStudioPoster.src,motionStoryStudioModel])assert(statSync(path.join(process.cwd(),"public",asset)).size>0);
  for(const asset of ['aperture-v1.mp4','aperture-v1.webp'])assert(statSync(path.join(process.cwd(),'public/assets/motion-story',asset)).size>0);
});
test('only the first two authored images become scenes, and older notes are kept in order',()=>{
  const story=createSection('motion-story');
  const first={id:'first',title:'Die Form.',text:'Die erste Szene.',image:motionStoryObject};
  const second={id:'second',title:'Die Oberfläche.',text:'Die zweite Szene.',image:motionStoryPoster};
  story.content.items=[{id:'note',title:'Notiz',text:'Text ohne Bild.'},first,second,{...first,id:'third'}];
  assert.deepEqual(motionStoryScenes(story.content).map(item=>item.id),[first.id,second.id]);
  assert(!sectionSchema.safeParse({...story,design:{...story.design,motionTrigger:'video'}}).success);
  assert(!sectionSchema.safeParse({...story,design:{...story.design,motionEffect:'untrusted'}}).success);
  assert.equal(sectionSchema.parse({...story,design:{...story.design,motionEffect:'assembly'}}).design.motionEffect,'assembly');
  assert.equal(sectionSchema.parse({...story,design:{...story.design,motionEffect:'glaze'}}).design.motionEffect,'glaze');
});
test('3D scenes accept only bundled model paths and include an animated sample with a camera',()=>{
  const story=createSection('motion-story');
  for(const source of [motionStoryStudioModel,'/assets/motion-story/models/client-a/table.glb']){
    assert.equal(motionStoryModelUrl(source),source);
    const saved=sectionSchema.parse({...story,content:{...story.content,motionModel:source}});
    assert.equal(saved.content.motionModel,source);
  }
  for(const source of ['https://example.org/scene.glb','//example.org/scene.glb','/assets/motion-story/models/../a.glb',
    '/assets/motion-story/models/%2e%2e/a.glb','/assets/motion-story/models/a.glb?draft=1','/media/model.glb','/assets/motion-story/models/a.gltf']){
    assert(!sectionSchema.safeParse({...story,content:{...story.content,motionModel:source}}).success);
  }
  const sample=readFileSync(path.join(process.cwd(),'public',motionStoryStudioModel));
  assert.equal(sample.toString('ascii',0,4),'glTF');
  const model=JSON.parse(sample.toString('utf8',20,20+sample.readUInt32LE(12)));
  assert(model.animations[0].channels.length>=5);
  assert.equal(model.cameras[0].type,'perspective');
});
test('Motion-Story rejects external, traversing and non-video sources without changing general videos',()=>{
  const story=createSection('motion-story');
  for(const source of ['/assets/scene.mp4','/media/videos/cut.webm']){
    assert.equal(motionStoryVideoUrl(source),source);
    assert(sectionSchema.safeParse({...story,content:{...story.content,videoUrl:source}}).success);
  }
  for(const source of ['https://example.com/clip.mp4','//example.com/a.mp4','/assets/thumb.webp','/assets/%2e%2e/a.mp4',
    '/assets/%252e%252e/a.mp4','/assets/film.mp4?private=1','/api/film.mp4','javascript:alert(1)']){
    assert.equal(motionStoryVideoUrl(source),undefined);
    assert(!sectionSchema.safeParse({...story,content:{...story.content,videoUrl:source}}).success);
  }
  const video=createSection('video');
  assert(sectionSchema.safeParse({...video,content:{...video.content,videoUrl:'https://www.youtube.com/watch?v=example1'}}).success);
});
test('initial local pictures, PDF links and internal page links have real targets',()=>{
  const site=content as WebsiteContent;const slugs=new Set(site.pages.map(page=>'/'+page.slug));
  if(hasBilingualHomepage(site.pages)) slugs.add(publishedPagePath('',true));
  const inspect=(value:unknown)=>{
    if(Array.isArray(value))return value.forEach(inspect);
    if(value&&typeof value==='object')for(const [key,entry] of Object.entries(value)){
      if(typeof entry==='string'&&['src','href','primaryHref','secondaryHref'].includes(key)&&entry.startsWith('/')){
        const url=new URL(entry,'https://test.invalid');
        if(['/media/','/downloads/','/assets/','/placeholders/'].some(prefix=>url.pathname.startsWith(prefix))){const publicRoot=path.resolve(process.cwd(),'public');const file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));assert(file.startsWith(publicRoot+path.sep)&&existsSync(file)&&statSync(file).isFile(),`Missing public file: ${entry}`);}
        else if(url.pathname==='/admin'){const adminPage=path.join(process.cwd(),'src/app/admin/page.tsx');assert(existsSync(adminPage)&&statSync(adminPage).isFile(),`Missing declared admin route: ${entry}`);}
        else if(site.config.modules?.creator?.enabled&&url.pathname.startsWith(site.config.modules.creator.demoBasePath)){const demo=JSON.parse(readFileSync(path.join(process.cwd(),'src/data/creator-demo.json'),'utf8'));const relative=url.pathname.slice(site.config.modules.creator.demoBasePath.length).replace(/^\//,'');assert(relative==='cms'||demo.pages.some((p:{slug:string})=>p.slug===relative),`Missing demo page: ${entry}`);}
        else assert(slugs.has(url.pathname),`Missing page: ${entry}`);
      }else inspect(entry);
    }
  };inspect(site);
});
test('unpublished pages cannot contain unfinished cards or empty footer links',()=>{
  const site=structuredClone(content) as WebsiteContent;
  site.pages[0].sections.push({...createSection('cards'),content:{heading:'Unsere Themen',items:[{id:'pending-card',title:'',text:''}]}});
  site.config.footer!.legalLinks.push({label:'',href:''});
  assert(publishIssues(site).some(issue=>issue.includes('Eintrag')));
  assert(publishIssues(site).some(issue=>issue.includes('Fußbereich')));
});
test('duplicate/reserved pages and tracking without consent are rejected',()=>{
  const site=structuredClone(content);site.pages.push({...site.pages[0],id:'duplicate'});assert.equal(websiteSchema.safeParse(site).success,false);
  const reserved=structuredClone(content);reserved.pages[1].slug='admin/test';assert.equal(websiteSchema.safeParse(reserved).success,false);
  const tracking=structuredClone(content);tracking.config.consent.enabled=false;tracking.config.analytics.googleId='G-TEST123';assert.equal(websiteSchema.safeParse(tracking).success,false);
});
test('contact form validates acknowledgement, address and useful message before storage',()=>{
  const valid={name:'Test Person',email:'test@example.org',message:'Dies ist eine technische Testanfrage.',consent:true};
  assert.equal(inquirySchema.safeParse(valid).success,true);
  assert.equal(inquirySchema.safeParse({...valid,consent:false}).success,false);
  assert.equal(inquirySchema.safeParse({...valid,email:'invalid'}).success,false);
  assert.equal(inquirySchema.safeParse({...valid,message:'Hallo'}).success,false);
});
