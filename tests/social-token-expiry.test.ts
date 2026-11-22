import {test} from 'node:test';
import {tokenExpiryCases} from '../src/lib/server/social/connectors/token-expiry.protocol';
for(const entry of tokenExpiryCases)test(entry.name,entry.run);
