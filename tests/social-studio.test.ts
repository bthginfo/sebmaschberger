import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getSeedProjects} from '../src/lib/social/catalog';
import {assetSourceSchema,brandSchema,durationOf,projectSchema,type SocialBrandProfile} from '../src/lib/social/model';
import {createFormatVariant,createProject,createElement} from '../src/lib/social/editing';
import {filterStudioMedia} from '../src/lib/social/studio-media-search';
import {archiveProjectState,emptyBrand,emptyProject,projectSnapshot,saveBrandState,saveProjectState,SocialStateError} from '../src/lib/server/social/state';

const brand:SocialBrandProfile={name:'Beispielbetrieb',website:'https://example.org',accent:'#cb7241',ink:'#153d32',paper:'#faf6ed',headlineFont:'manrope',bodyFont:'dm-sans'};
const at='2026-10-31T12:00:00.000Z';
const failure=(error:unknown)=>error instanceof SocialStateError&&error.status===409;

test('format copies keep grouped content, full backgrounds and source projects independent',()=>{
 const source=createProject(brand);
 source.caption='Original text';
 source.slides[0].elements=[
  createElement('shape',brand,{x:0,y:0,width:1080,height:1350}),
  createElement('text',brand,{x:100,y:100,width:500,height:100,fontSize:90,groupId:'group-a'}),
  createElement('shape',brand,{x:100,y:240,width:100,height:100,groupId:'group-a'})
 ];
 const original=structuredClone(source),copy=createFormatVariant(source,'square','post');
 const [background,text,shape]=copy.slides[0].elements;
 assert.deepEqual(source,original);assert.notEqual(copy.id,source.id);
 assert.equal(copy.caption,source.caption);assert.equal(background.width,1080);assert.equal(background.height,1080);
 assert.equal(text.width/text.height,5);assert.equal(shape.width,shape.height);assert.equal(text.groupId,shape.groupId);
 assert.notEqual(text.groupId,'group-a');assert(projectSchema.safeParse(copy).success);
 assert.throws(()=>createFormatVariant(source,'portrait','reel'));
});

test('studio media search matches accents and returns only the chosen type without duplicate sources',()=>{
 const media=[{name:'Rösterei Eingang',mimeType:'image/webp',src:'/a'},{name:'Rösterei Video',mimeType:'video/mp4',src:'/b'},{name:'Rösterei Eingang',src:'/a'}];
 assert.deepEqual(filterStudioMedia(media,'rosterei','all').map(item=>item.src),['/a','/b']);
 assert.deepEqual(filterStudioMedia(media,'rosterei','video').map(item=>item.src),['/b']);
 assert.deepEqual(filterStudioMedia(media,'eingang video','all'),[]);
});

test('neutral templates validate, cover all formats, and independently snapshot the website brand',()=>{
 const projects=getSeedProjects(brand);
 assert.equal(projects.length,10);assert.equal(projects.filter(p=>p.kind==='post').length,8);
 assert.equal(new Set(projects.map(p=>p.formatId)).size,5);
 for(const project of projects)assert(projectSchema.safeParse(project).success,project.id);
 assert.deepEqual(projects.filter(p=>p.kind==='reel').map(durationOf),[20000,20000]);
 projects[0].brand.name='Changed';assert.equal(projects[1].brand.name,brand.name);assert.equal(brand.name,'Beispielbetrieb');
 const serialized=JSON.stringify(projects);for(const term of ['Kantiq','kantiq.de','Mika Flux','Amélie'])assert(!serialized.includes(term),term);
});

test('private image sources reject external, traversal and executable URLs',()=>{
 for(const source of ['/api/admin/social/assets/'+randomUUID(),'/api/admin/social/media/example-image','/social-studio/paper.webp'])assert(assetSourceSchema.safeParse(source).success);
 for(const source of ['https://example.org/image.png','data:image/png;base64,AA==','blob:https://example.org/a','/social-studio/../private.png','//example.org/a','/api/admin/social/assets/a?token=x'])assert(!assetSourceSchema.safeParse(source).success,source);
 assert(!brandSchema.safeParse({...brand,caption:'Private config does not belong here'}).success);
});

test('save is immutable and idempotent; stale tabs and changed request replays cannot overwrite',()=>{
 const project=getSeedProjects(brand)[0],input={idempotencyKey:randomUUID(),baseRevision:0,project},previous=emptyProject();
 const first=saveProjectState(previous,input,at);
 assert.equal(previous.project,null);assert.equal(first.revision,1);assert.equal(first.updatedAt,at);
 assert.equal(saveProjectState(first,input,'2099-01-01'),first);
 assert.throws(()=>saveProjectState(first,{...input,project:{...project,title:'Different'}},at),failure);
 assert.throws(()=>saveProjectState(first,{...input,idempotencyKey:randomUUID()},at),failure);
 const second=saveProjectState(first,{...input,idempotencyKey:randomUUID(),baseRevision:1,project:{...project,title:'Newer'}},at);
 assert.throws(()=>saveProjectState(second,input,at),failure);
 const snapshot=projectSnapshot(second);snapshot.project.brand.name='Client edit';assert.equal(second.project?.brand.name,brand.name);
});

test('archive requires the current saved revision, replays safely and prevents resurrection',()=>{
 const project=getSeedProjects(brand)[0],first=saveProjectState(emptyProject(),{idempotencyKey:randomUUID(),baseRevision:0,project},at);
 const input={idempotencyKey:randomUUID(),baseRevision:1,id:project.id};
 assert.throws(()=>archiveProjectState(first,{...input,baseRevision:2},at),failure);
 const archived=archiveProjectState(first,input,at);assert.equal(archived.revision,2);assert(archived.archived);
 assert.equal(archiveProjectState(archived,input,at),archived);
 assert.throws(()=>projectSnapshot(archived),error=>error instanceof SocialStateError&&error.status===404);
 assert.throws(()=>saveProjectState(archived,{idempotencyKey:randomUUID(),baseRevision:2,project},at),failure);
});

test('brand defaults use independent CAS and do not mutate saved project snapshots',()=>{
 const project=getSeedProjects(brand)[0],saved=saveProjectState(emptyProject(),{idempotencyKey:randomUUID(),baseRevision:0,project},at);
 const input={idempotencyKey:randomUUID(),baseRevision:0,brand:{...brand,name:'New default'}};
 const profile=saveBrandState(emptyBrand(),input,at);assert.equal(profile.revision,1);
 assert.equal(saveBrandState(profile,input,at),profile);
 assert.throws(()=>saveBrandState(profile,{...input,idempotencyKey:randomUUID()},at),failure);
 assert.equal(saved.project?.brand.name,brand.name);
});

test('record receipt history is bounded without discarding the current accepted operation',()=>{
 let record=emptyProject();const project=getSeedProjects(brand)[0];
 for(let n=0;n<45;n++)record=saveProjectState(record,{idempotencyKey:randomUUID(),baseRevision:record.revision,project:{...project,title:'Version '+n}},at);
 assert.equal(record.revision,45);assert.equal(Object.keys(record.receipts).length,40);
 assert.equal(Object.values(record.receipts).at(-1)?.revision,45);
});

test('unbounded animation documents and ambiguous IDs are rejected at the persistence boundary',()=>{
 const project=getSeedProjects(brand).find(p=>p.kind==='reel')!;
 assert(!projectSchema.safeParse({...project,formatId:'square'}).success);
 assert(!projectSchema.safeParse({...project,slides:Array.from({length:5},(_,i)=>({...project.slides[0],id:'s'+i,durationMs:30000}))}).success);
 assert(!projectSchema.safeParse({...project,slides:[project.slides[0],project.slides[0]]}).success);
 assert(!projectSchema.safeParse({...project,slides:[{...project.slides[0],transitionMs:2000,durationMs:500}]}).success);
});
