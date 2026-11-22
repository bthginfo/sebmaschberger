import {analytics} from '@/lib/server/analytics/store';
export const dynamic='force-dynamic';export async function GET(){return Response.json(await analytics.publicConfig(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
