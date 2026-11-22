"use client";
import '@/styles/admin.css';
import '@/styles/canvas-editor.css';
import '@/styles/admin-refinements.css';
import '@/styles/creator-demo-cms.css';
import {useEffect,useMemo,useRef,useState} from 'react';
import {isolateWebsiteMedia} from '@/lib/isolated-media';
import type {MediaAsset,WebsiteContent} from '@/lib/types';
import {CommerceManager} from '@/components/admin/commerce-manager';
import {PageEditor} from '@/components/admin/page-editor';
import {AdminLinkProvider} from '@/components/admin/link-picker';
import {SiteInteractionContext,SiteMediaAdapterContext} from '@/components/site/editable';
import {demoStorageKey,newDemoState,publishDemo,readDemoState,saveDemoDraft,type DemoState} from '@/lib/creator/demo-state';
export function DemoCms({initialContent,embedded=false,storageKey,onShowWebsite,onReady,assistantOpenSignal}:{assistantOpenSignal?:number;initialContent:WebsiteContent;embedded?:boolean;storageKey?:string;onShowWebsite?:()=>void;onReady?:()=>void}){
const key=storageKey||demoStorageKey(initialContent);const[assistantReset,setAssistantReset]=useState(0);const[assistantIgnoredSignal,setAssistantIgnoredSignal]=useState(0);const [data,setData]=useState<DemoState>(()=>newDemoState(initialContent));const dataRef=useRef(data);const [content,setContent]=useState(()=>isolateWebsiteMedia(initialContent));const [ready,setReady]=useState(false);const [view,setView]=useState<'pages'|'products'>('pages');const [notice,setNotice]=useState('');const history=useRef<{past:WebsiteContent[];future:WebsiteContent[]}>({past:[],future:[]});
const [memoryOnly, setMemoryOnly] = useState(false);
useEffect(() => {
  let next: DemoState;
  try {
    next = readDemoState(window.sessionStorage, key, initialContent);
    setMemoryOnly(false);
  } catch {
    next = newDemoState(initialContent);
    setMemoryOnly(true);
  }
  dataRef.current = next;
  setData(next);
  setContent(structuredClone(next.state.draft));
  history.current = { past: [], future: [] };
  setNotice('');
  setReady(true);
}, [key, initialContent]);
useEffect(()=>{if(ready)onReady?.();},[ready,onReady]);
function persist(next: DemoState) {
  dataRef.current = next;
  setData(next);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(next));
    setMemoryOnly(false);
  } catch {
    setMemoryOnly(true);
  }
  window.dispatchEvent(new CustomEvent('ws:demo-published', { detail: { key, published: next.state.published } }));
}
function resetDemo() {
  const next = newDemoState(initialContent);
  persist(next);
  setContent(structuredClone(next.state.draft));
  history.current = { past: [], future: [] };
  setAssistantReset(value => value + 1);
  setAssistantIgnoredSignal(assistantOpenSignal || 0);
  setNotice('Das Beispiel wurde zurückgesetzt.');
}
function change(next:WebsiteContent){next=isolateWebsiteMedia(next);history.current.past=[...history.current.past.slice(-39),structuredClone(content)];history.current.future=[];setContent(next);}
function undo(){const previous=history.current.past.pop();if(previous){history.current.future.push(structuredClone(content));setContent(previous);}}
function redo(){const next=history.current.future.pop();if(next){history.current.past.push(structuredClone(content));setContent(next);}}
async function upload(file:File){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>1024*1024)throw new Error('Für diese lokale Demo bitte ein JPG-, PNG- oder WebP-Bild bis 1 MB wählen.');const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Das Bild konnte nicht gelesen werden.'));reader.readAsDataURL(file);});const asset:MediaAsset={id:crypto.randomUUID(),url,name:file.name,alt:'Eigenes Demo-Bild',position:'50% 50%',type:file.type,size:file.size,createdAt:new Date().toISOString()};persist({...dataRef.current,media:[asset,...dataRef.current.media]});return asset;}
const adapter=useMemo(()=>({upload,isolated:true}),[key]);
const dirty=JSON.stringify(content)!==JSON.stringify(data.state.draft);
if(!ready)return <div className="creator-demo-loading" role="status">Dein eigenes Beispiel wird geöffnet …</div>;
return <div className={`cms-root cms-app cms-app--editor creator-demo-cms${embedded?' creator-demo-cms--embedded':''}`} data-creator-demo-editor=""><div className="creator-demo-notice"><div><strong>Dein eigener Demo-Arbeitsstand</strong><span>Speichern und Veröffentlichen gelten nur für diesen Browser-Tab. Keine Anmeldung nötig.</span></div><div className="creator-demo-toolbar">{content.config.modules?.commerce&&<button type="button" onClick={()=>setView(view==='pages'?'products':'pages')}>{view==='pages'?'Produkte und Preise bearbeiten':'Zurück zum Seiteneditor'}</button>}<button type="button" onClick={resetDemo}>Demo zurücksetzen</button></div></div>{(notice || memoryOnly) && <p className="creator-demo-status" role="status">{memoryOnly ? 'Dein Browser kann diesen Arbeitsstand nur vorübergehend behalten. Beim Neuladen können Änderungen verloren gehen.' : notice}</p>}<SiteInteractionContext.Provider value={{isolated:true,localMediaOnly:true}}><SiteMediaAdapterContext.Provider value={adapter}><AdminLinkProvider content={content}><div className="creator-demo-product-pane" hidden={view!=='products'}><button type="button" className="creator-demo-product-back" onClick={()=>setView('pages')}>Zurück zum Seiteneditor</button>{content.config.modules?.commerce&&<CommerceManager isolated media={data.media} onUpload={upload} savedContent={data.state.draft} onOpenEditor={()=>setView('pages')} content={content} onChange={change} onSave={async()=>{persist(saveDemoDraft(dataRef.current,content));setNotice('Deine Produktänderungen sind lokal gespeichert. Im Seiteneditor kannst du sie für deine Demo veröffentlichen.');}} dirty={dirty} busy={false}/>}</div><div className="creator-demo-pages" hidden={view!=='pages'}><PageEditor key={assistantReset} assistantOpenSignal={Math.max(0,(assistantOpenSignal||0)-assistantIgnoredSignal)} assistantMode="demo" sessionLocal embedded={embedded} onShowWebsite={onShowWebsite} extraActions={<>{content.config.modules?.commerce&&<button type="button" onClick={()=>setView('products')}>Produkte und Preise</button>}<button type="button" onClick={resetDemo}>Demo zurücksetzen</button></>} content={content} cmsState={data.state} media={data.media} onUpload={upload} dirty={dirty} busy={null} onChange={change} onSave={async()=>{persist(saveDemoDraft(dataRef.current,content));setNotice('Dein Demo-Entwurf ist in diesem Tab gespeichert.');}} onPublish={async()=>{persist(publishDemo(dataRef.current));setNotice('Deine Demo-Veröffentlichung ist jetzt in diesem Browser-Tab sichtbar.');}} onRestore={async(id)=>{const revision=dataRef.current.state.revisions.find(r=>r.id===id);if(revision?.content){persist(saveDemoDraft(dataRef.current,revision.content));setContent(structuredClone(revision.content));}}} undo={undo} redo={redo} canUndo={history.current.past.length>0} canRedo={history.current.future.length>0}/></div></AdminLinkProvider></SiteMediaAdapterContext.Provider></SiteInteractionContext.Provider></div>;
}
