import {test} from 'node:test';
import {unifiedInstagramCases} from '../src/lib/server/social/connectors/unified-instagram.protocol';
for(const entry of unifiedInstagramCases)test(entry.name,entry.run);
