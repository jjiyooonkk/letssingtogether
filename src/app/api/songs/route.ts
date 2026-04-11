import { getSongs, addSong, updateSong, getSongById } from "@/lib/songs";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";
import type { Song } from "@/lib/constants";

export async function GET() {
  const songs = getSongs();
  return Response.json(songs);
}

const LANG_TARGETS = [
  { code: "en", name: "English" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "tl", name: "Tagalog" },
  { code: "id", name: "Indonesian" },
  { code: "ee", name: "Ewe" },
];

async function autoTranslate(songId: string, title: string, artist: string, lyricsLines: string[]) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return;

  const lyricsText = lyricsLines.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const prompt = `You are a professional translator. Translate the following Korean song information into all the listed languages. Also provide romanization (how to pronounce the Korean lyrics using the Latin/Roman alphabet).

Song Title: ${title}
Artist: ${artist}
Lyrics:
${lyricsText}

Respond ONLY with valid JSON in this exact format (no other text):
{
  "romanization": ["romanized line 1", "romanized line 2", ...],
  "translations": {
${LANG_TARGETS.map((l) => `    "${l.code}": { "title": "translated title", "artist": "translated artist", "lines": ["translated line 1", "translated line 2", ...] }`).join(",\n")}
  }
}

Rules:
- romanization: write Korean pronunciation in Roman letters (e.g., 아리랑 → arirang)
- Each language must translate ALL lyrics lines, keeping the same count (${lyricsLines.length} lines)
- Keep proper nouns as-is when appropriate
- Return ONLY valid JSON`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini API error:", res.status);
      return;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);

    const updates: Record<string, unknown> = {};

    if (parsed.romanization?.length) {
      updates.romanization = parsed.romanization;
    }

    if (parsed.translations) {
      const song = getSongById(songId);
      const merged = { ...(song?.translations || {}), ...parsed.translations };
      updates.translations = merged;
    }

    if (Object.keys(updates).length > 0) {
      updateSong(songId, updates as Partial<Song>);
      revalidatePath("/");
      revalidatePath(`/songs/${songId}`);
    }
  } catch (err) {
    console.error("Auto-translate error:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.artist || !body.lyrics?.length) {
      return Response.json(
        { error: "제목, 아티스트, 가사는 필수입니다." },
        { status: 400 }
      );
    }

    const song = addSong({
      title: body.title,
      artist: body.artist,
      category: body.category || "가요",
      tags: body.tags || [],
      youtubeUrl: body.youtubeUrl || undefined,
      audioUrl: body.audioUrl || undefined,
      sheetMusicUrls: body.sheetMusicUrls || [],
      lyrics: body.lyrics,
      translations: body.translations || {},
      romanization: body.romanization || [],
    });

    // Run translation and wait for it before responding
    const lyricsLines = body.lyrics.map((l: { line: string }) => l.line);
    const hasTranslations = Object.keys(body.translations || {}).length >= LANG_TARGETS.length;
    const hasRomanization = (body.romanization || []).some((r: string) => r.trim());

    if (!hasTranslations || !hasRomanization) {
      await autoTranslate(song.id, body.title, body.artist, lyricsLines);
    }

    revalidatePath("/");
    revalidatePath(`/songs/${song.id}`);

    // Return the latest version (with translations)
    const updated = getSongById(song.id) || song;
    return Response.json(updated, { status: 201 });
  } catch {
    return Response.json(
      { error: "잘못된 요청입니다." },
      { status: 400 }
    );
  }
}
