import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';

const file = '.env.local';
let source = existsSync(file) ? readFileSync(file, 'utf8') : readFileSync('.env.example', 'utf8');
const existing = key => source.match(new RegExp('^' + key + '=(.*)$', 'm'))?.[1]?.trim().replace(/^"|"$/g, '');
if (existing('ADMIN_INITIAL_PASSWORD_HASH')) {
  console.log('Der Erstzugang ist bereits eingerichtet. Bestehende Passwörter ändern Sie im CMS.');
  process.exit(0);
}
const generated = process.argv.includes('--generate');
async function readPassword() {
  if (!process.stdin.isTTY) {
    const input = createInterface({ input: process.stdin, terminal: false });
    try { for await (const line of input) return line; } finally { input.close(); }
    return '';
  }
  process.stdout.write('Erstes Administratorpasswort (mindestens 12 Zeichen, Eingabe verborgen): ');
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const done = error => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };
    const onData = chunk => {
      for (const character of chunk) {
        if (character === '\u0003') return done(new Error('Einrichtung abgebrochen.'));
        if (character === '\r' || character === '\n') return done();
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else if (character >= ' ') value += character;
      }
    };
    process.stdin.on('data', onData);
  });
}
const password = generated ? randomBytes(24).toString('base64url') : await readPassword();
if (!password || password.length < 12 || password.length > 200) throw new Error('Das Passwort muss zwischen 12 und 200 Zeichen lang sein.');
const salt = randomBytes(24).toString('base64url');
const values = {
  AUTH_SECRET: existing('AUTH_SECRET') || randomBytes(48).toString('base64url'),
  CRON_SECRET: existing('CRON_SECRET') || randomBytes(40).toString('base64url'),
  ADMIN_INITIAL_PASSWORD_HASH: `scrypt:v1:${salt}:${scryptSync(password, salt, 64).toString('base64url')}`,
};
for (const [key, value] of Object.entries(values)) {
  source = source.replace(new RegExp('^' + key + '=.*(?:\r?\n|$)', 'gm'), '');
  source += `\n${key}="${value}"\n`;
}
writeFileSync(file, source, { mode: 0o600 });
if (generated) {
  mkdirSync('.data', { recursive: true });
  writeFileSync('.data/admin-access.json', JSON.stringify({ url: 'http://localhost:3000/admin', password }, null, 2) + '\n', { mode: 0o600 });
  console.log('Zufälliger Erstzugang liegt in .data/admin-access.json. Diese private Datei nicht weitergeben oder committen.');
}
console.log('Erstzugang und unabhängige Zufallsschlüssel in .env.local eingerichtet.');
