import { NextRequest } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return Response.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const urls: string[] = [];

    const allowedTypes = ["image/", "audio/"];

    for (const file of files) {
      if (!allowedTypes.some((t) => file.type.startsWith(t))) {
        return Response.json(
          { error: "이미지 또는 오디오 파일만 업로드할 수 있습니다." },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() || "bin";
      const filename = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      await writeFile(
        path.join(process.cwd(), "public", "uploads", filename),
        buffer
      );

      urls.push(`/uploads/${filename}`);
    }

    return Response.json({ urls });
  } catch {
    return Response.json({ error: "업로드 실패" }, { status: 500 });
  }
}
