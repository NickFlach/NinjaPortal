import { Router } from 'express';
import { getMapData, incrementListenCount } from '../services/music';

const router = Router();

// Get map data endpoint
router.get('/api/music/map', async (req, res) => {
  try {
    const mapData = await getMapData();

    if (!mapData) {
      return res.status(500).json({ 
        error: 'Failed to fetch map data - no data returned'
      });
    }

    res.json(mapData);
  } catch (error) {
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
    res.status(500).json({ 
      error: 'Failed to update map data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;