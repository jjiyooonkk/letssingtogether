import fs from "fs";
import path from "path";
import { put, list } from "@vercel/blob";
import type { Song } from "./constants";

export type { Song, SongLine, Translation, Category } from "./constants";
export { CATEGORIES } from "./constants";

const LOCAL_PATH = path.join(process.cwd(), "data", "songs.json");
const BLOB_NAME = "songs.json";

function useBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// --- Blob helpers ---

async function readBlob(): Promise<Song[] | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_NAME });
    const blob = blobs.find((b) => b.pathname === BLOB_NAME);
    if (!blob) return null;
    const res = await fetch(blob.url);
    return res.json();
  } catch {
    return null;
  }
}

async function writeBlob(songs: Song[]) {
  await put(BLOB_NAME, JSON.stringify(songs, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// --- Local file helpers ---

function readLocal(): Song[] {
  try {
    const raw = fs.readFileSync(LOCAL_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocal(songs: Song[]) {
  try {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(songs, null, 2), "utf-8");
  } catch {
    // read-only filesystem (Vercel), ignore
  }
}

// --- Public API (async) ---

export async function getSongs(): Promise<Song[]> {
  if (useBlob()) {
    const songs = await readBlob();
    if (songs) return songs;
    // First time: seed from bundled file
    const local = readLocal();
    if (local.length > 0) {
      await writeBlob(local).catch(() => {});
    }
    return local;
  }
  return readLocal();
}

export async function getSongById(id: string): Promise<Song | undefined> {
  const songs = await getSongs();
  return songs.find((s) => s.id === id);
}

async function writeSongs(songs: Song[]) {
  if (useBlob()) {
    await writeBlob(songs);
  } else {
    writeLocal(songs);
  }
}

export async function addSong(song: Omit<Song, "id" | "createdAt">): Promise<Song> {
  const songs = await getSongs();
  const newSong: Song = {
    ...song,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
  };
  songs.push(newSong);
  await writeSongs(songs);
  return newSong;
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined> {
  const songs = await getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  songs[idx] = { ...songs[idx], ...updates };
  await writeSongs(songs);
  return songs[idx];
}

export async function deleteSong(id: string): Promise<boolean> {
  const songs = await getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  songs.splice(idx, 1);
  await writeSongs(songs);
  return true;
}
