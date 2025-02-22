import { Buffer } from 'buffer';

const pinataJWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_API = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
const IPFS_GATEWAY = 'https://ipfs.io/ipfs';

if (!pinataJWT) {
  throw new Error('Pinata JWT not found. Please check your environment variables.');
}

export async function uploadToIPFS(file: File): Promise<string> {
  try {
    console.log('Starting Pinata upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    // Validate file size (max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 100MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    // Validate file type
    const validAudioTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/aac',
      'audio/mp4',
      'audio/x-m4a'
    ];

    if (!validAudioTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Supported types: MP3, WAV, OGG, AAC, M4A`);
    }

    const formData = new FormData();
    formData.append('file', file);

    // Simplified metadata structure
    const metadata = {
      name: file.name,
      keyvalues: {
        contentType: file.type,
        size: file.size,
        uploadTimestamp: new Date().toISOString()
      }
    };

    // Add metadata as string
    formData.append('pinataMetadata', JSON.stringify(metadata));

    // Add upload options
    const options = {
      cidVersion: 1,
      wrapWithDirectory: false
    };
    formData.append('pinataOptions', JSON.stringify(options));

    console.log('Sending file to Pinata...', { metadata });

    const res = await fetch(PINATA_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJWT}`
      },
      body: formData
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Pinata API error:', error);
      if (res.status === 401) {
        throw new Error('Invalid Pinata credentials. Please check your JWT token.');
      } else if (res.status === 413) {
        throw new Error('File is too large for Pinata to process.');
      } else if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Pinata upload failed (${res.status}): ${error}`);
      }
    }

    const data = await res.json();
    console.log('Pinata upload successful:', {
      ipfsHash: data.IpfsHash,
      timestamp: new Date().toISOString(),
      size: file.size
    });

    return data.IpfsHash;
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Could not connect to Pinata. Please check your internet connection.');
      }
      throw error;
    }
    throw new Error('Upload failed: Unknown error');
  }
}

export async function getFromIPFS(hash: string): Promise<ArrayBuffer> {
  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      console.log('Fetching from IPFS:', {
        hash,
        attempt: 4 - retries,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`${IPFS_GATEWAY}/${hash}`);

      if (!response.ok) {
        console.error('IPFS Gateway error:', {
          status: response.status,
          statusText: response.statusText,
          attempt: 4 - retries
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      console.log('IPFS fetch successful:', {
        hash,
        size: buffer.byteLength,
        timestamp: new Date().toISOString()
      });

      return buffer;
    } catch (error) {
      console.error(`IPFS fetch attempt ${4 - retries} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error during IPFS fetch');
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
      }
    }
  }

  throw lastError || new Error('Failed to fetch from IPFS after multiple attempts');
}

// Add function to check IPFS connection
export async function checkIPFSConnection(): Promise<boolean> {
  try {
    const response = await fetch(IPFS_GATEWAY);
    return response.ok;
  } catch (error) {
    console.error('IPFS connection check failed:', error);
    return false;
  }
}