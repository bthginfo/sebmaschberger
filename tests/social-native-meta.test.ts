import {test} from 'node:test';
import {nativeMetaProtocolCases} from '../src/lib/server/social/connectors/native-meta.protocol';

for(const entry of nativeMetaProtocolCases)test(entry.name,entry.run);
