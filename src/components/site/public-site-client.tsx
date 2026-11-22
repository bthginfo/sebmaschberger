"use client";

import dynamic from 'next/dynamic';
import {SiteView,type SiteViewProps} from './site-view';

const CreatorPublicSiteView=dynamic(()=>import('@/components/creator/creator-public-site').then(module=>module.CreatorPublicSiteView));

export function PublicSiteClient(props:Pick<SiteViewProps,'page'|'site'|'cartHref'|'translations'|'consent'>){return props.site.modules?.creator?.enabled?<CreatorPublicSiteView {...props}/>:<SiteView {...props}/>;}
