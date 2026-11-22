import '@/components/creator/creator-critical-styles';
import {PublicSiteClient} from './public-site-client';
import type {SiteViewProps} from './site-view';

/** Discover critical CSS on the server; load creator JavaScript only when enabled. */
export function PublicSiteView(props:Pick<SiteViewProps,'page'|'site'|'cartHref'|'translations'|'consent'>){return <PublicSiteClient {...props}/>;}
