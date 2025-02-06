import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { db } from "@db";
import { songs, users, playlists, followers, playlistSongs, recentlyPlayed, userRewards } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { incrementListenCount } from './services/music';

// Track connected clients and their song subscriptions
const clients = new Map<WebSocket, {
  address?: string;
  currentSong?: number;
}>();

// Function to broadcast sync message to all clients listening to a song
function broadcastSyncMessage(sender: WebSocket, songId: number, timestamp: number, playing: boolean) {
  const message = JSON.stringify({
    type: 'sync',
    timestamp,
    playing,
    songId
  });

  Array.from(clients.entries()).forEach(([client, info]) => {
    if (client !== sender && 
        info.currentSong === songId && 
        client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending sync message:', error);
        // Remove client if send fails
        clients.delete(client);
      }
    }
  });
}

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Initialize WebSocket server with specific path to avoid conflicts with Vite HMR
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws/music-sync',
    verifyClient: (info, cb) => {
      // Skip Vite HMR websocket connections
      if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
        cb(false);
        return;
      }
      cb(true);
    }
  });

  wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.set(ws, {});

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const clientInfo = clients.get(ws);

        if (!clientInfo) {
          console.error('Client info not found');
          return;
        }

        switch (message.type) {
          case 'auth': {
            if (message.address) {
              clientInfo.address = message.address.toLowerCase();
            }
            break;
          }

          case 'subscribe': {
            if (message.songId) {
              clientInfo.currentSong = parseInt(message.songId);
            }
            break;
          }

          case 'sync': {
            const { timestamp, playing, songId } = message;
            if (typeof songId === 'number') {
              broadcastSyncMessage(ws, songId, timestamp, playing);
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
    });
  });

  // Regular cleanup of stale connections
  setInterval(() => {
    Array.from(clients.keys()).forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) {
        clients.delete(client);
      }
    });
  }, 30000);

  // Songs
  app.get("/api/songs/recent", async (req, res) => {
    const recentSongs = await db.query.recentlyPlayed.findMany({
      orderBy: desc(recentlyPlayed.playedAt),
      limit: 100,
      with: {
        song: true,
      }
    });

    // Map to return only unique songs in order of most recently played
    const uniqueSongs = Array.from(
      new Map(recentSongs.map(item => [item.songId, item.song])).values()
    );

    res.json(uniqueSongs);
  });

  app.get("/api/songs/library", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }



    // Convert both addresses to lowercase for case-insensitive comparison
    const userSongs = await db.query.songs.findMany({
      where: eq(songs.uploadedBy, userAddress.toLowerCase()),
      orderBy: desc(songs.createdAt),
    });

    res.json(userSongs);
  });

  app.post("/api/songs/play/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { latitude, longitude } = req.body;

    try {
      // Get country from IP using CloudFlare headers if available
      let countryCode = req.headers['cf-ipcountry'] as string;

      // Fallback to US if we can't determine country (for development)
      if (!countryCode) {
        countryCode = 'USA';
      }

      console.log('Recording play with data:', {
        songId,
        countryCode,
        hasLocation: !!latitude && !!longitude,
        coordinates: latitude && longitude ? { lat: latitude, lng: longitude } : 'No coordinates'
      });

      // If user is authenticated, record the play with country and coordinates
      await incrementListenCount(songId, countryCode, 
        latitude && longitude ? { lat: latitude, lng: longitude } : undefined
      );

      // Record play in recently played
      if (userAddress) {
        try {
          // Register user first if needed
          await db.insert(users).values({
            address: userAddress.toLowerCase(),
          }).onConflictDoNothing();

          await db.insert(recentlyPlayed).values({
            songId,
            playedBy: userAddress.toLowerCase(),
          });
        } catch (error) {
          console.error('Error recording authenticated play:', error);
        }
      }
      // For anonymous plays from landing page, just record the song
      else {
        await db.insert(recentlyPlayed).values({
          songId,
          playedBy: null,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error recording play:', error);
      res.status(500).json({ message: "Failed to record play" });
    }
  });

  app.post("/api/songs", async (req, res) => {
    const { title, artist, ipfsHash } = req.body;
    const uploadedBy = req.headers['x-wallet-address'] as string;

    if (!uploadedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newSong = await db.insert(songs).values({
      title,
      artist,
      ipfsHash,
      uploadedBy,
    }).returning();

    res.json(newSong[0]);
  });

  app.delete("/api/songs/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the song belongs to the user
    const song = await db.query.songs.findFirst({
      where: eq(songs.id, songId),
    });

    if (!song || song.uploadedBy !== userAddress) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      // Delete in order: recently_played, playlist_songs, then songs
      await db.delete(recentlyPlayed).where(eq(recentlyPlayed.songId, songId));
      await db.delete(playlistSongs).where(eq(playlistSongs.songId, songId));
      await db.delete(songs).where(eq(songs.id, songId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({ message: "Failed to delete song" });
    }
  });

  // Add new PATCH endpoint for editing songs
  app.patch("/api/songs/:id", async (req, res) => {
    const songId = parseInt(req.params.id);
    const userAddress = req.headers['x-wallet-address'] as string;
    const { title, artist } = req.body;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if the song belongs to the user
    const song = await db.query.songs.findFirst({
      where: eq(songs.id, songId),
    });

    if (!song || song.uploadedBy !== userAddress.toLowerCase()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Update the song
    const [updatedSong] = await db
      .update(songs)
      .set({
        title,
        artist,
      })
      .where(eq(songs.id, songId))
      .returning();

    res.json(updatedSong);
  });


  // Playlists
  app.get("/api/playlists", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;
    const userPlaylists = await db.query.playlists.findMany({
      where: userAddress ? eq(playlists.createdBy, userAddress) : undefined,
      orderBy: desc(playlists.createdAt),
      with: {
        playlistSongs: {
          with: {
            song: true,
          },
        },
      },
    });
    res.json(userPlaylists);
  });

  app.post("/api/playlists", async (req, res) => {
    const { name } = req.body;
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const newPlaylist = await db.insert(playlists).values({
      name,
      createdBy: userAddress,
    }).returning();

    res.json(newPlaylist[0]);
  });

  app.post("/api/playlists/:playlistId/songs", async (req, res) => {
    const { playlistId } = req.params;
    const { songId } = req.body;
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get the playlist to check ownership
    const playlist = await db.query.playlists.findFirst({
      where: eq(playlists.id, parseInt(playlistId)),
    });

    if (!playlist || playlist.createdBy !== userAddress) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Get current max position
    const currentSongs = await db.query.playlistSongs.findMany({
      where: eq(playlistSongs.playlistId, parseInt(playlistId)),
      orderBy: desc(playlistSongs.position),
    });

    const nextPosition = currentSongs.length > 0 ? currentSongs[0].position + 1 : 0;

    // Add song to playlist
    await db.insert(playlistSongs).values({
      playlistId: parseInt(playlistId),
      songId: parseInt(songId),
      position: nextPosition,
    });

    res.json({ success: true });
  });

  // Users
  app.post("/api/users/register", async (req, res) => {
    const address = req.headers['x-wallet-address'] as string;

    if (!address) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.address, address),
    });

    if (existingUser) {
      return res.json(existingUser);
    }

    // Create new user
    const newUser = await db.insert(users).values({
      address,
      isAdmin: false,
    }).returning();

    res.json(newUser[0]);
  });

  // Treasury Management
  app.get("/api/admin/treasury", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('Checking admin access for:', userAddress);

    const user = await db.query.users.findFirst({
      where: eq(users.address, userAddress.toLowerCase()),
    });

    console.log('Found user:', user);

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Get reward statistics
    const rewardedUsers = await db.query.userRewards.findMany();
    const totalRewards = rewardedUsers.reduce((total, user) => {
      return total + (user.uploadRewardClaimed ? 1 : 0) +
                    (user.playlistRewardClaimed ? 2 : 0) +
                    (user.nftRewardClaimed ? 3 : 0);
    }, 0);

    // Get current GAS recipient address from environment
    const gasRecipientAddress = process.env.GAS_RECIPIENT_ADDRESS || process.env.TREASURY_ADDRESS;

    res.json({
      address: gasRecipientAddress,
      totalRewards,
      rewardedUsers: rewardedUsers.length,
    });
  });

  // Add a route to set up initial admin
  app.post("/api/admin/setup", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if any admin exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.isAdmin, true),
    });

    if (existingAdmin) {
      return res.status(403).json({ message: "Admin already exists" });
    }

    // Set up first admin
    const updatedUser = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.address, userAddress.toLowerCase()))
      .returning();

    console.log('Created initial admin:', updatedUser);

    res.json({ success: true });
  });

  app.post("/api/admin/gas-recipient", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;
    const { address } = req.body;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('Checking admin access for:', userAddress);

    const user = await db.query.users.findFirst({
      where: eq(users.address, userAddress.toLowerCase()),
    });

    console.log('Found user:', user);

    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Update GAS recipient address in environment
    process.env.GAS_RECIPIENT_ADDRESS = address;

    res.json({ success: true });
  });

  // User rewards tracking
  app.post("/api/rewards/claim", async (req, res) => {
    const userAddress = req.headers['x-wallet-address'] as string;
    const { type } = req.body;

    if (!userAddress) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get or create user rewards
    let [userReward] = await db.query.userRewards.findMany({
      where: eq(userRewards.address, userAddress),
    });

    if (!userReward) {
      [userReward] = await db.insert(userRewards)
        .values({ address: userAddress })
        .returning();
    }

    // Check if reward already claimed
    const rewardField = `${type}RewardClaimed` as keyof typeof userReward;
    if (userReward[rewardField]) {
      return res.status(400).json({ message: "Reward already claimed" });
    }

    // Update reward status
    await db.update(userRewards)
      .set({ [rewardField]: true })
      .where(eq(userRewards.address, userAddress));

    res.json({ success: true });
  });

  return httpServer;
}