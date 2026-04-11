import fs from "fs";
import path from "path";
import type { Song } from "./constants";

export type { Song, SongLine, Translation, Category } from "./constants";
export { CATEGORIES } from "./constants";

const DATA_PATH = path.join(process.cwd(), "data", "songs.json");

export function getSongs(): Song[] {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

export function getSongById(id: string): Song | undefined {
  return getSongs().find((s) => s.id === id);
}

export function addSong(
  song: Omit<Song, "id" | "createdAt">
): Song {
  const songs = getSongs();
  const newSong: Song = {
    ...song,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
  };
  songs.push(newSong);
  fs.writeFileSync(DATA_PATH, JSON.stringify(songs, null, 2), "utf-8");
  return newSong;
}

export function updateSong(id: string, updates: Partial<Song>): Song | undefined {
  const songs = getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  songs[idx] = { ...songs[idx], ...updates };
  fs.writeFileSync(DATA_PATH, JSON.stringify(songs, null, 2), "utf-8");
  return songs[idx];
}

export function deleteSong(id: string): boolean {
  const songs = getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  songs.splice(idx, 1);
  fs.writeFileSync(DATA_PATH, JSON.stringify(songs, null, 2), "utf-8");
  return true;
}
