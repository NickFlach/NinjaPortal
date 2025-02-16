import { Router } from 'express';
import { db } from '@db';
import { sql } from 'drizzle-orm';

const router = Router();

// Helper to generate mock data with proper timestamps
function generateMockData(days: number = 30, interval: number = 5) {
  const data = [];
  const now = Date.now();
  const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds

  // Generate data points at specified intervals
  for (let i = days * 24 * 60 / interval; i >= 0; i--) {
    data.push({
      timestamp: new Date(now - i * intervalMs).toISOString(),
      value: Math.random() * 100,
      metric: 'sample'
    });
  }

  return data;
}

// GET /api/lumira/metrics
router.get('/metrics', async (req, res) => {
  const { start, end, interval = 5 } = req.query;

  try {
    // Parse time range parameters
    const startTime = start ? new Date(start as string) : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours
    const endTime = end ? new Date(end as string) : new Date();

    // For now, generate mock data based on the time range
    const daysDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000));

    const metrics = [
      {
        name: 'Network Performance',
        data: generateMockData(daysDiff, Number(interval))
      },
      {
        name: 'Data Synchronization Rate',
        data: generateMockData(daysDiff, Number(interval))
      },
      {
        name: 'System Load',
        data: generateMockData(daysDiff, Number(interval))
      }
    ];

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;