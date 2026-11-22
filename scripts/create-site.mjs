import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSite } from './lib/scaffold.mjs';
import { parseFeatures, scaffoldFeatureModules } from './lib/starter-features.mjs';

const switches = new Set([...Object.keys(scaffoldFeatureModules).map(feature => '--' + feature), '--git', '--help']);
const allowed = new Set(['--name', '--out', '--profile', '--aesthetic', '--brief', '--features', ...switches]);
const args = {};
for (let index = 2; index < process.argv.length; index++) {
  const key = process.argv[index];
  if (!allowed.has(key)) throw new Error(`Unbekannte Option: ${key}`);
  if (switches.has(key)) args[key] = true;
  else { const value = process.argv[++index]; if (!value || value.startsWith('--')) throw new Error(`Wert für ${key} fehlt.`); args[key] = value; }
}
if (args['--help']) {
  console.log('node scripts/create-site.mjs --name "Beispiel GmbH" --out "../beispiel" [--profile services|portfolio|consulting|editorial|creator] [--aesthetic standard|liquid-glass] [--brief briefing.json] [--features ' + Object.keys(scaffoldFeatureModules).join(',') + '] [--git]');
  process.exit(0);
}
if (!args['--out']) throw new Error('--out muss ein neues Projektverzeichnis angeben.');
const brief = args['--brief'] ? JSON.parse(await readFile(path.resolve(args['--brief']), 'utf8')) : {};
if (args['--name']) brief.projectName = args['--name'];
if (args['--aesthetic']) brief.aesthetic = args['--aesthetic'];
const features = args['--features'] ? parseFeatures(args['--features']) : [];
for(const [feature,name] of Object.entries(scaffoldFeatureModules)){
  if(!args['--'+feature]&&!features.includes(feature))continue;
  if(brief.modules!==undefined&&(!brief.modules||typeof brief.modules!=='object'||Array.isArray(brief.modules)))throw new Error('modules muss ein JSON-Objekt sein.');
  brief.modules={...brief.modules,[name]:{enabled:true}};
}
const result = await createSite({
  sourceRoot: fileURLToPath(new URL('../', import.meta.url)), outputDir: args['--out'], brief,
  briefDirectory: args['--brief'] ? path.dirname(path.resolve(args['--brief'])) : process.cwd(),
  profile: args['--profile'] || 'services',
});
if (args['--git']) {
  const git = spawnSync('git', ['init', '-b', 'main'], { cwd: result.directory, encoding: 'utf8', windowsHide: true });
  if (git.status !== 0) throw new Error('Projekt wurde erstellt, Git-Initialisierung ist fehlgeschlagen: ' + git.stderr);
}
console.log(JSON.stringify(result, null, 2));
console.log('Im neuen Projekt: npm ci, npm run setup, npm run dev. Inhalt und Gestaltung anhand von project/brief.json ausarbeiten.');
