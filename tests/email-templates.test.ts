import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultEmailTemplates,renderEmailTemplate} from '../src/lib/email-templates';
test('editable plain-text templates substitute only explicitly supplied values',()=>{assert.equal(renderEmailTemplate('Hi {brand}: {orderId}; {secret}',{brand:'Own shop',orderId:'123'}),'Hi Own shop: 123; {secret}');assert.equal(renderEmailTemplate('{constructor} {process.env}',{}),'{constructor} {process.env}');assert(renderEmailTemplate(defaultEmailTemplates.orderBody,{brand:'Own shop',orderId:'123',items:'1 x Pack',total:'10 EUR',receiptUrl:'https://example.invalid/order'}).includes('https://example.invalid/order'));});
