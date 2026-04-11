import { getSongById, updateSong } from "@/lib/songs";
import type { Song, Translation } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

const LANG_TARGETS = [
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accept English translation from request body (admin just saved it)
  let enTranslation: Translation | undefined;
  try {
    const body = await request.json();
    if (body.en) enTranslation = body.en;
  } catch {
    // no body, fall through to read from file
  }

  const song = getSongById(id);
  if (!song) {
    return Response.json({ error: "노래를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!enTranslation) {
    enTranslation = song.translations?.en;
  }

  if (!enTranslation || !enTranslation.title || !enTranslation.lines?.length) {
    return Response.json({ error: "영어 번역이 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "번역 API 키가 설정되지 않았습니다." }, { status: 500 });
  }

  const lyricsText = enTranslation.lines.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const prompt = `You are a professional translator. Translate the following English song information into all the listed languages.

Song Title (English): ${enTranslation.title}
Artist (English): ${enTranslation.artist || song.artist}
Lyrics (English):
${lyricsText}

Respond ONLY with valid JSON in this exact format (no other text):
{
  "translations": {
${LANG_TARGETS.map((l) => `    "${l.code}": { "title": "translated title", "artist": "translated artist", "lines": ["translated line 1", "translated line 2", ...] }`).join(",\n")}
  }
}

Rules:
- Translate FROM English to each target language
- Each language must translate ALL lyrics lines, keeping the same count (${enTranslation.lines.length} lines)
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
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return Response.json({ error: "번역 API 호출 실패" }, { status: 502 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini response parse fail:", text);
      return Response.json({ error: "번역 결과 파싱 실패" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.translations) {
      const merged = { ...song.translations, ...parsed.translations };
      merged.en = enTranslation;
      updateSong(id, { translations: merged } as Partial<Song>);
    }

    revalidatePath("/");
    revalidatePath(`/songs/${id}`);

    const updated = getSongById(id);
    return Response.json(updated);
  } catch (err) {
    console.error("Retranslate error:", err);
    return Response.json({ error: "번역 중 오류가 발생했습니다." }, { status: 500 });
  }
}
