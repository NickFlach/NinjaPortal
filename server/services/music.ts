import { db } from '@db';
import { songs, listeners } from '@db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export interface MusicStats {
  totalSongs: number;
  totalArtists: number;
  totalListens: number;
  topArtists: Array<{ artist: string; songCount: number }>;
  recentUploads: Array<typeof songs.$inferSelect>;
  countries: {
    [key: string]: {
      votes: number;
      locations: Array<[number, number]>; // [latitude, longitude] pairs
    };
  };
}

export async function getMusicStats(): Promise<MusicStats> {
  // Get basic stats
  const [{ count: totalSongs }] = await db.select({
    count: sql<number>`count(*)`
  }).from(songs);

  const [{ count: totalArtists }] = await db.select({
    count: sql<number>`count(distinct ${songs.artist})`
  }).from(songs);

  const [{ sum: totalListens }] = await db.select({
    sum: sql<number>`coalesce(sum(${songs.votes}), 0)`
  }).from(songs);

  // Get top artists
  const topArtists = await db.select({
    artist: songs.artist,
    songCount: sql<number>`count(*)`
  })
  .from(songs)
  .where(sql`${songs.artist} is not null`)
  .groupBy(songs.artist)
  .orderBy(sql`count(*) desc`)
  .limit(10);

  // Get recent uploads
  const recentUploads = await db.select()
    .from(songs)
    .orderBy(desc(songs.createdAt))
    .limit(5);

  // Get all listener data with coordinates
  const listenerData = await db.select({
    countryCode: listeners.countryCode,
    latitude: listeners.latitude,
    longitude: listeners.longitude,
  })
  .from(listeners)
  .where(sql`${listeners.latitude} is not null and ${listeners.longitude} is not null`);

  // Process listener data by country
  const countries: { [key: string]: { votes: number; locations: Array<[number, number]> } } = {};

  listenerData.forEach(({ countryCode, latitude, longitude }) => {
    if (!countries[countryCode]) {
      countries[countryCode] = { votes: 0, locations: [] };
    }
    countries[countryCode].votes++;
    if (latitude && longitude) {
      countries[countryCode].locations.push([Number(latitude), Number(longitude)]);
    }
  });

  return {
    totalSongs,
    totalArtists,
    totalListens,
    topArtists: topArtists.map(({ artist, songCount }) => ({
      artist: artist || 'Unknown',
      songCount: Number(songCount)
    })),
    recentUploads,
    countries
  };
}

export async function getSongMetadata(id: number) {
  const [song] = await db.select()
    .from(songs)
    .where(eq(songs.id, id));
  return song;
}

export async function incrementListenCount(id: number, countryCode: string, coords?: { lat: number; lng: number }) {
  await db.transaction(async (tx) => {
    // Increment song votes
    await tx.update(songs)
      .set({ votes: sql`coalesce(${songs.votes}, 0) + 1` })
      .where(eq(songs.id, id));

    // Record listener location with coordinates if available
    await tx.insert(listeners)
      .values({
        songId: id,
        countryCode,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        timestamp: new Date()
      });
  });
}