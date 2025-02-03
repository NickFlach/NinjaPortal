import { Router } from 'express';
import { db } from '@db';
import { users, recentlyPlayed } from '@db/schema';
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

    // Get user's recent songs
    const recentSongs = await db.query.recentlyPlayed.findMany({
      where: eq(recentlyPlayed.playedBy, address.toLowerCase()),
      orderBy: desc(recentlyPlayed.playedAt),
      limit: 5,
      with: {
        song: true,
      }
    });

    console.log('Retrieved recent songs:', recentSongs);

    const response = {
      success: true,
      user,
      recentSongs: recentSongs.map(item => item.song)
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

// Add endpoint to get user's recent activity
router.get('/api/users/recent', async (req, res) => {
  try {
    const address = req.headers['x-wallet-address'] as string;

    if (!address) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    const recentSongs = await db.query.recentlyPlayed.findMany({
      where: eq(recentlyPlayed.playedBy, address.toLowerCase()),
      orderBy: desc(recentlyPlayed.playedAt),
      limit: 10,
      with: {
        song: true,
      }
    });

    res.json(recentSongs.map(item => item.song));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: "Failed to fetch recent activity" });
  }
});

export default router;