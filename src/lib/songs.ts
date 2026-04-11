import fs from "fs";
import path from "path";
import os from "os";
import type { Song } from "./constants";

export type { Song, SongLine, Translation, Category } from "./constants";
export { CATEGORIES } from "./constants";

const ORIGINAL_PATH = path.join(process.cwd(), "data", "songs.json");
const TMP_PATH = path.join(os.tmpdir(), "singtogether-songs.json");

function getDataPath(): string {
  // Use /tmp copy for read/write (works on Vercel + Docker + local)
  if (!fs.existsSync(TMP_PATH)) {
    const original = fs.readFileSync(ORIGINAL_PATH, "utf-8");
    fs.writeFileSync(TMP_PATH, original, "utf-8");
  }
  return TMP_PATH;
}

export function getSongs(): Song[] {
  const raw = fs.readFileSync(getDataPath(), "utf-8");
  return JSON.parse(raw);
}

export function getSongById(id: string): Song | undefined {
  return getSongs().find((s) => s.id === id);
}

function writeSongs(songs: Song[]) {
  const data = JSON.stringify(songs, null, 2);
  fs.writeFileSync(getDataPath(), data, "utf-8");
  // Also try to write to original path (works locally/Docker, fails silently on Vercel)
  try {
    fs.writeFileSync(ORIGINAL_PATH, data, "utf-8");
  } catch {
    // read-only filesystem (Vercel), ignore
  }
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
  writeSongs(songs);
  return newSong;
}

export function updateSong(id: string, updates: Partial<Song>): Song | undefined {
  const songs = getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  songs[idx] = { ...songs[idx], ...updates };
  writeSongs(songs);
  return songs[idx];
}

export function deleteSong(id: string): boolean {
  const songs = getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  songs.splice(idx, 1);
  writeSongs(songs);
  return true;
}
