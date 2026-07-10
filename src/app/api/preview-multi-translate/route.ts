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

export async function POST(request: NextRequest) {
  try {
    const { enTitle, enArtist, enLines } = await request.json();

    if (!enTitle || !enLines?.length) {
      return Response.json({ error: "영어 제목과 가사가 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    const lyricsText = enLines.map((l: string, i: number) => `${i + 1}. ${l}`).join("\n");

    const prompt = `You are a professional translator. Translate the following English song information into all the listed languages.

Song Title (English): ${enTitle}
Artist (English): ${enArtist}
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
- Each language must translate ALL lyrics lines, keeping the same count (${enLines.length} lines)
- Keep proper nouns as-is when appropriate
- Return ONLY valid JSON`;

    const res = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error("OpenAI API error:", res.status, errBody);
      let detail = "";
      try {
        const errJson = JSON.parse(errBody);
        detail = errJson.error?.message || errBody.slice(0, 200);
      } catch { detail = errBody.slice(0, 200); }
      return Response.json({ error: `번역 API 호출 실패 (${res.status}): ${detail}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "번역 결과 파싱 실패" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err) {
    console.error("Preview multi-translate error:", err);
    return Response.json({ error: "다국어 번역 중 오류" }, { status: 500 });
  }
}
