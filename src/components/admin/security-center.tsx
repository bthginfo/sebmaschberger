'use client';
import {useCallback,useEffect,useState} from 'react';
import {ArrowUpRight,ClipboardCheck,LockKeyhole,RefreshCw,ShieldCheck} from 'lucide-react';
import type {DependencyReport} from '@/lib/server/dependency-audit';
import { useAdminLanguage } from "@/components/admin/admin-language";

const severityText={low:'Niedrig',moderate:'Mittel',high:'Hoch',critical:'Kritisch'};
export function SecurityCenter(){
  const { t } = useAdminLanguage();
 const [report,setReport]=useState<DependencyReport|null>(null);
 const [workflow,setWorkflow]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [failure,setFailure]=useState(false);
 const [https,setHttps]=useState(false);
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setFailure(false);
  try{
   const response=await fetch('/api/admin/security',{cache:'no-store',signal});
   const data=await response.json() as {report?:DependencyReport;workflow?:string};
   setWorkflow(data.workflow??null);
   if(!response.ok||!data.report)throw new Error('Scan unavailable');
   setReport(data.report);
  }catch{if(!signal?.aborted)setFailure(true);}
  finally{if(!signal?.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  setHttps(window.location.protocol==='https:');
  void load(controller.signal);
  return()=>controller.abort();
 },[load]);
 const checked=report?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(report.checkedAt)):null;
 return <section className="security-center" aria-labelledby="security-title">
  <div className="security-heading"><p className="security-tag">{t("Verwaltung")}</p><h1 id="security-title">{t("Sicherheit.")}</h1><p>{t("Bekannte Schwachstellen in den eingesetzten Paketen und der Schutz dieses Arbeitsbereichs auf einen Blick.")}</p></div>
  <div className="security-stats">
   <article className="security-card"><LockKeyhole size={22}/><small>{t("Transport")}</small><strong>{https?t("HTTPS aktiv"):t("Lokale HTTP-Verbindung")}</strong><p>{t("Verbindung zum aktuellen Arbeitsbereich.")}</p></article>
   <article className="security-card"><ShieldCheck size={22}/><small>{t("Arbeitsbereich")}</small><strong>{t("Anmeldung erforderlich")}</strong><p>{t("Die Sicherheitsübersicht ist geschützt und wird privat ausgeliefert.")}</p></article>
   <article className="security-card"><ClipboardCheck size={22}/><small>{t("Pakete geprüft")}</small><strong>{report?report.packageVersions.toLocaleString('de-DE'):loading?t("Prüfung läuft …"):t("Ausstehend")}</strong><p>{checked?'Zuletzt geprüft am '+checked:t("Gepinnte Versionen aus dem Lockfile")}</p></article>
  </div>
  <article className="security-findings">
   <header><div><h2>{t("Dependency-Check")}</h2><p>{t("Abgleich mit der Open Source Vulnerability Database.")}</p></div><button type="button" disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/>{t("Status laden")}</button></header>
   <div aria-live="polite">{loading&&<p>{t("Prüfung läuft …")}</p>}{failure&&<p role="alert">{t("Der Prüfdienst ist gerade nicht erreichbar. Bitte später erneut versuchen.")}</p>}{report&&(!report.findings.length&&!report.partial?<p>{t("Für die geprüften Versionen wurden aktuell keine bekannten Hinweise gefunden.")}</p>:<><ul>{report.findings.map(item=><li key={item.id}><div><a href={'https://osv.dev/vulnerability/'+item.id} target="_blank" rel="noreferrer">{item.id}<ArrowUpRight size={14}/></a><p>{item.packages.join(' · ')}</p></div>{item.severity&&<span className="security-severity" data-level={item.severity}>{t(severityText[item.severity])}</span>}</li>)}</ul>{report.partial&&<p>{t("Der Prüfdienst hat einen Teilbericht geliefert. Weitere Details stehen im Workflow.")}</p>}</>)}</div>
  </article>
  <div className="security-footer">{workflow&&<a className="security-link" href={workflow} target="_blank" rel="noreferrer">{t("Prüfläufe in GitHub")}<ArrowUpRight size={16}/></a>}<p>{t("GitHub prüft neue Änderungen und startet jede Woche einen weiteren Lauf.")}</p></div>
 </section>;
}
