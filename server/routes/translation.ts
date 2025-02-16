import { Router } from 'express';
import { Translate } from '@google-cloud/translate/build/src/v2';

const router = Router();

// Initialize Google Translate with API key from environment variable
const translate = new Translate({
  key: process.env.TRANSLATION_API_KEY
});

router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const [translation] = await translate.translate(text, targetLanguage);

    res.json({
      translatedText: translation,
      sourceLanguage: 'en',
      targetLanguage
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;