import { Router } from 'express';
import { getMusicStats, getSongMetadata, getMapData } from '../services/music';

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

router.get('/api/music/stats', async (_req, res) => {
  try {
    const stats = await getMusicStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching music stats:', error);
    res.status(500).json({ error: 'Failed to fetch music stats' });
  }
});

router.get('/api/music/metadata/:id', async (req, res) => {
  try {
    const songId = parseInt(req.params.id);
    const metadata = await getSongMetadata(songId);

    if (!metadata) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(metadata);
  } catch (error) {
    console.error('Error fetching song metadata:', error);
    res.status(500).json({ error: 'Failed to fetch song metadata' });
  }
});

// Map data endpoint with improved error handling
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
    // Send a proper JSON error response
    res.status(500).json({ 
      error: 'Failed to fetch map data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;