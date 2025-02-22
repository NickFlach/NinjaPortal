import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Simple wrapper for IPFS functionality through Neo X
export class IPFSManager {
  private ipfs;

  constructor(walletAddress: string) {
    // Connect to Neo X IPFS node
    this.ipfs = create({
      host: 'ipfs.neo.org',
      port: 5001,
      protocol: 'https',
      headers: {
        'X-Wallet-Address': walletAddress
      }
    });
  }

  async uploadFile(file: File): Promise<string> {
    try {
      console.log('Starting Neo X IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const content = Buffer.from(buffer);

      // Add file to IPFS through Neo X
      const result = await this.ipfs.add({
        path: file.name,
        content: content
      });

      console.log('Neo X IPFS upload successful:', {
        path: result.path,
        size: result.size
      });

      return result.path;
    } catch (error) {
      console.error('Neo X IPFS upload error:', error);
      throw error;
    }
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from Neo X IPFS:', { cid });

      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      return new Uint8Array(Buffer.concat(chunks)).buffer;
    } catch (error) {
      console.error('Neo X IPFS fetch error:', error);
      throw error;
    }
  }
}

// Export a simple function to create IPFS manager
export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}