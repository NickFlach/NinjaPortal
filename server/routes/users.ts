import { Router } from 'express';
import { db } from '@db';
import { users, recentlyPlayed, songs } from '@db/schema';
import { eq, desc } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import path from 'path';

// ES Module equivalent of __dirname if needed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

router.post('/api/users/register', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ 
        success: false,
        message: "Wallet address is required" 
      });
    }

    console.log('Processing registration for address:', address);

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

// Update recent endpoint to return global feed
router.get('/api/songs/recent', async (_req, res) => {
  try {
    console.log('Fetching recent songs feed');

    // Get most recently played songs across all users
    const recentlyPlayedSongs = await db.query.recentlyPlayed.findMany({
      orderBy: desc(recentlyPlayed.playedAt),
      limit: 100,
      with: {
        song: {
          columns: {
            id: true,
            title: true,
            artist: true,
            ipfsHash: true,
            uploadedBy: true,
            createdAt: true,
            votes: true
          }
        },
      }
    });

    console.log('Found recently played songs:', recentlyPlayedSongs.length);

    // Extract unique songs, keeping only the most recent play for each
    const uniqueSongs = Array.from(
      new Map(
        recentlyPlayedSongs
          .filter(item => item.song) // Filter out any null songs
          .map(item => [item.song.id, {
            ...item.song,
            lastPlayed: item.playedAt // Include the play timestamp
          }])
      ).values()
    );

    console.log('Returning unique songs:', uniqueSongs.length);
    res.json(uniqueSongs);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: "Failed to fetch recent activity" });
  }
});

export default router;