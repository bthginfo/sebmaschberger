import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {planStarterUpgrade,writeUpgradePreview} from '../scripts/lib/starter-upgrade.mjs';

const git=(cwd:string,...args:string[])=>execFileSync('git',['-c','user.name=Starter Test','-c','user.email=starter@example.invalid',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const file=(dir:string,name:string)=>readFile(path.join(dir,name),'utf8');
async function put(dir:string,name:string,content:string|object){
  const destination=path.join(dir,name);
  await mkdir(path.dirname(destination),{recursive:true});
  await writeFile(destination,typeof content==='string'?content:JSON.stringify(content,null,2)+'\n');
}
function commit(dir:string){
  git(dir,'add','--all');
  git(dir,'commit','-qm','Fixture');
  return git(dir,'rev-parse','HEAD');
}

test('starter updates merge a customer design in a detached preview and protect seeds and secrets',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'starter-upgrade-test-'));
  const neutral=path.join(root,'neutral'),customer=path.join(root,'kunde'),preview=path.join(root,'vorschau');
  const repository='https://example.test/website-starter';
  const original=['const button = "old";','// 1','// 2','// 3','// 4','// 5','// 6','const theme = "starter";',''].join('\n');
  try {
    for(const dir of [neutral,customer]){await mkdir(dir);git(dir,'init','-q','-b','main');await put(dir,'.gitignore','.env.local\n.data/\n');}
    await put(neutral,'template.manifest.json',{repository,version:'1.0.0'});
    await put(neutral,'src/app/view.ts',original);
    await put(neutral,'src/data/content.json',{title:'Starter'});
    await put(neutral,'package.json',{name:'starter',version:'1.0.0',scripts:{build:'next build'}});
    const base=commit(neutral);
    await put(customer,'project/origin.json',{template:repository,version:'1.0.0',sourceCommit:base});
    await put(customer,'template.manifest.json',{repository,version:'1.0.0'});
    await put(customer,'src/app/view.ts',original.replace('"starter"','"customer"'));
    await put(customer,'src/data/content.json',{title:'Kundentexte'});
    await put(customer,'package.json',{name:'kunde',version:'0.4.0',scripts:{build:'next build'}});
    await put(customer,'.env.local','FIXTURE_ONLY=synthetic\n');
    const previousCustomer=commit(customer);
    await put(neutral,'template.manifest.json',{repository,version:'1.1.0'});
    await put(neutral,'src/app/view.ts',original.replace('"old"','"new"'));
    await put(neutral,'src/data/content.json',{title:'Neuer Seed'});
    await put(neutral,'package.json',{name:'starter',version:'1.1.0',scripts:{build:'next build',check:'tsc'}});
    const next=commit(neutral);
    const plan=await planStarterUpgrade(neutral,customer);
    assert.deepEqual(plan.conflicts,[]);
    await writeUpgradePreview(plan,preview);
    assert.match(await file(preview,'src/app/view.ts'),/button = "new"/);
    assert.match(await file(preview,'src/app/view.ts'),/theme = "customer"/);
    assert.equal(JSON.parse(await file(preview,'src/data/content.json')).title,'Kundentexte');
    const pkg=JSON.parse(await file(preview,'package.json'));
    assert.equal(pkg.name,'kunde');assert.equal(pkg.version,'0.4.0');assert.equal(pkg.scripts.check,'tsc');
    assert.equal(JSON.parse(await file(preview,'project/origin.json')).sourceCommit,next);
    await assert.rejects(file(preview,'.env.local'),{code:'ENOENT'});
    assert.equal(git(customer,'rev-parse','HEAD'),previousCustomer);
    assert.equal(git(customer,'status','--short'),'');
    await put(customer,'src/app/view.ts',original.replace('"old"','"custom-button"'));
    commit(customer);
    const conflict=await planStarterUpgrade(neutral,customer);
    assert(conflict.conflicts.some(item=>item.file==='src/app/view.ts'));
    await assert.rejects(writeUpgradePreview(conflict,path.join(root,'unsicher')),/Dateikonflikte/);
  } finally {
    const verified=path.resolve(root);
    assert(verified.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(verified).startsWith('starter-upgrade-test-'));
    await rm(verified,{recursive:true,force:true});
  }
});
