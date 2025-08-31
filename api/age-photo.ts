import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
  regions: ['iad1'],
};

interface RequestBody {
  imageUrl: string;
  action: 'start' | 'poll' | 'cancel';
  predictionId?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    // Create server Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const serverSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify user
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, imageUrl, predictionId } = req.body as RequestBody;

    // Get Replicate token from server environment
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return res.status(503).json({ error: 'Replicate service not configured' });
    }

    const replicate = new Replicate({ auth: replicateToken });

    // SAM model for aging
    const SAM_MODEL_VERSION = 'd7129e88816823363aa5b41ed9aab6b9cb2996ce742c4169379cca5c40812b1f';

    switch (action) {
      case 'start': {
        if (!imageUrl) {
          return res.status(400).json({ error: 'Image URL required' });
        }

        // Start aging process
        const prediction = await replicate.predictions.create({
          version: SAM_MODEL_VERSION,
          input: {
            image: imageUrl,
            target_age: '2_years_older',
          },
        });

        return res.status(200).json({ 
          predictionId: prediction.id,
          status: prediction.status 
        });
      }

      case 'poll': {
        if (!predictionId) {
          return res.status(400).json({ error: 'Prediction ID required' });
        }

        // Check prediction status
        const prediction = await replicate.predictions.get(predictionId);

        if (prediction.status === 'succeeded') {
          const output = Array.isArray(prediction.output) 
            ? prediction.output[0] 
            : prediction.output;

          return res.status(200).json({ 
            status: 'succeeded',
            agedUrl: output || null 
          });
        }

        if (prediction.status === 'failed') {
          return res.status(200).json({ 
            status: 'failed',
            error: prediction.error 
          });
        }

        // Still processing
        return res.status(200).json({ 
          status: prediction.status 
        });
      }

      case 'cancel': {
        if (!predictionId) {
          return res.status(400).json({ error: 'Prediction ID required' });
        }

        await replicate.predictions.cancel(predictionId);

        return res.status(200).json({ status: 'canceled' });
      }

      default: {
        return res.status(400).json({ error: 'Invalid action' });
      }
    }
  } catch (error) {
    console.error('Age photo error:', error);
    return res.status(500).json({ 
      error: 'Failed to process aging request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}