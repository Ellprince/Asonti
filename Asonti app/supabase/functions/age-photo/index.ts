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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const replicateApiToken = Deno.env.get('REPLICATE_API_TOKEN')!

    if (!replicateApiToken) {
      throw new Error('Replicate API token not configured')
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { photoUrl, profileId } = await req.json()

    if (!photoUrl) {
      throw new Error('No photo URL provided')
    }

    console.log('Starting photo aging for user:', user.id)
    console.log('Photo URL:', photoUrl)

    // Call Replicate API to start aging process
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "9222a21c181b707209ef12b5e0d7e94c994b58f01c7b2fec075d2e892362f13c",
        input: {
          image: photoUrl,
          target_age: 30  // SAM model uses absolute age, not relative
        }
      })
    })

    if (!replicateResponse.ok) {
      const error = await replicateResponse.text()
      console.error('Replicate API error:', error)
      throw new Error('Failed to start aging process')
    }

    const prediction = await replicateResponse.json()
    console.log('Prediction started:', prediction.id)

    // Poll for completion (max 30 seconds)
    let result = prediction
    let attempts = 0
    const maxAttempts = 30

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      // Wait 1 second between polls
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Check prediction status
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${replicateApiToken}`,
        }
      })
      
      if (!statusResponse.ok) {
        console.error('Failed to check prediction status')
        break
      }
      
      result = await statusResponse.json()
      attempts++
      console.log(`Attempt ${attempts}: Status = ${result.status}`)
    }

    if (result.status === 'succeeded' && result.output) {
      const agedPhotoUrl = result.output
      console.log('Aging succeeded:', agedPhotoUrl)

      // Update the profile with the aged photo URL if profileId provided
      if (profileId) {
        const { error: updateError } = await supabase
          .from('future_self_profiles')
          .update({ 
            aged_photo_url: agedPhotoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Failed to update profile:', updateError)
        } else {
          console.log('Profile updated with aged photo')
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          agedPhotoUrl,
          predictionId: prediction.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    } else {
      console.log('Aging failed or timed out:', result.status)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error || 'Aging process failed',
          status: result.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 to avoid CORS issues
        }
      )
    }
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 to avoid CORS issues
      }
    )
  }
})