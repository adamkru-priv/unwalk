import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (admin privileges)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🔔 Checking for pending challenge notifications...')

    // 1. Check and notify expired challenges
    console.log('⏰ Checking for expired challenges...')
    const { data: expiredData, error: expiredError } = await supabase.rpc('check_and_notify_expired_challenges')
    
    if (expiredError) {
      console.error('❌ Error checking expired challenges:', expiredError)
    } else {
      console.log(`✅ Sent ${expiredData || 0} expiry notifications`)
    }

    // 2. Call the database function to send pending notifications
    const { data, error } = await supabase.rpc('send_pending_challenge_notifications')

    if (error) {
      console.error('❌ Error sending notifications:', error)
      throw error
    }

    const result = data?.[0] || { sent_count: 0, details: [] }
    
    console.log(`✅ Sent ${result.sent_count} challenge expiry notifications`)
    
    if (result.sent_count > 0) {
      console.log('📋 Details:', result.details)
    }

    return new Response(
      JSON.stringify({
        success: true,
        expired_challenges_notified: expiredData || 0,
        sent_count: result.sent_count,
        details: result.details,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
