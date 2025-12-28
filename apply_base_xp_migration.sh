#!/bin/bash
set -e

echo "🚀 Applying Base Daily XP Migration..."

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL not set"
  echo "Please set it like:"
  echo "export SUPABASE_DB_URL='postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'"
  exit 1
fi

# Apply migration
psql "$SUPABASE_DB_URL" -f docs/database/060_base_daily_xp.sql

echo "✅ Migration applied successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Test with: SELECT * FROM sync_daily_steps('your-user-id', 5000);"
echo "2. Rebuild app: cd unwalk && npm run build"
echo "3. Test Apple Health sync in app"
