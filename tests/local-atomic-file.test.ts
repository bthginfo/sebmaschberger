import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rename,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {replaceLocalFile} from '../src/lib/server/atomic-file';

test('local atomic replacement retains the previous file during a transient Windows lock',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'cms-atomic-')),target=path.join(dir,'cms.json'),temporary=path.join(dir,'own.tmp');
 try{await writeFile(target,'previous');await writeFile(temporary,'next');let attempts=0;
  await replaceLocalFile(temporary,target,{rename:async(from,to)=>{assert.equal(await readFile(target,'utf8'),'previous');if(++attempts===1)throw Object.assign(Error('locked'),{code:'EPERM'});await rename(from,to);},unlink,wait:async milliseconds=>{assert.equal(milliseconds,25);}});
  assert.equal(attempts,2);assert.equal(await readFile(target,'utf8'),'next');await assert.rejects(readFile(temporary),{code:'ENOENT'});
 }finally{for(const file of [temporary,target])await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});await rmdir(dir);}
});

test('permanent local replacement errors clean only the temporary file and retain committed data',async()=>{
 const error=Object.assign(Error('full'),{code:'ENOSPC'});let attempts=0,cleanup=0;
 await assert.rejects(replaceLocalFile('own.tmp','cms.json',{rename:async()=>{attempts++;throw error;},unlink:async file=>{assert.equal(file,'own.tmp');cleanup++;},wait:async()=>assert.fail('permanent errors must not retry')}),error);
 assert.equal(attempts,1);assert.equal(cleanup,1);
});

test('persistent Windows locks have a bounded retry budget and never remove the destination',async()=>{
 let attempts=0;const waits:number[]=[];const error=Object.assign(Error('busy'),{code:'EBUSY'});
 await assert.rejects(replaceLocalFile('own.tmp','cms.json',{rename:async()=>{attempts++;throw error;},unlink:async file=>{assert.equal(file,'own.tmp');},wait:async ms=>{waits.push(ms);}}),error);
 assert.equal(attempts,5);assert.deepEqual(waits,[25,50,100,200]);
});
