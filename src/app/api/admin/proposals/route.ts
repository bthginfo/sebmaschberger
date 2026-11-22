import { requireAdmin } from '@/lib/auth';
import { AppError, getDraftConfig, getPublished, getRecord, getSettings, rateLimit } from '@/lib/db';
import { z } from 'zod';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { publicLaunchAddress } from '@/lib/launch-content.mjs';
import { PROPOSAL_PATH, proposalChange, proposalView, type StoredProposal } from '@/lib/proposals/model';
import { issueOrRevoke } from '@/lib/proposals/service';
import { noteActivity } from '@/lib/team/activity';
import { resolvePage } from '@/lib/blog';

export const runtime = 'nodejs';
export const GET = handler(async request=>{
  await requireAdmin();
  const id=z.uuid().parse(new URL(request.url).searchParams.get('inquiry'));
  const record=await getRecord<{proposal?:StoredProposal}>('inquiries',id);
  if(!record)throw new AppError('Diese Anfrage wurde nicht gefunden.',404);
  return json({proposal:record.proposal?proposalView(record.proposal):null});
});

export const POST = handler(async request=>{
  sameOrigin(request);
  const owner=await requireAdmin();
  await rateLimit(ipKey(request,'proposal-admin'),20,60);
  const input=proposalChange.parse(await readJson(request,16000));
  let base:URL|undefined;
  if(input.action==='issue'){
    const [draft,published,settings]=await Promise.all([getDraftConfig(),getPublished(),getSettings()]);
    if(!draft.modules?.proposals?.enabled)throw new AppError('Aktivieren Sie Projektfreigaben zuerst unter Einstellungen.',403);
    if(resolvePage(published,PROPOSAL_PATH.slice(1)))throw new AppError('Die Adresse für Projektfreigaben wird bereits von einer Seite verwendet.',409);
    const origin=publicLaunchAddress(settings.siteUrl)?settings.siteUrl:
      !process.env.VERCEL&&/^http:\/\/(?:localhost|127\.0\.0\.1):\d{2,5}\/?$/.test(settings.siteUrl)?settings.siteUrl:null;
    if(!origin)throw new AppError('Speichern Sie zuerst die endgültige HTTPS-Adresse der Website.',409);
    base=new URL(PROPOSAL_PATH,origin);
  }
  const result=await issueOrRevoke(input);
  await noteActivity(owner,input.action==='issue'?'proposal.issued':'proposal.revoked',input.inquiryId);
  if(base&&result.key)base.hash=result.key;
  return json({proposal:result.proposal,link:base?.href},input.action==='issue'?201:200);
});
