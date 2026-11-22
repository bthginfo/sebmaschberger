import {rateLimit} from '@/lib/db';
import {handler,ipKey,json,readJson,sameOrigin} from '@/lib/http';
import {proposalAccess} from '@/lib/proposals/model';
import {accessProposal} from '@/lib/proposals/service';
import {outcomeProof} from '@/lib/server/analytics/outcome-proof';

export const runtime = 'nodejs';
export const POST = handler(async request=>{
  sameOrigin(request);
  await rateLimit(ipKey(request,'project-proposal'),24,60);
  const {key,action}=proposalAccess.parse(await readJson(request,3000));
  const {id,proposal}=await accessProposal(key,action);
  return json({proposal,statisticsProof:action==='accept'&&proposal.decidedAt
    ? outcomeProof(proposal.kind,id+':'+proposal.revision,proposal.decidedAt):undefined});
});
