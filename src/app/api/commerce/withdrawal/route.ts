import { AppError, rateLimit } from '@/lib/db';
import { publishedContent } from '@/lib/content';
import { handler, ipKey, json, readJson, sameOrigin } from '@/lib/http';
import { digest } from '@/lib/security';
import { withdrawalInput } from '@/lib/commerce/withdrawal-input';
import { receiveWithdrawal } from '@/lib/commerce/withdrawal-service';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = handler(async request => {
  sameOrigin(request);
  await rateLimit(ipKey(request, 'withdrawal'), 5, 900);
  const { config } = await publishedContent();
  if (!config.modules?.commerce?.consumerSales) throw new AppError('Diese Funktion ist derzeit nicht eingerichtet.', 404);
  const input = withdrawalInput.parse(await readJson(request, 12000));
  await rateLimit('withdrawal-recipient:' + digest(input.email.toLowerCase()), 8, 3600);
  return json(await receiveWithdrawal(input), 201);
});
