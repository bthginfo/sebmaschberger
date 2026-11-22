import test from 'node:test';
import {nativeCoreCases} from '../src/lib/server/social/connectors/native-core.protocol';
for(const entry of nativeCoreCases)test(entry.name,entry.run);
