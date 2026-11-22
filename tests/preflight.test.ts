import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {preflightContentIssues,scanCredentialFiles} from '../scripts/lib/preflight-checks.mjs';

const sample=()=>({config:{name:'Werkraum',legalName:'Werkraum GmbH',email:'kontakt@werkraum.de',modules:{creator:{enabled:true,demoBasePath:'/demo/example'}}},pages:[{slug:'',title:'Start',sections:[] as unknown[]},{slug:'impressum',title:'Impressum',sections:[{type:'richtext',content:{heading:'Anbieter',text:'Vollständige Anbieterangaben.'}}]},{slug:'datenschutz',title:'Datenschutz',sections:[{type:'richtext',content:{heading:'Datenschutz',text:'Die tatsächlich verwendeten Dienste werden hier beschrieben.'}}]}]});

test('explicit creator examples permit local, visibly declared placeholders only',()=>{
  const content=sample();
  content.pages[0].sections=[
    {type:'split',content:{heading:'Fiktiver Creator',text:'Alle Social-Inhalte sind bewusst gestaltete Platzhalter.',primaryHref:'/demo/example'}},
    {type:'list',content:{heading:'Funktionen',items:[{title:'Deine Kanäle',label:'Plattform-Platzhalter ansehen',href:'/demo/example/videos'}]}},
    {type:'faq',content:{heading:'Fragen',items:[{title:'Sind die Social-Kanäle in der Demo verbunden?',text:'Nein. Jeder Social-Inhalt ist ein lokaler Platzhalter. Keine echten Konten.'}]}},
    {type:'creator-social',content:{heading:'Inhalte',items:[{title:'YouTube-Platzhalter',platform:'youtube',placeholder:true,image:{src:'/assets/local.webp'}}]}},
  ];
  assert.deepEqual(preflightContentIssues(content),[]);
  content.config.modules.creator.enabled=false;
  assert(preflightContentIssues(content).some(issue=>issue.includes('nicht freigegebene Platzhalter')));
});

test('creator enablement never waives business placeholders, sample email or legal drafts',()=>{
  const business=sample();business.config.name='Musterstudio';
  assert(preflightContentIssues(business).some(issue=>issue.includes('Musterangaben')));
  const email=sample();email.config.email='hallo@example.invalid';
  assert(preflightContentIssues(email).some(issue=>issue.includes('Kontaktadresse')));
  const config=sample();config.config.legalName='Platzhalter GmbH';
  assert(preflightContentIssues(config).some(issue=>issue.includes('nicht freigegebene Platzhalter')));
  const legal=sample();legal.pages[1].sections=[{type:'richtext',content:{heading:'Demo',text:'PLATZHALTER: Dieser fiktive Creator-Rechtstext ist NICHT VERÖFFENTLICHUNGSFERTIG.'}}];
  assert(preflightContentIssues(legal).some(issue=>issue.startsWith('Impressum:')));
});

test('unlabeled unfinished text and external mock media still fail',()=>{
  const unfinished=sample();unfinished.pages[0].sections=[{type:'split',content:{heading:'Leistungen',text:'Platzhalter: Hier später den tatsächlichen Text ergänzen.'}}];
  assert(preflightContentIssues(unfinished).some(issue=>issue.includes('nicht freigegebene Platzhalter')));
  const remote=sample();remote.pages[0].sections=[{type:'creator-social',content:{heading:'Inhalte',items:[{title:'YouTube-Platzhalter',platform:'youtube',placeholder:true,mediaUrl:'https://external.example/video.mp4'}]}}];
  assert(preflightContentIssues(remote).some(issue=>issue.includes('nicht freigegebene Platzhalter')));
});

test('credential scan excludes private design work while continuing to inspect public source',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'preflight-fixture-'));
  try{
    const fake='vercel_blob_'+'rw_'+'unit_test_marker';
    await mkdir(path.join(directory,'.impeccable','review'),{recursive:true});
    await writeFile(path.join(directory,'.impeccable','review','private.json'),JSON.stringify({fake}));
    assert.deepEqual(await scanCredentialFiles(directory),[]);
    await mkdir(path.join(directory,'public'));
    await writeFile(path.join(directory,'public','content.json'),JSON.stringify({fake}));
    const findings=await scanCredentialFiles(directory);
    assert.equal(findings.length,1);
    assert(findings[0].endsWith(path.join('public','content.json')));
  }finally{
    const absolute=path.resolve(directory);
    assert(absolute.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(absolute).startsWith('preflight-fixture-'));
    await rm(absolute,{recursive:true,force:true});
  }
});

test('published launch checks include visible layouts and required legal pages, and exclude draft posts',()=>{
  const content={...sample(),posts:[{status:'draft',slug:'in-arbeit',title:'Platzhalter-Entwurf'}],templates:{
    'blog-post':{seo:{},sections:[{type:'richtext',visible:true,content:{heading:'Platzhalter im Beitragslayout'}}]}
  }};
  assert.deepEqual(preflightContentIssues(content),[]);
  const enabled={...content,config:{...content.config,blog:{enabled:true}}};
  assert(preflightContentIssues(enabled).some(issue=>issue.includes('Platzhalter')));
  const missing=sample();missing.pages=missing.pages.filter(page=>page.slug!=='datenschutz');
  assert(preflightContentIssues(missing).some(issue=>issue.includes('ausgefüllte Seite für Datenschutz')));
  const unlinked={...sample(),config:{...sample().config,footer:{legalLinks:[]}}};
  assert(preflightContentIssues(unlinked).some(issue=>issue.includes('öffentlich erreichbaren Link')));
});
