import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Simple wrapper for IPFS functionality
export class IPFSManager {
  private ipfs;

  constructor(walletAddress: string) {
    // Connect to local IPFS node or infura
    this.ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https'
    });
  }

  async uploadFile(file: File): Promise<string> {
    try {
      console.log('Starting IPFS upload...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Convert file to buffer
      const buffer = await file.arrayBuffer();
      const content = Buffer.from(buffer);

      // Simple metadata
      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size
      };

      // Add file to IPFS
      const result = await this.ipfs.add({
        path: file.name,
        content: content
      });

      console.log('IPFS upload successful:', {
        path: result.path,
        size: result.size
      });

      return result.path;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  }

  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from IPFS:', { cid });

      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      return new Uint8Array(Buffer.concat(chunks)).buffer;
    } catch (error) {
      console.error('IPFS fetch error:', error);
      throw error;
    }
  }
}

// Export a simple function to create IPFS manager
export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}