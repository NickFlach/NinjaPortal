import { Buffer } from 'buffer';

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Starting IPFS upload process...');

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 100MB limit');
    }

    // Get JWT from backend
    console.log('Fetching IPFS credentials...');
    const credentialsResponse = await fetch('/api/ipfs/credentials');
    if (!credentialsResponse.ok) {
      const error = await credentialsResponse.json();
      throw new Error(error.message || 'Failed to get IPFS credentials');
    }
    const { jwt } = await credentialsResponse.json();
    console.log('Successfully obtained IPFS credentials');

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Upload to Pinata
    console.log('Uploading to Pinata...');
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Pinata upload failed:', error);
      throw new Error(error.error?.details || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload successful:', data);

    if (!data.IpfsHash) {
      throw new Error('No IPFS hash received from Pinata');
    }

    return data.IpfsHash;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

export async function getFromIPFS(hash: string): Promise<ArrayBuffer> {
  try {
    console.log('Starting IPFS fetch process for hash:', hash);

    // Get JWT from backend
    console.log('Fetching IPFS credentials...');
    const credentialsResponse = await fetch('/api/ipfs/credentials');
    if (!credentialsResponse.ok) {
      const error = await credentialsResponse.json();
      throw new Error(error.message || 'Failed to get IPFS credentials');
    }
    const { jwt } = await credentialsResponse.json();
    console.log('Successfully obtained IPFS credentials');

    // Fetch from Pinata gateway
    console.log('Fetching from Pinata gateway...');
    const response = await fetch(`${PINATA_GATEWAY}/${hash}`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    if (!response.ok) {
      console.error('Pinata fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully fetched file from IPFS');
    return await response.arrayBuffer();
  } catch (error) {
    console.error('IPFS fetch error:', error);
    throw error;
  }
}