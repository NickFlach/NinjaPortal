import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Simple wrapper for IPFS functionality through Neo X
export class IPFSManager {
  private ipfs;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(walletAddress: string) {
    // Connect to Neo X IPFS node
    this.ipfs = create({
      host: 'neox-ipfs.neo.org',  // Updated endpoint
      port: 443,
      protocol: 'https',
      headers: {
        'X-Wallet-Address': walletAddress,
        'Accept': 'application/json'
      }
    });
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

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const content = Buffer.from(buffer);

      // Add file to IPFS through Neo X with retry mechanism
      const result = await this.retry(async () => {
        const addResult = await this.ipfs.add({
          path: file.name,
          content: content
        });

        if (!addResult?.path) {
          throw new Error('Invalid IPFS upload response');
        }

        return addResult;
      });

      console.log('Neo X IPFS upload successful:', {
        path: result.path,
        size: result.size
      });

      return result.path;
    } catch (error) {
      console.error('Neo X IPFS upload error:', error);
      throw new Error(`Failed to upload to Neo X IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from Neo X IPFS:', { cid });

      const chunks: Uint8Array[] = [];
      await this.retry(async () => {
        for await (const chunk of this.ipfs.cat(cid)) {
          chunks.push(chunk);
        }
      });

      if (chunks.length === 0) {
        throw new Error('No data received from IPFS');
      }

      return new Uint8Array(Buffer.concat(chunks)).buffer;
    } catch (error) {
      console.error('Neo X IPFS fetch error:', error);
      throw new Error(`Failed to fetch from Neo X IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a simple function to create IPFS manager
export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}