import { Router } from 'express';

const router = Router();

// Mock data generator
function generateMockData(days: number = 30) {
  const data = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < days; i++) {
    data.push({
      timestamp: new Date(now - (days - i) * dayMs).toISOString(),
      value: Math.random() * 100,
      metric: 'sample'
    });
  }

  return data;
}

// GET /api/lumira/metrics
router.get('/metrics', (req, res) => {
  // Generate mock metrics for testing
  const metrics = [
    {
      name: 'Network Performance',
      data: generateMockData()
    },
    {
      name: 'Data Synchronization Rate',
      data: generateMockData()
    },
    {
      name: 'System Load',
      data: generateMockData()
    }
  ];

  res.json(metrics);
});

export default router;
