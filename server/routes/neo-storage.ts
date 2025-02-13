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

    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'No address provided' });
    }

    console.log('Received file upload request:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      address: address
    });

    // Create form data for Neo FS
    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);
    formData.append('wallet', address);

    // Upload to Neo FS
    const response = await axios.post(`${NEO_FS_API}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
  } catch (error) {
    console.error('Neo FS upload error:', error);
    res.status(500).json({ error: 'Failed to upload file to Neo FS' });
  }
});

// List files for a wallet
router.get('/files/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const response = await axios.get(`${NEO_FS_API}/files/${address}`);
    res.json(response.data);
  } catch (error) {
    console.error('Neo FS list error:', error);
    res.status(500).json({ error: 'Failed to list Neo FS files' });
  }
});

// Download file
router.get('/download/:address/:fileId', async (req, res) => {
  try {
    const { address, fileId } = req.params;
    const response = await axios.get(`${NEO_FS_API}/download/${fileId}`, {
      responseType: 'stream',
      params: { wallet: address }
    });

    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader('Content-Disposition', response.headers['content-disposition']);

    response.data.pipe(res);
  } catch (error) {
    console.error('Neo FS download error:', error);
    res.status(500).json({ error: 'Failed to download file from Neo FS' });
  }
});

export default router;