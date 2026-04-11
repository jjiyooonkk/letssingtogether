import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { title, artist, lyrics } = await request.json();

    if (!title || !lyrics?.length) {
      return Response.json({ error: "제목과 가사가 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const lyricsText = lyrics.map((l: string, i: number) => `${i + 1}. ${l}`).join("\n");

    const prompt = `You are a professional translator. Translate the following Korean song into English and provide romanization.

Song Title: ${title}
Artist: ${artist}
Lyrics:
${lyricsText}

Respond ONLY with valid JSON (no other text):
{
  "romanization": ["romanized line 1", "romanized line 2", ...],
  "en": {
    "title": "English title",
    "artist": "English artist name",
    "lines": ["English line 1", "English line 2", ...]
  }
}

Rules:
- romanization: write Korean pronunciation in Roman letters (e.g., 아리랑 → arirang)
- Translate ALL ${lyrics.length} lyrics lines to English, keeping the same count
- Keep proper nouns as-is when appropriate
- Return ONLY valid JSON`;

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
      const errBody = await res.text();
      console.error("Gemini API error:", res.status, errBody);
      return Response.json({ error: `번역 API 호출 실패 (${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "번역 결과 파싱 실패" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err) {
    console.error("Preview translate error:", err);
    return Response.json({ error: "번역 중 오류" }, { status: 500 });
  }
}
