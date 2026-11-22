import { z } from 'zod';
import { coachRoute } from '@/lib/coach/enabled';
import { rateLimit } from '@/lib/db';
import { ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { coachCookieName, redeemCoachLink } from '@/lib/coach/store';

export const POST = coachRoute(async request => {
  sameOrigin(request);
  await rateLimit(ipKey(request, 'coach-redeem'), 30, 600);
  const { token } = z.object({ token: z.string().length(80) }).parse(await readJson(request, 2048));
  const access = await redeemCoachLink(token);
  const response = json({ path: access.path });
  response.cookies.set(coachCookieName(access.id), access.secret, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/', maxAge: access.seconds,
  });
  return response;
});
