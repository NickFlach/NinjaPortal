import { Buffer } from 'buffer';
import { getFromIPFS, uploadToIPFS } from './ipfs';
import { apiRequest } from './queryClient';

const MAX_IPFS_SIZE = 10 * 1024 * 1024; // 10MB limit for IPFS

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

    // Determine storage strategy based on file size
    if (file.size <= MAX_IPFS_SIZE) {
      // Use IPFS for smaller files
      const ipfsHash = await uploadToIPFS(file);
      return {
        type: 'ipfs',
        hash: ipfsHash,
        metadata
      };
    } else {
      // Use NeoFS for larger files
      const formData = new FormData();
      formData.append('file', file);
      
      // Calculate GAS requirement
      const gasResponse = await apiRequest('POST', '/api/neo-storage/calculate-gas', {
        fileSize: file.size,
        duration: metadata.duration || 300 // Default to 5 minutes if duration unknown
      });

      const gasData = await gasResponse.json();
      
      // Upload to NeoFS
      const response = await apiRequest('POST', '/api/neo-storage/upload', formData, {
        headers: {
          'X-Gas-Required': gasData.requiredGas
        }
      });

      const neoData = await response.json();
      return {
        type: 'neofs',
        objectId: neoData.id,
        metadata
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export async function getFileBuffer(source: { type: 'ipfs' | 'neofs', hash?: string, objectId?: string }): Promise<ArrayBuffer> {
  try {
    if (source.type === 'ipfs' && source.hash) {
      return await getFromIPFS(source.hash);
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
      const response = await fetch(`https://ipfs.io/ipfs/${source.hash}`, { method: 'HEAD' });
      return response.ok;
    } else if (source.type === 'neofs' && source.objectId) {
      const response = await apiRequest('HEAD', `/api/neo-storage/check/${source.objectId}`);
      return response.ok;
    }
    return false;
  } catch {
    return false;
  }
}
