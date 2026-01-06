import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { todaySteps, dailyGoal, currentStreak, userLevel, hasActiveChallenge } = await req.json()

    const progressPercent = Math.round((todaySteps / dailyGoal) * 100)
    const stepsRemaining = Math.max(0, dailyGoal - todaySteps)
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a personal movement advisor inside a fitness app.

Context:
- User daily goal: ${dailyGoal} steps
- Current steps today: ${todaySteps}
- Completion percentage: ${progressPercent}%
- Steps remaining: ${stepsRemaining}
- Current time of day: ${timeOfDay}

Your task:
Generate a short, personalized insight for the user based ONLY on their current data.
This is NOT a motivational slogan.
This is an intelligent, calm observation that helps the user understand:
- what their body has likely already gained today
- what kind of energy level they are probably at
- what a reasonable next move could be (optional, soft suggestion)

Guidelines:
- 1–2 short sentences max
- Sound human, thoughtful, and specific
- Use concrete comparisons if helpful (energy, calories, daily rhythm)
- Never shame or pressure
- Avoid generic fitness phrases
- No emojis

Examples of tone (do NOT copy literally):
- "You've already covered most of a solid walk — your body is warmed up, not tired."
- "At this pace, the remaining steps are more about consistency than effort."
- "Your activity so far likely boosted circulation and focus more than calories burned."

Do NOT mention streaks, XP, or challenges.
Do NOT mention app features.
Focus on the user's body and energy today.

Return JSON:
{
  "tip": "Your personalized insight (1-2 sentences, max 150 chars)",
  "icon": "single emoji that fits the insight",
  "category": "body" | "energy" | "rhythm",
  "why": "Brief reason why this matters (max 40 chars)",
  "quickWin": "Optional soft next step (max 60 chars)"
}`
        }]
      })
    })

    const data = await response.json()
    const content = data.content[0].text
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')
    
    const tip = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify(tip),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI Daily Tips Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
