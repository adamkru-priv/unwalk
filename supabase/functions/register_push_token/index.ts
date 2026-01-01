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
  if (platform !== 'ios') return json(400, { error: 'platform must be ios' });
  if (!deviceId) return json(400, { error: 'device_id is required' });

  // ✅ FIX: APNs requires lowercase hex tokens
  const normalizedToken = token.toLowerCase();

  // Resolve user_id:
  // 1) If caller has Authorization header, try to parse it and get auth user.
  // 2) Fallback: resolve guest user from public.users by device_id.
  let userId: string | null = null;
  let isAuthenticated = false;

  // Try auth user from JWT (if present)
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice('Bearer '.length).trim();
    if (jwt) {
      const { data, error } = await admin.auth.getUser(jwt);
      if (!error && data?.user?.id) {
        userId = data.user.id;
        isAuthenticated = true;
      }
    }
  }

  // Fallback to guest user by device_id
  if (!userId) {
    const { data: guest, error } = await admin
      .from('users')
      .select('id')
      .eq('device_id', deviceId)
      .eq('is_guest', true)
      .maybeSingle();

    if (error) return json(500, { error: 'Failed to resolve guest user', details: error.message });
    if (!guest?.id) return json(404, { error: 'Guest user not found for device_id' });
    userId = guest.id;
  }

  // ✅ FIX: If user is authenticated, delete ALL old tokens from other users with same device_id
  // This handles the case where user reinstalled app (new guest created) then logged in
  if (isAuthenticated) {
    // First, get all guest user IDs with this device_id
    const { data: guestUsers, error: guestError } = await admin
      .from('users')
      .select('id')
      .eq('device_id', deviceId)
      .eq('is_guest', true);
    
    if (!guestError && guestUsers && guestUsers.length > 0) {
      const guestIds = guestUsers.map(u => u.id);
      
      // Delete old tokens from those guest users
      const { error: deleteError } = await admin
        .from('device_push_tokens')
        .delete()
        .neq('user_id', userId)
        .in('user_id', guestIds);
      
      if (deleteError) {
        console.error('Failed to delete old guest tokens:', deleteError);
        // Don't fail the request - continue to upsert
      } else {
        console.log(`Deleted ${guestIds.length} old guest token(s)`);
      }
    }
  }

  const { error: upsertError } = await admin
    .from('device_push_tokens')
    .upsert(
      {
        user_id: userId,
        platform: 'ios',
        token: normalizedToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' },
    );

  if (upsertError) return json(500, { error: 'Failed to save token', details: upsertError.message });

  return json(200, { ok: true, user_id: userId, is_authenticated: isAuthenticated });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/register_push_token' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
