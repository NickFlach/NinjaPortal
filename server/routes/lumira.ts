import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { WebSocket } from 'ws';
import type { LumiraDataPoint, GpsData, PlaybackData, StandardizedData } from '../types/lumira';

const router = Router();

// In-memory store for aggregated metrics only, no personal data
const metricsStore = new Map<string, {
  count: number;
  aggregates: Record<string, number>;
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

  // Increment anonymized counters without storing raw data
  current.count++;

  // Aggregate metrics without storing individual values
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
  }

  current.lastUpdated = new Date();
  metricsStore.set(key, current);

  // Automatically prune old data
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