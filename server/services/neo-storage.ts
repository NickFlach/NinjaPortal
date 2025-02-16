import { WebSocket } from 'ws';
import { getClients } from './stats';
import { dimensionalBalancer } from './dimension-balance';
import type { StorageResult } from '../types/dimension';

interface NeoStorageConfig {
  gasRecipient: string;
  defaultGasLimit: string;
  enableDimensionalFeatures?: boolean;
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
  defaultGasLimit: '1000000',
  enableDimensionalFeatures: process.env.ENABLE_DIMENSIONAL_FEATURES === 'true'
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
    throw new Error('Failed to prepare NEO container');
  }
}

/**
 * Stores a file in NEO FS with optional dimensional capabilities
 */
export async function storeInNeoFS(
  fileData: Buffer,
  metadata: SongMetadata,
  options: { useDimensional?: boolean } = {}
): Promise<StorageResult> {
  try {
    const gas = calculateRequiredGas(fileData.length, 24); // 24 hours storage
    console.log('Calculated gas cost:', gas);

    const containerId = await prepareNeoContainer(metadata);
    const objectId = ''; // Would be returned from NEO FS

    // Only create dimensional reflections if explicitly enabled
    const useDimensional = options.useDimensional && config.enableDimensionalFeatures;
    let dimensions = {};

    if (useDimensional) {
      try {
        const fileEnergy = calculateFileEnergy(fileData);
        dimensions = dimensionalBalancer.createReflection(metadata.ipfsHash, fileEnergy);
        console.log('Created dimensional reflections:', dimensions);
      } catch (error) {
        console.warn('Dimensional features failed but continuing with basic upload:', error);
      }
    }

    return { containerId, objectId, dimensions };
  } catch (error) {
    console.error('Error storing in NEO FS:', error);
    throw new Error('Failed to store in NEO FS');
  }
}

/**
 * Calculates energy signature of a file using Shannon entropy
 * Only used when dimensional features are enabled
 */
function calculateFileEnergy(fileData: Buffer): number {
  try {
    const bytes = new Uint8Array(fileData);
    const frequency = new Array(256).fill(0);

    for (let i = 0; i < bytes.length; i++) {
      frequency[bytes[i]]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequency[i] > 0) {
        const p = frequency[i] / bytes.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy / 8; // Normalize to 0-1 range
  } catch (error) {
    console.error('Error calculating file energy:', error);
    throw new Error('Failed to calculate file energy');
  }
}

/**
 * Broadcasts storage status updates to connected clients
 */
export function broadcastStorageStatus(message: Record<string, unknown>): void {
  try {
    const clients = getClients();
    const broadcastMessage = JSON.stringify({
      type: 'storage_status',
      data: message
    });

    Array.from(clients.entries()).forEach(([client]) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(broadcastMessage);
        } catch (error) {
          console.error('Error broadcasting to client:', error);
        }
      }
    });
  } catch (error) {
    console.error('Error in broadcast:', error);
  }
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
    throw new Error('Failed to update song metadata');
  }
}