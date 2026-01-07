import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncStepsRequest {
  user_id: string;
  device_id: string;
  steps: number;
  date?: string;
}

serve(async (req) => {
  // 🎯 DEBUG: Log that function started
  console.log(`🚀 [sync-steps] Function invoked - method: ${req.method}, url: ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`✅ [sync-steps] CORS preflight handled`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🎯 DEBUG: Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    console.log(`🔧 [sync-steps] Env check:`, {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING'
    });
    
    // 🎯 FIX: Use user's token from Authorization header
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.error(`❌ [sync-steps] Missing Authorization header`);
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`🔑 [sync-steps] Authorization header present`);
    
    // Create Supabase client with user's token
    const supabaseClient = createClient(
      supabaseUrl ?? "",
      supabaseAnonKey ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Parse request body
    const body: SyncStepsRequest = await req.json();
    const { user_id, device_id, steps, date } = body;

    console.log(`📊 [sync-steps] Request:`, { user_id, device_id, steps, date });

    // Validate input
    if (!user_id || steps === undefined) {
      console.error(`❌ [sync-steps] Missing required fields`);
      return new Response(
        JSON.stringify({ error: "Missing user_id or steps" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided date or today
    const syncDate = date || new Date().toISOString().split('T')[0];

    console.log(`💾 [sync-steps] Upserting to daily_steps:`, { user_id, device_id, syncDate, steps });

    // Upsert to daily_steps (UPDATE if exists, INSERT if not)
    const { data, error } = await supabaseClient
      .from("daily_steps")
      .upsert(
        {
          user_id,
          device_id,
          date: syncDate,
          steps,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,date", // Unique constraint on (user_id, date)
        }
      )
      .select();

    if (error) {
      console.error(`❌ [sync-steps] Database error:`, error);
      console.error(`❌ [sync-steps] Error details:`, JSON.stringify(error, null, 2));
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [sync-steps] Successfully synced ${steps} steps for ${syncDate}`);
    console.log(`✅ [sync-steps] Returned data:`, data);

    return new Response(
      JSON.stringify({
        success: true,
        steps,
        date: syncDate,
        data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`❌ [sync-steps] Unexpected error:`, error);
    console.error(`❌ [sync-steps] Error stack:`, error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
