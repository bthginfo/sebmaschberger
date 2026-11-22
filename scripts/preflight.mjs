import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {scanCredentialFiles} from './lib/preflight-checks.mjs';
import {launchPublicationIssues} from '../src/lib/launch-content.mjs';
import {searchReadinessIssues} from '../src/lib/search-readiness.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const published = process.argv.slice(2).includes('--published');
const issues = [];
let content, address = process.env.NEXT_PUBLIC_SITE_URL;

if (published) {
  try {
    // A remote check is always explicit. Local checks read the existing file without seeding.
    if (process.env.WS_USE_REMOTE_DATABASE === '1') {
      const { databaseConfigured, getPublished, getSettings } = await import('../src/lib/db.ts');
      if (!databaseConfigured()) throw new Error('Missing database');
      content = await getPublished();
      address = (await getSettings()).siteUrl;
    } else {
      const stored = JSON.parse(await readFile(path.join(root, '.data/cms.json'), 'utf8'));
      content = stored.state?.published;
      address = stored.records?.['settings:site']?.siteUrl || address;
    }
    if (!content) throw new Error('Missing publication');
  } catch {
    issues.push('Die gespeicherte Veröffentlichung konnte nicht gelesen werden. Prüfen Sie die Einrichtung des gewählten Projekts.');
  }
} else {
  content = JSON.parse(await readFile(path.join(root, 'src/data/content.json'), 'utf8'));
}

issues.push(...launchPublicationIssues(content, address));
if (!process.env.DATABASE_URL) issues.push('Eigene produktive Datenbank ist nicht konfiguriert.');
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) issues.push('Eigener AUTH_SECRET fehlt.');
issues.push(...await scanCredentialFiles(root));
console.log(published ? 'Prüfung der gespeicherten Veröffentlichung' : 'Prüfung der Startdatei');
const searchNotes=searchReadinessIssues(content);
if(searchNotes.length)console.warn('Hinweise zu SEO-Metadaten:\n'+searchNotes.map(issue=>'• '+issue).join('\n'));
if (issues.length) { console.error(issues.map(issue => '• ' + issue).join('\n')); process.exitCode = 1; }
else console.log('Formale Prüfung bestanden. Die Freigaben und echten Verbindungen werden am Kundenprojekt geprüft.');
