"use client";
import {SiteView,type SiteViewProps} from '@/components/site/site-view';
import {CreatorSite,CreatorSectionRenderer} from './creator-site';

/** Static public entry makes its CSS discoverable during SSR, before first paint.
 * The actual CMS remains behind the separate client-only editor boundary. */
const creatorComponents={site:CreatorSite,section:CreatorSectionRenderer};
export function CreatorPublicSiteView(props:SiteViewProps){return <SiteView {...props} creatorComponents={creatorComponents}/>;}
