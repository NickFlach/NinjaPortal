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
   * @param onProgress Optional callback for upload progress updates (0-100)
   * @returns The IPFS hash (CID) of the uploaded file
   */
  async uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
    try {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`Starting IPFS upload to Pinata... ${file.name} (${fileSizeMB} MB)`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        timestamp: new Date().toISOString()
      });

      // Validation check for file size
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        throw new Error('File too large: Maximum file size is 100MB');
      }

      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata to help with organization in Pinata
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          app: 'neo-music-portal',
          walletAddress: this.walletAddress,
          fileType: file.type,
          fileSize: file.size,
          uploadDate: new Date().toISOString()
        }
      });
      formData.append('pinataMetadata', metadata);

      // Create a controller to allow aborting the upload if needed
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      try {
        const response = await this.retry(async () => {
          const uploadResponse = await axios.post('/api/ipfs/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Wallet-Address': this.walletAddress,
            },
            signal: controller.signal,
            timeout: 120000, // 2 minute timeout
            onUploadProgress: (progressEvent) => {
              if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
                console.log(`IPFS upload progress: ${percentCompleted}%`);
              }
            }
          });

          if (!uploadResponse.data?.success) {
            throw new Error('IPFS upload failed: Server returned unsuccessful status');
          }

          if (!uploadResponse.data?.Hash) {
            throw new Error('Invalid IPFS upload response: No hash returned');
          }

          return uploadResponse.data;
        });

        clearTimeout(timeoutId);
        console.log('IPFS upload successful:', response);
        
        // Return IPFS content identifier (CID)
        return response.Hash;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      console.error('IPFS upload error:', error);
      
      // Enhanced error messages for better debugging
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Upload timed out. The file might be too large or the connection is slow.');
      } else if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`IPFS upload failed (${error.response.status}): ${error.response.data?.error || error.response.statusText}`);
        } else if (error.request) {
          throw new Error('No response from server. Please check your network connection.');
        } else {
          throw new Error(`Request error: ${error.message}`);
        }
      }
      
      throw error instanceof Error ? error : new Error('Unknown upload error');
    }
  }
  
  /**
   * Test the connection to Pinata IPFS service
   * @returns Connection status information
   */
  async testConnection(): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const response = await axios.post('/api/ipfs/test-connection', null, {
        headers: {
          'X-Wallet-Address': this.walletAddress,
        },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('IPFS connection test error:', error);
      
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Connection test failed (${error.response.status}): ${error.response.data?.error || error.response.statusText}`);
      }
      
      throw error instanceof Error ? error : new Error('Unknown connection error');
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