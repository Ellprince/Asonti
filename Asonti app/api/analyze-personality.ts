import { PersonalityService } from '../src/services/personalityService';
import { supabase } from '../src/lib/supabase';
import type { WizardData } from '../src/types/personality';

export const config = {
  runtime: 'edge',
  regions: ['iad1'],
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const wizardData: WizardData = await request.json();
    
    if (!wizardData.attributes || !wizardData.currentValues || !wizardData.futureValues) {
      return new Response('Invalid wizard data', { status: 400 });
    }
    
    const service = new PersonalityService();
    const analysis = await service.analyzeProfile({
      ...wizardData,
      userId: user.id,
    });
    
    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Personality analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' }), 
      { 
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  }
}