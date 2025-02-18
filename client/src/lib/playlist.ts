import { z } from 'zod';
import { Buffer } from 'buffer';
import { getFromIPFS } from './ipfs';

export const DimensionalTrackSchema = z.object({
  id: z.number(),
  ipfsHash: z.string(),
  title: z.string(),
  artist: z.string(),
  dimensionalSignature: z.string().optional(),
  harmonicAlignment: z.number().optional(),
  dimension: z.string().optional(),
  entropyLevel: z.number().optional(),
  quantumState: z.enum(['aligned', 'shifting', 'unstable']).optional(),
});

export type DimensionalTrack = z.infer<typeof DimensionalTrackSchema>;

export const DimensionalPortalSchema = z.object({
  portalId: z.string(),
  tracks: z.array(DimensionalTrackSchema),
  timestamp: z.number(),
  portalSignature: z.string().optional(),
  currentDimension: z.string().optional(),
  entropyState: z.number().optional(),
});

export type DimensionalPortal = z.infer<typeof DimensionalPortalSchema>;

class DimensionalPortalManager {
  private currentPortal: DimensionalPortal | null = null;
  private audioCache: Map<string, ArrayBuffer> = new Map();

  async loadCurrentPortal(): Promise<DimensionalPortal> {
    try {
      const response = await fetch('/api/playlists/current');
      if (!response.ok) {
        throw new Error('Failed to load portal');
      }

      const portal = DimensionalPortalSchema.parse(await response.json());
      this.currentPortal = portal;
      return portal;
    } catch (error) {
      console.error('Error loading portal:', error);
      throw error;
    }
  }

  async generateZKProof(params: {
    signature?: string;
    dimension?: string;
    harmonicAlignment?: number;
    timestamp?: number;
    address?: string;
  }): Promise<string> {
    const proofData = {
      ...params,
      timestamp: params.timestamp || Date.now(),
      entropy: Math.random(), // This will be replaced with actual entropy calculation
      portalId: this.currentPortal?.portalId
    };

    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }

  async preloadAudio(ipfsHash: string): Promise<ArrayBuffer> {
    if (this.audioCache.has(ipfsHash)) {
      return this.audioCache.get(ipfsHash)!;
    }

    const buffer = await getFromIPFS(ipfsHash);
    this.audioCache.set(ipfsHash, buffer);
    return buffer;
  }

  async submitPlaybackProof(proof: string): Promise<void> {
    await fetch('/api/dimensional/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof })
    });
  }

  clearCache(): void {
    this.audioCache.clear();
  }
}

export const playlistManager = new DimensionalPortalManager();