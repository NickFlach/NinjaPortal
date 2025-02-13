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

    const fileSizeMB = req.file.size / (1024 * 1024);
    console.log('Received file upload request:', {
      filename: req.file.originalname,
      size: `${fileSizeMB.toFixed(2)}MB (${req.file.size} bytes)`,
      mimetype: req.file.mimetype,
      address: address
    });

    // Create form data for Neo FS
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    formData.append('wallet', address);

    console.log('Sending request to Neo FS...');

    // Calculate timeout based on file size
    const BASE_TIMEOUT = 30000; // 30 seconds base timeout
    const TIMEOUT_PER_MB = 2000; // 2 seconds per MB
    const timeoutDuration = BASE_TIMEOUT + (fileSizeMB * TIMEOUT_PER_MB);

    // Upload to Neo FS with dynamic timeout and retries
    const response = await axios.post(`${NEO_FS_API}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: timeoutDuration,
      maxContentLength: 10 * 1024 * 1024, // 10MB limit
      maxBodyLength: 10 * 1024 * 1024, // 10MB limit
      validateStatus: null, // Don't throw on any status
      retry: 3,
      retryDelay: (retryCount) => {
        return retryCount * 1000; // exponential backoff
      }
    });

    console.log('Neo FS response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });

    if (!response.data || response.status !== 200) {
      console.error('Neo FS error response:', response.data);
      throw new Error(response.data?.error || 'Failed to upload to Neo FS');
    }

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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

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
    console.log('Fetching files for wallet:', address);

    const response = await axios.get(`${NEO_FS_API}/files/${address}`, {
      timeout: 10000, // 10 second timeout for listing
      validateStatus: null, // Don't throw on any status
      retry: 3,
      retryDelay: (retryCount) => {
        return retryCount * 1000;
      }
    });

    console.log('Neo FS list response:', {
      status: response.status,
      statusText: response.statusText,
      dataLength: Array.isArray(response.data) ? response.data.length : 'not an array'
    });

    if (!response.data || response.status !== 200) {
      console.error('Neo FS list error:', response.data);
      throw new Error(response.data?.error || 'Failed to list files from Neo FS');
    }

    res.json(response.data);
  } catch (error: any) {
    console.error('Neo FS list error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

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
    console.log('Downloading file:', { address, fileId });

    const response = await axios.get(`${NEO_FS_API}/download/${fileId}`, {
      responseType: 'stream',
      params: { wallet: address },
      timeout: 15000, // 15 second timeout for downloads
      validateStatus: null, // Don't throw on any status
      retry: 3,
      retryDelay: (retryCount) => {
        return retryCount * 1000;
      }
    });

    if (!response.data || response.status !== 200) {
      console.error('Neo FS download error:', response.data);
      throw new Error(response.data?.error || 'Failed to download from Neo FS');
    }

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);

    response.data.pipe(res);
  } catch (error: any) {
    console.error('Neo FS download error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

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