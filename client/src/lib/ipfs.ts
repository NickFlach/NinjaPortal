import { Buffer } from 'buffer';

// Simple wrapper for IPFS functionality through Neo X
export class IPFSManager {
  private walletAddress: string;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

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
      console.log('Starting Neo X IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      const formData = new FormData();
      formData.append('file', file);

      const response = await this.retry(async () => {
        const uploadResponse = await fetch('/api/ipfs/upload', {
          method: 'POST',
          headers: {
            'X-Wallet-Address': this.walletAddress
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.text();
          throw new Error(error || 'Failed to upload to IPFS');
        }

        return uploadResponse.json();
      });

      console.log('Neo X IPFS upload successful:', response);
      return response.path;
    } catch (error) {
      console.error('Neo X IPFS upload error:', error);
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from Neo X IPFS:', { cid });

      const response = await this.retry(async () => {
        const fetchResponse = await fetch(`/api/ipfs/fetch/${cid}`, {
          headers: {
            'X-Wallet-Address': this.walletAddress
          }
        });

        if (!fetchResponse.ok) {
          const error = await fetchResponse.text();
          throw new Error(error || 'Failed to fetch from IPFS');
        }

        return fetchResponse.arrayBuffer();
      });

      if (!response || response.byteLength === 0) {
        throw new Error('No data received from IPFS');
      }

      return response;
    } catch (error) {
      console.error('Neo X IPFS fetch error:', error);
      throw error instanceof Error ? error : new Error('Unknown fetch error');
    }
  }
}

// Export a simple function to create IPFS manager
export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}