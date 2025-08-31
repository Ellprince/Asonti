import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

interface RequestBody {
  imageUrl: string;
  action: 'start' | 'poll' | 'cancel';
  predictionId?: string;
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.substring(7);

    // Create server Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const serverSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify user
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser(token);
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { action, imageUrl, predictionId } = await request.json() as RequestBody;

    // Get Replicate token from server environment
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return new Response(
        JSON.stringify({ error: 'Replicate service not configured' }),
        { status: 503, headers: { 'content-type': 'application/json' } }
      );
    }

    const replicate = new Replicate({ auth: replicateToken });

    // SAM model for aging
    const SAM_MODEL_VERSION = 'd7129e88816823363aa5b41ed9aab6b9cb2996ce742c4169379cca5c40812b1f';

    switch (action) {
      case 'start': {
        if (!imageUrl) {
          return new Response(
            JSON.stringify({ error: 'Image URL required' }),
            { status: 400, headers: { 'content-type': 'application/json' } }
          );
        }

        // Start aging process
        const prediction = await replicate.predictions.create({
          version: SAM_MODEL_VERSION,
          input: {
            image: imageUrl,
            target_age: '2_years_older',
          },
        });

        return new Response(
          JSON.stringify({ 
            predictionId: prediction.id,
            status: prediction.status 
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      case 'poll': {
        if (!predictionId) {
          return new Response(
            JSON.stringify({ error: 'Prediction ID required' }),
            { status: 400, headers: { 'content-type': 'application/json' } }
          );
        }

        // Check prediction status
        const prediction = await replicate.predictions.get(predictionId);

        if (prediction.status === 'succeeded') {
          const output = Array.isArray(prediction.output) 
            ? prediction.output[0] 
            : prediction.output;

          return new Response(
            JSON.stringify({ 
              status: 'succeeded',
              agedUrl: output || null 
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }

        if (prediction.status === 'failed') {
          return new Response(
            JSON.stringify({ 
              status: 'failed',
              error: prediction.error 
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }

        // Still processing
        return new Response(
          JSON.stringify({ 
            status: prediction.status 
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      case 'cancel': {
        if (!predictionId) {
          return new Response(
            JSON.stringify({ error: 'Prediction ID required' }),
            { status: 400, headers: { 'content-type': 'application/json' } }
          );
        }

        await replicate.predictions.cancel(predictionId);

        return new Response(
          JSON.stringify({ status: 'canceled' }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('Age photo error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process aging request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}