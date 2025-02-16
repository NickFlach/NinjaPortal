import { Router } from 'express';
import { Translate } from '@google-cloud/translate';
import { lumiraService } from './lumira';

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

    // Send anonymized translation data to Lumira for analysis
    lumiraService.processMetricsPrivately({
      type: 'translation',
      timestamp: new Date().toISOString(),
      data: {
        sourceLanguage: 'en',
        targetLanguage,
        success: true,
        text: text // Only length will be stored
      },
      metadata: {
        source: 'translation-api',
        processed: true
      }
    });

    res.json({
      translatedText: translation,
      sourceLanguage: 'en',
      targetLanguage
    });
  } catch (error) {
    console.error('Translation error:', error);

    // Log failed translation attempt for analysis
    lumiraService.processMetricsPrivately({
      type: 'translation',
      timestamp: new Date().toISOString(),
      data: {
        sourceLanguage: 'en',
        targetLanguage: req.body.targetLanguage,
        success: false,
        text: req.body.text || ''
      },
      metadata: {
        source: 'translation-api',
        processed: false
      }
    });

    res.status(500).json({ 
      error: 'Translation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;