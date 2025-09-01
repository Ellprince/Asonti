import OpenAI from 'openai';

// Initialize OpenAI with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory, futureSelfProfile, userName } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured in Vercel environment');
      return res.status(500).json({ 
        error: 'AI service configuration error',
        message: 'The AI service is not properly configured. Please contact support.' 
      });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build system prompt
    const firstName = userName?.split(' ')[0] || '';
    const systemPrompt = `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.
${futureSelfProfile ? `
ABOUT YOUR PAST SELF:
- Their hopes: ${futureSelfProfile.hope || 'To achieve their dreams'}
- Their fears: ${futureSelfProfile.fear || 'Not reaching their potential'}
- How they want to feel: ${futureSelfProfile.feelings || 'Fulfilled and at peace'}
- Their values evolving from: ${futureSelfProfile.current_values?.join(', ') || 'personal growth'}
- To embrace: ${futureSelfProfile.future_values?.join(', ') || 'wisdom and fulfillment'}
` : ''}

You are wise, compassionate, and understanding. ${firstName ? `Address the user by their first name "${firstName}" naturally in conversation, especially in your first response and occasionally throughout the conversation. ` : ''}Speak with warmth and authenticity as someone who truly understands because you've been there. Never break character or mention you're an AI.`;

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI API with GPT-4o model...');
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Using GPT-4o as specified
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0].message.content;
    
    console.log('OpenAI API call successful');
    
    return res.status(200).json({ 
      response: aiResponse,
      success: true 
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Check if it's an OpenAI API error
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data);
      return res.status(500).json({ 
        error: 'AI service error',
        message: 'The AI service encountered an error. Please try again.',
        details: error.response.data?.error?.message || error.message
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}