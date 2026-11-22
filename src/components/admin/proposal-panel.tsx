"use client";
import { useState, type FormEvent } from 'react';
import { Copy, Link2, RefreshCw } from 'lucide-react';
import type { Inquiry } from '@/lib/types';
import { proposalStatusLabels, type ProposalView } from '@/lib/proposals/model';
import { BusinessNumberInput } from './business-number-input';
import { Button, Field, Input, Modal, Notice, Select, Textarea, api, errorMessage, formatDate } from './admin-ui';
import { useAdminLanguage } from "@/components/admin/admin-language";

export function ProposalPanel({ inquiry, enabled, onChange }: { inquiry:Inquiry; enabled:boolean; onChange:(proposal?:ProposalView)=>void }) {
  const { language, t } = useAdminLanguage();
  const proposal=inquiry.proposal;
  const [kind,setKind]=useState<'offer'|'appointment'>('offer');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [priceCents,setPrice]=useState<number|undefined>();
  const [time,setTime]=useState('');
  const [minutes,setMinutes]=useState('30');
  const [validDays,setDays]=useState(7);
  const [open,setOpen]=useState<'issue'|'revoke'|null>(null);
  const [link,setLink]=useState('');
  const [copied,setCopied]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function refresh(){
    setBusy(true);setError('');
    try{const data=await api<{proposal:ProposalView|null}>('/api/admin/proposals?inquiry='+encodeURIComponent(inquiry.id));onChange(data.proposal??undefined);}
    catch(error){setError(errorMessage(error));}finally{setBusy(false);}
  }
  async function save(event?:FormEvent<HTMLFormElement>){
    event?.preventDefault();
    if(!open||busy)return;
    setBusy(true);setError('');
    try{
      const result=await api<{proposal:ProposalView;link?:string}>('/api/admin/proposals',{
        method:'POST',body:JSON.stringify({action:open,inquiryId:inquiry.id,revision:proposal?.revision??0,
          ...(open==='issue'?{proposal:{kind,title,description,validDays,...(kind==='offer'?{priceCents}:{time,minutes:Number(minutes)})}}:{})})
      });
      onChange(result.proposal);setLink(result.link??'');setCopied(false);setOpen(null);
    }catch(error){setError(errorMessage(error));}finally{setBusy(false);}
  }
  async function copy(){
    try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError('Markieren Sie den Link und kopieren Sie ihn manuell.');}
  }
  const expired=proposal?.status==='offered'&&Date.parse(proposal.expiresAt)<=Date.now();
  return <section className="cms-proposal-panel">
    <div className="cms-inline-heading"><h3><Link2 size={17}/>{" " + t("Projektfreigabe")}</h3>{proposal&&<span className="cms-team-status">{expired?t("Abgelaufen"):proposalStatusLabels[proposal.status]}</span>}</div>
    <p>{proposal?proposal.title:t("Senden Sie einen persönlichen Link für ein Angebot oder einen Termin.")}</p>
    {proposal?.decidedAt&&<small>{t("Antwort am") + " "}{formatDate(proposal.decidedAt, true, language)}</small>}
    <div className="cms-team-actions">
      {enabled&&proposal?.status!=='accepted'&&<Button onClick={()=>{setError('');setOpen('issue');}} disabled={busy}>{proposal?t("Neuen Link erstellen"):t("Vorschlag erstellen")}</Button>}
      {proposal&&<Button variant="quiet" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={15}/>{t("Status prüfen")}</Button>}
      {proposal?.status==='offered'&&<Button variant="quiet" onClick={()=>{setError('');setOpen('revoke');}} disabled={busy}>{t("Link zurückziehen")}</Button>}
    </div>
    {error&&!open&&!link&&<Notice tone="error">{t(error)}</Notice>}
    {open==='issue'&&<Modal title={t("Vorschlag vorbereiten")} onClose={()=>{if(!busy)setOpen(null);}} busy={busy}
      footer={<Button variant="primary" type="submit" form="cms-proposal" busy={busy} disabled={kind==='offer'&&priceCents===undefined}>{t("Freigabelink erstellen")}</Button>}>
      <form id="cms-proposal" className="cms-team-form" onSubmit={save}>
        {proposal?.status==='offered'&&<Notice>{t("Ein neuer Vorschlag ersetzt den bisherigen Link.")}</Notice>}
        <Field label={t("Art des Vorschlags")}><Select value={kind} onChange={event=>setKind(event.target.value as typeof kind)}><option value="offer">{t("Angebot")}</option><option value="appointment">{t("Terminvorschlag")}</option></Select></Field>
        <Field label={t("Titel")}><Input value={title} onChange={event=>setTitle(event.target.value)} required minLength={3} maxLength={150}/></Field>
        <Field label={kind==='offer'?t("Leistungsumfang und Konditionen"):t("Worum geht es beim Termin?")}><Textarea value={description} onChange={event=>setDescription(event.target.value)} required minLength={10} maxLength={4000} rows={5}/></Field>
        {kind==='offer'?<Field label={t("Gesamtpreis in Euro")}><BusinessNumberInput value={priceCents} money min={0} max={99999999} onChange={setPrice}/></Field>:
          <><Field label={t("Datum und Uhrzeit")} hint={t("Ortszeit Deutschland")}><Input type="datetime-local" required value={time} onChange={event=>setTime(event.target.value)}/></Field>
          <Field label={t("Dauer in Minuten")}><Input type="number" required min={15} max={240} value={minutes} onChange={event=>setMinutes(event.target.value)}/></Field></>}
        <Field label={t("Antwortfrist")}><Select value={validDays} onChange={event=>setDays(Number(event.target.value))}>{[3,7,14,30].map(days=><option key={days} value={days}>{days}{" " + t("Tage")}</option>)}</Select></Field>
        {error&&<Notice tone="error">{t(error)}</Notice>}
      </form>
    </Modal>}
    {open==='revoke'&&<Modal title={t("Freigabelink zurückziehen?")} onClose={()=>{if(!busy)setOpen(null);}} busy={busy}
      footer={<Button variant="danger" onClick={()=>void save()} busy={busy}>{t("Link zurückziehen")}</Button>}>
      <p>{t("Der bisherige Link wird ungültig. Sie können anschließend einen neuen Vorschlag erstellen.")}</p>
      {error&&<Notice tone="error">{t(error)}</Notice>}
    </Modal>}
    {link&&<Modal title={t("Freigabelink teilen")} onClose={()=>{setLink('');setError('');}}
      footer={<Button variant="primary" onClick={()=>void copy()}><Copy size={16}/>{copied?t("Kopiert"):t("Link kopieren")}</Button>}>
      <p>{t("Teilen Sie den Link mit der Person, die den Vorschlag prüfen soll. Die Antwort erscheint in dieser Anfrage.")}</p>
      <Field label={t("Persönlicher Freigabelink")}><Input readOnly value={link}/></Field>
      {error&&<Notice tone="error">{t(error)}</Notice>}
    </Modal>}
  </section>;
}
