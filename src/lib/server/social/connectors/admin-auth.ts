import 'server-only';
import {requireAdmin} from '@/lib/auth';
export async function connectorActor(){const session=await requireAdmin();return{id:'admin',sessionId:session.id};}
