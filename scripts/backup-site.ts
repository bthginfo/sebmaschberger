import { neon } from '@neondatabase/serverless';
import { appendFile, lstat, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { archiveLimit, backedUpCollections, openArchive, rebindMedia, safeBackupSnapshot, sealArchive, sha256 } from './lib/backup-format';
import { backupFiles, bundledBytes } from './lib/backup-media';
import { cleanSourceCommit } from './lib/starter-upgrade.mjs';

const inside = (root: string, file: string) => {
  const relative = path.relative(root,file);
  return !relative || (!relative.startsWith('..'+path.sep) && relative !== '..' && !path.isAbsolute(relative));
};
async function readBounded(file: string) {
  const info = await stat(file);
  if (!info.isFile() || info.size > archiveLimit + 64) throw new Error('Diese Datei ist größer als das unterstützte Archivlimit.');
  return readFile(file);
}
function git(cwd: string, args: string[]) {
  const process = spawnSync('git',args,{cwd,encoding:'utf8',windowsHide:true});
  if (process.status !== 0) throw new Error('Der gespeicherte Projektstand konnte nicht geöffnet werden.');
  return process.stdout;
}

async function remoteSnapshot() {
  if (!process.env.DATABASE_URL) throw new Error('Für die gezielte Neon-Sicherung fehlt DATABASE_URL.');
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql.query(`
    SELECT jsonb_build_object(
      'state',jsonb_build_object('draft',s.draft,'published',s.published,'revision',s.revision,
        'updatedAt',to_char(s.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'publishedAt',to_char(s.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'revisions',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'label',r.label,'content',r.content,
          'createdAt',to_char(r.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ORDER BY r.created_at DESC)
          FROM (SELECT * FROM ws_revisions ORDER BY created_at DESC LIMIT 30) r),'[]'::jsonb)),
      'records',COALESCE((SELECT jsonb_object_agg(collection||':'||id,data) FROM ws_records
        WHERE collection=ANY($1::text[])),'{}'::jsonb)
    ) AS snapshot FROM ws_site s WHERE s.id='main'`,[backedUpCollections]);
  if (!rows[0]?.snapshot) throw new Error('Die Website ist in der ausgewählten Datenbank noch nicht eingerichtet.');
  return rows[0].snapshot;
}

async function restore(root: string, archivePath: string, output: string, passphrase: string) {
  const archive = openArchive(await readBounded(archivePath),passphrase);
  const snapshot = safeBackupSnapshot(archive.snapshot);
  const packageName = JSON.parse(git(root,['show',archive.commit+':package.json'])).name;
  if (packageName !== archive.project) throw new Error('Die Sicherung passt nicht zum Projektstand.');
  const tracked = git(root,['ls-tree','-r','--name-only','-z',archive.commit]).split('\0').filter(Boolean);
  if (tracked.some(file => /(?:^|\/)(?:\.env(?:$|[./])|(?:\.data|\.local|\.vercel|\.git|node_modules)(?:\/|$))/i.test(file) && file !== '.env.example')) {
    throw new Error('Der Projektstand enthält private Laufzeitdateien. Bitte bereinigen Sie den Stand vor der Wiederherstellung.');
  }
  const destination = path.join(await realpath(path.dirname(path.resolve(output))),path.basename(path.resolve(output)));
  if (inside(root,destination)) throw new Error('Der Wiederherstellungsordner muss außerhalb des Kundenprojekts liegen.');
  const present = await lstat(destination).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (present) throw new Error('Für die Wiederherstellung ist ein neuer Ordner erforderlich.');
  git(root,['-c','core.hooksPath=/dev/null','worktree','add','--detach','--',destination,archive.commit]);
  const privateRoot = path.join(destination,'.data','recovered-private');
  const publicRoot = path.join(destination,'public','_recovery-media');
  const publicDirectory = await realpath(path.join(destination,'public'));
  if (!inside(destination,publicDirectory)) throw new Error('Der öffentliche Ordner liegt außerhalb der Vorschau.');
  await mkdir(path.join(destination,'.data'),{mode:0o700});
  await mkdir(privateRoot,{mode:0o700});
  await mkdir(publicRoot);
  const locations = new Map<string,string>();
  const written = new Set<string>();
  const privateFiles: Array<{originalUrl:string;filename:string;sha256:string}> = [];
  for (const file of archive.files) {
    const filename = file.sha+'.'+file.extension;
    if (file.extension === 'svg') {
      if (file.visibility !== 'public' || sha256(await bundledBytes(destination,file.url)) !== file.sha) throw new Error('Das SVG passt nicht zur gesicherten Projektversion.');
      continue;
    }
    const full = path.join(file.visibility === 'public' ? publicRoot : privateRoot,filename);
    if (!written.has(full)) {
      await writeFile(full,Buffer.from(file.bytes,'base64'),{flag:'wx',mode:0o600});
      written.add(full);
    }
    if (file.visibility === 'public') locations.set(file.url,'/_recovery-media/'+filename);
    else privateFiles.push({originalUrl:file.url,filename,sha256:file.sha});
  }
  const restored = rebindMedia(snapshot,locations) as typeof snapshot;
  // The preview must not report activity to a customer's live analytics property.
  for(const content of [restored.state.draft,restored.state.published,...restored.state.revisions.map(revision=>revision.content)]){
    content.config.analytics={googleId:'',matomoUrl:'',matomoSiteId:''};
    delete content.config.consent.scripts;
  }
  if (restored.records['settings:site']) restored.records['settings:site'].siteUrl = 'http://127.0.0.1:4424';
  await writeFile(path.join(destination,'.data','cms.json'),JSON.stringify(restored),{flag:'wx',mode:0o600});
  await writeFile(path.join(destination,'.data','recovery.json'),JSON.stringify({version:1,recoveredAt:new Date().toISOString(),sourceCommit:archive.commit,privateFiles},null,2),{flag:'wx',mode:0o600});
  const ignoreFile=path.join(destination,'.gitignore');
  const ignore=await lstat(ignoreFile);
  if(!ignore.isFile()||ignore.isSymbolicLink())throw new Error('Die Vorschau benötigt eine reguläre .gitignore-Datei.');
  await appendFile(ignoreFile,'\n/public/_recovery-media/\n');
  await writeFile(path.join(destination,'.env.local'),'WS_USE_REMOTE_DATABASE=0\nNEXT_PUBLIC_SITE_URL=http://127.0.0.1:4424\nNEXT_PUBLIC_DESIGN_REVIEW=true\nCOMMERCE_CHECKOUT_ENABLED=0\n',{flag:'wx',mode:0o600});
  const setup=spawnSync(process.execPath,['scripts/configure-auth.mjs','--generate'],{cwd:destination,stdio:'ignore',windowsHide:true});
  if(setup.status!==0)throw new Error('Der eigene lokale Testzugang konnte nicht erstellt werden.');
  const accessPath=path.join(destination,'.data','admin-access.json');
  const access=JSON.parse(await readFile(accessPath,'utf8'));
  await writeFile(accessPath,JSON.stringify({...access,url:'http://127.0.0.1:4424/admin'},null,2)+'\n',{mode:0o600});
  console.log('Wiederherstellung erstellt. Im neuen Ordner npm ci und npm run recovery:preview ausführen. Der lokale Zugang steht in .data/admin-access.json.');
}

async function main() {
  const { positionals, values } = parseArgs({allowPositionals:true,options:{
    out:{type:'string'}, in:{type:'string'}, remote:{type:'boolean'}, 'cloud-media':{type:'boolean'}
  }});
  const [command] = positionals;
  if (!['create','restore'].includes(command) || positionals.length !== 1 || !values.out) throw new Error('Verwendung: backup:create -- --out <Archiv> oder backup:restore -- --in <Archiv> --out <neuer Ordner>.');
  const root = await realpath(process.cwd());
  const passphrase = process.env.WS_BACKUP_PASSPHRASE;
  if (!passphrase || passphrase.length < 16) throw new Error('Bitte WS_BACKUP_PASSPHRASE mit mindestens 16 Zeichen sicher bereitstellen.');
  if (command === 'restore') {
    if (!values.in || values.remote || values['cloud-media']) throw new Error('Die Wiederherstellung benötigt nur --in und einen neuen --out-Ordner.');
    return restore(root,values.in,values.out,passphrase);
  }
  const commit = cleanSourceCommit(root);
  if (!commit || values.in) throw new Error('Bitte aus dem sauberen, gespeicherten Projektstand sichern.');
  const output = path.join(await realpath(path.dirname(path.resolve(values.out))),path.basename(path.resolve(values.out)));
  if (inside(root,output) && !inside(path.join(root,'.local'),output)) throw new Error('Speichern Sie das Archiv außerhalb des Projekts oder im privaten .local-Ordner.');
  const snapshot = safeBackupSnapshot(values.remote ? await remoteSnapshot() : JSON.parse((await readBounded(path.join(root,'.data','cms.json'))).toString('utf8')));
  const files = await backupFiles(snapshot,root,Boolean(values['cloud-media']));
  const project = JSON.parse(git(root,['show',commit+':package.json'])).name;
  const encrypted = sealArchive({version:1,createdAt:new Date().toISOString(),commit,project,snapshot,files},passphrase);
  await writeFile(output,encrypted,{flag:'wx',mode:0o600});
  console.log(`Verschlüsselte Sicherung erstellt. ${files.length} Dateien und ${Object.keys(snapshot.records).length} Datensätze.`);
}
main().catch(error=>{
  if (error?.name === 'ZodError') console.error('Die Sicherungsdaten passen nicht zum erwarteten Projektformat.');
  else if (error?.code === 'EEXIST') console.error('Das gewählte Ziel ist bereits vorhanden.');
  else if (error?.name === 'NeonDbError' || error?.code && error?.path) console.error('Der gesicherte Datenstand oder ein benötigter Pfad konnte nicht gelesen werden.');
  else console.error(error?.message || 'Die Sicherung konnte nicht verarbeitet werden.');
  process.exitCode=1;
});
