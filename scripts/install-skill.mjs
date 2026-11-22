import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../skills/website-starter/', import.meta.url));
const projectMarker = fileURLToPath(new URL('../project/origin.json', import.meta.url));
const codexDirectory = process.env.CODEX_HOME || path.join(homedir(), '.codex');
const destination = path.join(codexDirectory, 'skills', 'website-starter');
const update = process.argv.slice(2).includes('--update');
if (process.argv.slice(2).some(argument => argument !== '--update')) throw new Error('Usage: npm run skill:install -- [--update]');
try {
  await stat(projectMarker);
  throw new Error('Install the skill from the neutral Website Starter repository.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
try {
  await stat(destination);
  if (update) {
    const backup = path.join(codexDirectory, 'skill-backups', 'website-starter', new Date().toISOString().replace(/[:.]/gu, '-') + '-' + randomUUID().slice(0, 8));
    await mkdir(path.dirname(backup), { recursive: true });
    await cp(destination, backup, { recursive: true, force: false, errorOnExist: true });
    await cp(source, destination, { recursive: true, force: true });
    console.log('Skill aktualisiert: ' + destination + '\nBisherige Fassung gesichert: ' + backup);
  } else {
    console.log('Der Skill ist bereits installiert: ' + destination + '. Zum Aktualisieren npm run skill:install -- --update verwenden.');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
  console.log('Skill installiert: ' + destination);
  console.log('In einem neuen Chat: $website-starter Lege mir eine Website für XYZ an.');
}
await readFile(path.join(destination, 'SKILL.md'), 'utf8');
