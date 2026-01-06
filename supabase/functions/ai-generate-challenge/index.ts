import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { mood, timeOfDay, weather, recentSteps, timeAvailable, isTeamChallenge } = await req.json()

    // 🎯 NEW SYSTEM: Private Solo Challenge Generator
    // Based on VIBE × TIME with precise step ranges and XP rewards
    
    if (!isTeamChallenge) {
      // ============================================
      // SOLO PRIVATE CHALLENGE - NEW SYSTEM
      // ============================================
      
      // Map frontend mood to VIBE
      const vibeMap: Record<string, 'sprint' | 'steady' | 'easy'> = {
        'push': 'sprint',
        'active': 'steady',
        'light': 'easy',
        'recovery': 'easy'
      };
      
      const vibe = vibeMap[mood] || 'steady';
      const time = timeAvailable || 'medium'; // 'short', 'medium', 'long'
      
      // Step target ranges (% of 10,000 daily goal)
      const stepRanges: Record<string, Record<string, { min: number, max: number, percent: string }>> = {
        'sprint': {
          'short': { min: 3500, max: 4500, percent: '35-45%' },    // Quick sprint
          'medium': { min: 6500, max: 8000, percent: '65-80%' },   // Ambitious
          'long': { min: 10000, max: 13000, percent: '100-130%' }  // Go extra
        },
        'steady': {
          'short': { min: 2500, max: 3500, percent: '25-35%' },    // Consistent
          'medium': { min: 5000, max: 6500, percent: '50-65%' },   // Balanced
          'long': { min: 8000, max: 10500, percent: '80-105%' }    // Strong day
        },
        'easy': {
          'short': { min: 1500, max: 2500, percent: '15-25%' },    // Gentle
          'medium': { min: 3500, max: 5000, percent: '35-50%' },   // Movement
          'long': { min: 6000, max: 8000, percent: '60-80%' }      // Recovery
        }
      };
      
      // XP rewards - effort-based, not just steps
      const xpRewards: Record<string, Record<string, number>> = {
        'easy': { 'short': 40, 'medium': 70, 'long': 100 },
        'steady': { 'short': 60, 'medium': 100, 'long': 150 },
        'sprint': { 'short': 90, 'medium': 160, 'long': 220 }
      };
      
      // Time limits in hours
      const timeLimits: Record<string, number> = {
        'short': 1,    // 30min-1h
        'medium': 2,   // 1-2h
        'long': 4      // 3h+
      };
      
      const range = stepRanges[vibe]?.[time] || stepRanges['steady']['medium'];
      const steps = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      const xp = xpRewards[vibe]?.[time] || 100;
      const timeLimit = timeLimits[time] || 2;
      
      // Optional bonus (max one per challenge)
      const bonuses = [
        { condition: 'early_completion', xp: 20, text: '+20 XP for completing before deadline' },
        { condition: 'streak_3days', xp: 15, text: '+15 XP for 3-day streak' },
        { condition: 'first_of_day', xp: 25, text: '+25 XP as first challenge today' },
        { condition: 'perfect_pace', xp: 10, text: '+10 XP for steady pace (no breaks)' }
      ];
      
      const selectedBonus = Math.random() < 0.4 ? bonuses[Math.floor(Math.random() * bonuses.length)] : null;
      
      // Call AI for motivational title + description
      const aiPrompt = `Generate a SHORT, POSITIVE, MODERN walking challenge in JSON format.

CONTEXT:
- User's daily goal: 10,000 steps
- Challenge vibe: ${vibe === 'sprint' ? 'Sprint Mode (intense, ambitious)' : vibe === 'steady' ? 'Steady Pace (consistent flow)' : 'Easy Flow (no pressure, reset)'}
- Time available: ${time === 'short' ? '~30 minutes' : time === 'medium' ? '1-2 hours' : '3+ hours'}
- Target steps: ${steps} steps (${range.percent} of daily goal)
- Time of day: ${timeOfDay || 'any time'}

TONE RULES:
- Short and encouraging (like Apple Fitness+ or Duolingo)
- Friendly, modern, no fitness-coach shouting
- NO guilt, NO pressure
- Positive reinforcement
- Max 40 chars for title, max 100 chars for description

OUTPUT JSON:
{
  "title": "catchy short title",
  "description": "friendly motivational sentence",
  "difficulty": "${vibe === 'sprint' ? 'hard' : vibe === 'steady' ? 'medium' : 'easy'}",
  "emoji": "single emoji matching vibe"
}

Examples of good tone:
✅ "Time for a quick reset walk"
✅ "Let's stack some steps today"
✅ "Your daily movement unlock"
❌ "INTENSE CARDIO BLAST!!!" (too aggressive)
❌ "You need to..." (guilt-inducing)`;

      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 300,
          messages: [{ role: 'user', content: aiPrompt }]
        })
      });

      const aiData = await aiResponse.json();
      const aiContent = aiData.content[0].text;
      
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response');
      
      const aiChallenge = JSON.parse(jsonMatch[0]);
      
      // Fitness photo pool
      const fitnessPhotoIds = [
        '936094', '1552242', '3756165', '2803158', '2803242',
        '1954524', '1391487', '3768582', '3760257', '2402777'
      ];
      
      const titleHash = aiChallenge.title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const photoId = fitnessPhotoIds[titleHash % fitnessPhotoIds.length];
      
      // Build final challenge object
      const challenge = {
        challenge_type: 'solo_private',
        selected_vibe: vibe,
        selected_time: time,
        title: aiChallenge.title,
        description: aiChallenge.description,
        steps: steps,
        difficulty: aiChallenge.difficulty || (vibe === 'sprint' ? 'hard' : vibe === 'steady' ? 'medium' : 'easy'),
        time_hours: timeLimit,
        xp: xp,
        bonus: selectedBonus ? {
          condition: selectedBonus.condition,
          xp: selectedBonus.xp,
          text: selectedBonus.text
        } : null,
        emoji: aiChallenge.emoji || '👟',
        image_url: `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=800`,
        estimated_duration: time === 'short' ? '~30 minutes' : time === 'medium' ? '~75 minutes' : '~2.5 hours'
      };
      
      return new Response(
        JSON.stringify(challenge),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // TEAM CHALLENGE - NEW PROPORTIONAL XP SYSTEM
    // ============================================
    
    // Map frontend inputs to TEAM ENERGY
    const teamEnergyMap: Record<string, 'race' | 'together' | 'vibes'> = {
      'competitive': 'race',
      'cooperative': 'together',
      'fun': 'vibes',
      'support': 'vibes'
    };
    
    const teamEnergy = teamEnergyMap[mood] || 'together';
    const squadSize = timeAvailable || 'medium'; // 'small', 'medium', 'large'
    
    // Total step target ranges (MINIMUM 20,000 steps)
    const teamStepRanges: Record<string, Record<string, { min: number, max: number }>> = {
      'race': {
        'small': { min: 20000, max: 28000 },     // 2-3 people, competitive
        'medium': { min: 30000, max: 40000 },    // 3-4 people, competitive
        'large': { min: 45000, max: 60000 }      // 5-6 people, competitive
      },
      'together': {
        'small': { min: 20000, max: 24000 },     // 2-3 people, collaborative
        'medium': { min: 24000, max: 32000 },    // 3-4 people, collaborative
        'large': { min: 35000, max: 45000 }      // 5-6 people, collaborative
      },
      'vibes': {
        'small': { min: 20000, max: 22000 },     // 2-3 people, casual
        'medium': { min: 22000, max: 28000 },    // 3-4 people, casual
        'large': { min: 30000, max: 36000 }      // 5-6 people, casual
      }
    };
    
    // Total XP Pool (distributed proportionally among contributors)
    const teamXpPools: Record<string, Record<string, number>> = {
      'vibes': { 'small': 200, 'medium': 280, 'large': 360 },
      'together': { 'small': 300, 'medium': 420, 'large': 540 },
      'race': { 'small': 400, 'medium': 560, 'large': 700 }
    };
    
    // Time limits in hours
    const teamTimeLimits: Record<string, number> = {
      'small': 24,   // 1 day
      'medium': 48,  // 2 days
      'large': 72    // 3 days
    };
    
    const teamRange = teamStepRanges[teamEnergy]?.[squadSize] || teamStepRanges['together']['medium'];
    const totalSteps = Math.floor(Math.random() * (teamRange.max - teamRange.min + 1)) + teamRange.min;
    const totalXpPool = teamXpPools[teamEnergy]?.[squadSize] || 300;
    const timeLimit = teamTimeLimits[squadSize] || 48;
    
    // Optional bonus XP (added to pool before distribution)
    const teamBonuses = [
      { condition: 'all_contribute_15pct', xp: 50, text: '+50 XP if all members contribute 15%+' },
      { condition: 'early_finish_24h', xp: 40, text: '+40 XP for finishing 24h early' },
      { condition: 'first_team_challenge', xp: 60, text: '+60 XP as first team challenge' },
      { condition: 'daily_streaks', xp: 30, text: '+30 XP if all record daily steps' }
    ];
    
    const teamBonus = Math.random() < 0.3 ? teamBonuses[Math.floor(Math.random() * teamBonuses.length)] : null;
    
    // Call AI for team-focused motivational content
    const teamPrompt = `Generate a SHORT, INCLUSIVE, TEAM-FOCUSED walking challenge in JSON format.

CONTEXT:
- Team energy: ${teamEnergy === 'race' ? 'Race Mode (competitive, high energy)' : teamEnergy === 'together' ? 'Together (collaborative, shared goal)' : 'Just Vibes (no pressure, social fun)'}
- Squad size: ${squadSize === 'small' ? '2-3 people' : squadSize === 'medium' ? '3-4 people' : '5-6 people'}
- Total team target: ${totalSteps.toLocaleString()} steps (minimum 20,000)
- Duration: ${timeLimit}h
- Time of day: ${timeOfDay || 'flexible'}

TONE RULES:
- Inclusive and fair ("every step counts")
- Motivating without pressure
- NEVER shame low contributors
- Friendly, modern (Apple Fitness+ × group chat vibe)
- Max 40 chars for title, max 100 chars for description

OUTPUT JSON:
{
  "title": "team challenge title",
  "description": "motivational team-focused sentence",
  "difficulty": "${teamEnergy === 'race' ? 'hard' : teamEnergy === 'together' ? 'medium' : 'easy'}",
  "emoji": "single emoji matching team energy"
}

Examples of good tone:
✅ "Squad up and move together"
✅ "Your team's weekend challenge"
✅ "Let's hit this goal as a crew"
❌ "CRUSH THE COMPETITION!!!" (too aggressive)
❌ "Don't let your team down" (guilt-inducing)`;

    const teamAiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: teamPrompt }]
      })
    });

    const teamAiData = await teamAiResponse.json();
    const teamAiContent = teamAiData.content[0].text;
    
    const teamJsonMatch = teamAiContent.match(/\{[\s\S]*\}/);
    if (!teamJsonMatch) throw new Error('Invalid AI response for team challenge');
    
    const teamAiChallenge = JSON.parse(teamJsonMatch[0]);
    
    // Fitness photo pool
    const fitnessPhotoIds = [
      '936094', '1552242', '3756165', '2803158', '2803242',
      '1954524', '1391487', '3768582', '3760257', '2402777'
    ];
    
    const teamTitleHash = teamAiChallenge.title.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const teamPhotoId = fitnessPhotoIds[teamTitleHash % fitnessPhotoIds.length];
    
    // Build final team challenge object
    const teamChallenge = {
      challenge_type: 'team',
      team_energy: teamEnergy,
      squad_size: squadSize,
      title: teamAiChallenge.title,
      description: teamAiChallenge.description,
      steps: totalSteps,
      difficulty: teamAiChallenge.difficulty || (teamEnergy === 'race' ? 'hard' : teamEnergy === 'together' ? 'medium' : 'easy'),
      time_hours: timeLimit,
      xp: totalXpPool, // Total XP pool (distributed proportionally)
      xp_distribution_rule: 'Proportional: individual_xp = total_pool × (your_steps / team_total). Min 10 XP if contributing.',
      bonus: teamBonus ? {
        condition: teamBonus.condition,
        xp: teamBonus.xp,
        text: teamBonus.text
      } : null,
      emoji: teamAiChallenge.emoji || '👥',
      image_url: `https://images.pexels.com/photos/${teamPhotoId}/pexels-photo-${teamPhotoId}.jpeg?auto=compress&cs=tinysrgb&w=800`,
      estimated_duration: squadSize === 'small' ? '1 day' : squadSize === 'medium' ? '1 weekend' : '3 days'
    };
    
    return new Response(
      JSON.stringify(teamChallenge),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Generate Challenge Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
