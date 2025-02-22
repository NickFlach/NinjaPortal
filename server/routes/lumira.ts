import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { WebSocket } from 'ws';
import {
  StandardizedData,
  GpsData,
  PlaybackData,
  TranslationRequest,
  TranslationResponse,
  ProcessedMetrics,
  translationRequestSchema,
  translationResponseSchema,
} from '../types/lumira';
import { aiInterpreter } from '../services/ai-interpreter';
import { ragTranslator } from '../services/rag-translator';
import { messages } from '../../client/src/i18n';

const router = Router();

// Initialize RAG translator with our existing translations
ragTranslator.initializeStore(messages);

// Update translation endpoint
router.post('/translate', async (req, res) => {
  try {
    const result = translationRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request format',
        details: result.error.format()
      });
    }

    const { key, targetLocale, params } = result.data;

    // First try RAG-based translation
    const ragTranslation = await ragTranslator.findSimilarTranslation(key, targetLocale);

    // Process through AI interpreter for metrics
    const standardizedData: StandardizedData = {
      type: 'translation',
      timestamp: new Date().toISOString(),
      data: {
        sourceLanguage: 'en',
        targetLanguage: targetLocale,
        success: true,
        text: key
      },
      metadata: {
        source: 'translation-service',
        processed: false
      }
    };

    try {
      const interpretedMetrics = await aiInterpreter.interpretMetrics(standardizedData);
      await processMetricsPrivately(standardizedData);

      // Use RAG translation if available, otherwise fallback
      const translation = ragTranslation || interpretedMetrics.translation || key;

      const response: TranslationResponse = {
        translation,
        confidence: ragTranslation ? 0.95 : (interpretedMetrics.confidence || 1),
        metrics: interpretedMetrics.aggregates
      };

      res.json(response);
    } catch (error) {
      console.error('Translation error:', error);

      await processMetricsPrivately({
        ...standardizedData,
        data: {
          ...standardizedData.data,
          success: false
        }
      });

      // Return original key as fallback
      const fallbackResponse: TranslationResponse = {
        translation: key,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.json(fallbackResponse);
    }
  } catch (error) {
    console.error('Translation request error:', error);
    res.status(500).json({
      error: 'Failed to process translation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// In-memory stores for experiential feedback and sentiment analysis
const metricsStore = new Map<string, {
  count: number;
  aggregates: Record<string, number>;
  lastUpdated: Date;
}>();

const experienceStore = new Map<string, {
  timestamp: Date;
  type: 'audio' | 'visual' | 'interaction';
  sentiment: number; // -1 to 1
  intensity: number; // 0 to 1
  context: string;
  location?: string;
  songId?: number;
}[]>();

const translationStore = new Map<string, {
  usageCount: number;
  successRate: number;
  commonPhrases: Record<number, number>;
  lastUpdated: Date;
}>();

const communityFeedbackStore = new Map<string, {
  category: string;
  sentiment: number;
  impact: number;
  suggestions: string[];
  votes: number;
  status: 'new' | 'reviewing' | 'implemented' | 'declined';
  lastUpdated: Date;
}>();

const codePatternStore = new Map<string, {
  frequency: number;
  context: string;
  success: boolean;
  impact: number;
  lastUpdated: Date;
}>();

// Process metrics while preserving privacy
async function processMetricsPrivately(data: StandardizedData) {
  const key = `${data.type}_${new Date().toISOString().split('T')[0]}`;
  const current = metricsStore.get(key) || {
    count: 0,
    aggregates: {},
    lastUpdated: new Date()
  };

  // Process standard metrics
  current.count++;

  if (data.type === 'gps') {
    const gpsData = data.data as GpsData;
    current.aggregates.avgAccuracy = updateRunningAverage(
      current.aggregates.avgAccuracy || 0,
      gpsData.accuracy || 0,
      current.count
    );
    current.aggregates.avgSpeed = updateRunningAverage(
      current.aggregates.avgSpeed || 0,
      gpsData.speed || 0,
      current.count
    );
  } else if (data.type === 'playback') {
    const playbackData = data.data as PlaybackData;
    current.aggregates.playingPercentage = updateRunningAverage(
      current.aggregates.playingPercentage || 0,
      playbackData.isPlaying ? 1 : 0,
      current.count
    );
  } else if (data.type === 'reflection' || data.type === 'evolution') {
    // Process through AI interpreter
    try {
      const interpretedMetrics = await aiInterpreter.interpretMetrics(data);
      Object.assign(current.aggregates, interpretedMetrics.aggregates);
    } catch (error) {
      console.error('Error processing metrics through AI:', error);
    }
  } else if (data.type === 'experience') {
    const exp = data.data;
    const timeKey = new Date().toISOString();

    const experiences = experienceStore.get(timeKey) || [];
    experiences.push({
      timestamp: new Date(),
      type: exp.type,
      sentiment: exp.sentiment,
      intensity: exp.intensity,
      context: exp.context,
      location: exp.location,
      songId: exp.songId
    });

    // Update running averages for the experience type
    current.aggregates[`${exp.type}_sentiment`] = updateRunningAverage(
      current.aggregates[`${exp.type}_sentiment`] || 0,
      exp.sentiment,
      current.count
    );

    current.aggregates[`${exp.type}_intensity`] = updateRunningAverage(
      current.aggregates[`${exp.type}_intensity`] || 0,
      exp.intensity,
      current.count
    );

    experienceStore.set(timeKey, experiences);
  } else if (data.type === 'translation') {
    const langKey = `${data.data.sourceLanguage}_${data.data.targetLanguage}`;
    const translationData = translationStore.get(langKey) || {
      usageCount: 0,
      successRate: 1,
      commonPhrases: {},
      lastUpdated: new Date()
    };

    // Update translation metrics without storing actual translations
    translationData.usageCount++;
    if (data.data.success === false) {
      translationData.successRate =
        (translationData.successRate * (translationData.usageCount - 1) + 0) / translationData.usageCount;
    }

    // Store phrase patterns without actual content
    const phraseLength = data.data.text.split(' ').length;
    translationData.commonPhrases[phraseLength] =
      (translationData.commonPhrases[phraseLength] || 0) + 1;

    translationData.lastUpdated = new Date();
    translationStore.set(langKey, translationData);
  } else if (data.type === 'code') {
    // Process code patterns
    const { pattern, context, success, impact } = data.data;
    const patternKey = `${pattern}_${context}`;

    const existingPattern = codePatternStore.get(patternKey) || {
      frequency: 0,
      context,
      success: true,
      impact: 0,
      lastUpdated: new Date()
    };

    existingPattern.frequency++;
    existingPattern.success = success;
    existingPattern.impact = (existingPattern.impact + impact) / 2;
    existingPattern.lastUpdated = new Date();

    codePatternStore.set(patternKey, existingPattern);
  }


  current.lastUpdated = new Date();
  metricsStore.set(key, current);

  // Cleanup old data
  pruneOldMetrics();

  return current;
}

// Update running average without storing individual values
function updateRunningAverage(currentAvg: number, newValue: number, count: number): number {
  return ((currentAvg * (count - 1)) + newValue) / count;
}

// Prune metrics older than 24 hours for experience data, 30 days for aggregates
function pruneOldMetrics() {
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  metricsStore.forEach((value, key) => {
    if (value.lastUpdated < thirtyDaysAgo) {
      metricsStore.delete(key);
    }
  });

  experienceStore.forEach((_, key) => {
    const timestamp = new Date(key);
    if (timestamp < oneDayAgo) {
      experienceStore.delete(key);
    }
  });

  communityFeedbackStore.forEach((value, key) => {
    if (value.lastUpdated < thirtyDaysAgo && value.status === 'implemented') {
      communityFeedbackStore.delete(key);
    }
  });

  translationStore.forEach((value, key) => {
    if (value.lastUpdated < thirtyDaysAgo) {
      translationStore.delete(key);
    }
  });

  codePatternStore.forEach((value, key) => {
    if (value.lastUpdated < thirtyDaysAgo) {
      codePatternStore.delete(key);
    }
  });
}

// Record user experience feedback
router.post('/experience', async (req, res) => {
  try {
    const experienceData = {
      type: 'experience',
      timestamp: new Date().toISOString(),
      data: req.body,
      metadata: {
        source: 'user-experience',
        processed: true
      }
    };

    const metrics = await processMetricsPrivately(experienceData); //await added here
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error processing experience:', error);
    res.status(500).json({
      error: 'Failed to process experience',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get experience insights
router.get('/experience-insights', async (req, res) => {
  try {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Aggregate recent experiences
    const recentExperiences = Array.from(experienceStore.entries())
      .filter(([key, _]) => new Date(key) >= hourAgo)
      .flatMap(([_, experiences]) => experiences);

    // Calculate insights
    const insights = {
      currentMood: {
        audio: calculateAverageSentiment(recentExperiences, 'audio'),
        visual: calculateAverageSentiment(recentExperiences, 'visual'),
        interaction: calculateAverageSentiment(recentExperiences, 'interaction')
      },
      engagementLevels: {
        audio: calculateAverageIntensity(recentExperiences, 'audio'),
        visual: calculateAverageIntensity(recentExperiences, 'visual'),
        interaction: calculateAverageIntensity(recentExperiences, 'interaction')
      },
      totalExperiences: recentExperiences.length,
      timestamp: now.toISOString()
    };

    res.json(insights);
  } catch (error) {
    console.error('Error fetching experience insights:', error);
    res.status(500).json({
      error: 'Failed to fetch experience insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function calculateAverageSentiment(experiences: any[], type: string): number {
  const typeExperiences = experiences.filter(exp => exp.type === type);
  if (typeExperiences.length === 0) return 0;
  return typeExperiences.reduce((sum, exp) => sum + exp.sentiment, 0) / typeExperiences.length;
}

function calculateAverageIntensity(experiences: any[], type: string): number {
  const typeExperiences = experiences.filter(exp => exp.type === type);
  if (typeExperiences.length === 0) return 0;
  return typeExperiences.reduce((sum, exp) => sum + exp.intensity, 0) / typeExperiences.length;
}

// Get community insights and action items
router.get('/community-insights', async (req, res) => {
  try {
    const insights = Array.from(communityFeedbackStore.entries())
      .map(([key, data]) => ({
        id: key,
        ...data,
        actionable: data.impact > 7 && data.votes > 5,
        priority: (data.impact * data.votes) / 10
      }))
      .sort((a, b) => b.priority - a.priority);

    res.json(insights);
  } catch (error) {
    console.error('Error fetching community insights:', error);
    res.status(500).json({
      error: 'Failed to fetch community insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Vote on feedback
router.post('/feedback/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const feedback = communityFeedbackStore.get(id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    feedback.votes += 1;
    feedback.lastUpdated = new Date();
    communityFeedbackStore.set(id, feedback);

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({
      error: 'Failed to process vote',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update feedback status
router.patch('/feedback/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const feedback = communityFeedbackStore.get(id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    feedback.status = status;
    feedback.lastUpdated = new Date();
    communityFeedbackStore.set(id, feedback);

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      error: 'Failed to update status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// New endpoint for code pattern suggestions
router.get('/code-suggestions', async (req, res) => {
  try {
    const { context, limit = 5 } = req.query;

    const suggestions = Array.from(codePatternStore.entries())
      .filter(([_, data]) => !context || data.context === context)
      .sort((a, b) => {
        // Sort by success rate and impact
        const scoreA = a[1].success ? (a[1].impact * a[1].frequency) : 0;
        const scoreB = b[1].success ? (b[1].impact * b[1].frequency) : 0;
        return scoreB - scoreA;
      })
      .slice(0, Number(limit))
      .map(([key, data]) => ({
        pattern: key.split('_')[0],
        context: data.context,
        confidence: data.success ? (data.impact * data.frequency) / 100 : 0,
        usage: data.frequency,
        lastUsed: data.lastUpdated
      }));

    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching code suggestions:', error);
    res.status(500).json({
      error: 'Failed to fetch code suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// Get translation analytics without exposing individual translations
router.get('/translation-analytics', async (req, res) => {
  try {
    const analytics = Array.from(translationStore.entries()).map(([key, data]) => ({
      languagePair: key,
      usageCount: data.usageCount,
      successRate: data.successRate,
      phrasePatterns: data.commonPhrases,
      lastUpdated: data.lastUpdated
    }));

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching translation analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch translation analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get aggregated metrics without exposing individual data points
router.get('/metrics', async (req, res) => {
  const { start, end } = req.query;

  try {
    const startTime = start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = end ? new Date(end as string) : new Date();

    // Filter metrics within time range
    const filteredMetrics = Array.from(metricsStore.entries())
      .filter(([_, value]) => {
        const date = value.lastUpdated;
        return date >= startTime && date <= endTime;
      })
      .map(([key, value]) => ({
        bucket: key.split('_')[1],
        data_type: key.split('_')[0],
        aggregates: value.aggregates,
        count: value.count
      }));

    res.json(filteredMetrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
export const lumiraService = {
  processMetricsPrivately,
  updateRunningAverage
};