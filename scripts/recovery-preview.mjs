import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const marker = JSON.parse(await readFile('.data/recovery.json','utf8'));
if (marker.version !== 1) throw new Error('Diese Vorschau ist für einen isoliert wiederhergestellten Stand vorgesehen.');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(?:PATH|PATHEXT|SYSTEMROOT|WINDIR|SYSTEMDRIVE|APPDATA|LOCALAPPDATA|USERPROFILE|HOME|TMP|TEMP|COMSPEC|PROGRAMFILES|LANG)$/i.test(key)));
Object.assign(env,{WS_USE_REMOTE_DATABASE:'0',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:4424',NEXT_PUBLIC_DESIGN_REVIEW:'true',
  COMMERCE_CHECKOUT_ENABLED:'0',NEXT_TELEMETRY_DISABLED:'1'});
const child = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','4424'],{env,stdio:'inherit'});
child.on('exit',code=>{process.exitCode=code??1;});
