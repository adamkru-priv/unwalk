import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { weeklySteps, streak, totalChallenges, completedChallenges, level, xp } = await req.json()

    const monthlyTotal = weeklySteps.reduce((sum, steps) => sum + steps, 0)
    const dailyAverage = Math.round(monthlyTotal / weeklySteps.length)

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
          content: `You are an AI analyst interpreting a user's walking history.

Context:
- Daily step goal: 10,000 steps
- User step history (last 7 days): ${JSON.stringify(weeklySteps)}
- Total steps for the week: ${monthlyTotal}
- Daily average: ${dailyAverage}

Your task:
Generate a short, personalized insight based on the user's real activity patterns.
This should feel like a smart observation the user might not have noticed themselves.

You may analyze:
- consistency vs spikes
- average daily steps
- how often the user reaches or exceeds the goal
- estimated calorie burn (rough, human-friendly, not medical)
- signs of sustainable energy vs overexertion

Guidelines:
- 2–3 sentences max
- Calm, reflective, insightful tone
- Use phrases like "your data suggests", "it looks like", "on average"
- No judgement, no pressure
- No fitness buzzwords
- No emojis

You MAY mention:
- approximate calories burned (very roughly, e.g. "roughly equivalent to…")
- patterns like "strong start of the month" or "weekend-heavy activity"
- energy balance or recovery in a non-medical way

You MUST NOT:
- give medical advice
- compare the user to others
- say "you should" more than once
- mention streaks, XP, ranks, or challenges

End with one soft reflective line, not a command.

Return JSON:
{
  "trend": "improving" | "stable" | "declining",
  "trendEmoji": "📈" | "➡️" | "📉",
  "keyInsight": "Main observation (max 120 chars)",
  "secondInsight": "Secondary observation (max 120 chars)",
  "quickAction": "One soft suggestion (max 100 chars)",
  "motivation": "Reflective closing line (max 120 chars)"
}`
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
