import test from 'node:test';
import assert from 'node:assert/strict';
import {isClientPageLink} from '../src/lib/navigation';

test('public content navigates on the client while protected tools and downloads stay native',()=>{
  for(const href of ['/','/websites','/funktionen','/tools','/kontakt?service=Contentplaner','/demo/mika-flux','/demo/mika-flux/shop'])assert.equal(isClientPageLink(href),true,href);
  for(const href of ['#inhalte','mailto:hello@example.org','https://external.example/page','//external.example/page','/admin','/admin/login','/api/commerce/download/token','/demo/mika-flux/cms','/assets/sample.zip','/downloads/example.pdf','/custom/file.csv'])assert.equal(isClientPageLink(href),false,href);
  assert.equal(isClientPageLink('/documents/file',{download:true}),false);
  assert.equal(isClientPageLink('/tools',{target:'_blank'}),false);
});
