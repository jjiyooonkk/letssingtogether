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
    contentType: "application/json",
  });
}

// --- Local file helpers ---

function readLocal(): Song[] {
  const raw = fs.readFileSync(LOCAL_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeLocal(songs: Song[]) {
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(songs, null, 2), "utf-8");
}

// --- Public API (async) ---

export async function getSongs(): Promise<Song[]> {
  if (useBlob()) {
    try {
      const songs = await readBlob();
      if (songs) return songs;
      // First time: seed from bundled file
      const local = readLocal();
      await writeBlob(local);
      return local;
    } catch (err) {
      console.error("Blob read failed, falling back to local:", err);
      return readLocal();
    }
  }
  return readLocal();
}

export async function getSongById(id: string): Promise<Song | undefined> {
  const songs = await getSongs();
  return songs.find((s) => s.id === id);
}

export async function addSong(song: Omit<Song, "id" | "createdAt">): Promise<Song> {
  const songs = await getSongs();
  const newSong: Song = {
    ...song,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
  };
  songs.push(newSong);
  if (useBlob()) {
    await writeBlob(songs);
  } else {
    writeLocal(songs);
  }
  return newSong;
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined> {
  const songs = await getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  songs[idx] = { ...songs[idx], ...updates };
  if (useBlob()) {
    await writeBlob(songs);
  } else {
    writeLocal(songs);
  }
  return songs[idx];
}

export async function deleteSong(id: string): Promise<boolean> {
  const songs = await getSongs();
  const idx = songs.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  songs.splice(idx, 1);
  if (useBlob()) {
    await writeBlob(songs);
  } else {
    writeLocal(songs);
  }
  return true;
}
