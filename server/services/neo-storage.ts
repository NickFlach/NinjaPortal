import { WebSocket } from 'ws';
import { getClients } from './stats';
import { dimensionalBalancer } from './dimension-balance';

interface NeoStorageConfig {
  gasRecipient: string;
  defaultGasLimit: string;
}

export interface SongMetadata {
  title: string;
  artist: string;
  uploadedBy: string;
  ipfsHash: string;
  neoContainerId?: string;
  createdAt: Date;
}

// Configuration for NEO FS interactions
const config: NeoStorageConfig = {
  gasRecipient: process.env.GAS_RECIPIENT_ADDRESS || '',
  defaultGasLimit: '1000000'
};

/**
 * Calculates the required GAS for a NEO FS operation
 */
export function calculateRequiredGas(fileSize: number, duration: number): string {
  const baseCost = 0.001; // GAS per MB per hour
  const sizeCost = (fileSize / (1024 * 1024)) * baseCost * duration;
  const overhead = 0.1; // Fixed overhead in GAS
  const totalCost = (sizeCost + overhead) * 1.2;
  return totalCost.toFixed(8);
}

/**
 * Prepares a NEO FS container for song storage
 */
export async function prepareNeoContainer(metadata: SongMetadata): Promise<string> {
  try {
    const containerId = ''; // Would be returned from NEO FS
    return containerId;
  } catch (error) {
    console.error('Error preparing NEO container:', error);
    throw error;
  }
}

/**
 * Stores a file in NEO FS with dimensional reflection
 */
export async function storeInNeoFS(
  fileData: Buffer,
  metadata: SongMetadata
): Promise<{ containerId: string; objectId: string; dimensions: { [key: number]: number } }> {
  try {
    const gas = calculateRequiredGas(fileData.length, 24); // 24 hours storage
    const fileEnergy = calculateFileEnergy(fileData);
    const dimensions = dimensionalBalancer.createReflection(
      metadata.ipfsHash,
      fileEnergy
    );

    const containerId = await prepareNeoContainer(metadata);
    const objectId = ''; // Would be returned from NEO FS

    return { containerId, objectId, dimensions };
  } catch (error) {
    console.error('Error storing in NEO FS:', error);
    throw error;
  }
}

/**
 * Calculates energy signature of a file using Shannon entropy
 */
function calculateFileEnergy(fileData: Buffer): number {
  const bytes = new Uint8Array(fileData);
  const frequency = new Array(256).fill(0);

  // Calculate byte frequency using traditional for loop for compatibility
  for (let i = 0; i < bytes.length; i++) {
    frequency[bytes[i]]++;
  }

  // Calculate Shannon entropy
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequency[i] > 0) {
      const p = frequency[i] / bytes.length;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy / 8; // Normalize to 0-1 range
}

/**
 * Broadcasts storage status updates to connected clients
 */
export function broadcastStorageStatus(message: any) {
  const clients = getClients();
  const broadcastMessage = JSON.stringify({
    type: 'storage_status',
    data: message
  });

  // Use Array.from for compatibility with client iteration
  Array.from(clients.entries()).forEach(([client]) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(broadcastMessage);
      } catch (error) {
        console.error('Error broadcasting storage status:', error);
      }
    }
  });
}

/**
 * Updates song metadata
 */
export async function updateSongMetadata(
  songId: number,
  metadata: Partial<SongMetadata>
): Promise<void> {
  try {
    broadcastStorageStatus({
      type: 'metadata_updated',
      songId,
      metadata
    });
  } catch (error) {
    console.error('Error updating song metadata:', error);
    throw error;
  }
}