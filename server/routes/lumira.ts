import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';
import type { WebSocket } from 'ws';
import type { LumiraDataPoint, GpsData, PlaybackData, StandardizedData } from '../types/lumira';

const router = Router();

// In-memory store for real-time data
const dataStore = new Map<string, StandardizedData>();

// Standardize GPS data
function standardizeGpsData(data: GpsData): StandardizedData {
  return {
    type: 'gps',
    timestamp: new Date().toISOString(),
    data: {
      coordinates: data.coordinates,
      countryCode: data.countryCode,
      accuracy: data.accuracy || null,
      speed: data.speed || null
    },
    metadata: {
      source: data.source || 'user',
      processed: true
    }
  };
}

// Standardize playback data
function standardizePlaybackData(data: PlaybackData): StandardizedData {
  return {
    type: 'playback',
    timestamp: new Date().toISOString(),
    data: {
      songId: data.songId,
      position: data.position,
      isPlaying: data.isPlaying,
      volume: data.volume || 1.0
    },
    metadata: {
      source: data.source || 'music_player',
      processed: true
    }
  };
}

// Process and store data
async function processData(data: any): Promise<StandardizedData> {
  let standardizedData: StandardizedData;

  switch (data.type) {
    case 'gps':
      standardizedData = standardizeGpsData(data);
      break;
    case 'playback':
      standardizedData = standardizePlaybackData(data);
      break;
    default:
      throw new Error(`Unsupported data type: ${data.type}`);
  }

  // Store processed data
  dataStore.set(standardizedData.timestamp, standardizedData);

  // Persist to database
  await persistData(standardizedData);

  return standardizedData;
}

// Persist standardized data to database
async function persistData(data: StandardizedData) {
  try {
    await db.execute(sql`
      INSERT INTO lumira_metrics (
        timestamp,
        data_type,
        data,
        metadata
      ) VALUES (
        ${data.timestamp},
        ${data.type},
        ${JSON.stringify(data.data)},
        ${JSON.stringify(data.metadata)}
      )
    `);
  } catch (error) {
    console.error('Error persisting data to database:', error);
  }
}

// POST /api/lumira/data - Process incoming data
router.post('/data', async (req, res) => {
  try {
    const processedData = await processData(req.body);
    res.json(processedData);
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ 
      error: 'Failed to process data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/lumira/metrics - Get processed metrics
router.get('/metrics', async (req, res) => {
  const { start, end, interval = 5 } = req.query;

  try {
    // Parse time range parameters with timezone handling
    const startTime = start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = end ? new Date(end as string) : new Date();

    // Use time_bucket with timezone consideration for consistent bucketing
    const metrics = await db.execute(sql`
      WITH time_series AS (
        SELECT time_bucket(${interval} * '1 minute'::interval, timestamp AT TIME ZONE 'UTC') as bucket,
               data_type,
               data,
               metadata
        FROM lumira_metrics
        WHERE timestamp BETWEEN ${startTime.toISOString()} AND ${endTime.toISOString()}
      )
      SELECT 
        bucket,
        data_type,
        json_agg(data ORDER BY bucket) as data_points,
        COUNT(*) as point_count
      FROM time_series
      GROUP BY bucket, data_type
      ORDER BY bucket ASC
    `);

    res.json(metrics.rows);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
export const lumiraService = {
  processData,
  standardizeGpsData,
  standardizePlaybackData
};