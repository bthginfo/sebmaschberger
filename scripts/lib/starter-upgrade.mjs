import { spawnSync } from 'node:child_process';
import { lstat, mkdir, mkdtemp, realpath, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const utf8 = new TextDecoder('utf-8', { fatal: true });
const managed = /^(?:(?:src|public|scripts|tests|docs|profiles|skills|\.github)\/|(?:package(?:-lock)?\.json|template\.manifest\.json|tsconfig\.json|next\.config\.ts|next-env\.d\.ts|vercel\.json|\.env\.example|\.gitignore|\.gitattributes|\.vercelignore|AGENTS\.md|START-HERE\.md)$)/;
const runtimePaths = /(?:^|\/)(?:\.env(?!\.example$)|\.data|\.local|\.git|\.vercel|node_modules)(?:[./]|$)/;
const privatePaths = /^(?:src\/data\/)/;
const originPath = 'project/origin.json';

function git(cwd, args, allowed = [0]) {
  const result = spawnSync('git', args, { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (result.error) throw result.error;
  if (!allowed.includes(result.status)) throw new Error(result.stderr.toString('utf8').trim() || 'Git konnte den Schritt nicht ausführen.');
  return result;
}

function gitText(cwd, args) {
  return git(cwd, args).stdout.toString('utf8').trim();
}

export function cleanSourceCommit(root) {
  try {
    if (path.relative(root, gitText(root, ['rev-parse', '--show-toplevel'])) ||
        gitText(root, ['status', '--porcelain', '--untracked-files=all'])) return undefined;
    return gitText(root, ['rev-parse', 'HEAD']);
  } catch {
    return undefined;
  }
}

function tree(root, ref) {
  return new Map(git(root, ['ls-tree', '-r', '-z', '--full-tree', ref]).stdout.toString('utf8').split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t');
    const [mode, type, hash] = line.slice(0, tab).split(' ');
    return [line.slice(tab + 1), { mode, type, hash }];
  }));
}

function file(root, entry) {
  if (!entry) return null;
  if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) throw new Error('Dieser Dateityp muss manuell geprüft werden.');
  return git(root, ['cat-file', 'blob', entry.hash]).stdout;
}

function json(root, entries, relative) {
  const value = file(root, entries.get(relative));
  if (!value) throw new Error(relative + ' fehlt im Git-Stand.');
  return JSON.parse(utf8.decode(value));
}

function regularPath(relative) {
  return !relative.split('/').some(part => !part || part === '.' || part === '..' || /[\\:\x00-\x1f]/.test(part));
}

function withCustomerPackageIdentity(relative, bytes, identity) {
  if (!bytes || !identity || !['package.json', 'package-lock.json'].includes(relative)) return bytes;
  const value = JSON.parse(utf8.decode(bytes));
  value.name = identity.name;
  value.version = identity.version;
  if (relative === 'package-lock.json' && value.packages?.['']) {
    value.packages[''].name = identity.name;
    value.packages[''].version = identity.version;
  }
  return Buffer.from(JSON.stringify(value, null, 2) + '\n');
}

const equal = (a, b) => a === b || Boolean(a && b && a.equals(b));
function isText(bytes) {
  if (bytes.includes(0)) return false;
  try { utf8.decode(bytes); return true; } catch { return false; }
}

async function mergeBytes(source, previous, next, customer) {
  if (equal(customer, next)) return customer;
  if (equal(customer, previous)) return next;
  if (!previous || !next || !customer || ![previous, next, customer].every(isText)) {
    throw new Error('Datei in beiden Ständen geändert.');
  }
  const scratch = await mkdtemp(path.join(tmpdir(), 'starter-merge-'));
  const names = ['kunde', 'basis', 'update'].map(name => path.join(scratch, name));
  try {
    await Promise.all([customer, previous, next].map((bytes, index) => writeFile(names[index], bytes)));
    const merged = git(source, ['merge-file', '-p', '--diff3', ...names], Array.from({ length: 128 }, (_, index) => index));
    if (merged.status !== 0) throw new Error('Die Änderungen überschneiden sich.');
    return merged.stdout;
  } finally {
    await Promise.all(names.map(name => unlink(name).catch(() => {})));
    await rmdir(scratch);
  }
}

function repository(root) {
  const commit = cleanSourceCommit(root);
  if (!commit) throw new Error('Bitte einen sauberen, bereits gespeicherten Git-Stand im Projektordner verwenden.');
  return commit;
}

export async function planStarterUpgrade(sourceDir, projectDir, baseCommit) {
  const [source, project] = await Promise.all([realpath(sourceDir), realpath(projectDir)]);
  if (source === project) throw new Error('Starter und Kundenprojekt brauchen getrennte Ordner.');
  const next = repository(source);
  const head = repository(project);
  const [nextTree, projectTree] = [tree(source, next), tree(project, head)];
  if (nextTree.has(originPath)) throw new Error('Updates brauchen den neutralen Starter als Quelle.');
  if ([...projectTree.keys()].some(file => runtimePaths.test(file))) throw new Error('Der Kundenstand enthält private Laufzeitdateien in Git. Bitte bereinigen Sie sie vor dem Update.');
  const origin = json(project, projectTree, originPath);
  const manifest = json(source, nextTree, 'template.manifest.json');
  const base = baseCommit || origin.sourceCommit;
  if (!/^[a-f0-9]{40}$/.test(base ?? '')) throw new Error('Für dieses Projekt bitte den Commit der ursprünglichen Starter-Version mit --from angeben.');
  if (origin.template !== manifest.repository || base === next ||
      git(source, ['merge-base', '--is-ancestor', base, next], [0, 1]).status !== 0) {
    throw new Error('Die Quelle muss eine spätere Version derselben Starter-Historie sein.');
  }
  const baseTree = tree(source, base);
  if (json(source, baseTree, 'template.manifest.json').version !== origin.version) {
    throw new Error('Der Basis-Commit passt nicht zur Version des Kundenprojekts.');
  }
  const identity = json(project, projectTree, 'package.json');
  const changes = [], conflicts = [];
  for (const relative of [...new Set([...baseTree.keys(), ...nextTree.keys()])].sort()) {
    if (!managed.test(relative) || privatePaths.test(relative) || runtimePaths.test(relative)) continue;
    const oldEntry = baseTree.get(relative), newEntry = nextTree.get(relative), localEntry = projectTree.get(relative);
    if (oldEntry?.hash === newEntry?.hash && oldEntry?.mode === newEntry?.mode) continue;
    try {
      if (!regularPath(relative)) throw new Error('Der Dateipfad muss manuell geprüft werden.');
      const previous = withCustomerPackageIdentity(relative, file(source, oldEntry), identity);
      const incoming = withCustomerPackageIdentity(relative, file(source, newEntry), identity);
      const original = file(project, localEntry);
      const current = withCustomerPackageIdentity(relative, original, identity);
      const merged = await mergeBytes(source, previous, incoming, current);
      const mode = localEntry?.mode !== oldEntry?.mode ? localEntry?.mode ?? newEntry?.mode : newEntry?.mode;
      if (!equal(current, merged) || (merged && mode !== localEntry?.mode)) changes.push({ relative, bytes: merged, mode });
    } catch (error) {
      conflicts.push({ file: relative, reason: error.message });
    }
  }
  changes.push({
    relative: originPath,
    bytes: Buffer.from(JSON.stringify({ ...origin, version: manifest.version, sourceCommit: next }, null, 2) + '\n'),
    mode: '100644'
  });
  return { source, project, head, from: origin.version, to: manifest.version, changes, conflicts };
}

async function previewFile(root, relative) {
  let target = root;
  const parts = relative.split('/');
  for (const part of parts.slice(0, -1)) {
    target = path.join(target, part);
    const existing = await lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error('Unsicherer Pfad in der Vorschau: ' + relative);
    if (!existing) await mkdir(target);
  }
  return path.join(target, parts.at(-1));
}

export async function writeUpgradePreview(plan, directory) {
  if (plan.conflicts.length) throw new Error('Bitte zuerst die angezeigten Dateikonflikte klären.');
  const output = path.join(await realpath(path.dirname(path.resolve(directory))), path.basename(path.resolve(directory)));
  if ([plan.source, plan.project].some(root => {
    const rel = path.relative(root, output);
    return !rel || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
  })) throw new Error('Die Vorschau braucht einen eigenen Ordner außerhalb beider Projekte.');
  if (await lstat(output).catch(error => { if (error.code !== 'ENOENT') throw error; return null; })) throw new Error('Der Vorschauordner existiert bereits.');
  if (repository(plan.project) !== plan.head) throw new Error('Das Kundenprojekt wurde seit der Prüfung geändert.');
  git(plan.project, ['-c','core.hooksPath=/dev/null','worktree', 'add', '--detach', '--', output, plan.head]);
  for (const change of plan.changes) {
    const destination = await previewFile(output, change.relative);
    const current = await lstat(destination).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
    if (current && (!current.isFile() || current.isSymbolicLink())) throw new Error('Unsichere Datei in der Vorschau: ' + change.relative);
    if (change.bytes) await writeFile(destination, change.bytes);
    else if (current) await unlink(destination);
    git(output, ['add', '-A', '--', change.relative]);
    if (change.bytes) git(output, ['update-index', '--chmod=' + (change.mode === '100755' ? '+x' : '-x'), '--', change.relative]);
  }
  return output;
}
