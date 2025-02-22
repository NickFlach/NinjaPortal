import { Buffer } from 'buffer';
import { createIPFSManager } from './ipfs';
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

    // Create IPFS manager with wallet address
    const ipfs = createIPFSManager(metadata.uploadedBy);

    // Upload to IPFS
    const ipfsHash = await ipfs.uploadFile(file);

    return {
      type: 'ipfs' as const,
      hash: ipfsHash,
      metadata
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function getFileBuffer(source: { type: 'ipfs' | 'neofs', hash?: string, objectId?: string }): Promise<ArrayBuffer> {
  try {
    if (source.type === 'ipfs' && source.hash) {
      const ipfs = createIPFSManager('default'); // Use default for retrieval
      return await ipfs.getFile(source.hash);
    } else if (source.type === 'neofs' && source.objectId) {
      const response = await fetch(`/api/neo-storage/download/${source.objectId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch from NeoFS: ${response.statusText}`);
      }
      return await response.arrayBuffer();
    } else {
      throw new Error('Invalid source configuration');
    }
  } catch (error) {
    console.error('File retrieval error:', error);
    throw error;
  }
}

// Helper to check file availability
export async function checkFileAvailability(source: { type: 'ipfs' | 'neofs', hash?: string, objectId?: string }): Promise<boolean> {
  try {
    if (source.type === 'ipfs' && source.hash) {
      const ipfs = createIPFSManager('default');
      await ipfs.getFile(source.hash); // Will throw if not available
      return true;
    } else if (source.type === 'neofs' && source.objectId) {
      const response = await apiRequest('HEAD', `/api/neo-storage/check/${source.objectId}`);
      return response.ok;
    }
    return false;
  } catch {
    return false;
  }
}