import { z } from 'zod';

export const withdrawalInput = z.object({
  requestId: z.uuid(),
  name: z.string().trim().min(2, 'Bitte geben Sie Ihren Namen ein.').max(150),
  contract: z.string().trim().min(2, 'Bitte geben Sie eine Bestellnummer oder andere Vertragsangaben ein.').max(1800),
  email: z.email('Bitte geben Sie eine gültige E-Mail-Adresse für die Bestätigung ein.').max(254),
  website: z.literal('').optional()
}).strict();

export type WithdrawalInput = z.infer<typeof withdrawalInput>;
