import axios from 'axios';

/**
 * Manages IPFS file operations through our backend API which uses Pinata
 * This class handles uploading files to IPFS and retrieving them
 */
export class IPFSManager {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private walletAddress: string;

  /**
   * Initialize the IPFS manager with a wallet address
   * @param walletAddress The user's wallet address for authentication
   */
  constructor(walletAddress: string) {
    this.walletAddress = walletAddress;
  }

  /**
   * Retry an operation multiple times with exponential backoff
   * @param operation The async operation to retry
   * @returns The result of the operation
   */
  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed:`, error);
        lastError = error;
        if (attempt < this.MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }

  /**
   * Get a file from IPFS using its content identifier (CID)
   * @param cid The IPFS content identifier
   * @returns The file data as an ArrayBuffer
   */
  async getFile(cid: string): Promise<ArrayBuffer> {
    try {
      console.log('Fetching from IPFS (Pinata):', { cid });

      // Use our backend API to fetch from Pinata
      const response = await this.retry(async () => {
        const fetchResponse = await axios.get(`/api/ipfs/fetch/${cid}`, {
          headers: {
            'X-Wallet-Address': this.walletAddress,
          },
          responseType: 'arraybuffer',
          // Add longer timeout for larger files
          timeout: 30000
        });

        if (!fetchResponse.data) {
          throw new Error('No data received from IPFS');
        }

        return fetchResponse.data;
      });

      return response;
    } catch (error) {
      console.error('IPFS fetch error:', error);
      
      // Enhanced error messages for better debugging
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`IPFS fetch failed: ${error.response.status} - ${error.response.statusText}`);
      }
      
      throw error instanceof Error ? error : new Error('Unknown fetch error');
    }
  }

  /**
   * Upload a file to IPFS through Pinata
   * @param file The file to upload
   * @returns The IPFS hash (CID) of the uploaded file
   */
  async uploadFile(file: File): Promise<string> {
    try {
      console.log('Starting IPFS upload to Pinata...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet', this.walletAddress);

      const response = await this.retry(async () => {
        const uploadResponse = await axios.post('/api/ipfs/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Wallet-Address': this.walletAddress,
          },
          // Add longer timeout for larger files
          timeout: 60000
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
      
      // Enhanced error messages for better debugging
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`IPFS upload failed: ${error.response.status} - ${error.response.statusText}`);
      }
      
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }
}

/**
 * Create an IPFS manager instance
 * @param walletAddress The wallet address to use for the manager
 * @returns A new IPFSManager instance
 */
export function createIPFSManager(walletAddress: string) {
  return new IPFSManager(walletAddress);
}