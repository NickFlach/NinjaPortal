import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").unique().notNull(),
  username: text("username"),
  isAdmin: boolean("is_admin").default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  lastSeen: timestamp("last_seen").defaultNow(),
  ipfsAccount: text("ipfs_account"),
  ipfsSecret: text("ipfs_secret"),
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  ipfsHash: text("ipfs_hash").notNull(),
  uploadedBy: text("uploaded_by").references(() => users.address),
  createdAt: timestamp("created_at").defaultNow(),
  votes: integer("votes").default(0),
  // New metadata fields
  albumArtIpfsHash: text("album_art_ipfs_hash"),
  albumName: text("album_name"),
  genre: text("genre"),
  releaseYear: integer("release_year"),
  duration: integer("duration"), // Duration in seconds
  description: text("description"),
  isExplicit: boolean("is_explicit").default(false),
  license: text("license"),
  bpm: integer("bpm"), // Beats per minute
  key: text("key"), // Musical key
  tags: text("tags"),
  ipfsAccount: text("ipfs_account"),
});

export const recentlyPlayed = pgTable("recently_played", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id),
  playedBy: text("played_by").references(() => users.address),
  playedAt: timestamp("played_at").defaultNow(),
});

// Relations
export const songsRelations = relations(songs, ({ many, one }) => ({
  recentPlays: many(recentlyPlayed),
  uploader: one(users, {
    fields: [songs.uploadedBy],
    references: [users.address],
  }),
}));

export const recentlyPlayedRelations = relations(recentlyPlayed, ({ one }) => ({
  song: one(songs, {
    fields: [recentlyPlayed.songId],
    references: [songs.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;