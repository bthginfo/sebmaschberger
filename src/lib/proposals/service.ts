import 'server-only';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError, getRecord, updateExistingRecord } from '../db';
import { digest } from '../security';
import { resolveWallTime } from '../social/publishing/time';
import type { Inquiry } from '../types';
import { proposalChange, proposalView, proposalZone, type StoredProposal } from './model';
import type { z } from 'zod';

type StoredInquiry = Inquiry & { proposal?: StoredProposal };

export async function issueOrRevoke(input: z.infer<typeof proposalChange>) {
  const secret = input.action === 'issue' ? randomBytes(32).toString('base64url') : undefined;
  const now = new Date();
  const saved = await updateExistingRecord<StoredInquiry>('inquiries',input.inquiryId,current=>{
    if(current.kind==='withdrawal'||current.status==='spam')throw new AppError('Für diese Nachricht ist keine Freigabe möglich.',409);
    const previous=current.proposal;
    if((previous?.revision??0)!==input.revision)throw new AppError('Der Vorschlag wurde inzwischen geändert. Öffnen Sie die Anfrage erneut.',409);
    if(previous?.status==='accepted')throw new AppError('Ein bereits angenommener Vorschlag bleibt als Nachweis erhalten.',409);
    if(input.action==='revoke'){
      if(!previous||previous.status!=='offered')throw new AppError('Es gibt keinen offenen Freigabelink.',409);
      return {...current,proposal:{...previous,status:'revoked',revision:previous.revision+1,tokenHash:undefined}};
    }
    const data=input.proposal;
    let expiresAt=now.getTime()+data.validDays*86400000;
    let extra: Pick<StoredProposal,'startsAt'|'minutes'|'priceCents'>;
    if(data.kind==='appointment'){
      const choices=resolveWallTime(data.time,proposalZone);
      if(choices.length!==1||Date.parse(choices[0].instant)<=now.getTime()+60000)throw new AppError('Bitte wählen Sie einen eindeutigen Termin in der Zukunft.');
      expiresAt=Math.min(expiresAt,Date.parse(choices[0].instant));
      extra={startsAt:choices[0].instant,minutes:data.minutes};
    }else extra={priceCents:data.priceCents};
    return {...current,proposal:{
      ...extra,kind:data.kind,title:data.title,description:data.description,
      revision:(previous?.revision??0)+1,status:'offered',createdAt:now.toISOString(),
      expiresAt:new Date(expiresAt).toISOString(),tokenHash:digest(secret!)
    }};
  });
  if(!saved?.proposal)throw new AppError('Diese Anfrage wurde nicht gefunden.',404);
  return {proposal:proposalView(saved.proposal),key:secret?input.inquiryId+'.'+secret:undefined};
}

export async function accessProposal(key:string,action:'read'|'accept'|'decline'){
  const [id,secret]=key.split('.');
  const hash=Buffer.from(digest(secret),'hex');
  const now=new Date();
  function available(record:StoredInquiry|null){
    const proposal=record?.proposal;
    if(!proposal?.tokenHash||!/^[a-f0-9]{64}$/.test(proposal.tokenHash)||
      !timingSafeEqual(Buffer.from(proposal.tokenHash,'hex'),hash)||proposal.status==='revoked'){
      throw new AppError('Dieser Freigabelink ist nicht verfügbar.',404);
    }
    if(Date.parse(proposal.expiresAt)<=now.getTime())throw new AppError('Die Frist für diesen Vorschlag ist abgelaufen.',410);
    return proposal;
  }
  if(action==='read')return {id,proposal:proposalView(available(await getRecord<StoredInquiry>('inquiries',id)))};
  const saved=await updateExistingRecord<StoredInquiry>('inquiries',id,current=>{
    const proposal=available(current),status=action==='accept'?'accepted':'declined';
    if(proposal.status===status)return current;
    if(proposal.status!=='offered')throw new AppError('Für diesen Vorschlag wurde bereits entschieden.',409);
    return {...current,proposal:{...proposal,status,revision:proposal.revision+1,decidedAt:now.toISOString()}};
  });
  return {id,proposal:proposalView(available(saved))};
}
