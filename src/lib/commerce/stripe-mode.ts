export type StripeMode = 'test' | 'live';

export function stripeKeyMode(key?: string): StripeMode | undefined {
  const match = key?.match(/^(?:sk|rk)_(live|test)_[A-Za-z0-9_]+$/);
  return match?.[1] as StripeMode | undefined;
}

export function expectedStripeMode(env: Record<string, string | undefined>, siteUrl: string): StripeMode {
  if (env.VERCEL_ENV === 'production') return 'live';
  if (env.VERCEL_ENV || env.NODE_ENV !== 'production') return 'test';
  if (env.WS_USE_REMOTE_DATABASE === '0') {
    try {
      if (['localhost', '127.0.0.1', '[::1]'].includes(new URL(siteUrl).hostname)) return 'test';
    } catch {
      // A malformed address does not turn a production deployment into a sandbox.
    }
  }
  return 'live';
}

export function stripeValidationRejected(status: number, payload: unknown): boolean {
  if (status !== 400 || !payload || typeof payload !== 'object' || !('error' in payload)) return false;
  const error = payload.error;
  if (!error || typeof error !== 'object' || !('type' in error) || error.type !== 'invalid_request_error') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const param = 'param' in error && typeof error.param === 'string' ? error.param : '';
  if (code.startsWith('idempotency_')) return false;
  return code.startsWith('parameter_') || code === 'payment_method_unactivated'
    || /^(payment_method_types|line_items|shipping_address_collection|billing_address_collection|shipping_options|success_url|cancel_url)(?:\[|$)/.test(param);
}
