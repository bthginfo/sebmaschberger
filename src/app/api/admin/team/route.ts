import { randomBytes, randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { AppError, listRecords, mutateRecord, rateLimit, updateExistingRecord } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { hashPassword } from '@/lib/security';
import { noteActivity } from '@/lib/team/activity';
import { staffChangeInput, staffCreateInput, type AdminActivity, type StaffAccount } from '@/lib/team/model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const view = ({ hash: _hash, ...account }: StaffAccount) => account;

export const GET = handler(async () => {
  await requireAdmin();
  const [accounts, activity] = await Promise.all([listRecords<StaffAccount>('staff-accounts'), listRecords<AdminActivity>('admin-activity')]);
  return json({ accounts: accounts.map(view).sort((a, b) => a.name.localeCompare(b.name, 'de')), activity: activity.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60) });
});

export const POST = handler(async request => {
  sameOrigin(request);
  const actor = await requireAdmin();
  await rateLimit(ipKey(request, 'team-create'), 10, 900);
  const input = staffCreateInput.parse(await readJson(request, 3500));
  const password = randomBytes(18).toString('base64url');
  const account: StaffAccount = { ...input, enabled: true, changedAt: new Date().toISOString(), version: randomUUID(), hash: await hashPassword(password) };
  const saved = await mutateRecord('staff-accounts', input.login, account, current => {
    if (current.version !== account.version) throw new AppError('Dieser Benutzername ist bereits vergeben.', 409);
    return current;
  });
  await noteActivity(actor, 'account.created', saved.login);
  return json({ account: view(saved), password }, 201);
});

export const PATCH = handler(async request => {
  sameOrigin(request);
  const actor = await requireAdmin();
  await rateLimit(ipKey(request, 'team-edit'), 20, 900);
  const { login, version, action } = staffChangeInput.parse(await readJson(request, 3500));
  const password = action === 'reset' ? randomBytes(18).toString('base64url') : undefined;
  const hash = password ? await hashPassword(password) : undefined;
  const saved = await updateExistingRecord<StaffAccount>('staff-accounts', login, current => {
    if (current.version !== version) throw new AppError('Der Zugang wurde inzwischen geändert. Laden Sie die Liste neu.', 409);
    return { ...current, hash: hash ?? current.hash, enabled: action === 'reset' ? current.enabled : action === 'enable', version: randomUUID(), changedAt: new Date().toISOString() };
  });
  if (!saved) throw new AppError('Dieser Zugang ist nicht mehr verfügbar.', 404);
  await noteActivity(actor, `account.${action}`, saved.login);
  return json({ account: view(saved), password });
});
