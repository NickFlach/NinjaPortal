import { Router } from 'express';
import { db } from '@db';
import { playlists, playlistSongs } from '@db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.get("/", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.post("/:playlistId/songs", async (req, res) => {
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

export default router;
