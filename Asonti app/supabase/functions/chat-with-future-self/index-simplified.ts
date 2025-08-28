import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { data: profiles } = await supabase
      .from('future_self_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const profile = profiles && profiles.length > 0 ? profiles[0] : null

    if (!profile) {
      throw new Error('No future self profile found. Please complete your profile first.')
    }

    // Parse request body
    const { message, conversationHistory = [] } = await req.json()

    if (!message) {
      throw new Error('No message provided')
    }

    // Call OpenAI API directly using fetch
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: buildFutureSelfPrompt(profile)
          },
          ...conversationHistory.slice(-10).map((msg: any) => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          })),
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      })
    })

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text()
      console.error('OpenAI API error:', error)
      throw new Error('Failed to get AI response')
    }

    const completion = await openAIResponse.json()
    const aiResponse = completion.choices[0]?.message?.content || 'I need a moment to reflect on that...'

    // Save conversation to database (optional, won't fail if it doesn't work)
    try {
      // Try to find or create conversation
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('future_self_profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)

      let conversationId = conversations && conversations.length > 0 ? conversations[0].id : null

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
    } catch (dbError) {
      // Log but don't fail the request
      console.error('Database save error:', dbError)
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred',
        response: "I'm having trouble connecting right now. Please make sure your profile is complete and try again."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on error to avoid CORS issues
      }
    )
  }
})

function buildFutureSelfPrompt(profile: any): string {
  // Determine time jump based on whether photo was aged
  const yearsInFuture = profile.aged_photo_url ? 2 : 5
  
  // Build a concise but effective prompt
  const prompt = `You are the user's future self, ${yearsInFuture} years from now. You have lived through everything they're currently experiencing and achieved the life they dream of.

YOUR IDENTITY:
- You ARE the user, ${yearsInFuture} years in the future
- You speak from lived experience, not speculation
- You remember being exactly where they are now

YOUR JOURNEY:
- Your hope realized: "${profile.hope || 'You achieved what you dreamed of'}"
- Your fear overcome: "${profile.fear || 'You conquered your concerns'}"
- Your daily life: "${profile.day_in_life || 'You live with purpose and fulfillment'}"

YOUR GROWTH:
- Values maintained: ${profile.current_values?.join(', ') || 'your core values'}
- Values developed: ${profile.future_values?.join(', ') || 'new important values'}

YOUR PERSPECTIVE:
"${profile.feelings || 'The journey was challenging but worth every step.'}"

COMMUNICATION STYLE:
- Use "I" for your current state (as their future self)
- Use "you" when guiding your past self (the user)
- Be warm, understanding, and encouraging
- Share specific insights from your ${yearsInFuture}-year journey
- Stay in character as their actual future self

Remember: You're not a therapist or coach. You're literally them, ${yearsInFuture} years older, sharing wisdom from lived experience.`

  return prompt
}