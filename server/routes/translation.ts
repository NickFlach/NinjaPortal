import { Router } from 'express';
import { v2 } from '@google-cloud/translate';
import { lumiraService } from './lumira';

const router = Router();

// Initialize Google Translate with API key from environment variable
const translate = new v2.Translate({
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
    try {
      await lumiraService.processMetrics({
        type: 'playback',
        timestamp: new Date().toISOString(),
        data: {
          sourceLanguage: 'en',
          targetLanguage,
          success: true,
          textLength: text.length
        },
        metadata: {
          source: 'translation-api',
          processed: true
        }
      });
    } catch (lumiraError) {
      console.warn('Non-critical Lumira metrics error:', lumiraError);
      // Don't fail the translation if metrics fail
    }

    res.json({
      translatedText: translation,
      sourceLanguage: 'en',
      targetLanguage
    });
  } catch (error) {
    console.error('Translation error:', error);

    // Log failed translation attempt for analysis
    try {
      await lumiraService.processMetrics({
        type: 'playback',
        timestamp: new Date().toISOString(),
        data: {
          sourceLanguage: 'en',
          targetLanguage: req.body.targetLanguage,
          success: false,
          textLength: (req.body.text || '').length
        },
        metadata: {
          source: 'translation-api',
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } catch (lumiraError) {
      console.warn('Non-critical Lumira metrics error:', lumiraError);
    }

    res.status(500).json({ 
      error: 'Translation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;