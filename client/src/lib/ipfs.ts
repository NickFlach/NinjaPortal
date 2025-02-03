import { Buffer } from 'buffer';

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const IPFS_GATEWAY = 'https://ipfs.io/ipfs';

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Starting IPFS upload process...');

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 100MB limit');
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Upload to IPFS using Infura's IPFS API
    console.log('Uploading to IPFS...');
    const response = await fetch('https://ipfs.infura.io:5001/api/v0/add', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${import.meta.env.VITE_INFURA_PROJECT_ID}:${import.meta.env.VITE_INFURA_PROJECT_SECRET}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('IPFS upload failed:', error);
      throw new Error(error.message || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload successful:', data);

    if (!data.Hash) {
      throw new Error('No IPFS hash received');
    }

    return data.Hash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

export async function getFromIPFS(hash: string): Promise<ArrayBuffer> {
  try {
    console.log('Starting IPFS fetch process for hash:', hash);

    // Fetch directly from IPFS gateway
    console.log('Fetching from IPFS gateway...');
    const response = await fetch(`${IPFS_GATEWAY}/${hash}`);

    if (!response.ok) {
      console.error('IPFS fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully fetched file from IPFS');
    return await response.arrayBuffer();
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw error;
  }
}