import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image, mimeType } = await request.json();

    if (!image) {
      return Response.json({ error: "이미지가 필요합니다." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API key가 설정되지 않았습니다." }, { status: 500 });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: image,
                  },
                },
                {
                  text: `이 손글씨 이미지에서 노래 가사와 기타코드를 인식해주세요.

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "title": "노래 제목 (있으면)",
  "artist": "아티스트 (있으면)",
  "lyrics": [
    { "line": "가사 한 줄", "chords": "Am, G, Em" },
    { "line": "가사 한 줄", "chords": "C, F" }
  ]
}

규칙:
- 가사는 줄별로 나눠주세요
- 기타코드는 해당 줄 위에 적혀있는 코드를 쉼표로 구분해서 넣어주세요
- 코드가 없는 줄은 chords를 빈 문자열로 해주세요
- 제목이나 아티스트를 알 수 없으면 빈 문자열로 해주세요
- 반드시 유효한 JSON만 반환하세요`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Gemini API 오류");
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "이미지에서 가사를 인식할 수 없습니다." },
        { status: 422 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json(parsed);
  } catch (err: unknown) {
    console.error("OCR error:", err);
    const message =
      err instanceof Error ? err.message : "이미지 인식 중 오류가 발생했습니다.";
    return Response.json({ error: message }, { status: 500 });
  }
}
