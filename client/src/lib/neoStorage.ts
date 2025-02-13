import { apiRequest } from "./queryClient";

const NEO_FS_API = "https://fs.neo.org";

export interface NeoFSFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url: string;
}

export async function uploadToNeoFS(file: File, address: string): Promise<NeoFSFile> {
  // Create FormData and append file and address
  const formData = new FormData();
  formData.append('file', file, file.name); // Include filename
  formData.append('address', address);

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

  const response = await fetch('/api/neo-storage/upload', {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Upload error:', error);
    throw new Error(error || "Failed to upload file to Neo FS");
  }

  return response.json();
}

export async function listNeoFSFiles(address: string): Promise<NeoFSFile[]> {
  const response = await apiRequest("GET", `/api/neo-storage/files/${address}`);
  if (!response.ok) {
    throw new Error("Failed to fetch Neo FS files");
  }
  return response.json();
}

export async function downloadNeoFSFile(fileId: string, address: string): Promise<Blob> {
  const response = await apiRequest("GET", `/api/neo-storage/download/${address}/${fileId}`);
  if (!response.ok) {
    throw new Error("Failed to download file from Neo FS");
  }
  return response.blob();
}