import {createInstagramClient} from './instagram';
import {createFacebookClient} from './facebook';
import {createThreadsClient} from './threads';
import {createLinkedinClient} from './linkedin';
import {createPinterestClient} from './pinterest';
import {createTiktokClient} from './tiktok';
import {createYoutubeClient} from './youtube';
import {createBlueskyClient} from './bluesky';
import type {ConnectorProvider} from '../../../social/connectors/model';
import type {ProviderClient,ProviderFactoryOptions} from './provider-contract';

export function createConnectorClients(options:ProviderFactoryOptions):Record<ConnectorProvider,ProviderClient>{
 return{instagram:createInstagramClient(options),facebook:createFacebookClient(options),threads:createThreadsClient(options),linkedin:createLinkedinClient(options),pinterest:createPinterestClient(options),tiktok:createTiktokClient(options),youtube:createYoutubeClient(options),bluesky:createBlueskyClient(options)};
}
