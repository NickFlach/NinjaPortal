import { Router } from 'express';
import { getMapData, incrementListenCount } from '../services/music';

const router = Router();

// Debug middleware for map endpoint
router.use('/api/music/map', (req, res, next) => {
  console.log('Map endpoint request:', {
    headers: req.headers,
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl
  });
  next();
});

// Get map data endpoint
router.get('/api/music/map', async (req, res) => {
  try {
    console.log('Map data request received:', {
      headers: req.headers,
      auth: {
        hasInternalToken: !!req.headers['x-internal-token'],
        hasWalletAddress: !!req.headers['x-wallet-address'],
      }
    });

    const mapData = await getMapData();

    if (!mapData) {
      console.error('Map data is null or undefined');
      return res.status(500).json({ error: 'Failed to fetch map data - no data returned' });
    }

    console.log('Map data response size:', JSON.stringify(mapData).length);
    res.json(mapData);
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch map data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update map data with new listener location
router.post('/api/music/map', async (req, res) => {
  try {
    const { songId, countryCode, coordinates } = req.body;

    if (!songId || !countryCode) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'songId and countryCode are required' 
      });
    }

    await incrementListenCount(songId, countryCode, coordinates);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating map data:', error);
    res.status(500).json({ 
      error: 'Failed to update map data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
