import {json} from '@/lib/http';
import {commerceHandler as handler} from '@/lib/commerce/http';
import {publicCatalog} from '@/lib/commerce/service';
export const dynamic='force-dynamic';
export const GET=handler(async()=>json(await publicCatalog()));
