import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import { db } from '@db';
import { eq } from 'drizzle-orm';

const router = Router();
// Configure multer with proper field name matching the frontend
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const NEO_FS_API = "https://fs.neo.org";

// Upload file to Neo FS
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file in request:', req.files, req.file);
      return res.status(400).json({ error: 'No file provided' });
    }

    // Get wallet address from header
    const address = req.headers['x-wallet-address'] as string;
    if (!address) {
      console.error('No wallet address in headers:', req.headers);
      return res.status(400).json({ error: 'No wallet address provided' });
    }

    console.log('Received file upload request:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      address: address
    });

    // Create form data for Neo FS
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    formData.append('wallet', address);

    // Upload to Neo FS with timeout
    const response = await axios.post(`${NEO_FS_API}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 15000, // 15 second timeout - reduced from 30s
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
      maxBodyLength: 10 * 1024 * 1024, // 10MB limit
      retry: 3, // Enable retries
      retryDelay: (retryCount) => {
        return retryCount * 1000; // exponential backoff
      }
    });

    const fileData = {
      id: response.data.id,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      url: `${NEO_FS_API}/files/${response.data.id}`,
    };

    console.log('Upload successful:', fileData);
    res.json(fileData);
  } catch (error: any) {
    console.error('Neo FS upload error:', error);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Upload timed out. Please try again with a smaller file.' });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Unable to connect to Neo FS. Please try again later.' });
    }

    if (error.response?.status === 502) {
      return res.status(502).json({ error: 'Neo FS service is currently unavailable. Please try again later.' });
    }

    if (error.response?.status === 413 || error instanceof multer.MulterError) {
      return res.status(413).json({ error: 'File is too large. Maximum size is 10MB.' });
    }

    res.status(500).json({ error: 'Failed to upload file to Neo FS', details: error.message });
  }
});

// List files for a wallet
router.get('/files/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const response = await axios.get(`${NEO_FS_API}/files/${address}`, {
      timeout: 10000, // 10 second timeout for listing
      retry: 3,
      retryDelay: (retryCount) => {
        return retryCount * 1000;
      }
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('Neo FS list error:', error);
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timed out. Please try again.' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Unable to connect to Neo FS. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to list Neo FS files', details: error.message });
  }
});

// Download file
router.get('/download/:address/:fileId', async (req, res) => {
  try {
    const { address, fileId } = req.params;
    const response = await axios.get(`${NEO_FS_API}/download/${fileId}`, {
      responseType: 'stream',
      params: { wallet: address },
      timeout: 15000, // 15 second timeout for downloads
      retry: 3,
      retryDelay: (retryCount) => {
        return retryCount * 1000;
      }
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);

    response.data.pipe(res);
  } catch (error: any) {
    console.error('Neo FS download error:', error);
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Download timed out. Please try again.' });
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Unable to connect to Neo FS. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to download file from Neo FS', details: error.message });
  }
});

export default router;