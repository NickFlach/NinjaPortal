import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { WebSocket } from 'ws';
import type { StandardizedData, GpsData, PlaybackData } from '../types/lumira';

const router = Router();

// In-memory store for aggregated metrics and translation patterns
const metricsStore = new Map<string, {
  count: number;
  aggregates: Record<string, number>;
  lastUpdated: Date;
}>();

const translationStore = new Map<string, {
  usageCount: number;
  successRate: number;
  commonPhrases: { [key: string]: number };
  lastUpdated: Date;
}>();

// Privacy-preserving data processing
function processMetricsPrivately(data: StandardizedData) {
  const key = `${data.type}_${new Date().toISOString().split('T')[0]}`;
  const current = metricsStore.get(key) || {
    count: 0,
    aggregates: {},
    lastUpdated: new Date()
  };

  // Process standard metrics
  current.count++;
  if (data.type === 'translation') {
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
  } else if (data.type === 'gps') {
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

// Prune metrics older than 30 days
function pruneOldMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const [key, value] of metricsStore.entries()) {
    if (value.lastUpdated < thirtyDaysAgo) {
      metricsStore.delete(key);
    }
  }

  for (const [key, value] of translationStore.entries()) {
    if (value.lastUpdated < thirtyDaysAgo) {
      translationStore.delete(key);
    }
  }
}

// Process incoming data without persistence
router.post('/data', async (req, res) => {
  try {
    const data: StandardizedData = {
      type: req.body.type,
      timestamp: new Date().toISOString(),
      data: req.body,
      metadata: {
        source: req.body.source || 'anonymous',
        processed: true
      }
    };

    const metrics = processMetricsPrivately(data);
    res.json({ success: true, aggregatedMetrics: metrics });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ 
      error: 'Failed to process data',
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