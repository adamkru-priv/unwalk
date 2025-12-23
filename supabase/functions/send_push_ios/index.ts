// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
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
  // pem is the raw .p8 contents
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

function isProbablyDer(sig: Uint8Array) {
  // DER ECDSA signatures typically start with 0x30 (SEQUENCE)
  return sig.length > 0 && sig[0] === 0x30;
}

async function createApnsJwt(env: ApnsEnv): Promise<string> {
  // header
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

  // Edge runtime may return either DER encoded ECDSA signature or raw (r||s).
  // APNs requires raw (r||s) 64 bytes.
  const sig = new Uint8Array(sigBuf);
  const raw = isProbablyDer(sig) ? derToJose(sig, 64) : sig;

  if (raw.length !== 64) {
    throw new Error(`Unexpected ECDSA signature length: ${raw.length}`);
  }

  return `${signingInput}.${base64Url(raw)}`;
}

function derToJose(derSignature: Uint8Array, joseLength: number): Uint8Array {
  // Minimal DER parser for ECDSA signature.
  // DER: 0x30 len 0x02 rLen rBytes 0x02 sLen sBytes
  let offset = 0;
  if (derSignature[offset++] !== 0x30) throw new Error('Invalid DER signature');
  const seqLen = derSignature[offset++];
  void seqLen;

  if (derSignature[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const rLen = derSignature[offset++];
  let r = derSignature.slice(offset, offset + rLen);
  offset += rLen;

  if (derSignature[offset++] !== 0x02) throw new Error('Invalid DER signature');
  const sLen = derSignature[offset++];
  let s = derSignature.slice(offset, offset + sLen);

  const half = joseLength / 2;

  // Strip leading zeros
  if (r.length > half) r = r.slice(r.length - half);
  if (s.length > half) s = s.slice(s.length - half);

  const out = new Uint8Array(joseLength);
  out.set(r, half - r.length);
  out.set(s, joseLength - s.length);
  return out;
}

async function sendSingle(env: ApnsEnv, deviceToken: string, jwt: string, payload: any) {
  const host = (Deno.env.get('APPLE_APNS_HOST') ?? 'api.push.apple.com').trim();
  const url = `https://${host}/3/device/${deviceToken}`;

  const res = await fetch(url, {
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

  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  // Accept either user_id (single) or user_ids (many)
  const userId = String(body?.user_id ?? '').trim();
  const userIds = Array.isArray(body?.user_ids)
    ? (body.user_ids.map((x: any) => String(x).trim()).filter(Boolean) as string[])
    : [];

  const title = String(body?.title ?? 'MOVEE').trim();
  const message = String(body?.body ?? '').trim();

  // data/type for in-app routing
  const type = String(body?.type ?? '').trim();
  const data = body?.data ?? {};

  const effectiveUserIds = userIds.length > 0 ? userIds : (userId ? [userId] : []);

  if (effectiveUserIds.length === 0) return json(400, { error: 'user_id or user_ids is required' });
  if (!message) return json(400, { error: 'body is required' });

  // Load tokens for all requested users
  const { data: rows, error: tokenErr } = await admin
    .from('device_push_tokens')
    .select('token, user_id')
    .in('user_id', effectiveUserIds)
    .eq('platform', 'ios');

  if (tokenErr) return json(500, { error: 'Failed to load tokens', details: tokenErr.message });

  const tokens = (rows ?? []).map((r: any) => r.token).filter(Boolean);
  if (tokens.length === 0) return json(200, { ok: true, sent: 0, results: [] });

  const env: ApnsEnv = { teamId: apnsTeamId, keyId: apnsKeyId, p8: apnsP8, bundleId: apnsBundleId };

  let jwt: string;
  try {
    jwt = await createApnsJwt(env);
  } catch (e) {
    return json(500, { error: 'Failed to create APNs JWT', details: String(e) });
  }

  const payload = {
    aps: {
      alert: {
        title,
        body: message,
      },
      sound: 'default',
      badge: 1,
      'mutable-content': 1,
      'thread-id': 'movee-notifications',
    },
    // Always include a type so the app can route the notification.
    // Keep existing behavior if callers pass their own data.
    data: {
      ...(typeof data === 'object' && data ? data : {}),
      ...(type ? { type } : {}),
    },
  };

  const results = [] as any[];
  for (const token of tokens) {
    try {
      const r = await sendSingle(env, token, jwt, payload);
      results.push({ token, ...r });

      // If token is invalid, delete it.
      if (!r.ok) {
        try {
          const parsed = r.body ? JSON.parse(r.body) : null;
          const reason = parsed?.reason;
          if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
            await admin.from('device_push_tokens').delete().eq('token', token);
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      results.push({ token, ok: false, status: 0, body: String(e) });
    }
  }

  return json(200, { ok: true, sent: results.filter((r) => r.ok).length, results });
});
