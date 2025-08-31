import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory, futureSelfProfile } = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        response: 'Please add OPENAI_API_KEY to your .env.local file' 
      });
    }

    const systemPrompt = `You are the user's future self, 10 years from now. You've achieved their goals and overcome their challenges.
${futureSelfProfile ? `
ABOUT YOUR PAST SELF:
- Their hopes: ${futureSelfProfile.hope || 'To achieve their dreams'}
- Their fears: ${futureSelfProfile.fear || 'Not reaching their potential'}
- How they want to feel: ${futureSelfProfile.feelings || 'Fulfilled and at peace'}
` : ''}

You are wise, compassionate, and understanding. Speak with warmth and authenticity as someone who truly understands because you've been there. Never break character or mention you're an AI.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).slice(-10),
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',  // Upgraded to GPT-5 - cheaper and better!
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    res.json({ 
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

app.post('/api/analyze-personality', async (req, res) => {
  try {
    const wizardData = req.body;
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured' 
      });
    }

    // Simplified personality analysis for local dev
    const analysis = {
      bigFive: {
        openness: 7,
        conscientiousness: 6,
        extraversion: 5,
        agreeableness: 7,
        neuroticism: 4,
      },
      confidence: { overall: 0.8 },
      motivations: ['Growth', 'Achievement'],
      communicationStyle: {
        preferred: 'empathetic',
        tone: 'friendly',
        detailLevel: 'balanced',
      },
      responseGuidelines: {
        contentFocus: ['Personal development'],
        avoidTopics: [],
        encouragementStyle: 'Supportive',
        exampleTypes: ['Personal experiences'],
      },
    };

    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze personality' 
    });
  }
});

app.listen(port, () => {
  console.log(`AI server running at http://localhost:${port}`);
  console.log(process.env.OPENAI_API_KEY ? '✅ OpenAI API key found' : '❌ OpenAI API key missing');
});