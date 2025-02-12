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
  const formData = new FormData();
  formData.append('file', file);
  formData.append('address', address);

  const response = await apiRequest("POST", "/api/neo-storage/upload", formData);
  if (!response.ok) {
    throw new Error("Failed to upload file to Neo FS");
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
