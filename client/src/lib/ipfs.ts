import { Buffer } from 'buffer';
import { create } from 'ipfs-http-client';
import axios from 'axios';

// Simple wrapper for IPFS functionality through Infura
export class IPFSManager {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly projectId = import.meta.env.VITE_INFURA_PROJECT_ID;
  private readonly projectSecret = import.meta.env.VITE_INFURA_PROJECT_SECRET;
  private readonly auth = 'Basic ' + Buffer.from(this.projectId + ':' + this.projectSecret).toString('base64');
  private walletAddress: string; // Wallet address stored for future use if needed

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

  async uploadFile(file: File): Promise<string> {
    try {
      console.log('Starting IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      const ipfs = create({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
          authorization: this.auth,
        },
      });

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const content = Buffer.from(buffer);

      // Add file to IPFS through Infura
      const result = await this.retry(async () => {
        const addResult = await ipfs.add({
          path: file.name,
          content: content
        });

        if (!addResult?.path) {
          throw new Error('Invalid IPFS upload response');
        }

        return addResult;
      });

      console.log('IPFS upload successful:', {
        path: result.path,
        size: result.size
      });

      return result.path;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from IPFS:', { cid });

      const response = await this.retry(async () => {
        const fetchResponse = await axios.get(`https://ipfs.infura.io:5001/api/v0/cat?arg=${cid}`, {
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
}

export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}