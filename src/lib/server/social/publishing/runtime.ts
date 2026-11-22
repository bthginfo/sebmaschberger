import {connectorService,nativePipeline,nativeAccountViews,nativeAccountView} from '../connectors/runtime';
import 'server-only';
import {randomUUID} from 'node:crypto';
import {encrypt,decrypt} from '@/lib/security';
import {createInstagramDriver} from './instagram';
import {createPlannerOperations} from './operations';
import {createPublishingScheduler} from './scheduler';
import {plannerReadiness,publishingRepository} from './store';
import {verifyStoredMedia,providerMediaUrl} from './media-read';
import {enqueuePublishingTick} from './queue';

// This runtime deliberately excludes Sharp, rendering and upload preparation from the Queue worker graph.
const dependencies={repo:publishingRepository,now:()=>new Date().toISOString(),readiness:plannerReadiness,driver:createInstagramDriver({fetch:(...args)=>fetch(...args)}),encrypt,decrypt,verifyMedia:verifyStoredMedia,native:{accounts:nativeAccountViews,account:nativeAccountView,approved:nativePipeline.approved,reconcile:nativePipeline.reconcile}};
export const plannerOperations=createPlannerOperations(dependencies);
export const publishingScheduler=createPublishingScheduler({...dependencies,nativeMaintenance:connectorService.maintain,nativeTick:nativePipeline.tick,uuid:randomUUID,providerUrl:providerMediaUrl,enqueue:enqueuePublishingTick});
