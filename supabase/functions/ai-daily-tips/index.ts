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
          content: `Generate a CONCISE daily tip.

User:
- Steps: ${todaySteps}/${dailyGoal} (${progressPercent}%)
- Streak: ${currentStreak} days
- Level: ${userLevel}
- Time: ${timeOfDay}

Return JSON:
{
  "tip": "Ultra-short actionable advice (max 100 chars)",
  "icon": "single emoji",
  "category": "motivation" | "health" | "strategy",
  "why": "Why this matters (max 40 chars)",
  "quickWin": "Do this NOW (max 60 chars)"
}

Rules:
- Behind goal + evening? → indoor walk tip
- Good streak? → keep momentum
- No fluff, ultra-specific`
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
