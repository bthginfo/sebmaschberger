import type {ConnectionView} from './model';

export type AccountCheck = {username:string} | {failure:string; message:string};
export function connectionAfterCheck(previous:ConnectionView, result:AccountCheck, at:string):ConnectionView {
  const failed = 'failure' in result;
  const rejected = failed && ['expired','permission','configuration','invalid'].includes(result.failure);
  return {...previous, revision:previous.revision+1,
    username:failed ? previous.username : result.username,
    status:failed ? rejected ? result.failure === 'expired' ? 'expired' : 'configured' : previous.status : 'connected',
    generation:previous.generation + (rejected ? 1 : 0),
    checkedAt:failed && !rejected ? previous.checkedAt : at,
    lastError:failed ? result.message.slice(0,500) : null};
}

export function connectionCoversPublication(expiresAt:string|null, scheduledAt:string|null, now:string):boolean {
  return Boolean(expiresAt && scheduledAt && Date.parse(expiresAt) > Math.max(Date.parse(now),Date.parse(scheduledAt)+3_600_000));
}
