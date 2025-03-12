import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

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

    console.log('Processing file upload:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.headers['x-wallet-address'] || 'anonymous'
    });

    // Create a temporary file path
    const tempFileName = `${crypto.randomBytes(6).toString('hex')}-${req.file.originalname}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    console.log(`Writing file to temporary location: ${tempFilePath}`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    // Create FormData instance
    const formData = new FormData();
    
    // Create a readable stream from the temp file
    const fileStream = fs.createReadStream(tempFilePath);
    
    // Add the file as a stream to FormData
    formData.append('file', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    // Add metadata for better organization in Pinata
    const metadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        app: 'neo-music-portal',
        contentType: req.file.mimetype,
        uploadedBy: req.headers['x-wallet-address'] || 'anonymous',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Optional pinning options
    const pinataOptions = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', pinataOptions);

    console.log('Sending request to Pinata...');
    
    // Get the form headers from the FormData object
    const formHeaders = formData.getHeaders();
    
    // Send request to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      { 
        headers: {
          ...formHeaders,
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_API_SECRET,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('IPFS upload response:', response.data);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Temporary file ${tempFilePath} removed`);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }
    
    res.json({ 
      success: true,
      Hash: response.data.IpfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    
    // Enhanced error logging
    if (axios.isAxiosError(error) && error.response) {
      console.error('Pinata API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload to IPFS',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) && error.response ? error.response.status : null
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

// Test endpoint to check Pinata connectivity
router.post('/test-connection', async (req, res) => {
  try {
    console.log('Testing Pinata connection with credentials:', {
      keyProvided: !!PINATA_API_KEY,
      keyLength: PINATA_API_KEY ? PINATA_API_KEY.length : 0,
      secretProvided: !!PINATA_API_SECRET,
      secretLength: PINATA_API_SECRET ? PINATA_API_SECRET.length : 0
    });
    
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'pinata_api_key': PINATA_API_KEY || '',
        'pinata_secret_api_key': PINATA_API_SECRET || ''
      }
    });
    
    console.log('Pinata test authentication response:', response.data);
    res.json({ 
      success: true, 
      message: 'Pinata connection successful',
      credentials: {
        keyProvided: !!PINATA_API_KEY,
        secretProvided: !!PINATA_API_SECRET
      },
      data: response.data
    });
  } catch (error) {
    console.error('Pinata test authentication error:', error);
    
    // Enhanced error logging
    if (axios.isAxiosError(error) && error.response) {
      console.error('Pinata API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Pinata connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      credentials: {
        keyProvided: !!PINATA_API_KEY,
        secretProvided: !!PINATA_API_SECRET
      },
      status: axios.isAxiosError(error) && error.response ? error.response.status : null
    });
  }
});

// Simple upload test endpoint with detailed logging
router.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Log detailed information about the request
    console.log('Test upload request received:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname,
      encoding: req.file.encoding,
      bufferSize: req.file.buffer.length
    });

    // Create a temporary file path
    const tempFileName = `${crypto.randomBytes(6).toString('hex')}-${req.file.originalname}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);
    
    console.log(`Writing file to temporary location: ${tempFilePath}`);
    
    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    // Create new FormData instance
    const formData = new FormData();
    
    // Create a readable stream from the temp file
    const fileStream = fs.createReadStream(tempFilePath);
    
    // Add the file as a stream to FormData
    formData.append('file', fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    
    // Add metadata for better organization in Pinata
    const metadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        app: 'neo-music-portal',
        contentType: req.file.mimetype,
        uploadedBy: req.headers['x-wallet-address'] || 'anonymous',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Optional pinning options
    const pinataOptions = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', pinataOptions);
    
    console.log('FormData created with file stream');
    
    // Get form headers
    const formHeaders = formData.getHeaders();
    
    // Add required Pinata headers
    const headers = {
      ...formHeaders,
      'pinata_api_key': PINATA_API_KEY || '',
      'pinata_secret_api_key': PINATA_API_SECRET || ''
    };
    
    console.log('Sending request to Pinata test upload...');
    
    // Send request to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      { 
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log('Pinata test upload response:', response.data);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`Temporary file ${tempFilePath} removed`);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }
    
    // Send success response
    res.json({
      success: true,
      hash: response.data.IpfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      data: response.data
    });
    
  } catch (error) {
    console.error('Test upload error:', error);
    
    // Enhanced error reporting
    if (axios.isAxiosError(error) && error.response) {
      console.error('Pinata API error details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    // Send error response
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) && error.response ? error.response.status : null
    });
  }
});

export default router;