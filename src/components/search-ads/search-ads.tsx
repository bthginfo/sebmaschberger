'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, Check, Clipboard, Copy, ExternalLink, ListFilter, Plus, Search, Target } from 'lucide-react';
import type { Campaign, CampaignGroup, CampaignRecord } from '@/lib/search-ads/model';
import { adsRows, campaignSchema, csv, keywordList, keywordRows, launchPlan, launchSubset } from '@/lib/search-ads/model';
import { Button, Field, Input, Modal, Panel, Section, Status, copyText } from '@/components/coaching-portal/ui';
import styles from '@/components/coaching-portal/portal.module.css';
import ads from './search-ads.module.css';

const sections=[['keywords','Keywords'],['ads','Anzeigen'],['assets','Erweiterungen'],['launch','Startcheck']] as const;
type Tab=typeof sections[number][0];
const endpoint='/api/admin/google-ads';
function parseKeywords(lines:string):CampaignGroup['keywords']{
  return lines.split(/\r?\n/u).map(line=>line.trim()).filter(Boolean).map(line=>{
    const exact=line.startsWith('[')&&line.endsWith(']');
    return {term:line.replace(/^["\[]|["\]]$/gu,'').trim(),match:exact?'Exact':'Phrase'};
  });
}
function download(name:string,contents:string){
  const href=URL.createObjectURL(new Blob([contents],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=href;a.download=name;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function Lines({label,values,change,limit,count}: {label:string;values:string[];change:(values:string[])=>void;limit:number;count:number}){
  return <div className={styles.items}>
    {values.map((value,index)=><div className={ads.line} key={index}>
      <Field label={label+' '+(index+1)}><Input maxLength={limit} value={value} onChange={event=>change(values.map((entry,i)=>i===index?event.target.value:entry))}/></Field>
      <span className={styles.badge}>{value.length}/{limit}</span>
      <Button quiet aria-label={label+' '+(index+1)+' entfernen'} onClick={()=>change(values.filter((_,i)=>i!==index))}>×</Button>
    </div>)}
    <Button quiet disabled={values.length>=count} onClick={()=>change([...values,''])}><Plus size={16}/>{label} hinzufügen</Button>
  </div>;
}
export function SearchAds(){
  const [saved,setSaved]=useState<CampaignRecord|null>(null),[draft,setDraft]=useState<Campaign|null>(null);
  const [groupId,setGroupId]=useState(''),[tab,setTab]=useState<Tab>('keywords'),[feedback,setFeedback]=useState([] as [string,boolean]|[]);
  const [busy,setBusy]=useState(false),[approval,setApproval]=useState(false);
  const [planText,setPlanText]=useState<Record<string,string>>({}),[negativeText,setNegativeText]=useState<string|null>(null);
  useEffect(()=>{
    const abort=new AbortController();
    void fetch(endpoint,{cache:'no-store',signal:abort.signal}).then(async response=>{
      const value=await response.json();
      if(!response.ok)throw Error(value.error);
      setSaved(value);setDraft(value.campaign);setGroupId(value.campaign.groups[0].id);
    }).catch(error=>{if(!abort.signal.aborted)setFeedback([error.message,true]);});
    return()=>abort.abort();
  },[]);
  const group=draft?.groups.find(value=>value.id===groupId);
  const count=draft?.groups.reduce((sum,g)=>sum+g.keywords.length,0)??0;
  const exact=group?.keywords.filter(keyword=>keyword.match==='Exact').length??0;
  const launch=draft?launchPlan(draft):null;
  const launchCount=draft&&launch?draft.groups.reduce((sum,entry)=>sum+(launch.groupIds.includes(entry.id)?Math.min(entry.keywords.length,launch.limit):0),0):0;
  const dirty=Boolean(saved&&draft&&JSON.stringify(saved.campaign)!==JSON.stringify(draft));
  function updateGroup(input:Partial<CampaignGroup>){
    if(!draft||!group)return;
    setDraft({...draft,groups:draft.groups.map(value=>value.id===group.id?{...value,...input}:value)});
  }
  function report(text:string,bad=false){setFeedback([text,bad]);}
  async function copy(value:string,label:string) {
    try{await copyText(value);report(label+' kopiert');}catch{report('Der Browser hat den Zugriff auf die Zwischenablage gesperrt. Markiere den Text direkt.',true);}
  }
  async function persist(approve:boolean){
    if(!draft||!saved)return;
    const result=campaignSchema.safeParse(draft);
    if(!result.success){report(result.error.issues[0].message,true);return;}
    setBusy(true);setFeedback([]);
    try {
      const req=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaign:result.data,revision:saved.revision,approve})});
      const value=await req.json();
      if(!req.ok)throw Error(value.error);
      setSaved(value);setDraft(value.campaign);setApproval(false);report(approve?'Kampagne im CMS freigegeben':'Entwurf gespeichert');
    }catch(error){report(error instanceof Error?error.message:'Die Kampagne konnte nicht gespeichert werden.',true);}finally{setBusy(false);}
  }
  function exportFile(type:'keywords'|'ads',selection=false) {
    const result=campaignSchema.safeParse(draft);
    if(!result.success){report(result.error.issues[0].message,true);return;}
    const campaign=selection?launchSubset(result.data):result.data;
    const name='sebastian-'+(selection?'start-':'')+(type==='keywords'?'keywords.csv':'suchanzeigen.csv');
    download(name,csv(type==='keywords'?keywordRows(campaign):adsRows(campaign)));
    report('CSV-Datei heruntergeladen');
  }
  return <div className={styles.root} data-mode="dark">
    <header className={styles.header}><div className={styles.headerInner}>
    <a href="/admin" className={styles.brand}><img src="/media/project/sebastian-logo.svg" alt=""/><span>Sebastian Coaching<small>Kampagnenplanung</small></span></a>
    <div className={styles.controls}><a href="/admin/coaching" className={styles.button+' '+styles.quiet}>Coaching</a><a href="/admin" className={styles.button+' '+styles.quiet}>CMS</a></div>
    </div></header>
    <main className={ads.page}>
      <header className={styles.pageHead}><div><span className={styles.label}>Google Suche</span><h1>Google Ads</h1>
      <p>{draft?.name??'Kampagnenentwurf laden …'}</p></div>{draft&&<div className={styles.actions}>
        <span className={styles.badge}>{saved?.status==='approved'&&!dirty?'Freigegeben':'Entwurf'}</span>
        <Button onClick={()=>void persist(false)} loading={busy} disabled={!dirty}>Entwurf speichern</Button>
        <Button primary onClick={()=>setApproval(true)} disabled={busy||(!dirty&&saved?.status==='approved')}><Check size={17}/> Zur Freigabe</Button>
      </div>}</header>
      {feedback.length>0&&<Status text={(feedback[0]??'')} bad={feedback[1]}/>}
      {draft&&<><div className={styles.statGrid}>
        <div className={styles.stat}><Search size={17}/><b>{count}</b><span>Such-Keywords</span></div>
        <div className={styles.stat}><Target size={17}/><b>{draft.groups.length}</b><span>Anzeigengruppen</span></div>
        <div className={styles.stat}><ListFilter size={17}/><b>{draft.negative.length}</b><span>Ausschlüsse</span></div>
      </div>
      <div className={styles.editorTabs}>{sections.map(([key,label])=><Button quiet key={key} aria-pressed={key===tab} onClick={()=>setTab(key)}>{label}</Button>)}</div>
      {(tab==='keywords'||tab==='ads')&&group&&<div className={ads.editor}>
        <Panel><h2>Anzeigengruppen</h2><div className={ads.groupList}>{draft.groups.map(value=><button key={value.id} type="button" className={styles.actionRow} aria-pressed={group.id===value.id} onClick={()=>setGroupId(value.id)}>
          <span className={styles.rowIcon}><Target size={16}/></span><span><strong>{value.name}</strong><small>{value.keywords.length} Keywords</small></span></button>)}</div></Panel>
        {tab==='keywords'?<Section title={group.name} action={<Button quiet onClick={()=>void copy(keywordList(group.keywords),'Keywords')}><Copy size={16}/> Kopieren</Button>}>
          <div className={styles.form}>
            <p className={styles.copy}>{group.intent}</p>
            <div className={styles.pills}><span className={styles.badge}>{exact} genau passend</span><span className={styles.badge}>{group.keywords.length-exact} passende Wortgruppe</span></div>
            <Field label="Ein Keyword pro Zeile"><textarea className={ads.keywords} value={planText[group.id]??keywordList(group.keywords)} onChange={event=>{
              const raw=event.target.value;setPlanText({...planText,[group.id]:raw});updateGroup({keywords:parseKeywords(raw)});
            }}/></Field>
            <p className={styles.copy}>Eckige Klammern stehen für „Genau passend“. Anführungszeichen stehen für „Passende Wortgruppe“.</p>
            <div className={styles.actions}><Button onClick={()=>exportFile('keywords')}><ArrowDownToLine size={16}/> Alle Keywords als CSV</Button></div>
          </div>
        </Section>:<div className={styles.stack}>
          <Section title="Suchanzeige" action={<Button quiet onClick={()=>exportFile('ads')}><ArrowDownToLine size={16}/> Anzeigen als CSV</Button>}>
            <div className={styles.form}>
              <Field label="Zielseite"><Input type="url" value={group.landing} onChange={event=>updateGroup({landing:event.target.value})}/></Field>
              <div className={styles.fields}><Field label="Anzeigepfad 1"><Input maxLength={15} value={group.path1} onChange={event=>updateGroup({path1:event.target.value})}/></Field>
              <Field label="Anzeigepfad 2"><Input maxLength={15} value={group.path2} onChange={event=>updateGroup({path2:event.target.value})}/></Field></div>
              <div className={ads.adPreview}><small>Variantenansicht · Suche</small><p>{group.landing}</p><h3>{group.headlines.slice(0,3).join(' · ')}</h3><span>{group.descriptions[0]}</span></div>
            </div>
          </Section>
          <Section title="Überschriften" action={<Button quiet onClick={()=>void copy(group.headlines.join('\n'),'Überschriften')}><Copy size={16}/> Kopieren</Button>}>
            <Lines label="Überschrift" values={group.headlines} change={headlines=>updateGroup({headlines})} limit={30} count={15}/>
          </Section>
          <Section title="Anzeigentexte" action={<Button quiet onClick={()=>void copy(group.descriptions.join('\n'),'Anzeigentexte')}><Copy size={16}/> Kopieren</Button>}>
            <Lines label="Beschreibung" values={group.descriptions} change={descriptions=>updateGroup({descriptions})} limit={90} count={4}/>
          </Section>
        </div>}
      </div>}
      {tab==='assets'&&<div className={styles.grid}>
        <Section title="Ausschließende Keywords" action={<Button quiet onClick={()=>void copy(keywordList(draft.negative),'Ausschlüsse')}><Copy size={16}/> Kopieren</Button>}>
          <Field label="Kampagnenweite Ausschlüsse"><textarea className={ads.keywords} value={negativeText??keywordList(draft.negative)} onChange={event=>{setNegativeText(event.target.value);setDraft({...draft,negative:parseKeywords(event.target.value)});}}/></Field>
        </Section>
        <div className={styles.stack}>
          <Section title="Sitelinks" action={<Button quiet onClick={()=>void copy(draft.sitelinks.map(link=>[link.title,link.line1,link.line2,link.landing].join('\t')).join('\n'),'Sitelinks')}><Copy size={16}/> Kopieren</Button>}>
            <div className={styles.items}>{draft.sitelinks.map((link,index)=><details className={styles.editorItem} key={index}><summary>{link.title}<ExternalLink size={15}/></summary>
              <div className={styles.form}>{(['title','line1','line2','landing'] as const).map((key,i)=><Field key={key} label={['Titel','Beschreibung 1','Beschreibung 2','Zielseite'][i]}>
                <Input value={link[key]} maxLength={[25,35,35,2048][i]} onChange={event=>setDraft({...draft,sitelinks:draft.sitelinks.map((item,n)=>n===index?{...item,[key]:event.target.value}:item)})}/>
              </Field>)}</div></details>)}</div>
          </Section>
          <Section title="Zusatzinformationen" action={<Button quiet onClick={()=>void copy(draft.callouts.join('\n'),'Zusatzinformationen')}><Copy size={16}/> Kopieren</Button>}>
            <Lines label="Zusatzinformation" values={draft.callouts} change={callouts=>setDraft({...draft,callouts})} limit={25} count={20}/>
          </Section>
        </div>
      </div>}
      {tab==='launch'&&launch&&<div className={styles.grid}>
        <div className={styles.stack}><Section title="Kampagnen-Einstellungen"><div className={styles.form}>
          {(['name','locations','language','objective','bid'] as const).map((key,i)=><Field key={key} label={['Kampagnenname','Standort','Sprache','Ziel','Gebotsstrategie'][i]}><Input value={draft[key]} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></Field>)}
          <Field label="Tagesbudget in Euro"><Input min={0} step=".01" type="number" value={draft.dailyBudget} onChange={event=>setDraft({...draft,dailyBudget:Number(event.target.value)})}/></Field>
        </div></Section>
        <Section title="Startauswahl" action={<span className={styles.badge}>{launchCount} Keywords</span>}>
          <div className={styles.form}>
            <p className={styles.copy}>Der Export übernimmt die obersten Keywords jeder ausgewählten Gruppe. Verschiebe Suchbegriffe in der Keyword-Liste, um ihre Reihenfolge zu ändern.</p>
            <div className={styles.pills}>{draft.groups.map(entry=>{
              const selected=launch.groupIds.includes(entry.id);
              return <Button key={entry.id} quiet={!selected} primary={selected} aria-pressed={selected}
                disabled={selected&&launch.groupIds.length===1} onClick={()=>setDraft({...draft,launch:{...launch,groupIds:selected?launch.groupIds.filter(id=>id!==entry.id):[...launch.groupIds,entry.id]}})}>{entry.name}</Button>;
            })}</div>
            <Field label="Keywords pro ausgewählter Gruppe"><Input type="number" min={1} max={150} value={launch.limit} onChange={event=>setDraft({...draft,launch:{...launch,limit:Math.max(1,Math.min(150,Number(event.target.value)))}})}/></Field>
            <div className={styles.actions}>
              <Button quiet onClick={()=>exportFile('keywords',true)}><ArrowDownToLine size={16}/> Start-Keywords als CSV</Button>
              <Button quiet onClick={()=>exportFile('ads',true)}><ArrowDownToLine size={16}/> Start-Anzeigen als CSV</Button>
            </div>
          </div>
        </Section></div>
        <Section title="Check vor dem Launch" action={<Button quiet onClick={()=>void copy(draft.setup,'Startcheck')}><Clipboard size={16}/> Kopieren</Button>}>
          <Field label="Messung, Budget und Start"><textarea className={ads.checklist} value={draft.setup} onChange={event=>setDraft({...draft,setup:event.target.value})}/></Field>
          <div className={styles.actions}><Button quiet onClick={()=>exportFile('keywords')}><ArrowDownToLine size={16}/> Keyword-CSV</Button><Button quiet onClick={()=>exportFile('ads')}><ArrowDownToLine size={16}/> Anzeigen-CSV</Button></div>
        </Section>
      </div>}
      {approval&&<Modal title="Kampagnenentwurf freigeben" close={()=>setApproval(false)}>
        <div className={styles.stack}><h3>{draft.name}</h3><p>{count} Keywords · {draft.groups.length} Gruppen · {draft.dailyBudget.toLocaleString('de-DE')} € pro Tag.</p>
          <p className={styles.copy}>Die Freigabe dokumentiert den geprüften Stand im CMS. Die Kampagne wird in Google Ads separat eingerichtet und gestartet.</p>
          {feedback.length>0&&feedback[1]&&<Status text={(feedback[0]??'')} bad/>}
          <Button primary loading={busy} onClick={()=>void persist(true)}><Check size={17}/> Im CMS freigeben</Button>
        </div></Modal>}
      </>}
    </main>
  </div>;
}
