import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';

export { preflightContentIssues } from '../../src/lib/launch-content.mjs';

const ignoredDirectories=new Set(['node_modules','.git','.next','.data','.local','.checks','.vercel','.impeccable']);

/** Scan maintained source files; private runtime/design artifacts are outside this check. */
export async function scanCredentialFiles(root){
  const issues=[];
  async function visit(directory){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      if(ignoredDirectories.has(entry.name))continue;
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())await visit(file);
      else if(entry.isFile()&&/\.(ts|tsx|css|json|mjs)$/.test(entry.name)){
        const text=await readFile(file,'utf8');
        if(/(?:github_pat_|ghp_)[a-zA-Z0-9_]{20,}|postgres(?:ql)?:\/\/[^\s'"<>]+:[^\s'"<>]+@|vercel_blob_rw_[a-zA-Z0-9_]+/.test(text))issues.push('Mögliche Zugangsdaten in '+path.relative(root,file));
      }
    }
  }
  await visit(root);
  return issues;
}
