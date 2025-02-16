import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { db } from "@db";
import { songs, users, playlists, followers, playlistSongs, recentlyPlayed, userRewards, loves } from "@db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { incrementListenCount, getMapData } from './services/music';
import { getLiveStats, broadcastStats, getClients, setClients } from './services/stats';
import type { WebSocketMessage, ClientInfo } from './types/websocket';
import neoStorageRouter from './routes/neo-storage';
import translationRouter from './routes/translation';
import lumiraRouter from './routes/lumira';
import { 
  getClientStats, 
  updateClient, 
  addClient, 
  removeClient,
  broadcastStats as broadcastClientStats 
} from './services/client-stats';
import wsHealthService from './services/websocket-health';
import { 
  encryptLoveCount, 
  addEncryptedCounts, 
  establishSecureChannel,
  encryptMessage,
  decryptMessage
} from './services/encryption';
import { storeInNeoFS } from './services/neofs'; // Assuming this function exists

// Track connected clients and their song subscriptions
const clients = new Map<WebSocket, ClientInfo>();
setClients(clients);

// Function to find the leader client
function findLeaderClient(): [WebSocket, ClientInfo] | undefined {
  let earliestConnection: [WebSocket, ClientInfo] | undefined;

  for (const [ws, info] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN && 
        (!earliestConnection || info.connectedAt < earliestConnection[1].connectedAt)) {
      earliestConnection = [ws, info];
    }
  }

  return earliestConnection;
}

// Function to update leader status after connection changes
function updateLeaderStatus() {
  const leader = findLeaderClient();

  for (const [ws, info] of clients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      const isLeader = leader && ws === leader[0];
      info.isLeader = isLeader;

      try {
        ws.send(JSON.stringify({
          type: 'leader_update',
          isLeader
        }));
      } catch (error) {
        console.error('Error sending leader update:', error);
      }
    }
  }
}

// Function to find current leader's playback state
function getLeaderState(): { songId?: number; timestamp: number; playing: boolean } | undefined {
  const leader = findLeaderClient();
  if (!leader) return undefined;

  const [_, info] = leader;
  return {
    songId: info.currentSong,
    timestamp: info.currentTime || 0,
    playing: info.isPlaying || false
  };
}

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Add translation routes
  app.use('/api/translate', translationRouter);

  // Add Lumira route - ensure this is before WebSocket setup
  app.use('/api/lumira', lumiraRouter);

  // Initialize WebSocket server with enhanced security
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    verifyClient: (info, cb) => {
      try {
        // Reject Vite HMR connections
        if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
          cb(false);
          return;
        }

        // Get client key with development fallback
        const clientKey = info.req.headers['x-quantum-key'] || process.env.NODE_ENV === 'development' ? 'dev-quantum-key' : null;

        if (!clientKey) {
          console.warn('Client attempted connection without quantum key');
          console.log('Connection headers:', info.req.headers);
          cb(false);
          return;
        }

        console.log('Establishing secure channel for client');

        // Establish secure channel
        const channel = establishSecureChannel(clientKey as string);
        (info.req as any).secureChannel = channel;

        console.log('Secure channel established:', {
          channelId: channel.channelId,
          hasEncryptionKey: !!channel.encryptionKey
        });

        cb(true);
      } catch (error) {
        console.error('Error in verifyClient:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          headers: info.req.headers
        });
        cb(false);
      }
    }
  });

  // Mount Neo storage routes
  app.use('/api/neo-storage', neoStorageRouter);

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    console.log('New client connected from:', req.socket.remoteAddress);

    // Initialize client info with connection timestamp
    const clientInfo: ClientInfo = {
      connectedAt: Date.now(),
      isLeader: clients.size === 0, // First client becomes leader
      lastSyncTime: Date.now()
    };

    // Add client to our tracking
    addClient(ws, clientInfo);
    updateLeaderStatus();

    // Add to health monitoring
    wsHealthService.addConnection(ws);

    // Send initial stats to the new client
    try {
      ws.send(JSON.stringify({
        type: 'stats_update',
        data: getClientStats()
      }));
    } catch (error) {
      console.error('Error sending initial stats:', error);
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        console.log('Received message type:', message.type);

        switch (message.type) {
          case 'ping': {
            // Respond immediately to pings with pongs for latency measurement
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
          case 'auth': {
            if (message.address) {
              const normalizedAddress = message.address.toLowerCase();
              updateClient(ws, { address: normalizedAddress });
              ws.send(JSON.stringify({ type: 'auth_success' }));
              broadcastClientStats();
              console.log('Client authenticated:', normalizedAddress);
            }
            break;
          }
          case 'subscribe': {
            if (message.songId) {
              updateClient(ws, { currentSong: message.songId });
              ws.send(JSON.stringify({ 
                type: 'subscribe_success',
                songId: message.songId 
              }));

              // Send immediate sync state if available
              const leaderState = getLeaderState();
              if (leaderState && leaderState.songId === message.songId) {
                ws.send(JSON.stringify({
                  type: 'sync',
                  ...leaderState
                }));
              }
            }
            break;
          }
          case 'request_sync': {
            // Handle sync requests from followers
            const leaderState = getLeaderState();
            if (leaderState && leaderState.songId === message.songId) {
              ws.send(JSON.stringify({
                type: 'sync',
                ...leaderState
              }));
            }
            break;
          }
          case 'sync': {
            const { timestamp, playing, songId } = message;
            updateClient(ws, { 
              isPlaying: playing, 
              currentTime: timestamp,
              lastSyncTime: Date.now() 
            });

            const clientInfo = clients.get(ws);
            if (clientInfo?.isLeader) {
              if (!playing) {
                updateClient(ws, { coordinates: undefined, countryCode: undefined });
              }

              // Get connection health before broadcasting
              const health = wsHealthService.getConnectionHealth(ws);
              if (health && health.quality > 0.5) { // Only broadcast if connection quality is good
                // Broadcast sync message...
                const syncMessage = JSON.stringify({
                  type: 'sync',
                  timestamp,
                  playing,
                  songId,
                  quality: health.quality
                });

                // Enhanced sync broadcast with health consideration
                for (const [client, info] of clients.entries()) {
                  const clientHealth = wsHealthService.getConnectionHealth(client);
                  if (client !== ws && 
                      info.currentSong === songId && 
                      client.readyState === WebSocket.OPEN &&
                      clientHealth?.quality > 0.3) { // Only sync to relatively healthy connections
                    try {
                      client.send(syncMessage);
                    } catch (error) {
                      console.error('Error sending sync message:', error);
                      removeClient(client);
                    }
                  }
                }
              }
            }
            break;
          }
          case 'location_update': {
            const { coordinates, countryCode } = message;
            console.log('Received location update:', { coordinates, countryCode });

            if (coordinates && countryCode) {
              updateClient(ws, { coordinates, countryCode });
              ws.send(JSON.stringify({ 
                type: 'location_update_success',
                coordinates,
                countryCode 
              }));
              broadcastClientStats();
            } else {
              console.log('Invalid location update - missing coordinates or country code');
              ws.send(JSON.stringify({ 
                type: 'error',
                message: 'Invalid location data'
              }));
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error processing message'
          }));
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    });

    // Handle connection health events
    wsHealthService.on('connectionUnhealthy', (unhealthyWs) => {
      if (unhealthyWs === ws) {
        console.log('Connection became unhealthy:', req.socket.remoteAddress);
        removeClient(ws);
        updateLeaderStatus();
        broadcastClientStats();
      }
    });

    wsHealthService.on('qualityUpdate', (updatedWs, quality) => {
      if (updatedWs === ws) {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
          updateClient(ws, { connectionQuality: quality });
          // If leader's connection quality drops significantly, consider leader rotation
          if (clientInfo.isLeader && quality < 0.3) {
            updateLeaderStatus();
          }
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log('Client disconnected:', code, reason.toString());
      wsHealthService.removeConnection(ws);
      removeClient(ws);
      updateLeaderStatus();
      broadcastClientStats();
    });
  });

  // Regular cleanup now considers health service stats
  const cleanupInterval = setInterval(() => {
    const stats = wsHealthService.getAggregateStats();
    console.log('WebSocket health stats:', stats);

    if (stats.averageQuality < 0.5) {
      console.warn('Poor average connection quality detected:', stats.averageQuality);
    }
  }, 5000);

  // Cleanup on server close
  httpServer.on('close', () => {
    clearInterval(cleanupInterval);
    wsHealthService.shutdown();
  });

  // Add REST endpoint for client stats
  app.get('/api/clients/stats', (req, res) => {
    res.json(getClientStats());
  });

  // Map routes
  app.get('/api/music/map', async (req, res) => {
    try {
      console.log('Map data request received');
      const mapData = await getMapData();

      if (!mapData) {
        console.error('Map data is null or undefined');
        return res.status(500).json({ error: 'Failed to fetch map data - no data returned' });
      }

      // Add real-time stats and location data
      const stats = getLiveStats();
      mapData.totalListeners = stats.activeListeners;

      // Update locations with real-time data for each country
      Object.keys(mapData.countries).forEach(countryCode => {
        // Get active locations for this country
        const activeLocations = Array.from(clients.values())
          .filter(client => 
            client.isPlaying && 
            client.countryCode === countryCode && 
            client.coordinates
          )
          .map(client => [client.coordinates!.lat, client.coordinates!.lng] as [number, number]);

        console.log(`Active locations for ${countryCode}:`, activeLocations);

        // Set locations directly for each country including all known coordinates
        mapData.countries[countryCode].locations = activeLocations;

        // Update listener counts
        const countryListeners = stats.listenersByCountry[countryCode] || 0;
        mapData.countries[countryCode].listenerCount = countryListeners;
        mapData.countries[countryCode].anonCount = countryListeners - activeLocations.length;
      });

      // Add all locations regardless of country for heatmap
      const allLocations = Array.from(clients.values())
        .filter(client => client.isPlaying && client.coordinates)
        .map(client => [client.coordinates!.lat, client.coordinates!.lng] as [number, number]);

      mapData.allLocations = allLocations;

      console.log('Map data response:', {
        ...mapData,
        totalLocations: allLocations.length
      });

      res.json(mapData);
    } catch (error) {
      console.error('Error fetching map data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch map data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/music/map', async (req, res) => {
    try {
      const { songId, countryCode, coordinates } = req.body;

      if (!songId || !countryCode) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: 'songId and countryCode are required' 
        });
      }

      await incrementListenCount(songId, countryCode, coordinates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating map data:', error);
      res.status(500).json({ 
        error: 'Failed to update map data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

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

    // Get songs with their love counts and user's love status
    const userSongs = await db.query.songs.findMany({
      where: eq(songs.uploadedBy, userAddress.toLowerCase()),
      orderBy: desc(songs.createdAt),
      with: {
        loves: true,
      },
    });

    // Transform the results to include love information
    const songsWithLoves = await Promise.all(userSongs.map(async (song) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(loves)
        .where(eq(loves.songId, song.id));

      const userLove = await db.query.loves.findFirst({
        where: and(
          eq(loves.songId, song.id),
          eq(loves.address, userAddress.toLowerCase())
        ),
      });

      return {
        ...song,
        loves: total,
        isLoved: !!userLove
      };
    }));

    res.json(songsWithLoves);
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

  // In the POST "/api/songs" endpoint
  app.post("/api/songs", async (req, res) => {
    const { title, artist, ipfsHash } = req.body;
    const uploadedBy = req.headers['x-wallet-address'] as string;

    if (!uploadedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Store song metadata first
      const [newSong] = await db.insert(songs).values({
        title,
        artist,
        ipfsHash,
        uploadedBy: uploadedBy.toLowerCase(),
      }).returning();

      // Attempt NEO storage without dimensional features by default
      try {
        await storeInNeoFS(Buffer.from(ipfsHash), {
          title,
          artist,
          uploadedBy: uploadedBy.toLowerCase(),
          ipfsHash,
          createdAt: new Date()
        });
      } catch (storageError) {
        console.warn('NEO storage failed but continuing:', storageError);
      }

      res.json(newSong);
    } catch (error) {
      console.error('Error creating song:', error);
      res.status(500).json({ message: "Failed to create song" });
    }
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

  // User Registration Routes
  app.get("/api/users/register", async (req, res) => {
    try {
      const address = req.headers['x-wallet-address'] as string;

      if (!address) {
        return res.status(400).json({ 
          success: false,
          message: "Wallet address is required" 
        });
      }

      console.log('Checking registration for address:', address);

      // Check if user exists
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.address, address.toLowerCase()))
        .limit(1);

      let user;

      if (existingUser.length > 0) {
        // Update last seen for returning user
        const [updatedUser] = await db
          .update(users)
          .set({ lastSeen: new Date() })
          .where(eq(users.address, address.toLowerCase()))
          .returning();
        user = updatedUser;
        console.log('Updated existing user:', user);
      } else {
        // Create new user
        const [newUser] = await db.insert(users)
          .values({ 
            address: address.toLowerCase(),
            lastSeen: new Date()
          })
          .returning();
        user = newUser;
        console.log('Created new user:', user);
      }

      if (!user) {
        throw new Error('Failed to create or update user');
      }

      // Get global recent songs instead of user-specific
      const recentSongs = await db.query.songs.findMany({
        orderBy: desc(songs.createdAt),
        limit: 100,
      });

      console.log('Retrieved recent songs:', recentSongs.length);

      const response = {
        success: true,
        user,
        recentSongs
      };

      console.log('Sending response:', response);
      res.json(response);
    } catch (error: any) {
      console.error('Error in user registration:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to register user", 
        error: error.message 
      });
    }
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

  app.post("/api/songs/:id/love", async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const userAddress = req.headers['x-wallet-address'] as string;

      if (!userAddress) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check if the user has already loved this song
      const existingLove = await db.query.loves.findFirst({
        where: and(
          eq(loves.songId, songId),
          eq(loves.address, userAddress.toLowerCase())
        ),
      });

      if (existingLove) {
        await db.delete(loves).where(
          and(
            eq(loves.songId, songId),
            eq(loves.address, userAddress.toLowerCase())
          )
        );
      } else {
        await db.insert(loves).values({
          songId,
          address: userAddress.toLowerCase(),
        });
      }

      // Get updated love count and encrypt it
      const [{ total }] = await db
        .select({ total: count() })
        .from(loves)
        .where(eq(loves.songId, songId));

      const encryptedCount = await encryptLoveCount(total);

      // In development, send unencrypted response if no secure channel
      if (process.env.NODE_ENV === 'development' && !(req as any).secureChannel) {
        return res.json({ 
          loved: !existingLove,
          totalLoves: total,
          dev: true
        });
      }

      // For production or when secure channel exists
      const channel = (req as any).secureChannel;
      if (!channel || !channel.encryptionKey) {
        console.error('No secure channel established');
        return res.status(400).json({ 
          message: "Secure channel required",
          dev: process.env.NODE_ENV === 'development'
        });
      }

      const encryptedResponse = encryptMessage({
        loved: !existingLove,
        totalLoves: encryptedCount
      }, channel.encryptionKey);

      res.json({ 
        data: encryptedResponse,
        channelId: channel.channelId
      });
    } catch (error) {
      console.error('Error managing love:', error);
      res.status(500).json({ 
        message: "Failed to manage love",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/songs/:id/loves", async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
            const userAddress = req.headers['x-wallet-address'] as string;

      const [{ total }] = await db
        .select({ total: count() })
        .from(loves)
        .where(eq(loves.songId, songId));

      // Check if the user has loved this song
      let isLoved = false;
      if (userAddress) {
        const userLove = await db.query.loves.findFirst({
          where: and(
            eq(loves.songId, songId),
            eq(loves.address, userAddress.toLowerCase())
          ),
        });
        isLoved = !!userLove;
      }

      res.json({
        totalLoves: total,
        isLoved
      });
    } catch (error) {
      console.error('Error getting loves:', error);
      res.status(500).json({ message: "Failed to get loves" });
    }
  });

  return httpServer;
}