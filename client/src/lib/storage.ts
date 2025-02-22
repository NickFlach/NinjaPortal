import { Buffer } from 'buffer';
import { apiRequest } from './queryClient';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

interface StorageMetadata {
  title: string;
  artist: string;
  fileSize: number;
  duration?: number;
  mimeType: string;
  uploadedBy: string;
}

export async function uploadFile(file: File, metadata: StorageMetadata) {
  try {
    console.log('Starting file upload...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    });

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await apiRequest('POST', '/api/ipfs/upload', {
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      type: 'ipfs' as const,
      hash: response.Hash,
      metadata
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function getFileBuffer(source: { type: 'ipfs', hash: string }): Promise<ArrayBuffer> {
  try {
    if (!source.hash) {
      throw new Error('Missing IPFS hash');
    }

    const response = await apiRequest('GET', `/api/ipfs/fetch/${source.hash}`, {
      responseType: 'arraybuffer'
    });

    return response;
  } catch (error) {
    console.error('File retrieval error:', error);
    throw error;
  }
}

// Helper to check file availability
export async function checkFileAvailability(source: { type: 'ipfs', hash: string }): Promise<boolean> {
  try {
    if (!source.hash) {
      return false;
    }

    await apiRequest('HEAD', `/api/ipfs/fetch/${source.hash}`);
    return true;
  } catch {
    return false;
  }
}