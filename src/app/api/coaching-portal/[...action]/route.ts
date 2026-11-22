import { z } from 'zod';
import { AppError, rateLimit } from '@/lib/db';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { acceptInvite, actorRequired, currentActor, invite, renewInvite, setAssignments, setPaused, signIn, signOut } from '@/lib/coaching-portal/access';
import { accountId, enrolment, logInput, metrics, plan, planItem, profile, providers } from '@/lib/coaching-portal/model';
import { activity, addMetrics, audit, clearMetrics, messages, ownTrackerAccount, portalSnapshot, putLibrary, removeLibrary, sendMessage, setHealthSharing, writeProgram } from '@/lib/coaching-portal/program';
import { bridgeActor, bridgeInfo, newBridge, revokeBridge, writeBridge } from '@/lib/coaching-portal/bridge';
import { completeDevice, disconnect, providerSettings, startDevice, syncConnection, updateProvider } from '@/lib/coaching-portal/trackers';
import { serveFile, upload } from '@/lib/coaching-portal/files';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ action: string[] }> };
const password = z.string().min(12).max(128);
const token = z.string().regex(/^[a-zA-Z0-9_-]{43}$/u);
const text = z.string().trim().max(3000);
const handle = z.uuid();
const attachment = z.string().regex(/^\/api\/coaching-portal\/file\/[a-f0-9-]{36}$/iu);

export function GET(request: Request, ctx: Context) {
  return handler(async req => {
    const [action, id] = (await ctx.params).action;
    const url = new URL(req.url);
    if (action === 'session') return json({ actor: await currentActor() });
    if (action === 'device-callback') {
      const target = new URL('/portal', req.url);
      try {
        const provider = providers.parse(id);
        const state = token.parse(url.searchParams.get('state'));
        const code = z.string().min(1).max(2000).parse(url.searchParams.get('code'));
        await completeDevice(await actorRequired(), provider, state, code);
        target.searchParams.set('device', provider);
      } catch { target.searchParams.set('device', 'error'); }
      return new Response(null, { status: 303, headers: { Location: target.pathname + target.search, 'Cache-Control': 'private, no-store' } });
    }
    const actor = await actorRequired(), client = url.searchParams.get('client');
    if (action === 'state') return json(await portalSnapshot(actor, client));
    if (action === 'chat') return json({ messages: await messages(actor, client) });
    if (action === 'device-config') return json(await providerSettings(actor));
    if (action === 'apple-bridge') return json(await bridgeInfo(actor));
    if (action === 'file') return serveFile(actor, id, req);
    if (action === 'export') {
      const record = await portalSnapshot(actor, client);
      return new Response(JSON.stringify(record.client, null, 2), { headers: {
        'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="coaching-export.json"', 'Cache-Control': 'private, no-store'
      }});
    }
    throw new AppError('Dieser Bereich ist nicht verfügbar.', 404);
  })(request);
}

export function POST(request: Request, ctx: Context) {
  return handler(async req => {
    const [action] = (await ctx.params).action;
    if (action === 'apple-sync') {
      await rateLimit(ipKey(req, 'portal-bridge'), 60, 3600);
      const bridge = await bridgeActor(req.headers.get('authorization') ?? '');
      return json(await writeBridge(bridge, await readJson(req, 500_000)));
    }
    sameOrigin(req);
    if (action === 'login') {
      await rateLimit(ipKey(req, 'portal-login'), 14, 900);
      const value = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) }).strict().parse(await readJson(req, 2500));
      await signIn(value.email, value.password);
      return json({ ok: true });
    }
    if (action === 'accept') {
      await rateLimit(ipKey(req, 'portal-accept'), 10, 900);
      const value = z.object({ id: accountId, token, password }).strict().parse(await readJson(req, 2500));
      await acceptInvite(value.id, value.token, value.password);
      return json({ ok: true });
    }
    if (action === 'logout') { await signOut(); return json({ ok: true }); }
    const actor = await actorRequired();
    if (action === 'upload') {
      await rateLimit(ipKey(req, 'portal-files:' + actor.id), 55, 3600);
      return json(await upload(actor, req), 201);
    }
    await rateLimit(ipKey(req, 'portal-write:' + actor.id), 180, 60);
    const body = await readJson(req, 1_200_000);
    if (action === 'invite') return json(await invite(actor, enrolment.parse(body)), 201);
    if (action === 'renew') {
      const value = z.object({ id: accountId, send: z.boolean() }).strict().parse(body);
      return json(await renewInvite(actor, value.id, value.send));
    }
    if (action === 'assign') {
      const value = z.object({ id: accountId, coaches: z.array(accountId).max(20) }).strict().parse(body);
      await setAssignments(actor, value.id, value.coaches);
      await audit(actor,value.id,'Coaching-Team zugewiesen');
    } else if (action === 'pause') {
      const value = z.object({ id: accountId, paused: z.boolean() }).strict().parse(body);
      await setPaused(actor, value.id, value.paused);
      await audit(actor,value.id,value.paused?'Zugang pausiert':'Zugang aktiviert');
    } else if (action === 'plan') {
      const value = z.object({ id: accountId, revision: z.number().int().nonnegative(), draft: plan, profile, publish: z.boolean() }).strict().parse(body);
      return json(await writeProgram(actor, value.id, value.revision, value.draft, value.profile, value.publish));
    } else if (action === 'library') {
      const value = z.discriminatedUnion('kind', [
        z.object({ id: handle, kind: z.literal('item'), title: z.string().trim().min(1).max(140), item: planItem }).strict(),
        z.object({ id: handle, kind: z.literal('plan'), title: z.string().trim().min(1).max(140), plan }).strict()
      ]).parse(body);
      return json(await putLibrary(actor, value));
    } else if (action === 'library-remove') {
      const value = z.object({ id: handle }).strict().parse(body);
      await removeLibrary(actor, value.id);
    } else if (action === 'activity') {
      return json(await activity(actor, logInput.parse(body)));
    } else if (action === 'chat') {
      const value = z.object({ id: handle, client: accountId.nullable(), text, media: attachment.optional() }).strict().refine(v => v.text || v.media).parse(body);
      return json(await sendMessage(actor, value.client, value.id, value.text, value.media), 201);
    } else if (action === 'metrics') {
      const person = await ownTrackerAccount(actor);
      await addMetrics(person.id, 'manual', [metrics.parse(body)]);
    } else if (action === 'apple-import') {
      const person = await ownTrackerAccount(actor);
      const value = z.object({ consent: z.literal(true), rows: z.array(metrics).min(1).max(100) }).strict().parse(body);
      await addMetrics(person.id, 'apple', value.rows);
    } else if (action === 'apple-delete') {
      const person = await ownTrackerAccount(actor, { allowPaused: true });
      await clearMetrics(person.id, 'apple');
    } else if (action === 'sharing') {
      await setHealthSharing(actor, z.object({ sharing: z.boolean() }).strict().parse(body).sharing);
    } else if (action === 'apple-bridge') {
      z.object({ consent: z.literal(true) }).strict().parse(body);
      return json(await newBridge(actor));
    } else if (action === 'apple-revoke') {
      await revokeBridge(actor);
    } else if (action === 'device-config') {
      const value = z.object({ provider: providers, id: z.string().trim().min(1).max(350), secret: z.string().trim().max(500) }).strict().parse(body);
      await updateProvider(actor, value.provider, value.id, value.secret);
    } else if (action === 'device-start') {
      const value = z.object({ provider: providers, consent: z.literal(true) }).strict().parse(body);
      return json({ url: await startDevice(actor, value.provider) });
    } else if (action === 'device-sync') {
      const person = await ownTrackerAccount(actor);
      const value = z.object({ provider: providers }).strict().parse(body);
      return json(await syncConnection(person.id, value.provider));
    } else if (action === 'device-disconnect') {
      const value = z.object({ provider: providers, erase: z.boolean() }).strict().parse(body);
      await disconnect(actor, value.provider, value.erase);
    } else {
      throw new AppError('Aktion nicht verfügbar.', 404);
    }
    return json({ ok: true });
  })(request);
}
