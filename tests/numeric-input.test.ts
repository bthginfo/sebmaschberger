import assert from 'node:assert/strict';
import {test} from 'node:test';
import {numericDraft} from '../src/lib/social/numeric-input';

test('editing a replacement number never inserts the minimum as a prefix',()=>{
 let stored=118;
 for(const text of ['', '9', '96'])stored=numericDraft(text,6,600)??stored;
 assert.equal(stored,96);
 assert.equal(numericDraft('',6,600,true),null);
});
test('negative and fractional edits stay possible; out-of-range values clamp on blur',()=>{
 assert.equal(numericDraft('-',-10000,10000),null);
 assert.equal(numericDraft('-125',-10000,10000),-125);
 assert.equal(numericDraft('0.45',0,1),.45);
 assert.equal(numericDraft('2',6,600),null);
 assert.equal(numericDraft('2',6,600,true),6);
 assert.equal(numericDraft('700',6,600,true),600);
});
