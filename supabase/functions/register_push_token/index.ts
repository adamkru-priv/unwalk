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

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
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

  const token = String(body?.token ?? '').trim();
  const platform = String(body?.platform ?? 'ios').trim();
  const deviceId = String(body?.device_id ?? '').trim();

  if (!token) return json(400, { error: 'token is required' });
  if (platform !== 'ios' && platform !== 'android') return json(400, { error: 'platform must be ios or android' });
  if (!deviceId) return json(400, { error: 'device_id is required' });

  // ✅ FIX: Only lowercase iOS APNs hex tokens, keep Android FCM tokens as-is
  const normalizedToken = platform === 'ios' ? token.toLowerCase() : token;

  // Resolve user_id from JWT token (required - no guest users)
  let userId: string | null = null;

  // Get user from JWT (required)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'Authorization header required' });
  }

  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return json(401, { error: 'Authorization token required' });
  }

  const { data, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !data?.user?.id) {
    return json(401, { error: 'Invalid or expired authorization token', details: authError?.message });
  }

  userId = data.user.id;
  console.log(`[Push] Registering token for user: ${userId}, platform: ${platform}`);

  const { error: upsertError } = await admin
    .from('device_push_tokens')
    .upsert(
      {
        user_id: userId,
        platform: platform,
        token: normalizedToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

  if (upsertError) return json(500, { error: 'Failed to save token', details: upsertError.message });

  return json(200, { ok: true, user_id: userId, platform });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/register_push_token' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
