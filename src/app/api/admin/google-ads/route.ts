import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { AppError, getRecord, mutateRecord } from '@/lib/db';
import { handler, json, readJson, sameOrigin } from '@/lib/http';
import { campaignSchema } from '@/lib/search-ads/model';
import type { CampaignRecord } from '@/lib/search-ads/model';
import { seedCampaign, updateEarlierDraft } from '@/lib/search-ads/seed';

export const dynamic = 'force-dynamic';
const collection = 'search-ads-planning', id = 'sebastian-coaching';
const initial = ():CampaignRecord => ({ campaign: seedCampaign(), revision: 0, status: 'draft', approvedAt: null });
export const GET = handler(async () => {
  await requireAdmin();
  const saved = await getRecord<CampaignRecord>(collection,id);
  return json(saved ? updateEarlierDraft(saved) : initial());
});
export const PUT = handler(async request => {
  sameOrigin(request);
  await requireAdmin();
  const input = z.object({ campaign: campaignSchema, revision: z.number().int().nonnegative(), approve: z.boolean() }).strict().parse(await readJson(request,350_000));
  const now = new Date().toISOString();
  const updated=await mutateRecord<CampaignRecord>(collection,id,initial(),saved=>{
    const current = updateEarlierDraft(saved);
    if(current.revision!==input.revision || !input.campaign.launch)throw new AppError('Der Kampagnenentwurf hat sich geändert. Lade die Seite neu.',409);
    return { campaign:input.campaign,revision:current.revision+1,status:input.approve?'approved':'draft',approvedAt:input.approve?now:null };
  });
  return json(updated);
});
