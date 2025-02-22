import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const NEO_X_IPFS_API = 'https://neox-ipfs.neo.org/api/v1';

// Proxy route for IPFS uploads
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('wallet', walletAddress as string);

    const response = await axios.post(`${NEO_X_IPFS_API}/add`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Wallet-Address': walletAddress,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    res.json(response.data);
  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload to IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy route for IPFS downloads
router.get('/fetch/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const response = await axios.get(`${NEO_X_IPFS_API}/cat/${cid}`, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': '*/*'
      }
    });

    res.set('Content-Type', 'application/octet-stream');
    res.send(response.data);
  } catch (error) {
    console.error('IPFS fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch from IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
