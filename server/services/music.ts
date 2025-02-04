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
    };
  };
}

export async function getMusicStats(): Promise<MusicStats> {
  const [
    { count: totalSongs }
  ] = await db.select({
    count: sql<number>`count(*)`
  }).from(songs);

  const [
    { count: totalArtists }
  ] = await db.select({
    count: sql<number>`count(distinct ${songs.artist})`
  }).from(songs);

  const [
    { sum: totalListens }
  ] = await db.select({
    sum: sql<number>`coalesce(sum(${songs.votes}), 0)`
  }).from(songs);

  const topArtists = await db.select({
    artist: songs.artist,
    songCount: sql<number>`count(*)`
  })
  .from(songs)
  .where(sql`${songs.artist} is not null`)  // Only count non-null artists
  .groupBy(songs.artist)
  .orderBy(sql`count(*) desc`)
  .limit(10);

  const recentUploads = await db.select()
    .from(songs)
    .orderBy(desc(songs.createdAt))
    .limit(5);

  // Get listener counts by country
  const listenersByCountry = await db.select({
    countryCode: listeners.countryCode,
    votes: sql<number>`count(*)`
  })
  .from(listeners)
  .groupBy(listeners.countryCode)
  .orderBy(sql`count(*) desc`);

  // Transform into the expected format
  const countries: { [key: string]: { votes: number } } = {};
  listenersByCountry.forEach(({ countryCode, votes }) => {
    countries[countryCode] = { votes };
  });

  return {
    totalSongs,
    totalArtists,
    totalListens,
    topArtists: topArtists.map(({ artist, songCount }) => ({
      artist: artist || 'Unknown',
      songCount
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

export async function incrementListenCount(id: number, countryCode: string) {
  // Begin a transaction to ensure both operations complete
  await db.transaction(async (tx) => {
    // Increment song votes
    await tx.update(songs)
      .set({ votes: sql`coalesce(${songs.votes}, 0) + 1` })
      .where(eq(songs.id, id));

    // Record listener location
    await tx.insert(listeners)
      .values({
        songId: id,
        countryCode: countryCode.toLowerCase(),
        timestamp: new Date()
      });
  });
}