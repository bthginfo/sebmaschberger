import {test} from 'node:test';
import {journeyCases} from '../src/lib/social/connectors/setup-journey.protocol';
for(const entry of journeyCases)test(entry.name,entry.run);
