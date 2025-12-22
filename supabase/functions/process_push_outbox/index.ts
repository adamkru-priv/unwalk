import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

function corsPreflight(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  return null;
}

type OutboxRow = {
  id: string;
  user_id: string;
  platform: 'ios';
  type:
    | 'challenge_started'
    | 'challenge_completed'
    | 'challenge_assigned'
    | 'challenge_assignment_accepted'
    | 'challenge_assignment_rejected'
    | 'challenge_assignment_started'
    | 'challenge_assignment_completed'
    | 'challenge_ready_to_claim'
    | 'milestone_reached'
    | 'team_member_completed';
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  attempts: number;
  last_error: string | null;
  created_at: string;
  sending_started_at?: string | null;
};

const textEncoder = new TextEncoder();

type ApnsEnv = {
  teamId: string;
  keyId: string;
  p8: string;
  bundleId: string;
};

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importP8PrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

function derToJose(derSignature: Uint8Array, joseLength: number): Uint8Array {
  let offset = 0;
  if (derSignature[offset++] !== 0x30) throw new Error('Invalid DER signature');
  offset++; // seqLen

  if (derSignature[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const rLen = derSignature[offset++];
  let r = derSignature.slice(offset, offset + rLen);
  offset += rLen;

  if (derSignature[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const sLen = derSignature[offset++];
  let s = derSignature.slice(offset, offset + sLen);

  const half = joseLength / 2;

  if (r.length > half) r = r.slice(r.length - half);
  if (s.length > half) s = s.slice(s.length - half);

  const out = new Uint8Array(joseLength);
  out.set(r, half - r.length);
  out.set(s, joseLength - s.length);
  return out;
}

function isProbablyDer(sig: Uint8Array) {
  return sig.length > 0 && sig[0] === 0x30;
}

async function createApnsJwt(env: ApnsEnv): Promise<string> {
  const header = { alg: 'ES256', kid: env.keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: env.teamId, iat: now };

  const headerPart = base64Url(textEncoder.encode(JSON.stringify(header)));
  const payloadPart = base64Url(textEncoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerPart}.${payloadPart}`;

  const privateKey = await importP8PrivateKey(env.p8);
  const sigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    textEncoder.encode(signingInput),
  );

  const sig = new Uint8Array(sigBuf);
  const raw = isProbablyDer(sig) ? derToJose(sig, 64) : sig;
  if (raw.length !== 64) throw new Error(`Unexpected ECDSA signature length: ${raw.length}`);

  return `${signingInput}.${base64Url(raw)}`;
}

async function sendApnsSingle(env: ApnsEnv, deviceToken: string, jwt: string, payload: any) {
  // ✅ Auto-detect sandbox vs production APNS
  // Strategy: Try production first, if BadDeviceToken -> retry with sandbox
  
  const productionHost = 'api.push.apple.com';
  const sandboxHost = 'api.sandbox.push.apple.com';
  
  // Try production first (TestFlight, App Store, Ad-Hoc)
  let host = productionHost;
  let url = `https://${host}/3/device/${deviceToken}`;

  console.log(`[PUSH] Sending to ${host} | topic: ${env.bundleId} | token: ${deviceToken.slice(0, 8)}...`);

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': env.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let text = await res.text();
  
  // Check if we got BadDeviceToken (token is sandbox but we used production host)
  if (!res.ok && res.status === 400) {
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed?.reason === 'BadDeviceToken') {
        console.log(`[PUSH] BadDeviceToken on production, retrying with sandbox...`);
        
        // Retry with sandbox host
        host = sandboxHost;
        url = `https://${host}/3/device/${deviceToken}`;
        
        console.log(`[PUSH] Sending to ${host} | topic: ${env.bundleId} | token: ${deviceToken.slice(0, 8)}...`);
        
        res = await fetch(url, {
          method: 'POST',
          headers: {
            authorization: `bearer ${jwt}`,
            'apns-topic': env.bundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        text = await res.text();
      }
    } catch {
      // ignore parsing errors
    }
  }
  
  // Log final result
  if (!res.ok) {
    console.error(`[PUSH] ❌ APNs FAILED | host: ${host} | status: ${res.status} | response: ${text}`);
  } else {
    console.log(`[PUSH] ✅ APNs SUCCESS | host: ${host} | token: ${deviceToken.slice(0, 8)}...`);
  }

  return { ok: res.ok, status: res.status, body: text, host };
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Gate access by shared secret only.
  // NOTE: Supabase's edge gateway may require Authorization/apikey headers, but if the request
  // reaches our function we don't additionally enforce JWT validity here.
  const expectedSecret = (Deno.env.get('PUSH_OUTBOX_CRON_SECRET') ?? '').trim();
  if (expectedSecret) {
    const supplied = (req.headers.get('x-cron-secret') ?? '').trim();
    if (!supplied || supplied !== expectedSecret) return json(401, { error: 'Unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const fnUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL') ?? '';
  const maxBatch = Number(Deno.env.get('PUSH_OUTBOX_BATCH') ?? '25');
  const maxAttempts = Number(Deno.env.get('PUSH_OUTBOX_MAX_ATTEMPTS') ?? '10');
  const sendingTimeoutSeconds = Number(Deno.env.get('PUSH_OUTBOX_SENDING_TIMEOUT_SECONDS') ?? '600'); // 10 min

  // If SUPABASE_FUNCTIONS_URL isn't set, we can still call the internal Functions endpoint
  // by using the public `supabaseUrl` (Functions are under /functions/v1).
  const functionsBase = fnUrl || `${supabaseUrl.replace(/\/+$/g, '')}/functions/v1`;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Load a batch of notifications to process:
  // - pending rows
  // - plus rows stuck in 'sending' beyond timeout (to recover from crashes/timeouts)
  const staleBefore = new Date(Date.now() - sendingTimeoutSeconds * 1000).toISOString();

  const { data: rows, error: loadErr } = await admin
    .from('push_outbox')
    .select('*')
    .lt('attempts', maxAttempts)
    .or(`status.eq.pending,and(status.eq.sending,sending_started_at.lt.${staleBefore})`)
    .order('created_at', { ascending: true })
    .limit(maxBatch);

  if (loadErr) return json(500, { error: 'Failed to load push_outbox', details: loadErr.message });

  const pending = (rows ?? []) as OutboxRow[];
  if (pending.length === 0) return json(200, { ok: true, processed: 0, results: [] });

  const apnsTeamId = Deno.env.get('APPLE_TEAM_ID') ?? '';
  const apnsKeyId = Deno.env.get('APPLE_KEY_ID') ?? '';
  const apnsP8 = Deno.env.get('APPLE_APNS_PRIVATE_KEY') ?? '';
  const apnsBundleId = Deno.env.get('APPLE_BUNDLE_ID') ?? '';

  if (!apnsTeamId || !apnsKeyId || !apnsP8 || !apnsBundleId) {
    return json(500, {
      error: 'Missing APNs secrets',
      missing: {
        APPLE_TEAM_ID: !apnsTeamId,
        APPLE_KEY_ID: !apnsKeyId,
        APPLE_APNS_PRIVATE_KEY: !apnsP8,
        APPLE_BUNDLE_ID: !apnsBundleId,
      },
    });
  }

  // Load tokens for recipients (ios only)
  const { data: tokenRows, error: tokenErr } = await admin
    .from('device_push_tokens')
    .select('token, user_id')
    .in('user_id', pending.map((r) => r.user_id))
    .eq('platform', 'ios');

  if (tokenErr) return json(500, { error: 'Failed to load tokens', details: tokenErr.message });

  // Load push preferences for all users in this batch
  const { data: prefRows, error: prefErr } = await admin
    .from('users')
    .select('id, push_enabled')
    .in('id', pending.map((r) => r.user_id));

  if (prefErr) return json(500, { error: 'Failed to load user preferences', details: prefErr.message });

  const pushEnabledByUser = new Map<string, boolean>();
  for (const r of (prefRows ?? []) as any[]) {
    pushEnabledByUser.set(String(r.id), Boolean(r.push_enabled));
  }

  const tokensByUser = new Map<string, string[]>();
  for (const r of (tokenRows ?? []) as any[]) {
    const uid = String(r.user_id);
    const tok = String(r.token ?? '').trim();
    if (!uid || !tok) continue;
    const list = tokensByUser.get(uid) ?? [];
    list.push(tok);
    tokensByUser.set(uid, list);
  }

  const env: ApnsEnv = { teamId: apnsTeamId, keyId: apnsKeyId, p8: apnsP8, bundleId: apnsBundleId };
  let apnsJwt: string;
  try {
    apnsJwt = await createApnsJwt(env);
  } catch (e) {
    return json(500, { error: 'Failed to create APNs JWT', details: String(e) });
  }

  const results: any[] = [];

  for (const row of pending) {
    // Global opt-out
    if (pushEnabledByUser.has(row.user_id) && pushEnabledByUser.get(row.user_id) === false) {
      await admin
        .from('push_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: 'Skipped: push notifications disabled by user',
        })
        .eq('id', row.id);
      results.push({ id: row.id, ok: true, skipped: true });
      continue;
    }

    // Claim this row (best-effort). If another worker already claimed it, skip.
    const { data: claimed, error: claimErr } = await admin
      .from('push_outbox')
      .update({ status: 'sending' })
      .eq('id', row.id)
      .in('status', ['pending', 'sending'])
      .select('id')
      .maybeSingle();

    if (claimErr || !claimed) {
      // Could not claim (or already handled by another run)
      continue;
    }

    // Ensure data is an object (SQL may store it as a JSON string)
    const normalizedData: Record<string, unknown> = (() => {
      const v: any = (row as any).data;
      if (!v) return {};
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch {
          return {};
        }
      }
      return (typeof v === 'object') ? v : {};
    })();

    const deviceTokens = tokensByUser.get(row.user_id) ?? [];
    if (deviceTokens.length === 0) {
      await admin
        .from('push_outbox')
        .update({
          status: 'failed',
          attempts: (row.attempts ?? 0) + 1,
          last_error: 'No push token registered for user',
        })
        .eq('id', row.id);

      results.push({ id: row.id, ok: false, error: 'No push token registered for user' });
      continue;
    }

    const payload = {
      aps: {
        alert: {
          title: row.title,
          body: row.body,
        },
        sound: 'default',
      },
      data: {
        ...normalizedData,
        type: row.type,
      },
    };

    try {
      const sendResults = [] as any[];
      for (const token of deviceTokens) {
        const r = await sendApnsSingle(env, token, apnsJwt, payload);
        sendResults.push({ token, ...r });

        if (!r.ok) {
          try {
            const parsed = r.body ? JSON.parse(r.body) : null;
            const reason = parsed?.reason;
            // Only delete tokens that APNs explicitly marks as unregistered.
            // BadDeviceToken often indicates a sandbox/prod host mismatch and should not delete the token.
            if (reason === 'Unregistered') {
              await admin.from('device_push_tokens').delete().eq('token', token);
            }
          } catch {
            // ignore
          }
        }
      }

      const sentCount = sendResults.filter((x) => x.ok).length;
      if (sentCount > 0) {
        await admin
          .from('push_outbox')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .eq('id', row.id);
        results.push({ id: row.id, ok: true, sent: sentCount });
      } else {
        const host = (Deno.env.get('APPLE_APNS_HOST') ?? 'api.push.apple.com').trim();
        const msg = `APNs send failed (host=${host}, topic=${env.bundleId}): ${JSON.stringify(sendResults.map((x) => ({ status: x.status, body: x.body })).slice(0, 3))}`;
        const nextAttempts = (row.attempts ?? 0) + 1;
        const nextStatus = nextAttempts >= maxAttempts ? 'failed' : 'pending';
        await admin
          .from('push_outbox')
          .update({ status: nextStatus, attempts: nextAttempts, last_error: msg })
          .eq('id', row.id);
        results.push({ id: row.id, ok: false, error: msg });
      }
    } catch (e) {
      const msg = String(e);
      const nextAttempts = (row.attempts ?? 0) + 1;
      const nextStatus = nextAttempts >= maxAttempts ? 'failed' : 'pending';
      await admin
        .from('push_outbox')
        .update({ status: nextStatus, attempts: nextAttempts, last_error: msg })
        .eq('id', row.id);
      results.push({ id: row.id, ok: false, error: msg });
    }
  }

  return json(200, { ok: true, processed: pending.length, results });
});
