import { db } from '@db';
import { songs } from '@db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export interface MusicStats {
  totalSongs: number;
  totalArtists: number;
  totalListens: number;
  topArtists: Array<{ artist: string; songCount: number }>;
  recentUploads: Array<typeof songs.$inferSelect>;
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

  // Use votes as a proxy for listens since we don't have a plays field
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

  return {
    totalSongs,
    totalArtists,
    totalListens,
    topArtists: topArtists.map(({ artist, songCount }) => ({
      artist: artist || 'Unknown',
      songCount
    })),
    recentUploads
  };
}

export async function getSongMetadata(id: number) {
  const [song] = await db.select()
    .from(songs)
    .where(eq(songs.id, id));

  return song;
}

export async function incrementListenCount(id: number) {
  await db.update(songs)
    .set({ votes: sql`coalesce(${songs.votes}, 0) + 1` })
    .where(eq(songs.id, id));
}