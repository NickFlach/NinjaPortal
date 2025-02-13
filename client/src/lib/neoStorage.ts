import { apiRequest } from "./queryClient";

export interface NeoFSFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url: string;
}

export async function uploadToNeoFS(file: File, address: string): Promise<NeoFSFile> {
  // Validate file size before upload
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // Reduced to 5MB limit for better reliability
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  // Create FormData and append file and address
  const formData = new FormData();
  formData.append('file', file, file.name); // Include filename

  console.log('Uploading file to Neo FS:', {
    name: file.name,
    size: file.size,
    type: file.type,
    address: address
  });

  // Custom headers for FormData
  const headers = new Headers();
  // Don't set Content-Type, let the browser set it with the boundary
  headers.append('X-Wallet-Address', address);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`Upload attempt ${attempt + 1} of ${MAX_RETRIES}`);
      const response = await fetch('/api/neo-storage/upload', {
        method: 'POST',
        body: formData,
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Upload error:', error);

        if (response.status === 502) {
          throw new Error("Neo FS service is currently unavailable. Please try again later.");
        }

        // If we get a 5xx error, we'll retry
        if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          continue;
        }

        throw new Error(error || "Failed to upload file to Neo FS");
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    } catch (error: any) {
      console.error(`Upload attempt ${attempt + 1} failed:`, error);

      if (error.name === 'AbortError') {
        throw new Error("Upload timed out. Please try again with a smaller file or check your connection.");
      }

      // Network error or other fetch error
      if (error instanceof TypeError && attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }

      // If we've exhausted our retries or it's a different error, rethrow
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Failed to upload file after multiple attempts. Please try again later.");
}

export async function listNeoFSFiles(address: string): Promise<NeoFSFile[]> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`List files attempt ${attempt + 1} of ${MAX_RETRIES}`);
      const response = await apiRequest("GET", `/api/neo-storage/files/${address}`);
      if (!response.ok) {
        throw new Error("Failed to fetch Neo FS files");
      }
      const result = await response.json();
      console.log('Files retrieved successfully:', result.length);
      return result;
    } catch (error) {
      console.error(`List files attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to list files after multiple attempts. Please try again later.");
}

export async function downloadNeoFSFile(fileId: string, address: string): Promise<Blob> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`Download attempt ${attempt + 1} of ${MAX_RETRIES}`);
      const response = await apiRequest("GET", `/api/neo-storage/download/${address}/${fileId}`);
      if (!response.ok) {
        throw new Error("Failed to download file from Neo FS");
      }
      const blob = await response.blob();
      console.log('Download successful, blob size:', blob.size);
      return blob;
    } catch (error) {
      console.error(`Download attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to download file after multiple attempts. Please try again later.");
}