import {cleanupAssistantApprovals} from '@/lib/server/assistant/workspace-next';
import {cleanupAgentAudit} from '@/lib/server/agents/store';
import {analytics} from '@/lib/server/analytics/store';
import {newsletter} from '@/lib/server/newsletter/store';
import {wakeNewsletter} from '@/lib/server/newsletter/queue';
import {timingSafeEqual} from 'node:crypto';
import {dailyCleanup,getDraftConfig} from '@/lib/db';
import {publishingModuleEnabled} from '@/lib/social/publishing/activation';
import {digest} from '@/lib/security';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){const expected=process.env.CRON_SECRET;const actual=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';if(!expected||!timingSafeEqual(Buffer.from(digest(expected)),Buffer.from(digest(actual))))return Response.json({error:'Nicht autorisiert.'},{status:401});await dailyCleanup();await analytics.cleanup();await cleanupAgentAudit();await cleanupAssistantApprovals();await newsletter.prune();await wakeNewsletter().catch(()=>console.warn("Newsletter queue wake failed"));const config=await getDraftConfig();const publishing=publishingModuleEnabled(config)?await(await import('@/lib/server/social/publishing/runtime')).publishingScheduler.recover():undefined;return Response.json({ok:true,...(publishing?{publishing}:{})},{headers:{'Cache-Control':'no-store'}});}
