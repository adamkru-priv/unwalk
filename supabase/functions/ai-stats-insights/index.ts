import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { weeklySteps, streak, totalChallenges, completedChallenges, level, xp } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Analyze fitness stats. Be SUPER CONCISE.

Stats:
- Weekly steps: ${JSON.stringify(weeklySteps)}
- Streak: ${streak} days
- Challenges: ${completedChallenges}/${totalChallenges}
- Level ${level}, XP: ${xp}

Return JSON:
{
  "trend": "improving" | "stable" | "declining",
  "trendEmoji": "📈" | "➡️" | "📉",
  "keyInsight": "ONE main observation (max 60 chars)",
  "secondInsight": "ONE secondary point (max 60 chars)",
  "quickAction": "ONE thing to do now (max 80 chars)",
  "motivation": "Short encouragement (max 100 chars)"
}

Rules:
- Be ultra-specific with numbers
- Focus on the TREND
- No fluff, just facts + 1 action`
        }]
      })
    })

    const data = await response.json()
    const content = data.content[0].text
    
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')
    
    const insights = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify(insights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI Stats Insights Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
