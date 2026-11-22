import 'server-only';
import {unstable_cache} from 'next/cache';
import {databaseCacheNamespace,getSettings} from './db';
export const cachedSettings=unstable_cache(getSettings,['ws-private-settings-v2',databaseCacheNamespace],{tags:['ws-settings'],revalidate:false});
