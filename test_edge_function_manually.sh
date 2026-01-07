#!/bin/bash

# Test Edge Function sync-steps manually with curl

USER_ID="72c48a7c-729e-4e43-9039-4ddc737fc0fa"
DEVICE_ID="47de840a-8792-4d9d-9f91-a23882c0ff6d"
STEPS=10293
DATE="2026-01-06"

# Get your access token from app (temporary - for testing)
echo "Testing Edge Function sync-steps..."
echo ""
echo "Payload:"
echo "{"
echo "  \"user_id\": \"$USER_ID\","
echo "  \"device_id\": \"$DEVICE_ID\","
echo "  \"steps\": $STEPS,"
echo "  \"date\": \"$DATE\""
echo "}"
echo ""

# Test with curl
curl -X POST https://bctcjrxvgwooiayawfyl.supabase.co/functions/v1/sync-steps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d "{\"user_id\":\"$USER_ID\",\"device_id\":\"$DEVICE_ID\",\"steps\":$STEPS,\"date\":\"$DATE\"}" \
  --verbose

echo ""
echo ""
echo "Check Supabase Dashboard Logs:"
echo "https://supabase.com/dashboard/project/bctcjrxvgwooiayawfyl/functions/sync-steps/logs"
