import { Buffer } from 'buffer';

// Ensure Buffer is available in the browser environment
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export async function uploadToIPFS(file: File, jwt: string): Promise<string> {
  try {
    console.log('Starting Pinata upload...');

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 100MB limit');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(PINATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.IpfsHash) {
      throw new Error('No IPFS hash received from Pinata');
    }

    console.log('Upload successful:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

export async function getFromIPFS(hash: string, jwt: string): Promise<ArrayBuffer> {
  try {
    console.log('Fetching from Pinata:', hash);
    const response = await fetch(`${PINATA_GATEWAY}/${hash}`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('IPFS fetch failed:', error);
    throw error;
  }
}