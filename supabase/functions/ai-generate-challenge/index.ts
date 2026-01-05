import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mood, timeOfDay, weather, recentSteps, timeAvailable, isTeamChallenge } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Generate a personalized walking challenge in JSON format.

Context:
- Fitness Goal: ${mood || 'active'} (push = intense workout, active = stay moving, light = easy walk, recovery = gentle activity)
- Time Available: ${timeAvailable || 'medium'} (short = ~30min, medium = 1-2h, long = 3h+)
- Time of Day: ${timeOfDay || 'morning'}
- Weather: ${weather || 'clear'}
- Recent Daily Average: ${recentSteps || 8000} steps

CRITICAL RULES - MUST FOLLOW:
1. Time limits MUST match time available:
   - "short" (30min) = 0.5-1h time limit, 2000-4000 steps
   - "medium" (1-2h) = 1-3h time limit, 5000-10000 steps  
   - "long" (3h+) = 3-6h time limit, 10000-20000 steps

2. For TEAM challenges (competitive/cooperative/fun/support) - MINIMUM 50,000 STEPS REQUIRED:
   - "small" (2-3 people) = 50,000-75,000 steps, 12-24h limit
   - "medium" (4-5 people) = 75,000-120,000 steps, 24-48h limit
   - "large" (6-7 people) = 120,000-200,000 steps, 48-72h limit

3. Fitness Goal intensity:
   - "push" = highest end of range
   - "active" = middle of range
   - "light" = lower end of range
   - "recovery" = lowest end of range

Generate challenge JSON:
{
  "title": "Catchy title (max 40 chars)",
  "description": "Motivating description matching their goal (max 120 chars)",
  "steps": NUMBER (MUST match time available rules above),
  "difficulty": "easy" | "medium" | "hard",
  "time_hours": NUMBER (MUST match time available rules above),
  "xp": NUMBER (50-200 based on difficulty),
  "emoji": "single emoji matching the fitness goal",
  "image_query": "2-3 words for Unsplash search"
}

REMEMBER: If user picks "short" (30min), time_hours MUST be 0.5-1h, NOT 4h!`
        }]
      })
    })

    const data = await response.json()
    const content = data.content[0].text
    
    // Parse AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')
    
    const challenge = JSON.parse(jsonMatch[0])
    
    // 🎯 FIX: Ensure difficulty is always valid (easy, medium, hard)
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(challenge.difficulty)) {
      // Default to medium if AI returns invalid difficulty
      console.warn(`Invalid difficulty "${challenge.difficulty}", defaulting to "medium"`);
      challenge.difficulty = 'medium';
    }
    
    // 🎯 FIX: Ensure steps and time_hours are numbers
    challenge.steps = parseInt(challenge.steps) || 5000;
    challenge.time_hours = parseFloat(challenge.time_hours) || 1;
    challenge.xp = parseInt(challenge.xp) || 100;
    
    // 🎯 FIX: For team challenges, ensure minimum 50,000 steps
    if (isTeamChallenge && challenge.steps < 50000) {
      console.warn(`Team challenge steps too low (${challenge.steps}), increasing to 50000`);
      challenge.steps = 50000;
    }
    
    // 🎯 IMPROVED: Use Pexels API instead of Unsplash (more reliable)
    // Format: https://images.pexels.com/photos/[id]/pexels-photo-[id].jpeg
    // We'll use a pool of fitness-related photos
    const fitnessPhotoIds = [
      '936094',  // Running
      '1552242', // Walking
      '3756165', // Fitness
      '2803158', // Walking path
      '2803242', // Nature walk
      '1954524', // City walking
      '1391487', // Trail walking
      '3768582', // Park walking
      '3760257', // Morning walk
      '2402777'  // Sunset walk
    ];
    
    // Select random photo based on challenge title hash
    const titleHash = challenge.title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const photoId = fitnessPhotoIds[titleHash % fitnessPhotoIds.length];
    challenge.image_url = `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=800`;

    return new Response(
      JSON.stringify(challenge),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI Generate Challenge Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
