import { OpenAI } from 'openai';

interface MoodAnalysisResult {
  mood: 'happy' | 'sad' | 'neutral';
  confidence: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeMood(text: string): Promise<MoodAnalysisResult> {
  try {
    console.log('Analyzing mood for text:', text);

    const prompt = `Analyze the emotional tone of this song title and determine if it's happy, sad, or neutral: "${text}"
    Only respond with one of these words: happy, sad, neutral`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a music sentiment analyzer. Respond only with: happy, sad, or neutral.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const mood = response.choices[0].message.content?.trim().toLowerCase() as 'happy' | 'sad' | 'neutral';
    const confidence = response.choices[0].finish_reason === 'stop' ? 0.9 : 0.5;

    console.log('Mood analysis result:', { mood, confidence });

    return {
      mood: mood || 'neutral',
      confidence
    };
  } catch (error) {
    console.error('Error analyzing mood:', error);
    return {
      mood: 'neutral',
      confidence: 0
    };
  }
}

export async function aggregateMoodData(songId: number): Promise<MoodAnalysisResult> {
  // This function will be implemented to combine user reactions with AI analysis
  // for more accurate mood classification
  return {
    mood: 'neutral',
    confidence: 0
  };
}