import { Router } from 'express';
import { getMusicStats, getSongMetadata } from '../services/music';

const router = Router();

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

export default router;
