-- Check if nickname column exists
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'users'
AND column_name = 'nickname';

-- Check if there are any nicknames set
SELECT id, email, display_name, nickname
FROM users
WHERE nickname IS NOT NULL
LIMIT 5;

-- Check the my_team view definition
SELECT definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'my_team';

-- Check get_campaign_leaderboard function
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'get_campaign_leaderboard';
