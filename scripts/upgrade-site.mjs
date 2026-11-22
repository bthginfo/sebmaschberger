import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { planStarterUpgrade, writeUpgradePreview } from './lib/starter-upgrade.mjs';

try {
  const { values } = parseArgs({ options: { project: { type: 'string' }, from: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log('node scripts/upgrade-site.mjs --project <Kundenprojekt> [--from <Basis-Commit>] [--out <neuer Vorschauordner>]');
  } else {
    if (!values.project) throw new Error('--project benötigt den Ordner des Kundenprojekts.');
    const plan = await planStarterUpgrade(fileURLToPath(new URL('../', import.meta.url)), values.project, values.from);
    console.log(`Website-Starter ${plan.from} → ${plan.to}`);
    for (const change of plan.changes) console.log((change.bytes ? 'Aktualisieren   ' : 'Entfernen       ') + change.relative);
    for (const conflict of plan.conflicts) console.error('Manuell prüfen  ' + conflict.file + ' · ' + conflict.reason);
    if (plan.conflicts.length) process.exitCode = 2;
    else if (values.out) {
      console.log('Vorschau: ' + await writeUpgradePreview(plan, values.out));
      console.log('Im Vorschauordner git diff --cached, npm ci und npm run check ausführen. Inhalte und Kundendesign prüfen und die Änderungen dann auf einem Update-Branch übernehmen.');
    } else console.log('Mit --out lässt sich der geprüfte Plan in einer getrennten Vorschau anwenden.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
