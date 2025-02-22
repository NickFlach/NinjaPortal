import { Buffer } from 'buffer';
import axios from 'axios';

// Simple wrapper for IPFS functionality through Infura
export class IPFSManager {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly projectId = import.meta.env.VITE_INFURA_PROJECT_ID;
  private readonly projectSecret = import.meta.env.VITE_INFURA_PROJECT_SECRET;
  private readonly auth = 'Basic ' + Buffer.from(this.projectId + ':' + this.projectSecret).toString('base64');
  private walletAddress: string;

  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from IPFS:', { cid });

      const response = await this.retry(async () => {
        const fetchResponse = await axios.get(`/api/v0/cat?arg=${cid}`, {
          baseURL: 'https://ipfs.infura.io:5001',
          headers: {
            'Authorization': this.auth,
          },
          responseType: 'arraybuffer'
        });

        if (!fetchResponse.data) {
          throw new Error('No data received from IPFS');
        }

        return fetchResponse.data;
      });

      return response;
    } catch (error) {
      console.error('IPFS fetch error:', error);
      throw error instanceof Error ? error : new Error('Unknown fetch error');
    }
  }

  async uploadFile(file: File): Promise<string> {
    try {
      console.log('Starting IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const formData = new FormData();
      formData.append('path', file.name);
      formData.append('file', new Blob([buffer]));

      const response = await this.retry(async () => {
        const uploadResponse = await axios.post('/api/v0/add', formData, {
          baseURL: 'https://ipfs.infura.io:5001',
          headers: {
            'Authorization': this.auth,
            'Content-Type': 'multipart/form-data'
          }
        });

        if (!uploadResponse.data?.Hash) {
          throw new Error('Invalid IPFS upload response');
        }

        return uploadResponse.data;
      });

      console.log('IPFS upload successful:', response);
      return response.Hash;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }
}

export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}