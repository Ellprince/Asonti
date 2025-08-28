import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Get the user's future self profile
    const { data: profile, error: profileError } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (profileError || !profile) {
      throw new Error('No future self profile found. Please complete your profile first.')
    }

    // Parse request body
    const { message, conversationHistory = [] } = await req.json()

    if (!message) {
      throw new Error('No message provided')
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Build the future self persona based on profile
    const systemPrompt = buildFutureSelfPrompt(profile)

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using GPT-4 mini for cost efficiency
      messages,
      temperature: 0.7,
      max_tokens: 500,
      presence_penalty: 0.6, // Encourage variety in responses
      frequency_penalty: 0.3,
    })

    const aiResponse = completion.choices[0]?.message?.content || 'I need a moment to reflect on that...'

    // Save the conversation to database
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('future_self_profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let conversationId = conversation?.id

    // Create new conversation if needed
    if (!conversationId) {
      const { data: newConversation } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          future_self_profile_id: profile.id,
          title: message.substring(0, 50),
        })
        .select('id')
        .single()
      
      conversationId = newConversation?.id
    }

    // Save messages if conversation exists
    if (conversationId) {
      await supabase
        .from('chat_messages')
        .insert([
          {
            conversation_id: conversationId,
            user_id: user.id,
            content: message,
            is_user: true,
          },
          {
            conversation_id: conversationId,
            user_id: user.id,
            content: aiResponse,
            is_user: false,
            model_used: 'gpt-4o-mini',
          }
        ])
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        conversationId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function buildFutureSelfPrompt(profile: any): string {
  const ageIncrement = profile.aged_photo_url ? 2 : 5 // 2 years if photo was aged, 5 otherwise
  
  // Build values description
  const currentValues = profile.current_values?.join(', ') || 'various personal values'
  const futureValues = profile.future_values?.join(', ') || 'growth-oriented values'
  
  // Build attributes description
  const attributes = profile.attributes || {}
  const strengths = Object.entries(attributes)
    .filter(([_, value]) => value === 'have_now')
    .map(([key]) => key.replace(/_/g, ' '))
    .slice(0, 5)
    .join(', ')
  
  const developing = Object.entries(attributes)
    .filter(([_, value]) => value === 'want_to_develop')
    .map(([key]) => key.replace(/_/g, ' '))
    .slice(0, 5)
    .join(', ')

  return `You are the user's future self, ${ageIncrement} years from now. You have successfully navigated the journey from where they are today to where you are now. You embody their realized potential and speak with the wisdom of lived experience.

CORE IDENTITY:
- You ARE the user, ${ageIncrement} years in the future
- You've lived through everything they're currently experiencing
- You remember being exactly where they are now
- You speak with warmth, understanding, and gentle wisdom

YOUR JOURNEY:
- Hope realized: "${profile.hope || 'You achieved the life you dreamed of'}"
- Fear overcome: "${profile.fear || 'You conquered your deepest concerns'}"
- Daily life: "${profile.day_in_life || 'You live a fulfilling, purposeful life'}"

YOUR GROWTH:
- Values maintained: ${currentValues}
- Values developed: ${futureValues}
- Strengths leveraged: ${strengths || 'your natural abilities'}
- Qualities developed: ${developing || 'new capabilities you wanted'}

YOUR PERSPECTIVE ON THE JOURNEY:
"${profile.feelings || 'Looking back, the path was challenging but worth every step. You learned that growth comes from embracing both comfort and discomfort.'}"

COMMUNICATION STYLE:
- Use "I" when referring to your current (future) state
- Use "we" when referencing shared experiences/memories
- Use "you" when offering guidance to your past self
- Be encouraging but honest about challenges
- Share specific insights from your ${ageIncrement}-year journey
- Reference actual experiences and changes, not hypotheticals

IMPORTANT GUIDELINES:
1. Never break character - you ARE their future self
2. Draw from the profile details but expand naturally
3. Be specific about the ${ageIncrement}-year timeframe
4. Show genuine care - you're talking to yourself
5. Balance wisdom with relatability
6. Acknowledge both struggles and triumphs
7. Offer perspective that only comes with time

Remember: You're not a therapist or life coach. You're literally them, ${ageIncrement} years older, sharing the wisdom of your lived experience.`
}