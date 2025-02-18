import { z } from 'zod';
import { Buffer } from 'buffer';
import { getFromIPFS } from './ipfs';

export const PlaylistItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  artist: z.string(),
  ipfsHash: z.string(),
  duration: z.number().optional(),
  order: z.number(),
});

export type PlaylistItem = z.infer<typeof PlaylistItemSchema>;

export const PlaylistSchema = z.object({
  id: z.string(),
  items: z.array(PlaylistItemSchema),
  timestamp: z.number(),
  signature: z.string(),
});

export type Playlist = z.infer<typeof PlaylistSchema>;

class PlaylistManager {
  private currentPlaylist: Playlist | null = null;
  private audioCache: Map<string, ArrayBuffer> = new Map();
  
  async loadPlaylist(playlistId: string): Promise<Playlist> {
    const response = await fetch(`/api/playlists/${playlistId}`);
    if (!response.ok) {
      throw new Error('Failed to load playlist');
    }
    
    const playlist = PlaylistSchema.parse(await response.json());
    this.currentPlaylist = playlist;
    return playlist;
  }

  async preloadAudio(ipfsHash: string): Promise<ArrayBuffer> {
    if (this.audioCache.has(ipfsHash)) {
      return this.audioCache.get(ipfsHash)!;
    }

    const buffer = await getFromIPFS(ipfsHash);
    this.audioCache.set(ipfsHash, buffer);
    return buffer;
  }

  async generateZKProof(playlistItem: PlaylistItem): Promise<string> {
    // Generate zero-knowledge proof of playback
    // This will be implemented with actual ZK circuit
    const proofData = {
      timestamp: Date.now(),
      itemId: playlistItem.id,
      playlistId: this.currentPlaylist?.id
    };
    
    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }

  async submitPlaybackProof(proof: string): Promise<void> {
    await fetch('/api/proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof })
    });
  }

  clearCache(): void {
    this.audioCache.clear();
  }
}

export const playlistManager = new PlaylistManager();
