import {test} from 'node:test';
import {carouselCases} from '../src/lib/server/social/connectors/carousel.protocol';
for(const entry of carouselCases)test(entry.name,entry.run);
