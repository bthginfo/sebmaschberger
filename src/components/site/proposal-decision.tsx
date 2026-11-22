"use client";
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { proposalZone, type ProposalView } from '@/lib/proposals/model';
import { reportConfirmedOutcome } from '@/lib/analytics/client';
import styles from '@/components/creator/withdrawal.module.css';

const date = new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short',timeZone:proposalZone});
const currency = new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});

export function ProposalDecision() {
  const [proposal,setProposal]=useState<ProposalView>();
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(true);
  const key=useRef('');
  const pending=useRef(false);
  async function request(action:'read'|'accept'|'decline',signal?:AbortSignal){
    if(!key.current){setError('Öffnen Sie bitte den vollständigen Freigabelink.');setBusy(false);return;}
    try{
      const response=await fetch('/api/proposals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key.current,action}),signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Der Vorschlag konnte gerade nicht geladen werden.');
      if(signal?.aborted)return;
      setProposal(data.proposal);setError('');
      if(action==='accept')void reportConfirmedOutcome(data.statisticsProof);
    }catch(error){if(!signal?.aborted)setError(error instanceof Error?error.message:'Bitte versuchen Sie es erneut.');}
    finally{if(!signal?.aborted){setBusy(false);pending.current=false;}}
  }
  useEffect(()=>{
    key.current=location.hash.slice(1);
    const controller=new AbortController();
    void request('read',controller.signal);
    return()=>controller.abort();
  },[]);
  function decide(action:'accept'|'decline'){
    if(pending.current)return;
    pending.current=true;setBusy(true);setError('');void request(action);
  }
  return <section className={styles.form} aria-live="polite">
    {busy&&!proposal&&<p role="status">Ihr Vorschlag wird geladen …</p>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {proposal&&<>
      <h2>{proposal.title}</h2>
      <p style={{whiteSpace:'pre-wrap'}}>{proposal.description}</p>
      <dl className={styles.review}>
        {proposal.kind==='offer'?<div><dt>Gesamtpreis</dt><dd>{currency.format((proposal.priceCents??0)/100)}</dd></div>
          : <div><dt>Vorgeschlagener Termin</dt><dd>{proposal.startsAt?date.format(new Date(proposal.startsAt)):''} Uhr · {proposal.minutes} Minuten</dd></div>}
        <div><dt>Antwort möglich bis</dt><dd>{date.format(new Date(proposal.expiresAt))} Uhr</dd></div>
      </dl>
      {proposal.status==='offered'?<div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={busy} onClick={()=>decide('accept')}>{proposal.kind==='offer'?'Angebot annehmen':'Termin annehmen'}</button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={()=>decide('decline')}>Ablehnen</button>
      </div>:<p role="status"><CheckCircle2 size={19} aria-hidden="true"/> {proposal.status==='accepted'?'Ihre Annahme ist eingegangen.':'Ihre Ablehnung ist eingegangen.'}</p>}
      <small>Bei Rückfragen wenden Sie sich bitte an Ihre Ansprechperson.</small>
    </>}
  </section>;
}
