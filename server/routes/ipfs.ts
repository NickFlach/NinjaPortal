import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Pinata configuration
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Proxy route for IPFS uploads
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    
    // Add metadata for better organization in Pinata
    const metadata = {
      name: req.file.originalname,
      keyvalues: {
        app: 'neo-music-portal',
        contentType: req.file.mimetype,
        uploadedBy: req.headers['x-wallet-address'] || 'anonymous',
        timestamp: new Date().toISOString()
      }
    };
    formData.append('pinataMetadata', JSON.stringify(metadata));

    // Optional pinning options
    const pinataOptions = {
      cidVersion: 0
    };
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET,
        'Content-Type': 'multipart/form-data',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log('IPFS upload response:', response.data);
    res.json({ Hash: response.data.IpfsHash });
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

    console.log('Fetching from IPFS:', { cid });

    // First try to get the file from Pinata gateway
    try {
      const response = await axios.get(`${PINATA_GATEWAY}${cid}`, {
        responseType: 'arraybuffer',
        timeout: 15000
      });
      
      res.set('Content-Type', 'application/octet-stream');
      res.send(response.data);
      return;
    } catch (gatewayError) {
      console.warn('Pinata gateway error, falling back to Pinata API:', gatewayError.message);
    }

    // Fallback to Pinata API if gateway doesn't work
    const response = await axios.get(`https://api.pinata.cloud/data/pinList?status=pinned&hashContains=${cid}`, {
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_API_SECRET
      }
    });
    
    if (response.data.rows && response.data.rows.length > 0) {
      // Get direct gateway URL
      const directUrl = `${PINATA_GATEWAY}${cid}`;
      const fileResponse = await axios.get(directUrl, {
        responseType: 'arraybuffer'
      });
      
      res.set('Content-Type', 'application/octet-stream');
      res.send(fileResponse.data);
    } else {
      throw new Error('File not found in Pinata');
    }
  } catch (error) {
    console.error('IPFS fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch from IPFS',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;