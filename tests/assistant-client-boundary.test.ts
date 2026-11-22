import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {safeLink} from '../src/lib/safe-links';
import {safeLink as serverSafeLink} from '../src/lib/security';

// tsx already declares/pins esbuild. Reuse that installed test-runner dependency;
// no separate project dependency, installation or network is needed for this check.
const projectRequire=createRequire(import.meta.url),tsxRequire=createRequire(projectRequire.resolve('tsx/package.json'));
const {build}=tsxRequire('esbuild') as typeof import('esbuild');

test('page-plan adapter and complete website schema build as a browser graph without Node security code',async()=>{
 const result=await build({absWorkingDir:fileURLToPath(new URL('../',import.meta.url)),entryPoints:['src/lib/assistant/pages.ts'],bundle:true,platform:'browser',format:'esm',write:false,metafile:true,logLevel:'silent'});
 assert(result.outputFiles?.length);assert(result.metafile);
 const inputs=Object.keys(result.metafile.inputs);assert(inputs.some(name=>name.endsWith('src/lib/validation.ts')));assert(inputs.some(name=>name.endsWith('src/lib/safe-links.ts')));assert(!inputs.some(name=>name.endsWith('src/lib/security.ts')));
});

test('client and server use the same link predicate while executable and protocol-relative links remain rejected',()=>{
 assert.equal(safeLink,serverSafeLink);
 for(const value of ['', '/kontakt','#team','https://example.org/','tel:+490000000000','mailto:info@example.org'])assert.equal(safeLink(value),true,value);
 for(const value of ['javascript:alert(1)','data:text/html,test','//example.org','/\\example.org','vbscript:test'])assert.equal(safeLink(value),false,value);
});
