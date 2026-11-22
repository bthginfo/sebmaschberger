import {test} from 'node:test';
import {nativeInstagramCases} from '../src/lib/server/social/connectors/native-instagram.protocol';
for(const entry of nativeInstagramCases)test(entry.name,entry.run);
